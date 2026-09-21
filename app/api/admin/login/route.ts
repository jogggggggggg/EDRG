import { NextRequest, NextResponse } from 'next/server'
import { adminSessionToken, checkAdminCode, checkAdminSession } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: checkAdminSession(request) })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const code = body && typeof body.code === 'string' ? body.code : (body && typeof body.password === 'string' ? body.password : null)
  if (!checkAdminCode(code)) return NextResponse.json({ ok: false }, { status: 401 })
  const response = NextResponse.json({ ok: true })
  response.cookies.set('tfpc_admin', adminSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 60 * 60 * 12,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('tfpc_admin', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
