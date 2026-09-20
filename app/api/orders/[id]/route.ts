import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminPassword } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasDatabase || !sql) return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 })
  const password = request.headers.get('x-admin-password')
  if (!checkAdminPassword(password)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await context.params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })

  await ensureTables()
  await sql`DELETE FROM orders WHERE id = ${numericId}`
  return NextResponse.json({ ok: true })
}
