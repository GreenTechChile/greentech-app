import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { rut } = await req.json()
    if (!rut) return NextResponse.json({ error: 'Falta el RUT' }, { status: 400 })

    // Buscar socio por RUT
    const { data: socio } = await supabaseAdmin
      .from('socios')
      .select('rut, nombre, email, estado')
      .eq('rut', rut.trim())
      .single()

    // Siempre responder igual para no revelar si un RUT existe o no
    if (!socio || socio.estado !== 'activo') {
      return NextResponse.json({ ok: true })
    }

    // Determinar qué email tiene en Auth:
    // Usuarios nuevos → email sintético {rutLimpio}@greentech.cl
    // Usuarios legacy (aprobados antes del cambio) → email real
    const rutLimpio = socio.rut.replace(/\./g, '').replace('-', '')
    const syntheticEmail = `${rutLimpio}@greentech.cl`
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://asociaciongreentech.cl'}/login`

    // Intentar con email sintético; si falla, fallback al email real (usuario legacy)
    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: syntheticEmail,
      options: { redirectTo },
    })

    if (linkError || !linkData?.properties?.action_link) {
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: socio.email,
        options: { redirectTo },
      })

      if (fallbackError || !fallbackData?.properties?.action_link) {
        console.warn('[reset-password] No se encontró usuario Auth para RUT:', rut)
        return NextResponse.json({ ok: true })
      }

      linkData = fallbackData
    }

    const resetLink = linkData.properties.action_link

    // Enviar al email REAL del socio (no al sintético)
    await sendEmail('reset_password', socio.email, {
      nombre: socio.nombre,
      link: resetLink,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
