import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

// Cliente con service role — bypasea RLS completamente
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, orden, mes, ano, access_token } = body as {
      items: { cepa: string; gramos: number; monto: number }[]
      orden: string
      mes: number
      ano: number
      access_token: string
    }

    if (!access_token) {
      return NextResponse.json({ error: 'Sin token de sesión' }, { status: 401 })
    }

    // Verificar la sesión del usuario con el token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(access_token)
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Obtener RUT del socio por email
    const { data: socio, error: socioError } = await supabaseAdmin
      .from('socios')
      .select('rut, nombre')
      .eq('email', user.email)
      .eq('estado', 'activo')
      .single()

    if (socioError || !socio) {
      return NextResponse.json({ error: 'Socio no encontrado o inactivo' }, { status: 403 })
    }

    // Insertar cada item del carrito con sufijo único en orden_numero
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      // Un ítem → sin sufijo. Varios → GT-2026-XXXXX-1, GT-2026-XXXXX-2, etc.
      const ordenNumero = items.length === 1 ? orden : `${orden}-${idx + 1}`
      const { error } = await supabaseAdmin.from('dispensaciones').insert({
        rut_socio: socio.rut,
        cepa:       item.cepa,
        gramos:     item.gramos,
        monto:      item.monto,
        orden_numero: ordenNumero,
        mes,
        año:        ano,
        medio_pago: 'BYPASS',
        estado:     'pagado',
      })
      if (error) {
        console.error('[api/dispensacion] insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Correo de confirmación de dispensación
    try {
      const cepasResumen = items.map(i => `${i.cepa} ${i.gramos}gr`).join(', ')
      const gramosTotal = items.reduce((a, i) => a + i.gramos, 0)
      await sendEmail('dispensacion_confirmada', user.email, {
        nombre: socio.nombre || user.email,
        cepa: cepasResumen,
        gramos: String(gramosTotal),
        orden,
      })
    } catch (emailErr) {
      console.error('[api/dispensacion] email error:', emailErr)
    }

    return NextResponse.json({ ok: true, rut_socio: socio.rut })
  } catch (e) {
    console.error('[api/dispensacion] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
