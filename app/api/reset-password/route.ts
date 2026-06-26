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

    let authEmail = syntheticEmail
    const { data: { user: userSynthetic } } = await supabaseAdmin.auth.admin.getUserByEmail(syntheticEmail)
    if (!userSynthetic) {
      // Fallback: intentar con el email real (usuario legacy)
      const { data: { user: userReal } } = await supabaseAdmin.auth.admin.getUserByEmail(socio.email)
      if (!userReal) {
        // No existe en Auth — responder ok igual (no revelar si el RUT existe)
        console.warn('[reset-password] No se encontró usuario Auth para RUT:', rut)
        return NextResponse.json({ ok: true })
      }
      authEmail = socio.email
    }

    // Generar link de recuperación usando Supabase Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: authEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://asociaciongreentech.cl'}/login`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[reset-password] Error generando link:', linkError)
      return NextResponse.json({ error: 'No se pudo generar el link de recuperación' }, { status: 500 })
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
