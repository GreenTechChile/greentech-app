import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/mp-pago-exitoso?rut=xxx
// Devuelve nombre y email del pre-registro para continuar el formulario tras pago
export async function GET(req: NextRequest) {
  const rut = req.nextUrl.searchParams.get('rut')
  if (!rut) {
    return NextResponse.json({ error: 'RUT requerido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('pagos_incorporacion')
    .select('nombre, email, monto')
    .eq('rut', rut)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
