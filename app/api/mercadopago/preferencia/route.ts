import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { items, pagador, external_reference, back_urls } = await req.json()

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado' }, { status: 500 })
    }

    // Derivar origen para la URL del webhook
    const origin = new URL(back_urls.success).origin

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items,
        payer: {
          name: pagador.name,
          email: pagador.email,
        },
        external_reference,
        back_urls,
        auto_return: 'approved',
        notification_url: `${origin}/api/webhook-mp`,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Error MP preference:', JSON.stringify(err))
      return NextResponse.json({ 
        error: 'Error al crear preferencia en MercadoPago',
        mp_error: err,
        mp_status: res.status,
      }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id,
    })
  } catch (e) {
    console.error('Error en preferencia MP:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
