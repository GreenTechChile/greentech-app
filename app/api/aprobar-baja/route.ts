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
    const { solicitudId, decision, resueltaPor } = await req.json()
    // decision: 'aprobada' | 'rechazada'
    if (!solicitudId || !decision || !['aprobada', 'rechazada'].includes(decision)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Obtener la solicitud con datos del socio
    const { data: solicitud, error: fetchError } = await supabaseAdmin
      .from('solicitudes_baja')
      .select('*, socios(id, nombre, email, estado)')
      .eq('id', solicitudId)
      .single()

    if (fetchError || !solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json({ error: 'La solicitud ya fue resuelta' }, { status: 409 })
    }

    // Resolver la solicitud
    await supabaseAdmin
      .from('solicitudes_baja')
      .update({ estado: decision, resuelta_at: new Date().toISOString(), resuelta_por: resueltaPor || null })
      .eq('id', solicitudId)

    if (decision === 'aprobada') {
      // Marcar socio como inactivo
      await supabaseAdmin
        .from('socios')
        .update({ estado: 'inactivo' })
        .eq('id', solicitud.socio_id)

      // Deshabilitar usuario en auth
      const rutLimpio = solicitud.rut.replace(/\./g, '').replace('-', '')
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const authUser = users?.find(u => u.email === `${rutLimpio}@greentech.cl`)
      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { ban_duration: '87600h' }) // 10 años
      }

      // Enviar email al socio
      try {
        await sendEmail('baja_aprobada', solicitud.socios.email, { nombre: solicitud.nombre })
      } catch (e) {
        console.error('[aprobar-baja] email error:', e)
      }
    } else {
      // Rechazada: notificar al socio
      try {
        await sendEmail('baja_rechazada', solicitud.socios.email, { nombre: solicitud.nombre })
      } catch (e) {
        console.error('[aprobar-baja] email error:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[aprobar-baja] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
