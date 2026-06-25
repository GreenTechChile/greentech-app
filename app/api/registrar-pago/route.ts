// app/api/registrar-pago/route.ts
// Registra el pago de incorporación al momento de completar el paso de pago,
// ANTES de que el socio termine el formulario. Esto permite rastrear pagos incompletos.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { rut, nombre, email, monto, mp_payment_id, estado } = await req.json()
    if (!rut || !nombre || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('pagos_incorporacion').upsert({
      rut,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      mp_payment_id: mp_payment_id || ('BYPASS-' + Date.now()),
      monto: monto ?? 25000,
      estado: estado || 'aprobado',
      fecha: new Date().toISOString(),
    }, { onConflict: 'rut', ignoreDuplicates: false })

    if (error) {
      console.error('[api/registrar-pago] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/registrar-pago] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
