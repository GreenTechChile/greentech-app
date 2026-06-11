import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, pagador, external_reference, back_urls } = body

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items,
        payer: pagador,
        external_reference,
        back_urls: {
          success: back_urls?.success || `${process.env.NEXT_PUBLIC_BASE_URL}/socio/dispensacion?pago=success`,
          failure: back_urls?.failure || `${process.env.NEXT_PUBLIC_BASE_URL}/socio/dispensacion?pago=failure`,
          pending: back_urls?.pending || `${process.env.NEXT_PUBLIC_BASE_URL}/socio/dispensacion?pago=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'GreenTech Asociacion',
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: 400 })
    }

    return NextResponse.json({
      id: data.id,
      init_point: data.init_point,         // producción
      sandbox_init_point: data.sandbox_init_point, // pruebas
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
