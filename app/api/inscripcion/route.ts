import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Convierte YYYY-MM-DD → DD-MM-YYYY
function formatFecha(d: string): string {
  if (!d) return ''
  const p = d.split('-')
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`
  return d
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      rut, nombre, email, telefono, direccion, casa_depto,
      comuna, ciudad, estado_civil, profesion, diagnostico,
      diagnostico_secundario, medico_nombre, medico_rut, folio_receta,
      cuota_mensual, gramos_delegados, vencimiento_receta, observaciones,
      fecha_nacimiento,
    } = body

    if (!rut || !nombre || !email) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Verificar que el RUT no esté ya registrado
    const { data: existing } = await supabaseAdmin
      .from('socios')
      .select('rut')
      .eq('rut', rut)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'El RUT ya está registrado en el sistema.' }, { status: 409 })
    }

    const { error: insertError } = await supabaseAdmin.from('socios').insert({
      rut,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      casa_depto: casa_depto?.trim() || null,
      comuna: comuna?.trim() || null,
      ciudad: ciudad?.trim() || null,
      estado_civil: estado_civil || null,
      profesion: profesion?.trim() || null,
      diagnostico: diagnostico?.trim() || null,
      diagnostico_secundario: diagnostico_secundario?.trim() || null,
      medico_nombre: medico_nombre?.trim() || null,
      medico_rut: medico_rut?.trim() || null,
      folio_receta: folio_receta?.trim() || null,
      cuota_mensual: parseInt(cuota_mensual) || null,
      gramos_delegados: parseInt(gramos_delegados) || null,
      vencimiento_receta: vencimiento_receta || null,
      observaciones: observaciones?.trim() || null,
      estado: 'pendiente',
      reglamento_aceptado_at: new Date().toISOString(),
      reglamento_ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim()
                  || req.headers.get('x-real-ip')
                  || 'desconocida',
    })

    if (insertError) {
      console.error('[api/inscripcion] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Generar PDFs server-side con supabaseAdmin (bypasea RLS, siempre funciona)
    try {
      const { jsPDF } = await import('jspdf')

      const fecha = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })
      const domicilio = [direccion, casa_depto].filter(Boolean).join(', ')
      const m = 20
      const w = 216 - m * 2
      const lh = 6

      const addWrappedText = (doc: InstanceType<typeof jsPDF>, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y)
        return y + (lines.length * lineHeight)
      }

      // ── CONTRATO DE PREVISIÓN Y DELEGACIÓN DE CULTIVO ──
      const docContrato = new jsPDF({ unit:'mm', format:'letter' })
      docContrato.setFont('helvetica','bold')
      docContrato.setFontSize(13)
      docContrato.text('Contrato de Previsión y Delegación de Cultivo', 108, 25, { align:'center' })
      docContrato.setFontSize(10)
      docContrato.setFont('helvetica','normal')
      docContrato.text('Asociación de usuarios de plantas medicinales GreenTech', 108, 32, { align:'center' })
      docContrato.setLineWidth(0.4)
      docContrato.line(m, 36, 216 - m, 36)

      let y = 46
      const parrafosContrato = [
        `Don/Doña ${nombre}, RUT: ${rut}, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".`,
        'Por la presente declara:',
      ]
      for (const p of parrafosContrato) { y = addWrappedText(docContrato, p, m, y, w, lh); y += 4 }

      const puntos = [
        '1. Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.',
        '2. Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).',
        '3. La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.',
        '4. Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.',
        '5. Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.',
        `6. Delegar la entrega de ${gramos_delegados} gr. de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.`,
      ]
      for (const p of puntos) { y = addWrappedText(docContrato, p, m, y, w, lh); y += 3 }

      y += 8
      docContrato.setFont('helvetica','normal')
      docContrato.text(`FECHA: ${fecha}`, m, y); y += 10
      docContrato.line(m, y, m + 80, y); y += 5
      docContrato.text(`${nombre}`, m, y); y += 5
      docContrato.text(`RUT: ${rut}`, m, y)
      docContrato.setFont('helvetica','italic')
      docContrato.setFontSize(8)
      docContrato.setTextColor(150)
      docContrato.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y + 11)
      docContrato.setTextColor(0)

      const pdfContrato = docContrato.output('arraybuffer')
      const { error: uploadContratoErr } = await supabaseAdmin.storage
        .from('documentos')
        .upload(`${rut}/contrato.pdf`, pdfContrato, { contentType:'application/pdf', upsert:true })
      if (uploadContratoErr) console.error('[api/inscripcion] contrato upload error:', uploadContratoErr)

      // ── DECLARACIÓN JURADA ESPECIAL DE INGRESO ──
      const docDeclaracion = new jsPDF({ unit:'mm', format:'letter' })
      docDeclaracion.setFont('helvetica','bold')
      docDeclaracion.setFontSize(13)
      docDeclaracion.text('Declaración Jurada Especial de Ingreso', 108, 25, { align:'center' })
      docDeclaracion.setFontSize(10)
      docDeclaracion.setFont('helvetica','normal')
      docDeclaracion.text('Asociación GreenTech', 108, 32, { align:'center' })
      docDeclaracion.setLineWidth(0.4)
      docDeclaracion.line(m, 36, 216 - m, 36)

      let y2 = 46
      const parrafosDeclaracion = [
        `Yo, ${nombre}, cédula nacional de identidad ${rut}, fecha de nacimiento ${formatFecha(fecha_nacimiento || '')}, estado civil ${estado_civil}, de profesión u oficio ${profesion}, con domicilio en ${domicilio}, comuna de ${comuna}, ciudad de ${ciudad}, correo electrónico ${email}, teléfono móvil ${telefono},`,
        `diagnosticado/a con ${diagnostico}, por este acto y por el presente instrumento, VENGO EN DECLARAR QUE:`,
        `PRIMERO: Debido a mi patología, y con el afán de mejorar mi calidad de vida, declaro ser usuario Medicinal de Cannabis. Además, señalo que cuento con receta médica, determinada con el número ${folio_receta}, que justifica mi uso de tipo medicinal hasta la cantidad de ${cuota_mensual} gramos mensuales, según lo prescrito en la receta médica que justifica el tratamiento. La presente receta se encuentra vigente hasta la fecha de ${formatFecha(vencimiento_receta || '')}, la cual ha sido extendida por el(la) doctor(a) ${medico_nombre}, documento de identidad número ${medico_rut}.`,
        'SEGUNDO: TENIENDO PLENO CONOCIMIENTO del fallo Rol de Ingreso N° 4949-2015 pronunciado con fecha 04 de junio del año 2015 por nuestra Excelentísima Corte Suprema de Justicia y, sobre todo lo relativo a la modificación del artículo 8° de la ley 20.000, VENGO EN MANIFESTAR MI VOLUNTAD DE SER MIEMBRO ACTIVO DE LA ASOCIACIÓN DE USUARIOS DE PLANTAS MEDICINALES GREENTECH, con domicilio Monjitas 527 oficina 1207 comuna de Santiago, representada legalmente por PATRICIO OSVALDO VELOSO ALCOTA, cédula nacional de identidad N° 10836787-3.',
        'TERCERO: Vengo en hacer presente que, por motivos de seguridad, el acceso a nuestro Cultivo Colectivo Privado de Cannabis Medicinal se encuentra restringido solo a los miembros que el Directorio determine, razón por la cual AUTORIZO al Directorio de MI ASOCIACIÓN para que en mi nombre y representación, SIEMBRE, CULTIVE, COSECHE, GUARDE, CONSERVE, ANALICE, TRANSPORTE el Cannabis que está destinado para mi tratamiento médico.',
        `CUARTO: De acuerdo a la facultad entregada por la ley 20.000 en su artículo 8vo inciso 2do, pacto con esta asociación mi cuota sobre la Provisión para uso de cannabis medicinal mensual por la cantidad de ${gramos_delegados} gramos mensuales.`,
        'QUINTO: Vengo en hacer presente que, además, AUTORIZO al Directorio de MI ASOCIACIÓN para que, de ser necesario, pueda utilizar los residuos de mi Cannabis Medicinal y pueda realizar todo tipo de productos y subproductos de carácter medicinal. EN NINGÚN CASO SE AUTORIZA LA COMERCIALIZACIÓN DE LA SUSTANCIA.',
        `SEXTO: FACULTO expresamente al Directorio de LA ASOCIACIÓN para que, en caso de ser necesario, ejerza todas las acciones legales que sean pertinentes en beneficio de nuestra comunidad y que me notifiquen cualquier resolución o información al correo electrónico ${email}.`,
        `SÉPTIMO: En ${ciudad}, a ${fecha}.`,
        `OCTAVO: DECLARO que la receta médica con folio número ${folio_receta}, extendida por el/la Dr./Dra. ${medico_nombre}, RUT ${medico_rut}, con vigencia hasta el ${formatFecha(vencimiento_receta || '')}, ha sido entregada en custodia a la Asociación GreenTech como único dispensador autorizado de mi tratamiento bajo dicha prescripción. En consecuencia, ME OBLIGO a no presentar ni utilizar la referida receta, ni copia de ella, en ningún otro establecimiento, farmacia, asociación o recinto de dispensación durante el período de vigencia del presente contrato. El incumplimiento de esta obligación constituirá una infracción grave a los estatutos de LA ASOCIACIÓN, causal de expulsión inmediata, y podrá configurar el delito de uso malicioso de instrumento privado contemplado en el artículo 197 del Código Penal de la República de Chile.`,
      ]

      for (const p of parrafosDeclaracion) {
        if (y2 > 250) { docDeclaracion.addPage(); y2 = 20 }
        y2 = addWrappedText(docDeclaracion, p, m, y2, w, lh)
        y2 += 5
      }
      if (y2 > 240) { docDeclaracion.addPage(); y2 = 20 }
      y2 += 5
      docDeclaracion.line(m, y2, m + 80, y2); y2 += 5
      docDeclaracion.text(`${nombre}`, m, y2); y2 += 5
      docDeclaracion.text(`RUT: ${rut}`, m, y2)
      docDeclaracion.setFont('helvetica','italic')
      docDeclaracion.setFontSize(8)
      docDeclaracion.setTextColor(150)
      docDeclaracion.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y2 + 8)
      docDeclaracion.setTextColor(0)

      const pdfDeclaracion = docDeclaracion.output('arraybuffer')
      const { error: uploadDeclaracionErr } = await supabaseAdmin.storage
        .from('documentos')
        .upload(`${rut}/declaracion_jurada.pdf`, pdfDeclaracion, { contentType:'application/pdf', upsert:true })
      if (uploadDeclaracionErr) console.error('[api/inscripcion] declaracion upload error:', uploadDeclaracionErr)

    } catch (pdfErr) {
      console.error('[api/inscripcion] PDF generation error:', pdfErr)
      // No bloquear el flujo — el socio ya fue creado
    }

    // Enviar correo de confirmación
    try {
      await sendEmail('inscripcion_recibida', email.trim().toLowerCase(), {
        nombre: nombre.trim(),
        rut,
      })
    } catch (emailErr) {
      console.error('[api/inscripcion] email error:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/inscripcion] error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
