import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { amount, subject, transaction_id, return_url, cancel_url, payer_email } = await req.json()

    const apiKey = process.env.KHIPU_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'KHIPU_API_KEY no configurado' }, { status: 500 })
    }

    const res = await fetch('https://payment-api.khipu.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        amount,
        currency: 'CLP',
        subject,
        transaction_id,
        return_url,
        cancel_url,
        notify_url: `${new URL(return_url).origin}/api/webhook-khipu`,
        payer_email: payer_email || undefined,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[khipu] error creando pago:', JSON.stringify(err))
      return NextResponse.json({ error: 'Error al crear cobro en Khipu', khipu_error: err }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({
      payment_id: data.payment_id,
      payment_url: data.simplified_transfer_url || data.payment_url,
    })
  } catch (e) {
    console.error('[khipu] error interno:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
