import { NextRequest, NextResponse } from 'next/server'
import { sql, hasDatabase, ensureTables, checkAdminSession } from '@/app/lib/db'

export const dynamic = 'force-dynamic'
const STATUSES = ['Nouvelle', 'En cours', 'Devis à préparer', 'Acceptée', 'Terminée', 'Annulée']

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasDatabase || !sql || !checkAdminSession(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await context.params
  const numericId = Number(id)
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === 'string' ? body.status : ''
  if (!Number.isInteger(numericId) || !STATUSES.includes(status)) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  await ensureTables()
  await sql`UPDATE orders SET status = ${status} WHERE id = ${numericId}`
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasDatabase || !sql || !checkAdminSession(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await context.params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  await ensureTables()
  await sql`DELETE FROM orders WHERE id = ${numericId}`
  return NextResponse.json({ ok: true })
}
