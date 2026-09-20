import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminPassword } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

// GET : renvoie les surcharges de prix enregistrées (id -> prix). Public :
// tout visiteur de l'onglet Services doit voir les prix à jour.
export async function GET() {
  if (!hasDatabase || !sql) return NextResponse.json({ overrides: {} })
  await ensureTables()
  const rows = await sql`SELECT id, price FROM service_prices`
  const overrides: Record<string, number> = {}
  for (const row of rows) overrides[row.id as string] = Number(row.price)
  return NextResponse.json({ overrides })
}

// PUT : enregistre un ou plusieurs prix — réservé à l'admin.
export async function PUT(request: NextRequest) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  const password = request.headers.get('x-admin-password')
  if (!checkAdminPassword(password)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const updates = body && typeof body === 'object' ? (body.updates as Record<string, number>) : null
  if (!updates) return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })

  await ensureTables()
  for (const [id, price] of Object.entries(updates)) {
    if (!Number.isFinite(Number(price))) continue
    await sql`
      INSERT INTO service_prices (id, price) VALUES (${id}, ${Number(price)})
      ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price
    `
  }
  return NextResponse.json({ ok: true })
}
