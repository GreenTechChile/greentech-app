import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COMISION_MP = 0.0308

export async function POST(req: NextRequest) {
  try {
    const { monto_total, orden, mes, año } = await req.json()

    if (!monto_total || !orden || !mes || !año) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const comision = Math.round(monto_total * COMISION_MP)

    const { error } = await supabaseAdmin
      .from('movimientos_financieros')
      .insert({
        tipo: 'egreso',
        categoria: 'Comisiones',
        concepto: `Comisión MercadoPago 3.08% — Orden ${orden}`,
        monto: comision,
        mes,
        año,
        registrado_por: 'sistema',
      })

    if (error) {
      console.error('Error registrando comisión MP:', error)
      return NextResponse.json({ error: 'Error al registrar comisión' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, comision })
  } catch (e) {
    console.error('Error en comision-mp:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
