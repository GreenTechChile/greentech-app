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
    const { socioId, notas } = await req.json()
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

    // 2. Generar contraseña temporal
    const rutLimpio = socio.rut.replace(/\./g, '').replace('-', '')
    const tempPassword = `GT${rutLimpio.slice(-6)}!`

    // 3. Crear usuario en Supabase Auth (o actualizarlo si ya existe)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: socio.email,
      password: tempPassword,
      email_confirm: true, // No necesita confirmar email
      user_metadata: { rut: socio.rut, nombre: socio.nombre },
    })

    // Si ya existe el usuario en auth, solo actualizar la contraseña
    if (authError && authError.message?.includes('already been registered')) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.email === socio.email)
      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          email_confirm: true,
        })
      }
    } else if (authError) {
      console.error('[aprobar-socio] Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 4. Actualizar estado del socio a 'activo' y activar rol_socio
    await supabaseAdmin
      .from('socios')
      .update({ estado: 'activo', rol_socio: true, notas_admin: notas || null })
      .eq('id', socioId)

    // 5. Registrar ingreso en movimientos_financieros
    try {
      const { data: configPago } = await supabaseAdmin
        .from('configuracion')
        .select('datos')
        .eq('id', 'pago_incorporacion')
        .single()
      const monto: number = configPago?.datos?.monto ?? 25000
      const ahora = new Date()
      await supabaseAdmin.from('movimientos_financieros').insert({
        tipo: 'ingreso',
        categoria: 'Incorporación',
        concepto: `Pago de incorporación — ${socio.nombre} (${socio.rut})`,
        monto,
        socio_id: socio.id,
        mes: ahora.getMonth() + 1,
        año: ahora.getFullYear(),
      })
    } catch (finErr) {
      console.error('[aprobar-socio] error registrando movimiento financiero:', finErr)
      // No bloqueante — la aprobación continúa igualmente
    }

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
