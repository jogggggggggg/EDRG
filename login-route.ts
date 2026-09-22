import { NextRequest, NextResponse } from 'next/server'
import { adminSessionToken, checkAdminCode, checkAdminSession, adminCodeConfigured } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: checkAdminSession(request) })
}

export async function POST(request: NextRequest) {
  if (!adminCodeConfigured()) {
    // ADMIN_ACCESS_CODE (ou ADMIN_PASSWORD) n'est pas défini sur Vercel : aucun mot de
    // passe ne peut fonctionner tant que la variable n'est pas ajoutée puis redéployée.
    return NextResponse.json(
      { ok: false, error: 'not_configured', message: "Aucun mot de passe admin n'est configuré sur le serveur (variable ADMIN_ACCESS_CODE manquante sur Vercel)." },
      { status: 500 }
    )
  }
  const body = await request.json().catch(() => null)
  const code = body && typeof body.code === 'string' ? body.code : (body && typeof body.password === 'string' ? body.password : null)
  if (!checkAdminCode(code)) return NextResponse.json({ ok: false, error: 'wrong_password' }, { status: 401 })
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
