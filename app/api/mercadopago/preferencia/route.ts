import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, pagador, external_reference, back_urls } = body

    const payload = {
      items,
      payer: pagador,
      external_reference,
      back_urls: {
        success: back_urls?.success || `${process.env.NEXT_PUBLIC_BASE_URL}/inscripcion/pago-exitoso`,
        failure: back_urls?.failure || `${process.env.NEXT_PUBLIC_BASE_URL}/inscripcion/pago-fallido`,
        pending: back_urls?.pending || `${process.env.NEXT_PUBLIC_BASE_URL}/inscripcion/pago-pendiente`,
      },
      auto_return: 'approved',
      statement_descriptor: 'GreenTech Asociacion',
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
    }

    // LOG TEMPORAL para debug
    console.log('=== MP PAYLOAD ===', JSON.stringify(payload, null, 2))
    console.log('=== MP TOKEN (primeros 20 chars) ===', process.env.MERCADOPAGO_ACCESS_TOKEN?.slice(0, 20))

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    // LOG TEMPORAL respuesta MP
    console.log('=== MP RESPONSE STATUS ===', response.status)
    console.log('=== MP RESPONSE DATA ===', JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: 400 })
    }

    return NextResponse.json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    })
  } catch (e) {
    console.error('=== MP ERROR ===', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
