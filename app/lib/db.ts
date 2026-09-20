import { neon } from '@neondatabase/serverless'

// Vercel + l'intégration Neon ajoutent automatiquement DATABASE_URL (pooled)
// et DATABASE_URL_UNPOOLED. On utilise la version poolée par défaut, adaptée
// aux fonctions serverless de Next.js.
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED

export const hasDatabase = Boolean(connectionString)

export const sql = connectionString ? neon(connectionString) : null

let ready: Promise<void> | null = null

// Crée les tables si elles n'existent pas encore. Appelé au début de chaque
// route API : sans coût une fois les tables en place (IF NOT EXISTS), et ça
// évite d'avoir à faire une migration manuelle séparée.
export function ensureTables(): Promise<void> {
  if (!sql) return Promise.resolve()
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          player TEXT NOT NULL,
          contact TEXT,
          note TEXT,
          items JSONB NOT NULL DEFAULT '[]',
          services JSONB NOT NULL DEFAULT '[]',
          custom_requests JSONB NOT NULL DEFAULT '[]',
          total NUMERIC NOT NULL DEFAULT 0
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS service_prices (
          id TEXT PRIMARY KEY,
          price NUMERIC NOT NULL
        )
      `
    })()
  }
  return ready
}

export function checkAdminPassword(password: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return Boolean(password) && password === expected
}
