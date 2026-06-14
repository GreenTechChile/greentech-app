import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      rut, nombre, email, telefono, direccion, casa_depto,
      comuna, ciudad, estado_civil, profesion, diagnostico,
      diagnostico_secundario, medico_nombre, medico_rut, folio_receta,
      cuota_mensual, gramos_delegados, vencimiento_receta, observaciones,
    } = body

    if (!rut || !nombre || !email) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Verificar que el RUT no esté ya registrado
    const { data: existing } = await supabaseAdmin
      .from('socios')
      .select('rut')
      .eq('rut', rut)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'El RUT ya está registrado en el sistema.' }, { status: 409 })
    }

    const { error: insertError } = await supabaseAdmin.from('socios').insert({
      rut,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      casa_depto: casa_depto?.trim() || null,
      comuna: comuna?.trim() || null,
      ciudad: ciudad?.trim() || null,
      estado_civil: estado_civil || null,
      profesion: profesion?.trim() || null,
      diagnostico: diagnostico?.trim() || null,
      diagnostico_secundario: diagnostico_secundario?.trim() || null,
      medico_nombre: medico_nombre?.trim() || null,
      medico_rut: medico_rut?.trim() || null,
      folio_receta: folio_receta?.trim() || null,
      cuota_mensual: parseInt(cuota_mensual) || null,
      gramos_delegados: parseInt(gramos_delegados) || null,
      vencimiento_receta: vencimiento_receta || null,
      observaciones: observaciones?.trim() || null,
      estado: 'pendiente',
    })

    if (insertError) {
      console.error('[api/inscripcion] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/inscripcion] error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
