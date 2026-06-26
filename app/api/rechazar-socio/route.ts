import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Documentos que se archivan al rechazar
const DOCS_ARCHIVAR = [
  'cedula_anverso',
  'cedula_reverso',
  'receta_medica',
  'cert_antecedentes',
  'contrato_firmado',
  'declaracion_jurada_firmada',
]

export async function POST(req: NextRequest) {
  try {
    const { socioId, motivo, rechazadoPor } = await req.json()
    if (!socioId) return NextResponse.json({ error: 'Falta socioId' }, { status: 400 })

    // 1. Obtener datos actuales del socio
    const { data: socio, error: fetchError } = await supabaseAdmin
      .from('socios')
      .select('*')
      .eq('id', socioId)
      .single()

    if (fetchError || !socio) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
    }

    // 2. Calcular número de intento (cuántos rechazos previos + 1)
    const { count } = await supabaseAdmin
      .from('historial_postulaciones')
      .select('*', { count: 'exact', head: true })
      .eq('rut', socio.rut)

    const intentoNumero = (count || 0) + 1

    // 3. Archivar documentos: copiar de {rut}/doc.pdf → {rut}/historial/intento_{n}/doc.pdf
    const documentosPaths: Record<string, string> = {}

    await Promise.all(
      DOCS_ARCHIVAR.map(async (docKey) => {
        // Buscar el archivo (puede tener extensión .pdf, .jpg, .jpeg, .png, .webp)
        const { data: archivos } = await supabaseAdmin.storage
          .from('documentos')
          .list(socio.rut, { search: docKey })

        if (!archivos || archivos.length === 0) return

        const archivo = archivos[0]
        const origen = `${socio.rut}/${archivo.name}`
        const destino = `${socio.rut}/historial/intento_${intentoNumero}/${archivo.name}`

        const { error: copyError } = await supabaseAdmin.storage
          .from('documentos')
          .copy(origen, destino)

        if (!copyError) {
          documentosPaths[docKey] = destino
        }
      })
    )

    // 4. Guardar snapshot en historial_postulaciones
    const snapshot = {
      nombre: socio.nombre,
      email: socio.email,
      telefono: socio.telefono,
      direccion: socio.direccion,
      casa_depto: socio.casa_depto,
      comuna: socio.comuna,
      ciudad: socio.ciudad,
      estado_civil: socio.estado_civil,
      profesion: socio.profesion,
      diagnostico: socio.diagnostico,
      diagnostico_secundario: socio.diagnostico_secundario,
      medico_nombre: socio.medico_nombre,
      medico_rut: socio.medico_rut,
      folio_receta: socio.folio_receta,
      cuota_mensual: socio.cuota_mensual,
      vencimiento_receta: socio.vencimiento_receta,
      created_at: socio.created_at,
    }

    await supabaseAdmin.from('historial_postulaciones').insert({
      socio_id: socioId,
      rut: socio.rut,
      intento_numero: intentoNumero,
      datos_snapshot: snapshot,
      documentos_paths: documentosPaths,
      motivo_rechazo: motivo || null,
      rechazado_por: rechazadoPor || null,
    })

    // 5. Actualizar socio: rechazado + incrementar contador
    await supabaseAdmin.from('socios').update({
      estado: 'rechazado',
      notas_admin: motivo || null,
      aprobado_por: rechazadoPor || null,
      aprobado_at: new Date().toISOString(),
      numero_intentos: intentoNumero,
    }).eq('id', socioId)

    // 6. Audit log
    await supabaseAdmin.from('audit_log').insert({
      accion: 'rechazar_socio',
      entidad: 'socio',
      entidad_id: socioId,
      realizado_por: rechazadoPor || 'Admin',
      detalles: { socio_nombre: socio.nombre, rut: socio.rut, motivo, intento_numero: intentoNumero },
    })

    // 7. Email al socio
    try {
      await sendEmail('rechazo_solicitud', socio.email, {
        nombre: socio.nombre,
        motivo: motivo || 'No se especificó motivo.',
      })
    } catch (emailErr) {
      console.error('[rechazar-socio] email error:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[rechazar-socio] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
