import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    if (type !== 'payment') return NextResponse.json({ ok: true })

    // Consultar el pago a MercadoPago
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
    })
    const pago = await res.json()

    if (pago.status !== 'approved') return NextResponse.json({ ok: true })

    // external_reference viene como "rut|tipo|orden"
    const [rut, tipo, orden] = (pago.external_reference || '').split('|')

    if (tipo === 'dispensacion') {
      // Actualizar dispensaciones de esa orden a estado pagado
      await supabase.from('dispensaciones')
        .update({ estado: 'pagado', medio_pago: 'MercadoPago' })
        .like('orden_numero', `${orden}%`)
    }

    if (tipo === 'incorporacion') {
      // Marcar pago de incorporación confirmado
      await supabase.from('solicitudes_incorporacion')
        .update({ estado: 'pago_confirmado', mp_payment_id: String(data.id) })
        .eq('rut', rut)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
