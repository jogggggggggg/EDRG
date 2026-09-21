import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminSession } from '@/app/lib/db'
import seed from '@/public/data/catalogue.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasDatabase || !sql) return NextResponse.json({ items: seed })
  await ensureTables()
  const rows = await sql`SELECT data FROM catalog_items ORDER BY id`
  return NextResponse.json({ items: rows.map(r => r.data) })
}

export async function PUT(request: NextRequest) {
  if (!hasDatabase || !sql || !checkAdminSession(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const item = body?.item
  if (!item || typeof item !== 'object' || typeof item.Objet !== 'string' || !item.Objet.trim()) {
    return NextResponse.json({ error: 'Objet invalide.' }, { status: 400 })
  }
  const name = item.Objet.trim()
  const data = {
    ...item,
    Objet: name,
    Catégorie: typeof item.Catégorie === 'string' && item.Catégorie.trim() ? item.Catégorie.trim() : 'Divers',
    'Prix / stack de 64 ($)': Math.max(0, Number(item['Prix / stack de 64 ($)']) || 0),
  }
  await ensureTables()
  await sql`INSERT INTO catalog_items (id, data, updated_at) VALUES (${name}, ${JSON.stringify(data)}, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(request: NextRequest) {
  if (!hasDatabase || !sql || !checkAdminSession(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const name = typeof body?.Objet === 'string' ? body.Objet.trim() : ''
  if (!name) return NextResponse.json({ error: 'Objet invalide.' }, { status: 400 })
  await ensureTables()
  await sql`DELETE FROM catalog_items WHERE id = ${name}`
  return NextResponse.json({ ok: true })
}
