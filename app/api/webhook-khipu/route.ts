import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { payment_id, payment_status, transaction_id, amount } = body

    console.log('[webhook-khipu] recibido:', { payment_id, payment_status, transaction_id })

    if (payment_status !== 'done') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // transaction_id tiene formato: "{rut}|{tipo}|{orden}" o "{orden}" directo
    const partes = (transaction_id || '').split('|')

    if (partes.length === 3 && partes[1] === 'aporte') {
      // ── Dispensación / solicitud ──
      const orden = partes[2]
      const rutSocio = partes[0]

      // Buscar dispensaciones en estado 'pendiente_pago' para esta orden
      const { data: items } = await supabase
        .from('dispensaciones')
        .select('*')
        .like('orden_numero', `${orden}%`)

      if (items && items.length > 0) {
        for (const item of items) {
          await supabase
            .from('dispensaciones')
            .update({ estado: 'pagado', medio_pago: 'Khipu' })
            .eq('id', item.id)
        }

        // Registrar ingreso en movimientos_financieros
        const mes = new Date().getMonth() + 1
        const año = new Date().getFullYear()
        const { data: socio } = await supabase
          .from('socios')
          .select('nombre')
          .eq('rut', rutSocio)
          .single()

        await supabase.from('movimientos_financieros').insert({
          tipo: 'ingreso',
          categoria: 'Dispensación',
          concepto: `Aporte ordinario — ${socio?.nombre || rutSocio} (Khipu #${payment_id})`,
          monto: amount,
          mes,
          año,
          registrado_por: 'sistema',
        })
      }

    } else if (partes.length === 3 && partes[1] === 'incorporacion') {
      // ── Incorporación ──
      const rut = partes[0]

      await supabase
        .from('pagos_incorporacion')
        .update({ estado: 'aprobado', medio_pago: 'Khipu', payment_id })
        .eq('rut', rut)
        .eq('estado', 'pendiente')

      const mes = new Date().getMonth() + 1
      const año = new Date().getFullYear()
      const { data: socio } = await supabase
        .from('socios')
        .select('nombre')
        .eq('rut', rut)
        .single()

      await supabase.from('movimientos_financieros').insert({
        tipo: 'ingreso',
        categoria: 'Incorporación',
        concepto: `Pago de incorporación — ${socio?.nombre || rut} (Khipu #${payment_id})`,
        monto: amount,
        mes,
        año,
        registrado_por: 'sistema',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook-khipu] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
