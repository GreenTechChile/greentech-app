// RUTA TEMPORAL — eliminar después de usar
// Acceder en browser: POST /api/regenerar-docs-daniel
// O simplemente GET para ejecutar
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { jsPDF } = await import('jspdf')

    const rut             = '13550645-1'
    const nombre          = 'Daniel Flavio Armijo Herrera'
    const email           = 'danielarmijo@gmail.com'
    const telefono        = '+56985380476'
    const direccion       = 'Los Talaveras 891'
    const comuna          = 'Ñuñoa'
    const ciudad          = 'Santiago'
    const estado_civil    = 'Casado/a'
    const profesion       = 'Ingeniero Agronomo'
    const diagnostico     = 'Insomnio Cronico'
    const medico_nombre   = 'Pilar Spika Salvatore'
    const medico_rut      = '28785488-9'
    const folio_receta    = '4463152'
    const cuota_mensual   = 15
    const gramos_delegados = 15
    const vencimiento_receta = '2027-01-16'
    const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    const domicilio = direccion

    const formatFecha = (d: string) => {
      const p = d.split('-')
      return p.length === 3 && p[0].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : d
    }

    const m = 20
    const w = 216 - m * 2
    const lh = 6
    const addText = (doc: InstanceType<typeof jsPDF>, text: string, x: number, y: number) => {
      const lines = doc.splitTextToSize(text, w)
      doc.text(lines, x, y)
      return y + lines.length * lh
    }

    // ── CONTRATO ──────────────────────────────────────────────────────────
    const docC = new jsPDF({ unit: 'mm', format: 'letter' })
    docC.setFont('helvetica', 'bold'); docC.setFontSize(13)
    docC.text('Contrato de Previsión y Delegación de Cultivo', 108, 25, { align: 'center' })
    docC.setFont('helvetica', 'normal'); docC.setFontSize(10)
    docC.text('Asociación de usuarios de plantas medicinales GreenTech', 108, 32, { align: 'center' })
    docC.setLineWidth(0.4); docC.line(m, 36, 216 - m, 36)

    let y = 46
    y = addText(docC, `Don/Doña ${nombre}, RUT: ${rut}, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".`, m, y); y += 4
    y = addText(docC, 'Por la presente declara:', m, y); y += 4
    const puntos = [
      '1. Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.',
      '2. Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).',
      '3. La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.',
      '4. Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.',
      '5. Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.',
      `6. Delegar la entrega de ${gramos_delegados} gr. de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.`,
    ]
    for (const p of puntos) { y = addText(docC, p, m, y); y += 3 }
    y += 8
    docC.text(`FECHA: ${fecha}`, m, y); y += 10
    docC.line(m, y, m + 80, y); y += 5
    docC.text(nombre, m, y); y += 5
    docC.text(`RUT: ${rut}`, m, y)
    docC.setFont('helvetica', 'italic'); docC.setFontSize(8); docC.setTextColor(150)
    docC.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y + 11)

    const pdfC = docC.output('arraybuffer')
    const { error: e1 } = await supabaseAdmin.storage.from('documentos')
      .upload(`${rut}/contrato.pdf`, pdfC, { contentType: 'application/pdf', upsert: true })
    if (e1) throw new Error(`contrato: ${e1.message}`)

    // ── DECLARACIÓN JURADA ────────────────────────────────────────────────
    const docD = new jsPDF({ unit: 'mm', format: 'letter' })
    docD.setFont('helvetica', 'bold'); docD.setFontSize(13)
    docD.text('Declaración Jurada Especial de Ingreso', 108, 25, { align: 'center' })
    docD.setFont('helvetica', 'normal'); docD.setFontSize(10)
    docD.text('Asociación GreenTech', 108, 32, { align: 'center' })
    docD.setLineWidth(0.4); docD.line(m, 36, 216 - m, 36)

    let y2 = 46
    const parrafos = [
      `Yo, ${nombre}, cédula nacional de identidad ${rut}, estado civil ${estado_civil}, de profesión u oficio ${profesion}, con domicilio en ${domicilio}, comuna de ${comuna}, ciudad de ${ciudad}, correo electrónico ${email}, teléfono móvil ${telefono},`,
      `diagnosticado/a con ${diagnostico}, por este acto y por el presente instrumento, VENGO EN DECLARAR QUE:`,
      `PRIMERO: Debido a mi patología, y con el afán de mejorar mi calidad de vida, declaro ser usuario Medicinal de Cannabis. Además, señalo que cuento con receta médica, determinada con el número ${folio_receta}, que justifica mi uso de tipo medicinal hasta la cantidad de ${cuota_mensual} gramos mensuales, según lo prescrito en la receta médica que justifica el tratamiento. La presente receta se encuentra vigente hasta la fecha de ${formatFecha(vencimiento_receta)}, la cual ha sido extendida por el(la) doctor(a) ${medico_nombre}, documento de identidad número ${medico_rut}.`,
      'SEGUNDO: TENIENDO PLENO CONOCIMIENTO del fallo Rol de Ingreso N° 4949-2015 pronunciado con fecha 04 de junio del año 2015 por nuestra Excelentísima Corte Suprema de Justicia y, sobre todo lo relativo a la modificación del artículo 8° de la ley 20.000, VENGO EN MANIFESTAR MI VOLUNTAD DE SER MIEMBRO ACTIVO DE LA ASOCIACIÓN DE USUARIOS DE PLANTAS MEDICINALES GREENTECH, con domicilio Monjitas 527 oficina 1207 comuna de Santiago, representada legalmente por PATRICIO OSVALDO VELOSO ALCOTA, cédula nacional de identidad N° 10836787-3.',
      'TERCERO: Vengo en hacer presente que, por motivos de seguridad, el acceso a nuestro Cultivo Colectivo Privado de Cannabis Medicinal se encuentra restringido solo a los miembros que el Directorio determine, razón por la cual AUTORIZO al Directorio de MI ASOCIACIÓN para que en mi nombre y representación, SIEMBRE, CULTIVE, COSECHE, GUARDE, CONSERVE, ANALICE, TRANSPORTE el Cannabis que está destinado para mi tratamiento médico.',
      `CUARTO: De acuerdo a la facultad entregada por la ley 20.000 en su artículo 8vo inciso 2do, pacto con esta asociación mi cuota sobre la Provisión para uso de cannabis medicinal mensual por la cantidad de ${gramos_delegados} gramos mensuales.`,
      'QUINTO: Vengo en hacer presente que, además, AUTORIZO al Directorio de MI ASOCIACIÓN para que, de ser necesario, pueda utilizar los residuos de mi Cannabis Medicinal y pueda realizar todo tipo de productos y subproductos de carácter medicinal. EN NINGÚN CASO SE AUTORIZA LA COMERCIALIZACIÓN DE LA SUSTANCIA.',
      `SEXTO: FACULTO expresamente al Directorio de LA ASOCIACIÓN para que, en caso de ser necesario, ejerza todas las acciones legales que sean pertinentes en beneficio de nuestra comunidad y que me notifiquen cualquier resolución o información al correo electrónico ${email}.`,
      `SÉPTIMO: En ${ciudad}, a ${fecha}.`,
      `OCTAVO: DECLARO que la receta médica con folio número ${folio_receta}, extendida por el/la Dr./Dra. ${medico_nombre}, RUT ${medico_rut}, con vigencia hasta el ${formatFecha(vencimiento_receta)}, ha sido entregada en custodia a la Asociación GreenTech como único dispensador autorizado de mi tratamiento bajo dicha prescripción. En consecuencia, ME OBLIGO a no presentar ni utilizar la referida receta, ni copia de ella, en ningún otro establecimiento, farmacia, asociación o recinto de dispensación durante el período de vigencia del presente contrato. El incumplimiento de esta obligación constituirá una infracción grave a los estatutos de LA ASOCIACIÓN, causal de expulsión inmediata, y podrá configurar el delito de uso malicioso de instrumento privado contemplado en el artículo 197 del Código Penal de la República de Chile.`,
    ]
    for (const p of parrafos) {
      if (y2 > 250) { docD.addPage(); y2 = 20 }
      y2 = addText(docD, p, m, y2); y2 += 5
    }
    if (y2 > 240) { docD.addPage(); y2 = 20 }
    y2 += 5
    docD.line(m, y2, m + 80, y2); y2 += 5
    docD.text(nombre, m, y2); y2 += 5
    docD.text(`RUT: ${rut}`, m, y2)
    docD.setFont('helvetica', 'italic'); docD.setFontSize(8); docD.setTextColor(150)
    docD.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y2 + 8)

    const pdfD = docD.output('arraybuffer')
    const { error: e2 } = await supabaseAdmin.storage.from('documentos')
      .upload(`${rut}/declaracion_jurada.pdf`, pdfD, { contentType: 'application/pdf', upsert: true })
    if (e2) throw new Error(`declaracion: ${e2.message}`)

    return NextResponse.json({ ok: true, mensaje: 'Documentos regenerados con 15 gr — puedes eliminar esta ruta.' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
