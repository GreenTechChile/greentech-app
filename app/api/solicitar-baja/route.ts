import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { socioId, rut, nombre, motivo } = await req.json()
    if (!socioId || !rut || !nombre) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Verificar que el socio existe y está activo
    const { data: socio, error: fetchError } = await supabaseAdmin
      .from('socios')
      .select('id, estado')
      .eq('id', socioId)
      .single()

    if (fetchError || !socio) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
    }
    if (socio.estado !== 'activo') {
      return NextResponse.json({ error: 'La cuenta no está activa' }, { status: 400 })
    }

    // Verificar que no haya ya una solicitud pendiente
    const { data: pendiente } = await supabaseAdmin
      .from('solicitudes_baja')
      .select('id')
      .eq('socio_id', socioId)
      .eq('estado', 'pendiente')
      .single()

    if (pendiente) {
      return NextResponse.json({ error: 'Ya tienes una solicitud de baja pendiente' }, { status: 409 })
    }

    // Crear la solicitud
    const { error: insertError } = await supabaseAdmin
      .from('solicitudes_baja')
      .insert({ socio_id: socioId, rut, nombre, motivo: motivo?.trim() || null })

    if (insertError) {
      console.error('[solicitar-baja] Error:', insertError)
      return NextResponse.json({ error: 'Error al registrar la solicitud' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[solicitar-baja] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
