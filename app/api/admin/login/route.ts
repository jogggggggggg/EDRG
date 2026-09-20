import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPassword } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const password = body && typeof body.password === 'string' ? body.password : null
  if (!checkAdminPassword(password)) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}
