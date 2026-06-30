import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// MercadoPago envía POST con { type: "payment", data: { id: "..." } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    // Verificar estado del pago directamente con la API de MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })

    if (!mpRes.ok) {
      console.error('Error consultando pago MP:', paymentId)
      return NextResponse.json({ error: 'Error consultando pago MP' }, { status: 500 })
    }

    const payment = await mpRes.json()
    const rut = payment.external_reference   // RUT del socio
    const status = payment.status            // "approved", "pending", "rejected"

    if (!rut) return NextResponse.json({ ok: true })

    if (status === 'approved') {
      await supabaseAdmin
        .from('pagos_incorporacion')
        .update({
          estado: 'aprobado',
          mp_payment_id: String(paymentId),
        })
        .eq('rut', rut)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook MP error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// MP hace GET al webhook para verificar que responde
export async function GET() {
  return NextResponse.json({ ok: true })
}
