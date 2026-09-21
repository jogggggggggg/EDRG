import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminSession, getServicePrices } from '@/app/lib/db'

export const dynamic = 'force-dynamic'
const STATUSES = ['Nouvelle', 'En cours', 'Devis à préparer', 'Acceptée', 'Terminée', 'Annulée'] as const

export async function GET(request: NextRequest) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  if (!checkAdminSession(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  await ensureTables()
  const rows = await sql`SELECT id, created_at, player, contact, note, items, services, custom_requests, total, status FROM orders ORDER BY created_at DESC LIMIT 500`
  return NextResponse.json({ orders: rows.map(row => ({
    id: Number(row.id), date: new Date(row.created_at as string).toLocaleString('fr-FR'),
    player: row.player, contact: row.contact || '', note: row.note || '',
    items: row.items || [], services: row.services || [], customRequests: row.custom_requests || [],
    total: Number(row.total), status: String(row.status || 'Nouvelle'),
  })) })
}

export async function POST(request: NextRequest) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  await ensureTables()
  const body = await request.json().catch(() => null)
  const player = typeof body?.player === 'string' ? body.player.trim() : ''
  if (!player || player.length > 80) return NextResponse.json({ error: 'Pseudo requis.' }, { status: 400 })

  const rawItems = Array.isArray(body.items) ? body.items : []
  const rawServices = Array.isArray(body.services) ? body.services : []
  const customRequests = Array.isArray(body.customRequests)
    ? body.customRequests.filter((x: unknown) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 1000))
    : []

  let total = 0
  const items: { label: string; detail: string; total: number }[] = []
  for (const raw of rawItems) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : ''
    const mode = raw?.mode === 'unit' ? 'unit' : 'stack'
    const quantity = Math.floor(Number(raw?.quantity))
    if (!name || !Number.isFinite(quantity) || quantity < 1 || quantity > 10000) continue
    const rows = await sql`SELECT data FROM catalog_items WHERE id = ${name} LIMIT 1`
    const data = rows[0]?.data as Record<string, unknown> | undefined
    if (!data) continue
    const stackPrice = Number(data['Prix / stack de 64 ($)']) || (Number(data['Prix / unité ($)']) || 0) * 64
    const unitPrice = Number(data['Prix / unité ($)']) || stackPrice / 64
    const unit = mode === 'unit' ? unitPrice : stackPrice
    const lineTotal = Math.max(0, unit) * quantity
    total += lineTotal
    items.push({ label: name, detail: `${quantity} × ${mode === 'unit' ? 'unité(s)' : 'stack(s)'}`, total: lineTotal })
  }

  const prices = await getServicePrices()
  const services: { label: string; detail: string; total: number }[] = []
  for (const raw of rawServices) {
    const id = typeof raw?.id === 'string' ? raw.id : ''
    const quantity = Math.floor(Number(raw?.quantity))
    if (!id || !Number.isFinite(quantity) || quantity < 1 || quantity > 1000 || !(id in prices)) continue
    const price = Math.max(0, Number(prices[id]))
    const lineTotal = price * quantity
    total += lineTotal
    services.push({ label: typeof raw.label === 'string' ? raw.label.slice(0, 200) : id, detail: `${quantity} ×`, total: lineTotal })
  }

  const contact = typeof body?.contact === 'string' ? body.contact.trim().slice(0, 300) : ''
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : ''
  const rows = await sql`INSERT INTO orders (player, contact, note, items, services, custom_requests, total, status)
    VALUES (${player}, ${contact}, ${note}, ${JSON.stringify(items)}, ${JSON.stringify(services)}, ${JSON.stringify(customRequests)}, ${total}, 'Nouvelle')
    RETURNING id, created_at`
  return NextResponse.json({ ok: true, id: Number(rows[0].id), total, hasCustomQuote: customRequests.length > 0 })
}
