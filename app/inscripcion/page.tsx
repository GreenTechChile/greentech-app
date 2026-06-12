'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FormData {
  nombre: string; rut: string; fecha_nacimiento: string; estado_civil: string
  profesion: string; telefono: string; email: string; direccion: string
  casa_depto: string; comuna: string; ciudad: string; diagnostico: string
  diagnostico_secundario: string; medico_nombre: string; medico_rut: string
  folio_receta: string; cuota_mensual: string; gramos_delegados: string
  vencimiento_receta: string; observaciones: string
}

const initialForm: FormData = {
  nombre:'',rut:'',fecha_nacimiento:'',estado_civil:'',profesion:'',telefono:'',
  email:'',direccion:'',casa_depto:'',comuna:'',ciudad:'',diagnostico:'',
  diagnostico_secundario:'',medico_nombre:'',medico_rut:'',folio_receta:'',
  cuota_mensual:'',gramos_delegados:'',vencimiento_receta:'',observaciones:'',
}

// Validación RUT chileno
const validarRut = (rut: string): boolean => {
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (rutLimpio.length < 2) return false
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = suma % 11
  const dvEsperado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto)
  return dv === dvEsperado
}

// Validar email
const validarEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Formatear RUT automáticamente
const formatearRut = (valor: string): string => {
  const limpio = valor.replace(/\./g, '').replace(/-/g, '').replace(/[^0-9kK]/g, '')
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1).toUpperCase()
  return `${cuerpo}-${dv}`
}

export default function Inscripcion() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([])
  const [comunasDisponibles, setComunasDisponibles] = useState<string[]>([])
  const [reglamentoLeido, setReglamentoLeido] = useState(false)
  const [reglamentoAceptado, setReglamentoAceptado] = useState(false)
  const [contratoLeido, setContratoLeido] = useState(false)
  const [contratoAceptado, setContratoAceptado] = useState(false)
  const [declaracionLeida, setDeclaracionLeida] = useState(false)
  const [declaracionAceptada, setDeclaracionAceptada] = useState(false)
  const [archivos, setArchivos] = useState<{cedula_anverso:File|null,cedula_reverso:File|null,receta:File|null,antecedentes:File|null}>({cedula_anverso:null,cedula_reverso:null,receta:null,antecedentes:null})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mpLoading, setMpLoading] = useState(false)

  // 🚧 BYPASS TEMPORAL — cambiar a false para activar MP en producción
  const BYPASS_PAGO = true

  const handlePagoMP = async () => {
    if (BYPASS_PAGO) {
      // ── MODO BYPASS: marcar pago como aprobado directamente ──
      setMpLoading(true)
      try {
        await supabase.from('pagos_incorporacion').upsert({
          rut: form.rut,
          mp_payment_id: 'BYPASS-' + Date.now(),
          monto: 25000,
          estado: 'aprobado',
          fecha: new Date().toISOString(),
        })
        await supabase.from('socios').update({ pago_incorporacion: true }).eq('rut', form.rut)
        setPaso(7)
      } catch {
        setError('Error al registrar el pago.')
      } finally {
        setMpLoading(false)
      }
      return
    }

    // ── MODO PRODUCCIÓN: flujo real MercadoPago ──
    setMpLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mercadopago/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: 'incorporacion-greentech',
            title: 'Incorporación como socio GreenTech',
            quantity: 1,
            unit_price: 25000,
            currency_id: 'CLP',
          }],
          pagador: { name: form.nombre, email: form.email },
          external_reference: form.rut,
          back_urls: {
            success: `${window.location.origin}/inscripcion/pago-exitoso`,
            failure: `${window.location.origin}/inscripcion/pago-fallido`,
            pending: `${window.location.origin}/inscripcion/pago-pendiente`,
          },
        }),
      })
      const data = await res.json()
      const url = data.init_point
      if (url) {
        window.location.href = url
      } else {
        setError('No se pudo iniciar el pago. Intenta nuevamente.')
      }
    } catch {
      setError('Error al conectar con Mercado Pago.')
    } finally {
      setMpLoading(false)
    }
  }

  const [rutValido, setRutValido] = useState<boolean|null>(null)
  const [rutMedicoValido, setRutMedicoValido] = useState<boolean|null>(null)
  const update = (field: keyof FormData, value: string) => setForm(prev => ({...prev,[field]:value}))
  const pasos = ['Datos personales','Domicilio','Info médica','Documentos','Reglamento','Pago','Contrato','Declaración','Envío']

  // Cargar ciudades con cobertura activa
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('cobertura').select('ciudad').eq('activa', true).order('ciudad')
      if (data) {
        const ciudades = [...new Set(data.map((c: {ciudad:string}) => c.ciudad))]
        setCiudadesDisponibles(ciudades)
      }
    }
    cargar()
  }, [])

  // Cargar comunas al cambiar ciudad
  const cargarComunas = async (ciudad: string) => {
    const { data } = await supabase.from('cobertura').select('comuna').eq('ciudad', ciudad).eq('activa', true).order('comuna')
    if (data) setComunasDisponibles(data.map((c:{comuna:string}) => c.comuna))
  }

  const gramosEnDomicilio = form.cuota_mensual && form.gramos_delegados
    ? Math.max(0, parseInt(form.cuota_mensual) - parseInt(form.gramos_delegados)) : 0

  const handleSubmit = async () => {
    if (!reglamentoAceptado) { setError('Debes aceptar el reglamento interno.'); return }
    setLoading(true); setError('')
    try {
      const rut = form.rut.trim()
      const fecha = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })
      const domicilio = [form.direccion, form.casa_depto].filter(Boolean).join(', ')

      // 1. Insertar socio en la tabla
      const { error: insertError } = await supabase.from('socios').insert({
        rut, nombre: form.nombre.trim(), email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim(), direccion: form.direccion.trim(), casa_depto: form.casa_depto.trim(),
        comuna: form.comuna.trim(), ciudad: form.ciudad.trim(), estado_civil: form.estado_civil,
        profesion: form.profesion.trim(), diagnostico: form.diagnostico.trim(),
        diagnostico_secundario: form.diagnostico_secundario.trim(), medico_nombre: form.medico_nombre.trim(),
        medico_rut: form.medico_rut.trim(), folio_receta: form.folio_receta.trim(),
        cuota_mensual: parseInt(form.cuota_mensual), gramos_delegados: parseInt(form.gramos_delegados),
        vencimiento_receta: form.vencimiento_receta, estado: 'pendiente', rol: 'socio',
      })
      if (insertError) throw insertError

      // 2. Subir documentos físicos a Supabase Storage
      const uploads = [
        { file: archivos.cedula_anverso, nombre: 'cedula_anverso' },
        { file: archivos.cedula_reverso, nombre: 'cedula_reverso' },
        { file: archivos.receta, nombre: 'receta' },
        { file: archivos.antecedentes, nombre: 'antecedentes' },
      ]
      for (const { file, nombre } of uploads) {
        if (!file) continue
        const ext = file.name.split('.').pop()
        const path = `${rut}/${nombre}.${ext}`
        await supabase.storage.from('documentos').upload(path, file, { upsert: true })
      }

      // 3. Generar PDFs de contrato y declaración jurada con jsPDF
      const { jsPDF } = await import('jspdf')

      // Helper para texto con wrapping y retorno de Y final
      const addWrappedText = (doc: InstanceType<typeof jsPDF>, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y)
        return y + (lines.length * lineHeight)
      }

      // ── CONTRATO DE PREVISIÓN Y DELEGACIÓN DE CULTIVO ──
      const docContrato = new jsPDF({ unit:'mm', format:'letter' })
      const m = 20 // margen
      const w = 216 - m * 2 // ancho útil carta
      docContrato.setFont('helvetica','bold')
      docContrato.setFontSize(13)
      docContrato.text('Contrato de Previsión y Delegación de Cultivo', 108, 25, { align:'center' })
      docContrato.setFontSize(10)
      docContrato.setFont('helvetica','normal')
      docContrato.text('Asociación de usuarios de plantas medicinales GreenTech', 108, 32, { align:'center' })
      docContrato.setLineWidth(0.4)
      docContrato.line(m, 36, 216 - m, 36)

      let y = 46
      const lh = 6

      const parrafosContrato = [
        `Don/Doña ${form.nombre}, RUT: ${rut}, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".`,
        'Por la presente declara:',
      ]
      for (const p of parrafosContrato) {
        y = addWrappedText(docContrato, p, m, y, w, lh)
        y += 4
      }

      const puntos = [
        '1. Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.',
        '2. Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).',
        '3. La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.',
        '4. Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.',
        '5. Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.',
        `6. Delegar la entrega de ${form.gramos_delegados} gr. de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.`,
      ]
      for (const p of puntos) {
        y = addWrappedText(docContrato, p, m, y, w, lh)
        y += 3
      }

      y += 8
      docContrato.setFont('helvetica','normal')
      docContrato.text(`FECHA: ${fecha}`, m, y); y += 10
      docContrato.line(m, y, m + 80, y)
      y += 5
      docContrato.text(`${form.nombre}`, m, y); y += 5
      docContrato.text(`RUT: ${rut}`, m, y); y += 5
      docContrato.setFont('helvetica','italic')
      docContrato.setFontSize(8)
      docContrato.setTextColor(150)
      docContrato.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y + 6)
      docContrato.setTextColor(0)

      const pdfContrato = docContrato.output('arraybuffer')
      await supabase.storage.from('documentos').upload(`${rut}/contrato.pdf`, pdfContrato, { contentType:'application/pdf', upsert:true })

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
        `Yo, ${form.nombre}, cédula nacional de identidad ${rut}, fecha de nacimiento ${form.fecha_nacimiento}, estado civil ${form.estado_civil}, de profesión u oficio ${form.profesion}, con domicilio en ${domicilio}, comuna de ${form.comuna}, ciudad de ${form.ciudad}, correo electrónico ${form.email}, teléfono móvil ${form.telefono},`,
        `diagnosticado/a con ${form.diagnostico}, por este acto y por el presente instrumento, VENGO EN DECLARAR QUE:`,
        `PRIMERO: Debido a mi patología, y con el afán de mejorar mi calidad de vida, declaro ser usuario Medicinal de Cannabis. Además, señalo que cuento con receta médica, determinada con el número ${form.folio_receta}, que justifica mi uso de tipo medicinal hasta la cantidad de ${form.cuota_mensual} gramos mensuales, según lo prescrito en la receta médica que justifica el tratamiento. La presente receta se encuentra vigente hasta la fecha de ${form.vencimiento_receta}, la cual ha sido extendida por el(la) doctor(a) ${form.medico_nombre}, documento de identidad número ${form.medico_rut}.`,
        'SEGUNDO: TENIENDO PLENO CONOCIMIENTO del fallo Rol de Ingreso N° 4949-2015 pronunciado con fecha 04 de junio del año 2015 por nuestra Excelentísima Corte Suprema de Justicia y, sobre todo lo relativo a la modificación del artículo 8° de la ley 20.000, VENGO EN MANIFESTAR MI VOLUNTAD DE SER MIEMBRO ACTIVO DE LA ASOCIACIÓN DE USUARIOS DE PLANTAS MEDICINALES GREENTECH, con domicilio Monjitas 527 oficina 1207 comuna de Santiago, representada legalmente por PATRICIO OSVALDO VELOSO ALCOTA, cédula nacional de identidad N° 10836787-3.',
        'TERCERO: Vengo en hacer presente que, por motivos de seguridad, el acceso a nuestro Cultivo Colectivo Privado de Cannabis Medicinal se encuentra restringido solo a los miembros que el Directorio determine, razón por la cual AUTORIZO al Directorio de MI ASOCIACIÓN para que en mi nombre y representación, SIEMBRE, CULTIVE, COSECHE, GUARDE, CONSERVE, ANALICE, TRANSPORTE el Cannabis que está destinado para mi tratamiento médico.',
        `CUARTO: De acuerdo a la facultad entregada por la ley 20.000 en su artículo 8vo inciso 2do, pacto con esta asociación mi cuota sobre la Provisión para uso de cannabis medicinal mensual por la cantidad de ${form.gramos_delegados} gramos mensuales.`,
        'QUINTO: Vengo en hacer presente que, además, AUTORIZO al Directorio de MI ASOCIACIÓN para que, de ser necesario, pueda utilizar los residuos de mi Cannabis Medicinal y pueda realizar todo tipo de productos y subproductos de carácter medicinal. EN NINGÚN CASO SE AUTORIZA LA COMERCIALIZACIÓN DE LA SUSTANCIA.',
        `SEXTO: FACULTO expresamente al Directorio de LA ASOCIACIÓN para que, en caso de ser necesario, ejerza todas las acciones legales que sean pertinentes en beneficio de nuestra comunidad y que me notifiquen cualquier resolución o información al correo electrónico ${form.email}.`,
        `SÉPTIMO: En ${form.ciudad}, a ${fecha}.`,
      ]

      for (const p of parrafosDeclaracion) {
        if (y2 > 250) { docDeclaracion.addPage(); y2 = 20 }
        y2 = addWrappedText(docDeclaracion, p, m, y2, w, lh)
        y2 += 5
      }

      if (y2 > 240) { docDeclaracion.addPage(); y2 = 20 }
      y2 += 5
      docDeclaracion.line(m, y2, m + 80, y2); y2 += 5
      docDeclaracion.text(`${form.nombre}`, m, y2); y2 += 5
      docDeclaracion.text(`RUT: ${rut}`, m, y2); y2 += 8
      docDeclaracion.setFont('helvetica','italic')
      docDeclaracion.setFontSize(8)
      docDeclaracion.setTextColor(150)
      docDeclaracion.text('Documento firmado electrónicamente — pendiente de firma avanzada (Ley 19.799)', m, y2)
      docDeclaracion.setTextColor(0)

      const pdfDeclaracion = docDeclaracion.output('arraybuffer')
      await supabase.storage.from('documentos').upload(`${rut}/declaracion_jurada.pdf`, pdfDeclaracion, { contentType:'application/pdf', upsert:true })

      setPaso(10)
    } catch (e: unknown) {
      setError('Error al enviar: ' + (e instanceof Error ? e.message : 'Error desconocido'))
    } finally { setLoading(false) }
  }

  const s = {
    input: {width:'100%',padding:'9px 11px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box' as const},
    label: {fontSize:12,color:'#6b7280',display:'block',marginBottom:4},
    req: {color:'#A32D2D'},
    field: {display:'flex',flexDirection:'column' as const,gap:4},
    hint: {fontSize:11,color:'#9ca3af',marginTop:2},
    grid2: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
    btnPrimary: {background:'#3B6D11',color:'#EAF3DE',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:'pointer'},
    btnOutline: {background:'transparent',color:'#111',border:'1px solid #d1d5db',borderRadius:8,padding:'9px 20px',fontSize:13,cursor:'pointer'},
  }

  return (
    <div style={{fontFamily:'system-ui, sans-serif',minHeight:'100vh',background:'#f9fafb'}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 32px',borderBottom:'1px solid #e5e7eb',background:'#fff'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'#111'}}>
          <div style={{width:32,height:32,background:'#EAF3DE',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>🌿</div>
          <span style={{fontSize:15,fontWeight:600}}>GreenTech</span>
        </Link>
        <Link href="/" style={{fontSize:13,color:'#6b7280',textDecoration:'none'}}>← Volver al inicio</Link>
      </nav>

      <div style={{maxWidth:700,margin:'32px auto',padding:'0 24px'}}>
        <h1 style={{fontSize:22,fontWeight:600,marginBottom:6}}>Solicitud de incorporación como socio</h1>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:28}}>Completa el formulario. La directiva revisará tu solicitud en un plazo máximo de 5 días hábiles.</p>

        {paso <= 9 && (
          <div style={{display:'flex',marginBottom:28}}>
            {pasos.map((p,i) => {
              const n=i+1; const done=paso>n; const active=paso===n
              return <div key={p} style={{flex:1,textAlign:'center',padding:'7px 4px',fontSize:11,borderBottom:`2px solid ${done?'#639922':active?'#3B6D11':'#e5e7eb'}`,color:done?'#639922':active?'#3B6D11':'#9ca3af',fontWeight:active?600:400}}>{done?'✓ ':''}{p}</div>
            })}
          </div>
        )}

        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:28}}>

          {/* PASO 1 — Datos personales */}
          {paso===1 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>👤 Datos personales</h2>
              <div style={{...s.grid2,marginBottom:12}}>
                <div style={s.field}><label style={s.label}>Nombre completo <span style={s.req}>*</span></label><input style={s.input} value={form.nombre} onChange={e=>update('nombre',e.target.value)} placeholder="Nombre completo"/></div>
                <div style={s.field}>
                  <label style={s.label}>RUT (sin puntos, con guión) <span style={s.req}>*</span></label>
                  <input style={{...s.input, borderColor: rutValido === false ? '#A32D2D' : rutValido === true ? '#3B6D11' : '#d1d5db'}}
                    value={form.rut}
                    onChange={e => {
                      const formateado = formatearRut(e.target.value)
                      update('rut', formateado)
                      if (formateado.includes('-') && formateado.length >= 3) {
                        setRutValido(validarRut(formateado))
                      } else {
                        setRutValido(null)
                      }
                    }}
                    placeholder="12345678-9"/>
                  {rutValido === false && <span style={{fontSize:11, color:'#A32D2D'}}>⚠️ RUT inválido — verifica el dígito verificador</span>}
                  {rutValido === true && <span style={{fontSize:11, color:'#3B6D11'}}>✓ RUT válido</span>}
                </div>
                <div style={s.field}><label style={s.label}>Fecha de nacimiento <span style={s.req}>*</span></label><input style={s.input} type="date" value={form.fecha_nacimiento} onChange={e=>update('fecha_nacimiento',e.target.value)}/></div>
                <div style={s.field}><label style={s.label}>Estado civil <span style={s.req}>*</span></label>
                  <select style={s.input} value={form.estado_civil} onChange={e=>update('estado_civil',e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {['Soltero/a','Casado/a','Divorciado/a','Viudo/a','Conviviente civil'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={s.field}><label style={s.label}>Profesión u oficio <span style={s.req}>*</span></label><input style={s.input} value={form.profesion} onChange={e=>update('profesion',e.target.value)} placeholder="Profesión u oficio"/></div>
                <div style={s.field}><label style={s.label}>Teléfono móvil <span style={s.req}>*</span></label><input style={s.input} value={form.telefono} onChange={e=>update('telefono',e.target.value)} placeholder="+569XXXXXXXX"/></div>
                <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Correo electrónico <span style={s.req}>*</span></label><input style={s.input} type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="correo@ejemplo.com"/></div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.nombre||!form.rut||!form.estado_civil||!form.profesion||!form.telefono||!form.email){setError('Completa todos los campos obligatorios.');return}
                  if(!validarRut(form.rut)){setError('El RUT ingresado no es válido. Verifica el dígito verificador.');return}
                  if(!validarEmail(form.email)){setError('El correo electrónico no tiene un formato válido. Debe ser tipo correo@dominio.com');return}
                  setError('');setPaso(2)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 2 — Domicilio */}
          {paso===2 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:16}}>📍 Domicilio</h2>
              <div style={{background:'#E6F1FB',border:'1px solid #A8CBF0',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#185FA5',marginBottom:16}}>
                ℹ️ <strong>Cobertura de despacho:</strong> Solo se pueden registrar ciudades y comunas donde GreenTech tiene cobertura activa. Si tu ciudad no aparece en el listado, comunícate con la directiva.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={s.field}>
                  <label style={s.label}>Calle y número <span style={s.req}>*</span></label>
                  <input style={s.input} value={form.direccion} onChange={e=>update('direccion',e.target.value)} placeholder="Calle y número"/>
                  <span style={s.hint}>Solo la calle y número, sin casa ni departamento</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Casa / Departamento</label>
                  <input style={s.input} value={form.casa_depto} onChange={e=>update('casa_depto',e.target.value)} placeholder="Casa 55 o Dpto 302"/>
                  <span style={s.hint}>Opcional si aplica</span>
                </div>
                <div style={s.grid2}>
                  <div style={s.field}>
                    <label style={s.label}>Ciudad <span style={s.req}>*</span></label>
                    <select style={s.input} value={form.ciudad} onChange={e=>{
                      update('ciudad',e.target.value)
                      update('comuna','')
                      if(e.target.value) cargarComunas(e.target.value)
                    }}>
                      <option value="">Seleccionar ciudad...</option>
                      {ciudadesDisponibles.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    {ciudadesDisponibles.length===0 && <span style={s.hint}>Cargando ciudades...</span>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Comuna <span style={s.req}>*</span></label>
                    <select style={{...s.input,opacity:form.ciudad?1:0.5}} value={form.comuna} onChange={e=>update('comuna',e.target.value)} disabled={!form.ciudad}>
                      <option value="">{form.ciudad?'Seleccionar comuna...':'Primero selecciona la ciudad'}</option>
                      {comunasDisponibles.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    {!form.ciudad&&<span style={s.hint}>Selecciona primero la ciudad</span>}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(1)}>← Anterior</button>
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.direccion||!form.comuna||!form.ciudad){setError('Completa todos los campos obligatorios.');return}
                  setError('');setPaso(3)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 3 — Info médica */}
          {paso===3 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>🩺 Información médica y delegación al cultivo</h2>
              <div style={{...s.grid2,marginBottom:12}}>
                <div style={s.field}><label style={s.label}>Diagnóstico principal (CIE-11) <span style={s.req}>*</span></label><input style={s.input} value={form.diagnostico} onChange={e=>update('diagnostico',e.target.value)} placeholder="Diagnóstico principal"/></div>
                <div style={s.field}><label style={s.label}>Diagnóstico secundario</label><input style={s.input} value={form.diagnostico_secundario} onChange={e=>update('diagnostico_secundario',e.target.value)} placeholder="Diagnóstico secundario (opcional)"/></div>
                <div style={s.field}><label style={s.label}>Nombre del médico tratante <span style={s.req}>*</span></label><input style={s.input} value={form.medico_nombre} onChange={e=>update('medico_nombre',e.target.value)} placeholder="Nombre del médico tratante"/></div>
                <div style={s.field}>
                  <label style={s.label}>RUT del médico <span style={s.req}>*</span></label>
                  <input style={{...s.input, borderColor: rutMedicoValido === false ? '#A32D2D' : rutMedicoValido === true ? '#3B6D11' : '#d1d5db'}}
                    value={form.medico_rut}
                    onChange={e => {
                      const formateado = formatearRut(e.target.value)
                      update('medico_rut', formateado)
                      if (formateado.includes('-') && formateado.length >= 3) {
                        setRutMedicoValido(validarRut(formateado))
                      } else {
                        setRutMedicoValido(null)
                      }
                    }}
                    placeholder="12345678-9"/>
                  {rutMedicoValido === false && <span style={{fontSize:11, color:'#A32D2D'}}>⚠️ RUT inválido</span>}
                  {rutMedicoValido === true && <span style={{fontSize:11, color:'#3B6D11'}}>✓ RUT válido</span>}
                </div>
                <div style={s.field}><label style={s.label}>Folio receta médica <span style={s.req}>*</span></label><input style={s.input} value={form.folio_receta} onChange={e=>update('folio_receta',e.target.value)} placeholder="Número de folio"/></div>
                <div style={s.field}><label style={s.label}>Vencimiento de la receta <span style={s.req}>*</span></label><input style={s.input} type="date" value={form.vencimiento_receta} onChange={e=>update('vencimiento_receta',e.target.value)}/></div>
              </div>
              <div style={{border:'1px solid #97C459',borderRadius:12,padding:16,background:'#EAF3DE',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:'#3B6D11',marginBottom:12}}>🌱 Delegación al cultivo colectivo — límite mensual de dispensación</div>
                <div style={s.grid2}>
                  <div style={s.field}>
                    <label style={{...s.label,color:'#3B6D11'}}>Gramos autorizados en receta (máximo) <span style={s.req}>*</span></label>
                    <input style={{...s.input,borderColor:'#97C459'}} type="number" min="1" value={form.cuota_mensual} onChange={e=>update('cuota_mensual',e.target.value)} placeholder="Ej: 30"/>
                    <span style={{...s.hint,color:'#3B6D11'}}>Cantidad máxima indicada por tu médico</span>
                  </div>
                  <div style={s.field}>
                    <label style={{...s.label,color:'#3B6D11'}}>Gramos que delegas a GreenTech (mensual) <span style={s.req}>*</span></label>
                    <input style={{...s.input,borderColor:'#97C459'}} type="number" min="1" max={parseInt(form.cuota_mensual)||999} value={form.gramos_delegados} onChange={e=>update('gramos_delegados',e.target.value)} placeholder="Ej: 30"/>
                    <span style={{...s.hint,color:'#3B6D11'}}>Este será tu límite máximo de dispensación mensual</span>
                  </div>
                </div>
                {gramosEnDomicilio>0&&<div style={{marginTop:10,fontSize:12,color:'#3B6D11',background:'#fff',borderRadius:8,padding:'8px 12px'}}>ℹ️ Cultivarás <strong>{gramosEnDomicilio} gr</strong> en domicilio</div>}
                <div style={{marginTop:10,background:'#FAEEDA',border:'1px solid #EF9F27',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#633806'}}>⚠️ El sistema bloqueará automáticamente cualquier dispensación que supere los gramos delegados.</div>
              </div>
              <div style={s.field}><label style={s.label}>Observaciones médicas</label><textarea style={{...s.input,height:70,resize:'none'}} value={form.observaciones} onChange={e=>update('observaciones',e.target.value)} placeholder="Observaciones relevantes (opcional)"/></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(2)}>← Anterior</button>
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.diagnostico||!form.medico_nombre||!form.medico_rut||!form.folio_receta||!form.cuota_mensual||!form.gramos_delegados||!form.vencimiento_receta){setError('Completa todos los campos obligatorios.');return}
                  if(parseInt(form.gramos_delegados)>parseInt(form.cuota_mensual)){setError('Los gramos delegados no pueden superar los autorizados en receta.');return}
                  setError('');setPaso(4)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 4 — Documentos */}
          {paso===4 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>📎 Documentos requeridos</h2>
              <div style={{border:'1px dashed #d1d5db',borderRadius:12,padding:20,textAlign:'center',background:'#f9fafb',marginBottom:16}}>
                <div style={{fontSize:28,marginBottom:8}}>☁️</div>
                <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Arrastra archivos aquí o selecciona</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>PDF, JPG, PNG · máx. 10 MB por archivo</div>
              </div>
              {[
                {key:'cedula_anverso',label:'Cédula de identidad — Anverso (frente)',req:true},
                {key:'cedula_reverso',label:'Cédula de identidad — Reverso (dorso)',req:true},
                {key:'receta',label:'Receta médica vigente',req:true},
                {key:'antecedentes',label:'Certificado de antecedentes penales',req:true},
              ].map(doc=>(
                <div key={doc.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:archivos[doc.key as keyof typeof archivos]?'#EAF3DE':'#fff',border:`1px solid ${archivos[doc.key as keyof typeof archivos]?'#97C459':'#e5e7eb'}`,borderRadius:10,marginBottom:8}}>
                  <span style={{fontSize:16}}>{archivos[doc.key as keyof typeof archivos]?'✅':'📄'}</span>
                  <span style={{flex:1,fontSize:13}}>{doc.label}</span>
                  <label style={{fontSize:11,padding:'4px 10px',border:'1px solid #3B6D11',borderRadius:8,color:'#3B6D11',cursor:'pointer'}}>
                    {archivos[doc.key as keyof typeof archivos]?'Cambiar':'Seleccionar'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])setArchivos(prev=>({...prev,[doc.key]:e.target.files![0]}))}}/>
                  </label>
                  {doc.req&&!archivos[doc.key as keyof typeof archivos]&&<span style={{fontSize:10,background:'#FCEBEB',color:'#A32D2D',padding:'2px 7px',borderRadius:20}}>Requerido</span>}
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(3)}>← Anterior</button>
                <button style={s.btnPrimary} onClick={()=>{setError('');setPaso(5)}}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 5 — Reglamento */}
          {paso===5 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:6}}>📖 Reglamento Interno — Asociación GreenTech</h2>
              <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Debes leer y aceptar el reglamento antes de enviar tu solicitud.</p>
              <div style={{background:'#f9fafb',borderRadius:10,padding:12,marginBottom:12,fontSize:12,color:'#6b7280'}}>
                <div style={{fontWeight:600,marginBottom:8,color:'#111'}}>Contenido del reglamento</div>
                {['1. Introducción · Marco legal · Misión y visión','2. Estructura y funcionamiento · Ingreso de socios','3. Instancias de representación · Asamblea General','4. Derechos y deberes · De los socios · De la directiva','5. Vigencia, difusión y anexos'].map((item,i)=>(
                  <div key={i} style={{padding:'4px 0',borderBottom:i<4?'1px solid #e5e7eb':'none'}}>• {item}</div>
                ))}
              </div>
              <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:200,overflowY:'auto',padding:14,fontSize:12,lineHeight:1.7,color:'#374151',marginBottom:14}}
                onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setReglamentoLeido(true)}}>
                <strong>1. INTRODUCCIÓN — Marco legal</strong>
                <p style={{marginTop:6}}>El presente reglamento es el instrumento elaborado por la Corporación con objeto de establecer los derechos y deberes de los asociados. La corporación "Asociación de usuarios de plantas medicinales GreenTech" es una asociación de derecho privado sin fines de lucro que busca proveer de información, desarrollar la investigación y ejecución de tratamientos complementarios orientados a aliviar el sufrimiento humano.</p>
                <strong style={{display:'block',marginTop:12}}>1.2 Misión y visión</strong>
                <p style={{marginTop:6}}>La misión de GreenTech es crear, interpretar y difundir conocimiento, además de la realización de actividades que contribuyan con el bienestar físico, social y espiritual de sus miembros. Por medio de un cultivo cooperativo colectivo, la Corporación abastecerá con materia vegetal a un circuito cerrado de usuarios medicinales previamente inscritos y acreditados.</p>
                <strong style={{display:'block',marginTop:12}}>1.3 Principios generales</strong>
                <p style={{marginTop:6}}>Dignidad del ser humano · Compasión · Empatía · Libertad · No discriminación · Legalidad · Transparencia · Responsabilidad.</p>
                <strong style={{display:'block',marginTop:12}}>2. Ingreso de socios</strong>
                <p style={{marginTop:6}}>La admisión o rechazo se informará en un plazo máximo de 5 días hábiles. La edad mínima es de 18 años.</p>
                <strong style={{display:'block',marginTop:12}}>4. DERECHOS Y DEBERES</strong>
                <ul style={{marginTop:4,paddingLeft:20}}>
                  <li>Pagar las cuotas y aportaciones correspondientes.</li>
                  <li>Participar en las Asambleas Generales.</li>
                  <li>Contribuir a la mejora de la imagen social de los usuarios de cannabis.</li>
                  <li style={{fontWeight:600}}>No vender, transferir ni ceder los productos recibidos. El incumplimiento es causal de expulsión inmediata.</li>
                </ul>
                <p style={{marginTop:10,color:'#9ca3af',fontStyle:'italic'}}>— Fin del reglamento —</p>
              </div>
              {!reglamentoLeido&&<div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>}
              <button onClick={async () => {
                const { createClient } = await import('@supabase/supabase-js')
                const sb = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )
                const { data } = await sb.storage.from('documentos').createSignedUrl('corporacion/reglamento.pdf', 120)
                if (data?.signedUrl) {
                  const a = document.createElement('a')
                  a.href = data.signedUrl
                  a.download = 'Reglamento_Interno_GreenTech.pdf'
                  a.click()
                }
              }} style={{display:'flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid #3B6D11',borderRadius:8,padding:'7px 14px',fontSize:12,color:'#3B6D11',cursor:'pointer',marginBottom:14}}>
                📥 Descargar Reglamento Interno completo (PDF)
              </button>
              <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:reglamentoLeido?1:0.4}}>
                <input type="checkbox" id="acepta" checked={reglamentoAceptado} onChange={e=>reglamentoLeido&&setReglamentoAceptado(e.target.checked)} disabled={!reglamentoLeido} style={{width:16,height:16,marginTop:2,accentColor:'#3B6D11'}}/>
                <label htmlFor="acepta" style={{fontSize:12,lineHeight:1.6,cursor:reglamentoLeido?'pointer':'not-allowed'}}>
                  He leído y entendido en su totalidad el <strong>Reglamento Interno de la Asociación GreenTech</strong>. Me comprometo a cumplirlo desde el momento de mi incorporación. Entiendo que el incumplimiento puede derivar en <strong>suspensión o expulsión</strong>.
                </label>
              </div>
              {reglamentoAceptado&&<div style={{marginTop:8,background:'#EAF3DE',border:'1px solid #97C459',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#3B6D11'}}>✓ Aceptación registrada con fecha, hora e IP en tu expediente.</div>}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(4)}>← Anterior</button>
                <button style={{...s.btnPrimary,opacity:reglamentoAceptado?1:0.5,cursor:reglamentoAceptado?'pointer':'not-allowed'}} onClick={()=>reglamentoAceptado&&(setError(''),setPaso(6))}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 6 — Pago de incorporación */}
          {paso===6 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:6}}>💳 Pago de incorporación</h2>
              <p style={{fontSize:12,color:'#6b7280',marginBottom:20}}>Para continuar con la generación y firma de tus contratos, debes realizar el pago del proceso de incorporación.</p>

              {/* Banner Mercado Pago */}
              <div style={{background:'#f0f9ff',border:'1px solid #7dd3fc',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#0369a1',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
                🔵 <span><strong>Pago seguro con Mercado Pago</strong> — Acepta tarjetas de débito, crédito y transferencia bancaria.</span>
              </div>

              {/* Detalle del cobro */}
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflow:'hidden',marginBottom:20}}>
                <div style={{background:'#f9fafb',padding:'12px 16px',borderBottom:'1px solid #e5e7eb'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>Detalle del cobro</div>
                </div>
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'7px 0',borderBottom:'1px solid #f3f4f6'}}>
                    <span style={{color:'#374151'}}>Proceso de incorporación como socio GreenTech</span>
                    <span style={{fontWeight:500}}>$25.000</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,padding:'10px 0 4px',marginTop:4,borderTop:'2px solid #e5e7eb'}}>
                    <span>Total a pagar</span>
                    <span style={{color:'#3B6D11'}}>$25.000</span>
                  </div>
                </div>
              </div>

              {/* Info del proceso */}
              <div style={{background:'#EAF3DE',border:'1px solid #97C459',borderRadius:10,padding:'12px 14px',fontSize:12,color:'#3B6D11',marginBottom:24,lineHeight:1.7}}>
                <strong>¿Qué incluye este pago?</strong><br/>
                ✓ Revisión de tu solicitud por la directiva<br/>
                ✓ Generación de contratos personalizados con tus datos<br/>
                ✓ Firma electrónica avanzada (Ley 19.799)<br/>
                ✓ Alta en el sistema GreenTech
              </div>

              {error && <div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginBottom:14}}>⚠️ {error}</div>}

              <button onClick={handlePagoMP} disabled={mpLoading}
                style={{width:'100%',padding:'14px',border:'none',borderRadius:12,background:mpLoading?'#9ca3af':'#009ee3',color:'#fff',fontSize:15,fontWeight:700,cursor:mpLoading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:10}}>
                {mpLoading ? '⏳ Redirigiendo a Mercado Pago...' : '💳 Pagar $25.000 con Mercado Pago →'}
              </button>
              <div style={{textAlign:'center',fontSize:11,color:'#9ca3af',marginBottom:16}}>
                🔒 Pago seguro · Mercado Pago · SSL
              </div>
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <button style={s.btnOutline} onClick={()=>setPaso(5)}>← Anterior</button>
              </div>
            </div>
          )}

          {/* PASO 7 — Contrato de Previsión y Delegación de Cultivo */}
          {paso===7 && (() => {
            const fecha = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})
            const domicilio = [form.direccion, form.casa_depto, form.comuna, form.ciudad].filter(Boolean).join(', ')
            return (
              <div>
                <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>📄 Contrato de Previsión y Delegación de Cultivo</h2>
                <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Lee el contrato con tus datos pre-completados y acéptalo al final.</p>

                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:340,overflowY:'auto',padding:16,fontSize:12,lineHeight:1.8,color:'#374151',marginBottom:14,background:'#fafafa'}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setContratoLeido(true)}}>
                  <div style={{textAlign:'center',marginBottom:16}}>
                    <strong style={{fontSize:13}}>Contrato de Previsión y Delegación de Cultivo</strong><br/>
                    <span style={{color:'#6b7280'}}>Asociación de usuarios de plantas medicinales GreenTech.</span>
                  </div>
                  <p>Don/Doña <strong>{form.nombre||'_______________'}</strong>, RUT: <strong>{form.rut||'_______________'}</strong>, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".</p>
                  <p style={{marginTop:10}}>Por la presente declara:</p>
                  <ul style={{marginTop:8,paddingLeft:20,display:'flex',flexDirection:'column',gap:8}}>
                    <li>Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.</li>
                    <li>Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).</li>
                    <li>La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.</li>
                    <li>Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.</li>
                    <li>Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.</li>
                    <li>Delegar la entrega de <strong>{form.gramos_delegados||'___'} gr.</strong> de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.</li>
                  </ul>
                  <p style={{marginTop:14,color:'#6b7280'}}>FECHA: {fecha}</p>
                  <div style={{marginTop:16,borderTop:'1px dashed #d1d5db',paddingTop:12,color:'#9ca3af',fontStyle:'italic',textAlign:'center'}}>
                    Firma electrónica avanzada de: {form.nombre||'_______________'} · RUT {form.rut||'_______________'}
                  </div>
                </div>

                {!contratoLeido && <div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:contratoLeido?1:0.4,marginBottom:8}}>
                  <input type="checkbox" id="acepta-contrato" checked={contratoAceptado} onChange={e=>contratoLeido&&setContratoAceptado(e.target.checked)} disabled={!contratoLeido} style={{width:16,height:16,marginTop:2,accentColor:'#3B6D11'}}/>
                  <label htmlFor="acepta-contrato" style={{fontSize:12,lineHeight:1.6,cursor:contratoLeido?'pointer':'not-allowed'}}>
                    He leído y acepto el <strong>Contrato de Previsión y Delegación de Cultivo</strong>. Entiendo que al completar el proceso recibiré este documento para firma electrónica avanzada.
                  </label>
                </div>
                {contratoAceptado && <div style={{marginTop:4,background:'#EAF3DE',border:'1px solid #97C459',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#3B6D11',marginBottom:8}}>✓ Aceptación registrada.</div>}

                <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                  <button style={s.btnOutline} onClick={()=>setPaso(6)}>← Anterior</button>
                  <button style={{...s.btnPrimary,opacity:contratoAceptado?1:0.5,cursor:contratoAceptado?'pointer':'not-allowed'}} onClick={()=>contratoAceptado&&(setError(''),setPaso(8))}>Siguiente →</button>
                </div>
              </div>
            )
          })()}

          {/* PASO 8 — Declaración Jurada Especial de Ingreso */}
          {paso===8 && (() => {
            const ciudad = form.ciudad || '_______________'
            const fecha = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})
            const domicilio = [form.direccion, form.casa_depto].filter(Boolean).join(', ')
            return (
              <div>
                <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>📄 Declaración Jurada Especial de Ingreso</h2>
                <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Lee la declaración con tus datos pre-completados y acéptala al final.</p>

                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:340,overflowY:'auto',padding:16,fontSize:11.5,lineHeight:1.8,color:'#374151',marginBottom:14,background:'#fafafa'}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setDeclaracionLeida(true)}}>
                  <div style={{textAlign:'center',marginBottom:16}}>
                    <strong style={{fontSize:13}}>DECLARACIÓN JURADA ESPECIAL DE INGRESO</strong><br/>
                    <span style={{color:'#6b7280'}}>ASOCIACIÓN GREENTECH</span>
                  </div>
                  <p>Yo, <strong>{form.nombre||'_______________'}</strong>, cédula nacional de identidad <strong>{form.rut||'_______________'}</strong>, fecha de nacimiento <strong>{form.fecha_nacimiento||'_______________'}</strong>, estado civil <strong>{form.estado_civil||'_______________'}</strong>, de profesión u oficio <strong>{form.profesion||'_______________'}</strong>, con domicilio en <strong>{domicilio||'_______________'}</strong>, comuna de <strong>{form.comuna||'_______________'}</strong>, ciudad de <strong>{form.ciudad||'_______________'}</strong>, correo electrónico <strong>{form.email||'_______________'}</strong>, teléfono móvil <strong>{form.telefono||'_______________'}</strong>,</p>
                  <p style={{marginTop:8}}>diagnosticado/a con <strong>{form.diagnostico||'_______________'}</strong>, por este acto y por el presente instrumento, <strong>VENGO EN DECLARAR QUE:</strong></p>

                  <p style={{marginTop:10}}><strong>PRIMERO:</strong> Debido a mi patología, y con el afán de mejorar mi calidad de vida, <strong>declaro ser usuario Medicinal de Cannabis</strong>. Además, señalo que cuento con receta médica, determinada con el número <strong>{form.folio_receta||'_______________'}</strong>, que justifica mi uso de tipo medicinal hasta la cantidad de <strong>{form.cuota_mensual||'___'} gramos mensuales</strong>, según lo prescrito en la receta médica que justifica el tratamiento. La presente receta se encuentra vigente hasta la fecha de <strong>{form.vencimiento_receta||'_______________'}</strong>, la cual ha sido extendida por el(la) doctor(a) <strong>{form.medico_nombre||'_______________'}</strong>, documento de identidad número <strong>{form.medico_rut||'_______________'}</strong>.</p>

                  <p style={{marginTop:10}}><strong>SEGUNDO:</strong> TENIENDO PLENO CONOCIMIENTO del fallo Rol de Ingreso N° 4949-2015 pronunciado con fecha 04 de junio del año 2015 por nuestra Excelentísima Corte Suprema de Justicia y, sobre todo lo relativo a la modificación del artículo 8° de la ley 20.000, <strong>VENGO EN MANIFESTAR MI VOLUNTAD DE SER MIEMBRO ACTIVO DE LA ASOCIACIÓN DE USUARIOS DE PLANTAS MEDICINALES GREENTECH</strong>, con domicilio Monjitas 527 oficina 1207 comuna de Santiago, representada legalmente por PATRICIO OSVALDO VELOSO ALCOTA, cédula nacional de identidad N° 10836787-3.</p>

                  <p style={{marginTop:10}}><strong>TERCERO:</strong> Vengo en hacer presente que, por motivos de seguridad, el acceso a nuestro Cultivo Colectivo Privado de Cannabis Medicinal se encuentra restringido solo a los miembros que el Directorio determine, razón por la cual <strong>AUTORIZO</strong> al Directorio de MI ASOCIACIÓN para que en mi nombre y representación, <strong>SIEMBRE, CULTIVE, COSECHE, GUARDE, CONSERVE, ANALICE, TRANSPORTE</strong> el Cannabis que está destinado para mi tratamiento médico.</p>

                  <p style={{marginTop:10}}><strong>CUARTO:</strong> De acuerdo a la facultad entregada por la ley 20.000 en su artículo 8vo inciso 2do, pacto con esta asociación mi cuota sobre la Provisión para uso de cannabis medicinal mensual por la cantidad de <strong>{form.gramos_delegados||'___'} gramos mensuales</strong>.</p>

                  <p style={{marginTop:10}}><strong>QUINTO:</strong> Vengo en hacer presente que, además, <strong>AUTORIZO</strong> al Directorio de MI ASOCIACIÓN para que, de ser necesario, pueda utilizar los residuos de mi Cannabis Medicinal y pueda realizar todo tipo de productos y subproductos de carácter medicinal. EN NINGÚN CASO SE AUTORIZA LA COMERCIALIZACIÓN DE LA SUSTANCIA.</p>

                  <p style={{marginTop:10}}><strong>SEXTO:</strong> <strong>FACULTO</strong> expresamente al Directorio de LA ASOCIACIÓN para que, en caso de ser necesario, ejerza todas las acciones legales que sean pertinentes en beneficio de nuestra comunidad y que me notifiquen cualquier resolución o información al correo electrónico <strong>{form.email||'_______________'}</strong>.</p>

                  <p style={{marginTop:10}}><strong>SÉPTIMO:</strong> En <strong>{ciudad}</strong>, a <strong>{fecha}</strong>.</p>
                  <div style={{marginTop:16,borderTop:'1px dashed #d1d5db',paddingTop:12,color:'#9ca3af',fontStyle:'italic',textAlign:'center'}}>
                    Firma electrónica avanzada de: {form.nombre||'_______________'} · RUT {form.rut||'_______________'}
                  </div>
                </div>

                {!declaracionLeida && <div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:declaracionLeida?1:0.4,marginBottom:8}}>
                  <input type="checkbox" id="acepta-declaracion" checked={declaracionAceptada} onChange={e=>declaracionLeida&&setDeclaracionAceptada(e.target.checked)} disabled={!declaracionLeida} style={{width:16,height:16,marginTop:2,accentColor:'#3B6D11'}}/>
                  <label htmlFor="acepta-declaracion" style={{fontSize:12,lineHeight:1.6,cursor:declaracionLeida?'pointer':'not-allowed'}}>
                    He leído y acepto la <strong>Declaración Jurada Especial de Ingreso</strong>. Entiendo que al completar el proceso recibiré este documento para firma electrónica avanzada.
                  </label>
                </div>
                {declaracionAceptada && <div style={{marginTop:4,background:'#EAF3DE',border:'1px solid #97C459',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#3B6D11',marginBottom:8}}>✓ Aceptación registrada.</div>}

                <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                  <button style={s.btnOutline} onClick={()=>setPaso(7)}>← Anterior</button>
                  <button style={{...s.btnPrimary,opacity:declaracionAceptada?1:0.5,cursor:declaracionAceptada?'pointer':'not-allowed'}} onClick={()=>declaracionAceptada&&(setError(''),setPaso(9))}>Siguiente →</button>
                </div>
              </div>
            )
          })()}

          {/* PASO 9 — Resumen y envío */}
          {paso===9 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>✅ Resumen y envío</h2>
              <div style={{background:'#f9fafb',borderRadius:10,padding:16,marginBottom:20}}>
                {[
                  {label:'Nombre',value:form.nombre},{label:'RUT',value:form.rut},
                  {label:'Email',value:form.email},{label:'Teléfono',value:form.telefono},
                  {label:'Domicilio',value:`${form.direccion}${form.casa_depto?', '+form.casa_depto:''}, ${form.comuna}, ${form.ciudad}`},
                  {label:'Diagnóstico',value:form.diagnostico},{label:'Médico',value:form.medico_nombre},
                  {label:'Folio receta',value:form.folio_receta},
                  {label:'Cuota mensual',value:`${form.cuota_mensual} gr (receta) · ${form.gramos_delegados} gr (delegados)`},
                  {label:'Vencimiento receta',value:form.vencimiento_receta},
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid #e5e7eb'}}>
                    <span style={{color:'#6b7280'}}>{r.label}</span>
                    <span style={{fontWeight:500,maxWidth:'60%',textAlign:'right'}}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#EAF3DE',border:'1px solid #97C459',borderRadius:10,padding:14,fontSize:12,color:'#3B6D11',marginBottom:14,display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>💳 <span><strong>Pago de incorporación $25.000</strong> — Confirmado ✓</span></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>📄 <span><strong>Contrato de Previsión y Delegación de Cultivo</strong> — Aceptado ✓</span></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>📄 <span><strong>Declaración Jurada Especial de Ingreso</strong> — Aceptada ✓</span></div>
              </div>
              <div style={{background:'#f9fafb',borderRadius:10,padding:14,fontSize:12,color:'#374151',marginBottom:20,lineHeight:1.6}}>
                <strong>Declaración:</strong> Declaro que toda la información es verídica. Entiendo que queda estrictamente prohibida la venta o transferencia de los productos recibidos (causal de expulsión). Al enviar acepto los estatutos y el reglamento interno de GreenTech.
              </div>
              {error&&<div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginBottom:14}}>⚠️ {error}</div>}
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <button style={s.btnOutline} onClick={()=>setPaso(8)}>← Anterior</button>
                <button style={{...s.btnPrimary,opacity:loading?0.7:1}} onClick={handleSubmit} disabled={loading}>{loading?'Enviando...':'Enviar solicitud →'}</button>
              </div>
            </div>
          )}

          {/* PASO 10: ÉXITO */}
          {paso===10 && (
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{fontSize:56,marginBottom:16}}>🎉</div>
              <h2 style={{fontSize:20,fontWeight:600,marginBottom:8,color:'#3B6D11'}}>¡Solicitud enviada correctamente!</h2>
              <p style={{fontSize:14,color:'#6b7280',marginBottom:6,lineHeight:1.7}}>Tu solicitud fue recibida. La directiva la revisará en un plazo máximo de <strong>5 días hábiles</strong>.</p>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:28}}>Recibirás un correo en <strong>{form.email}</strong> con el resultado.</p>
              <div style={{background:'#EAF3DE',border:'1px solid #97C459',borderRadius:12,padding:16,marginBottom:24,textAlign:'left',fontSize:12,color:'#3B6D11',lineHeight:1.7}}>
                <strong>¿Qué sigue?</strong><br/>
                1. La directiva revisará tus documentos y antecedentes.<br/>
                2. Si es aprobada, recibirás tus credenciales de acceso por correo.<br/>
                3. Podrás ingresar con tu RUT y la contraseña asignada.<br/>
                4. Se generarán tu Contrato de Previsión y Declaración Jurada para firma electrónica avanzada.<br/>
                5. Recibirás un link en tu celular para firmar ambos documentos.
              </div>
              <Link href="/" style={{...s.btnPrimary,textDecoration:'none',display:'inline-block'}}>Volver al inicio</Link>
            </div>
          )}

          {error&&paso<9&&<div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginTop:14}}>⚠️ {error}</div>}
        </div>
      </div>
    </div>
  )
}
