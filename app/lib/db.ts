import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'
import catalogueSeed from '@/public/data/catalogue.json'

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
export const hasDatabase = Boolean(connectionString)
export const sql = connectionString ? neon(connectionString) : null

let ready: Promise<void> | null = null

export const DEFAULT_SERVICE_PRICES: Record<string, number> = {
  'ferme-petite': 1500, 'ferme-moyenne': 5000, 'ferme-grande': 15000, 'ferme-gigantesque': 40000,
  'camo-leger': 500, 'camo-complet': 1500, 'camo-premium': 10000, decoration: 1000, tri: 2500, optimisation: 2000,
  'transport-petit': 500, 'transport-moyen': 1500, 'transport-grand': 4000, 'transport-industriel': 10000,
  chargement: 300, stockage: 500,
}

export async function ensureTables(): Promise<void> {
  if (!sql) return
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        player TEXT NOT NULL, contact TEXT, note TEXT, items JSONB NOT NULL DEFAULT '[]',
        services JSONB NOT NULL DEFAULT '[]', custom_requests JSONB NOT NULL DEFAULT '[]',
        total NUMERIC NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Nouvelle'
      )`
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Nouvelle'`
      await sql`CREATE TABLE IF NOT EXISTS service_prices (id TEXT PRIMARY KEY, price NUMERIC NOT NULL)`
      await sql`CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      // Ajoute aussi les nouveaux objets du fichier catalogue si la base existe déjà.
      // Les entrées existantes ne sont jamais écrasées : leurs prix personnalisés restent intacts.
      for (const raw of catalogueSeed as Record<string, unknown>[]) {
        const name = String(raw['Objet'] || '').trim()
        if (!name) continue
        const stack = Math.max(0, Number(raw['Prix / stack de 64 ($)']) || 0)
        const unit = Math.max(0, Number(raw['Prix / unité ($)']) || stack / 64)
        const data = { ...raw, Objet: name, 'Prix / unité ($)': unit, 'Prix / stack de 64 ($)': stack || unit * 64, Disponibilité: String(raw['Disponibilité'] || 'Disponible') }
        await sql`INSERT INTO catalog_items (id, data) VALUES (${name}, ${JSON.stringify(data)}) ON CONFLICT (id) DO NOTHING`
      }
    })()
  }
  return ready
}

export function adminSessionToken(): string {
  const secret = process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_PASSWORD || ''
  if (!secret) return ''
  return crypto.createHmac('sha256', secret).update('tout-faire-pas-cher-admin-session-v1').digest('hex')
}

export function checkAdminSession(request: Request): boolean {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)tfpc_admin=([^;]+)/)?.[1] || ''
  const expected = adminSessionToken()
  return Boolean(expected && token && token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)))
}

export function checkAdminCode(code: string | null): boolean {
  const expected = process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_PASSWORD
  return Boolean(expected && code && code.trim() === expected.trim())
}

export async function getServicePrices() {
  const prices = { ...DEFAULT_SERVICE_PRICES }
  if (!sql) return prices
  await ensureTables()
  const rows = await sql`SELECT id, price FROM service_prices`
  for (const row of rows) prices[String(row.id)] = Number(row.price)
  return prices
}
