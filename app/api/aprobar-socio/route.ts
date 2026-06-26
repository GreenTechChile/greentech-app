import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

// Cliente admin con service role — solo en servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { socioId, notas, aprobadoPor } = await req.json()
    if (!socioId) return NextResponse.json({ error: 'Falta socioId' }, { status: 400 })

    // 1. Obtener datos del socio
    const { data: socio, error: fetchError } = await supabaseAdmin
      .from('socios')
      .select('id, nombre, rut, email, estado')
      .eq('id', socioId)
      .single()

    if (fetchError || !socio) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
    }

    // 2. Generar email sintético basado en RUT (identificador único, independiente del email real)
    //    Esto evita conflictos cuando dos socios usan el mismo email personal.
    const rutLimpio = socio.rut.replace(/\./g, '').replace('-', '')
    const authEmail = `${rutLimpio}@greentech.cl`
    const tempPassword = `GT${rutLimpio.slice(-6)}!`

    // 3. Crear usuario en Supabase Auth usando el email sintético por RUT
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { rut: socio.rut, nombre: socio.nombre },
    })

    // Si ya existe (re-aprobación), no tocar la contraseña — el socio puede haberla cambiado
    if (authError && authError.message?.includes('already been registered')) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.email === authEmail)
      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
          user_metadata: { rut: socio.rut, nombre: socio.nombre },
          // NO se resetea la contraseña
        })
      }
    } else if (authError) {
      console.error('[aprobar-socio] Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 4. Actualizar estado del socio a 'activo' y activar rol_socio
    await supabaseAdmin
      .from('socios')
      .update({
        estado: 'activo', rol_socio: true, notas_admin: notas || null,
        aprobado_por: aprobadoPor || null,
        aprobado_at: new Date().toISOString(),
      })
      .eq('id', socioId)

    // 5. El ingreso en movimientos_financieros se registra al completar la inscripción
    //    (en inscripcion-api-route.ts), no al aprobar — el pago es independiente del estado.

    // 6. Enviar emails
    try {
      await sendEmail('aprobacion_solicitud', socio.email, { nombre: socio.nombre, rut: socio.rut })
      await sendEmail('credenciales_enviadas', socio.email, { nombre: socio.nombre, rut: socio.rut, contrasena: tempPassword })
    } catch (emailErr) {
      console.error('[aprobar-socio] email error:', emailErr)
      // No falla el proceso si el email falla
    }

    return NextResponse.json({ ok: true, tempPassword })
  } catch (err) {
    console.error('[aprobar-socio] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
