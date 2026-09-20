import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminPassword } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

// GET : liste des commandes — réservé à l'admin (mot de passe dans l'en-tête).
export async function GET(request: NextRequest) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  const password = request.headers.get('x-admin-password')
  if (!checkAdminPassword(password)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  await ensureTables()
  const rows = await sql`SELECT id, created_at, player, contact, note, items, services, custom_requests, total FROM orders ORDER BY created_at DESC LIMIT 500`
  const orders = rows.map(row => ({
    id: Number(row.id),
    date: new Date(row.created_at as string).toLocaleString('fr-FR'),
    player: row.player,
    contact: row.contact || '',
    note: row.note || '',
    items: row.items || [],
    services: row.services || [],
    customRequests: row.custom_requests || [],
    total: Number(row.total),
  }))
  return NextResponse.json({ orders })
}

// POST : création d'une commande — accessible à tout le monde (c'est le checkout client).
export async function POST(request: NextRequest) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  await ensureTables()

  const body = await request.json().catch(() => null)
  if (!body || typeof body.player !== 'string' || !body.player.trim()) {
    return NextResponse.json({ error: 'Pseudo requis.' }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  const services = Array.isArray(body.services) ? body.services : []
  const customRequests = Array.isArray(body.customRequests) ? body.customRequests : []
  const total = Number(body.total) || 0

  const rows = await sql`
    INSERT INTO orders (player, contact, note, items, services, custom_requests, total)
    VALUES (${body.player.trim()}, ${body.contact || ''}, ${body.note || ''}, ${JSON.stringify(items)}, ${JSON.stringify(services)}, ${JSON.stringify(customRequests)}, ${total})
    RETURNING id, created_at
  `
  return NextResponse.json({ ok: true, id: Number(rows[0].id) })
}
