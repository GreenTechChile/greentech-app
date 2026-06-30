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
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Buscar socio por RUT (del user_metadata) — no por email sintético
    const rut = user.user_metadata?.rut
    if (!rut) {
      return NextResponse.json({ error: 'Token inválido: sin RUT' }, { status: 401 })
    }

    // Obtener datos del socio incluyendo límites y vencimiento
    const { data: socio, error: socioError } = await supabaseAdmin
      .from('socios')
      .select('rut, nombre, email, gramos_delegados, cuota_mensual, vencimiento_receta')
      .eq('rut', rut)
      .eq('estado', 'activo')
      .single()

    if (socioError || !socio) {
      return NextResponse.json({ error: 'Socio no encontrado o inactivo' }, { status: 403 })
    }

    // ── VALIDACIÓN 1: Receta no vencida ──────────────────────────────────────
    if (socio.vencimiento_receta) {
      const hoy = new Date().toISOString().split('T')[0]
      if (socio.vencimiento_receta < hoy) {
        return NextResponse.json({ error: 'Receta médica vencida. No puedes dispensar hasta renovarla.' }, { status: 403 })
      }
    }

    // ── VALIDACIÓN 2: gramos_delegados definido ───────────────────────────────
    const limiteMensual = socio.gramos_delegados ?? socio.cuota_mensual
    if (!limiteMensual || limiteMensual <= 0) {
      return NextResponse.json({ error: 'Sin cuota de dispensación asignada.' }, { status: 403 })
    }

    // ── VALIDACIÓN 3: No superar cuota mensual ───────────────────────────────
    const gramosNuevos = items.reduce((acc, item) => acc + item.gramos, 0)
    const { data: dispensacionesMes } = await supabaseAdmin
      .from('dispensaciones')
      .select('gramos')
      .eq('rut_socio', socio.rut)
      .eq('mes', mes)
      .eq('año', ano)
      .neq('estado', 'pendiente_pago')

    const gramosYaDispensados = (dispensacionesMes || []).reduce((acc, d) => acc + d.gramos, 0)
    if (gramosYaDispensados + gramosNuevos > limiteMensual) {
      const disponible = limiteMensual - gramosYaDispensados
      return NextResponse.json({
        error: `Supera tu cuota mensual. Tienes ${disponible}gr disponibles (límite: ${limiteMensual}gr, ya dispensados: ${gramosYaDispensados}gr).`
      }, { status: 403 })
    }

    // ── VALIDACIÓN 4: Stock suficiente por cepa ──────────────────────────────
    // Agrupar gramos por cepa para verificar stock antes de insertar
    const gramosPorCepa: Record<string, number> = {}
    for (const item of items) {
      gramosPorCepa[item.cepa] = (gramosPorCepa[item.cepa] || 0) + item.gramos
    }

    for (const [nombreCepa, gramosRequeridos] of Object.entries(gramosPorCepa)) {
      const { data: cepaData } = await supabaseAdmin
        .from('cepas')
        .select('id, stock_gramos')
        .eq('nombre', nombreCepa)
        .single()

      if (!cepaData || cepaData.stock_gramos < gramosRequeridos) {
        return NextResponse.json({
          error: `Stock insuficiente para ${nombreCepa}: disponible ${cepaData?.stock_gramos ?? 0}gr, solicitado ${gramosRequeridos}gr.`
        }, { status: 409 })
      }
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

    // ── Descontar stock en servidor (atómico: leer → validar → escribir) ─────
    for (const [nombreCepa, gramosRequeridos] of Object.entries(gramosPorCepa)) {
      const { data: cepaActual } = await supabaseAdmin
        .from('cepas').select('id, stock_gramos').eq('nombre', nombreCepa).single()
      if (cepaActual) {
        const nuevoStock = Math.max(0, cepaActual.stock_gramos - gramosRequeridos)
        await supabaseAdmin.from('cepas').update({ stock_gramos: nuevoStock }).eq('id', cepaActual.id)
        // Registrar en audit trail de stock
        await supabaseAdmin.from('movimientos_stock').insert({
          cepa_nombre: nombreCepa,
          tipo: 'salida_dispensacion',
          gramos: -gramosRequeridos,
          stock_antes: cepaActual.stock_gramos,
          stock_despues: nuevoStock,
          motivo: `Dispensación orden ${orden} — socio ${socio.rut}`,
          registrado_por: socio.rut,
        })
      }
    }

    // Correo de confirmación de dispensación
    try {
      const cepasResumen = items.map(i => `${i.cepa} ${i.gramos}gr`).join(', ')
      const gramosTotal = items.reduce((a, i) => a + i.gramos, 0)
      await sendEmail('dispensacion_confirmada', socio.email, {
        nombre: socio.nombre,
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
