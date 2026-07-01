'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

const documentosEsperados = [
  { id:'contrato',       nombre:'Contrato de previsión y delegación de cultivo', tipo:'contrato',    detalle:'Firma electrónica · Ley 19.799',    icon:'📋', storageKey:'contrato',         firmaKey:'contrato_firmado' },
  { id:'declaracion',    nombre:'Declaración jurada especial de ingreso',         tipo:'declaracion', detalle:'Firma electrónica · Ley 19.799',    icon:'✍️', storageKey:'declaracion_jurada', firmaKey:'declaracion_jurada_firmada' },
  { id:'reglamento',     nombre:'Reglamento interno — aceptación',                tipo:'reglamento',  detalle:'Aceptado en línea · IP registrada', icon:'📖', storageKey:'reglamento' },
  { id:'cedula_anverso', nombre:'Cédula de identidad — Anverso (frente)',         tipo:'cedula',      detalle:'Verificada por la directiva',       icon:'🪪', storageKey:'cedula_anverso' },
  { id:'cedula_reverso', nombre:'Cédula de identidad — Reverso (dorso)',          tipo:'cedula',      detalle:'Verificada por la directiva',       icon:'🪪', storageKey:'cedula_reverso' },
  { id:'receta',         nombre:'Receta médica vigente',                          tipo:'receta',      detalle:'',                                  icon:'🩺', storageKey:'receta' },
  { id:'antecedentes',   nombre:'Certificado de antecedentes penales',            tipo:'cedula',      detalle:'Verificado por la directiva',       icon:'📋', storageKey:'antecedentes' },
]

const tipoColor: Record<string,string> = {
  contrato:'#E6F1FB', declaracion:'#EEEDFE', reglamento:'#EAF3DE', cedula:'#FDF5E6', receta:'#FCEBEB',
}

interface DocEstado { existe: boolean; path: string | null; fecha: string | null }

interface FormReceta {
  diagnostico: string; diagnostico_secundario: string; medico_nombre: string
  medico_rut: string; folio_receta: string; vencimiento_receta: string
  cuota_mensual: string; observaciones: string
}

const validarRut = (rut: string): boolean => {
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (rutLimpio.length < 2) return false
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  let suma = 0; let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = suma % 11
  const dvEsperado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto)
  return dv === dvEsperado
}

const formatearRut = (valor: string): string => {
  const limpio = valor.replace(/\./g, '').replace(/-/g, '').replace(/[^0-9kK]/g, '')
  if (limpio.length < 2) return limpio
  return `${limpio.slice(0, -1)}-${limpio.slice(-1).toUpperCase()}`
}

const calcularHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export default function MisDocumentos() {
  const [rutSocio, setRutSocio] = useState('')
  const [socioId, setSocioId] = useState('')
  const [nombreSocio, setNombreSocio] = useState('...')
  const [subiendoReceta, setSubiendoReceta] = useState(false)
  const [archivoNuevo, setArchivoNuevo] = useState<File|null>(null)
  const [mensaje, setMensaje] = useState('')
  const [vencimientoReceta, setVencimientoReceta] = useState<string|null>(null)
  const [reglamentoAceptadoAt, setReglamentoAceptadoAt] = useState<string|null>(null)
  const [reglamentoIp, setReglamentoIp] = useState<string|null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [docEstados, setDocEstados] = useState<Record<string, DocEstado>>({})
  const [cargandoDocs, setCargandoDocs] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [recetaPendiente, setRecetaPendiente] = useState<{id:string, created_at:string} | null>(null)
  const [gramosDelegados, setGramosDelegados] = useState<number>(0)
  const [rutMedicoValido, setRutMedicoValido] = useState<boolean|null>(null)
  const [delegacionSolicitada, setDelegacionSolicitada] = useState(false)
  const [firmandoContrato, setFirmandoContrato] = useState(false)
  const [socioData, setSocioData] = useState<any>(null)
  const [cuotaDelegacion, setCuotaDelegacion] = useState('')
  const [formReceta, setFormReceta] = useState<FormReceta>({
    diagnostico:'', diagnostico_secundario:'', medico_nombre:'', medico_rut:'',
    folio_receta:'', vencimiento_receta:'', cuota_mensual:'', observaciones:''
  })

  const updateForm = (k: keyof FormReceta, v: string) => setFormReceta(p => ({...p, [k]: v}))

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const rut = user?.user_metadata?.rut
      if (rut) {
        setRutSocio(rut)
          supabase.from('socios')
            .select('*')
            .eq('rut', rut)
            .single()
            .then(({ data }) => {
              if (data) setSocioData(data)
              if (data?.nombre) setNombreSocio(data.nombre)
              if (data?.gramos_delegados) setGramosDelegados(data.gramos_delegados)
              if (data?.id) {
                setSocioId(data.id)
                // Buscar receta pendiente
                supabase.from('recetas_pendientes')
                  .select('id, created_at')
                  .eq('socio_id', data.id)
                  .eq('estado', 'pendiente')
                  .maybeSingle()
                  .then(({ data: rp }) => { if (rp) setRecetaPendiente(rp) })
              }
              if (data?.vencimiento_receta) setVencimientoReceta(data.vencimiento_receta)
              if (data?.reglamento_aceptado_at) setReglamentoAceptadoAt(data.reglamento_aceptado_at)
              if (data?.reglamento_ip) setReglamentoIp(data.reglamento_ip)
              verificarDocumentos(rut, data?.reglamento_aceptado_at || null)
            })
      }
    })
  }, [])

  const verificarDocumentos = async (rut: string, reglamentoAt: string | null) => {
    setCargandoDocs(true)
    const { data: archivos } = await supabase.storage.from('documentos').list(rut)
    const estados: Record<string, DocEstado> = {}

    for (const doc of documentosEsperados) {
      if (doc.id === 'reglamento') {
        // El reglamento se verifica por BD, no por Storage
        if (reglamentoAt) {
          const fecha = new Date(reglamentoAt).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
          estados[doc.id] = { existe: true, path: null, fecha }
        } else {
          estados[doc.id] = { existe: false, path: null, fecha: null }
        }
        continue
      }
      const firmaKeyDoc = (doc as any).firmaKey
      // Para docs con firmaKey (contrato, declaracion), el socio SOLO ve la versión firmada
      const archivo = firmaKeyDoc
        ? archivos?.find(f => f.name.split('.')[0] === firmaKeyDoc)
        : archivos?.find(f => f.name.split('.')[0] === doc.storageKey || f.name.split('.')[0] === doc.storageKey + '_nueva')
      if (archivo) {
        const fecha = archivo.updated_at
          ? new Date(archivo.updated_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
          : null
        estados[doc.id] = { existe: true, path: `${rut}/${archivo.name}`, fecha }
      } else {
        estados[doc.id] = { existe: false, path: null, fecha: null }
      }
    }
    setDocEstados(estados)
    setCargandoDocs(false)
  }

  const getRecetaStatus = () => {
    if (!vencimientoReceta) return { color: '#111', alerta: null }
    const hoy = new Date()
    const vence = new Date(vencimientoReceta)
    const dias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    if (dias <= 30) return { color: '#A32D2D', alerta: `🔴 Vence en ${dias} días — renueva urgente` }
    if (dias <= 60) return { color: '#BA7517', alerta: `⚠️ Vence en ${dias} días — renueva pronto` }
    return { color: '#3B6D11', alerta: null }
  }
  const recetaStatus = getRecetaStatus()
  const fechaVencimientoLabel = vencimientoReceta
    ? new Date(vencimientoReceta).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : ''

  const docsPresentes = Object.values(docEstados).filter(d => d.existe).length

  const verDocumento = async (storageKey: string) => {
    if (!rutSocio) return
    const { data: archivos } = await supabase.storage.from('documentos').list(rutSocio)
    const doc = documentosEsperados.find(d => d.storageKey === storageKey)
    const firmaKey = (doc as any)?.firmaKey
    // Si tiene firmaKey, SOLO buscar la versión firmada
    const archivo = firmaKey
      ? archivos?.find(f => f.name.split('.')[0] === firmaKey)
      : archivos?.find(f => f.name.split('.')[0] === storageKey)
    if (archivo) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(`${rutSocio}/${archivo.name}`, 120)
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
    }
    setMensaje('❌ Documento firmado no encontrado. Contacta al administrador.')
    setTimeout(() => setMensaje(''), 5000)
  }

  const verReglamento = async () => {
    setAbriendo(true)
    try {
      const res = await fetch('/api/reglamento-url')
      const { url } = await res.json()
      if (url) { window.open(url, '_blank') }
      else { setMensaje('❌ Reglamento no disponible. Contacta al administrador.'); setTimeout(() => setMensaje(''), 5000) }
    } catch { setMensaje('❌ Error al obtener el reglamento.'); setTimeout(() => setMensaje(''), 5000) }
    finally { setAbriendo(false) }
  }

  const descargarDocumento = async (storageKey: string, nombre: string) => {
    if (!rutSocio) return
    const { data: archivos } = await supabase.storage.from('documentos').list(rutSocio)
    const doc = documentosEsperados.find(d => d.storageKey === storageKey)
    const firmaKey = (doc as any)?.firmaKey
    // Si tiene firmaKey, SOLO buscar la versión firmada
    const archivo = firmaKey
      ? archivos?.find(f => f.name.split('.')[0] === firmaKey)
      : archivos?.find(f => f.name.split('.')[0] === storageKey)
    if (archivo) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(`${rutSocio}/${archivo.name}`, 120)
      if (data?.signedUrl) {
        const a = document.createElement('a'); a.href = data.signedUrl
        a.download = nombre + '.' + archivo.name.split('.').pop(); a.click(); return
      }
    }
    setMensaje('❌ Documento no encontrado.')
    setTimeout(() => setMensaje(''), 4000)
  }

  // Computa si la cuota nueva requiere actualizar delegación
  const nuevaCuota = parseFloat(formReceta.cuota_mensual) || 0
  const delegacionOpcional    = gramosDelegados > 0 && nuevaCuota > gramosDelegados && nuevaCuota > 0 && !!formReceta.cuota_mensual
  const delegacionObligatoria = gramosDelegados > 0 && nuevaCuota < gramosDelegados && nuevaCuota > 0 && !!formReceta.cuota_mensual

  const iniciarActualizacionDelegacion = async () => {
    const gramosDelegar = parseFloat(cuotaDelegacion)
    if (!rutSocio) { setMensaje('❌ No se encontró tu RUT. Recarga la página.'); return }
    if (!socioId) { setMensaje('❌ No se encontró tu ID de socio. Recarga la página.'); return }
    if (!gramosDelegar || gramosDelegar < 0.5 || gramosDelegar > nuevaCuota) { setMensaje('❌ El monto de delegación no es válido.'); return }
    setFirmandoContrato(true)
    setMensaje('')
    try {
      const { jsPDF } = await import('jspdf')
      const m = 20
      const w = 216 - m * 2
      const lh = 6
      const fecha = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' })

      const addWrappedText = (doc: InstanceType<typeof jsPDF>, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y)
        return y + (lines.length * lineHeight)
      }

      // Generar nuevo Contrato de Delegación con gramos actualizados
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
      for (const p of [
        `Don/Doña ${nombreSocio}, RUT: ${rutSocio}, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".`,
        'Por la presente declara:',
      ]) { y = addWrappedText(docContrato, p, m, y, w, lh); y += 4 }
      for (const p of [
        '1. Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.',
        '2. Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).',
        '3. La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.',
        '4. Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.',
        '5. Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.',
        `6. Delegar la entrega de ${gramosDelegar} gr. de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.`,
      ]) { y = addWrappedText(docContrato, p, m, y, w, lh); y += 3 }
      y += 8
      docContrato.text(`FECHA: ${fecha}`, m, y); y += 10
      docContrato.line(m, y, m + 80, y); y += 5
      docContrato.text(nombreSocio, m, y); y += 5
      docContrato.text(`RUT: ${rutSocio}`, m, y)
      docContrato.setFont('helvetica','italic'); docContrato.setFontSize(8); docContrato.setTextColor(150)
      docContrato.text('Pendiente de firma — entregue a la directiva para gestionar la firma', m, y + 8)
      docContrato.setTextColor(0)
      const pdfBuffer = docContrato.output('arraybuffer')

      // Subir PDF a storage como contrato_renovacion (no reemplaza el contrato firmado actual)
      const storagePath = `${rutSocio}/contrato_renovacion.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('documentos')
        .upload(storagePath, pdfBuffer, { contentType:'application/pdf', upsert:true })
      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(storagePath)

      // Registrar solicitud via función segura (solo actualiza campos de delegación)
      const { error: rpcErr } = await supabase.rpc('solicitar_actualizacion_delegacion', {
        p_socio_id:   socioId,
        p_nueva_cuota: gramosDelegar,
        p_pdf_url:    urlData.publicUrl,
      })
      if (rpcErr) throw new Error(rpcErr.message)

      setDelegacionSolicitada(true)
      setMensaje('✅ Solicitud enviada. La directiva descargará el contrato, lo gestionará para su firma y subirá la versión firmada.')
      setTimeout(() => setMensaje(''), 10000)
    } catch (e: any) {
      setMensaje('❌ Error al generar el contrato: ' + (e instanceof Error ? e.message : 'Intenta nuevamente.'))
    } finally {
      setFirmandoContrato(false)
    }
  }

  const enviarSolicitudReceta = async () => {
    if (!archivoNuevo || !rutSocio || !socioId) {
      setMensaje('❌ Faltan datos de sesión. Recarga la página e intenta nuevamente.'); return
    }
    const { diagnostico, medico_nombre, medico_rut, folio_receta, vencimiento_receta, cuota_mensual } = formReceta
    if (!diagnostico || !medico_nombre || !medico_rut || !folio_receta || !vencimiento_receta || !cuota_mensual) {
      setMensaje('❌ Completa todos los campos obligatorios.'); return
    }
    if (!validarRut(medico_rut)) {
      setMensaje('❌ El RUT del médico no es válido. Verifica el formato (ej: 12345678-9).'); return
    }
    setEnviando(true)
    try {
      // 1. Calcular hash SHA-256
      const hash = await calcularHash(archivoNuevo)
      // 2. Subir archivo a storage
      const ext = archivoNuevo.name.split('.').pop()
      const path = `${rutSocio}/receta_renovacion_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('documentos').upload(path, archivoNuevo, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
      // 4. Insertar en recetas_pendientes
      const nuevosCuota = parseFloat(formReceta.cuota_mensual)
      const requiereNuevoContrato = gramosDelegados > 0 && nuevosCuota < gramosDelegados
      const notaContrato = requiereNuevoContrato
        ? `⚠️ REQUIERE NUEVO CONTRATO: nueva cuota ${nuevosCuota}g es menor a gramos delegados actuales (${gramosDelegados}g). Hay que rehacer el contrato de delegación de cultivo.`
        : null
      const { error: insertErr } = await supabase.from('recetas_pendientes').insert({
        socio_id: socioId,
        diagnostico: formReceta.diagnostico,
        diagnostico_secundario: formReceta.diagnostico_secundario || null,
        medico_nombre: formReceta.medico_nombre,
        medico_rut: formReceta.medico_rut,
        folio_receta: formReceta.folio_receta,
        vencimiento_receta: formReceta.vencimiento_receta,
        cuota_mensual: nuevosCuota,
        observaciones: formReceta.observaciones || null,
        archivo_url: urlData.publicUrl,
        hash_sha256: hash,
        estado: 'pendiente',
        notas_admin: notaContrato,
      })
      if (insertErr) throw new Error(insertErr.message)
      setMensaje('✅ Solicitud enviada. La directiva revisará tu receta en 5 días hábiles.')
      // Email de confirmación al socio
      try {
        const emailSocio = socioData?.email
        if (emailSocio) {
          await sendEmail('renovacion_receta_enviada', emailSocio, {
            nombre:      nombreSocio,
            folio:       formReceta.folio_receta,
            medico:      formReceta.medico_nombre,
            vencimiento: formReceta.vencimiento_receta,
            cuota:       formReceta.cuota_mensual,
            ...(delegacionSolicitada ? { delegacion_gramos: cuotaDelegacion } : {}),
          })
        }
      } catch {}
      setSubiendoReceta(false)
      setArchivoNuevo(null)
      setFormReceta({ diagnostico:'', diagnostico_secundario:'', medico_nombre:'', medico_rut:'', folio_receta:'', vencimiento_receta:'', cuota_mensual:'', observaciones:'' })
      // Refrescar estado pendiente
      const { data: rp } = await supabase.from('recetas_pendientes').select('id, created_at').eq('socio_id', socioId).eq('estado', 'pendiente').maybeSingle()
      setRecetaPendiente(rp ?? null)
    } catch (e: unknown) {
      setMensaje('❌ Error al enviar: ' + (e instanceof Error ? e.message : 'Error desconocido') + '. Intenta nuevamente o contacta al administrador.')
      // Errores no se auto-desaparecen
    } finally {
      setEnviando(false)
    }
  }

  if (!rutSocio) return <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>Cargando...</div>

  return (
    <div style={{ display:'flex', minHeight:'100vh', overflowX:'hidden' }}>
      <SidebarSocio nombre={nombreSocio} rut={rutSocio} />
      <main style={{ flex:1, padding:24, overflowY:'auto', minWidth:0, background:'#f9fafb' }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Mis documentos</h1>
          <p style={{ fontSize:13, color:'#6b7280' }}>Expediente completo de tu membresía como socio</p>
        </div>

        {mensaje && (
          <div style={{ background:mensaje.startsWith('✅')?'#EAF3DE':'#FCEBEB', border:`1px solid ${mensaje.startsWith('✅')?'#97C459':'#F5C5C5'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color:mensaje.startsWith('✅')?'#3B6D11':'#A32D2D', marginBottom:16 }}>
            {mensaje}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Documentos presentes', value: cargandoDocs ? '...' : `${docsPresentes} / ${documentosEsperados.length}`, sub:'en tu expediente' },
            { label:'Receta médica', value: fechaVencimientoLabel ? `Vence ${fechaVencimientoLabel}` : '—', sub: recetaStatus.alerta || (fechaVencimientoLabel ? 'Vigente' : 'Cargando...'), color: recetaStatus.color },
            { label:'Estado', value: docsPresentes === documentosEsperados.length ? 'Completo ✓' : `Faltan ${documentosEsperados.length - docsPresentes}`, sub:'socio activo', color: docsPresentes === documentosEsperados.length ? '#3B6D11' : '#BA7517' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:18, fontWeight:600, color:(m as {color?:string}).color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #e5e7eb', fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Documentos de membresía</span>
            {cargandoDocs && <span style={{ fontSize:11, color:'#9ca3af' }}>Verificando archivos...</span>}
          </div>
          {documentosEsperados.map((doc, i) => {
            const estado = docEstados[doc.id]
            const existe = estado?.existe ?? false
            const fecha = estado?.fecha ?? '—'
            const detalleReceta = doc.tipo === 'receta'
              ? (recetaStatus.alerta || (fechaVencimientoLabel ? `Vence ${fechaVencimientoLabel}` : doc.detalle))
              : doc.detalle

            // Detalle extra para el reglamento: fecha, hora e IP de aceptación
            const detalleReglamento = doc.id === 'reglamento' && reglamentoAceptadoAt
              ? (() => {
                  const dt = new Date(reglamentoAceptadoAt)
                  const fechaStr = dt.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
                  const horaStr = dt.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' })
                  return `Aceptado el ${fechaStr} a las ${horaStr}${reglamentoIp ? ` · IP ${reglamentoIp}` : ''}`
                })()
              : null

            return (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:i<documentosEsperados.length-1?'1px solid #f3f4f6':'none', opacity: cargandoDocs ? 0.5 : 1 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:tipoColor[doc.tipo], display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {doc.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{doc.nombre}</div>
                  <div style={{ fontSize:11, color: doc.tipo==='receta' && recetaStatus.alerta ? recetaStatus.color : '#9ca3af' }}>
                    {detalleReglamento || detalleReceta}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>{fecha}</span>
                  {existe ? (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#EAF3DE', color:'#3B6D11', whiteSpace:'nowrap' }}>✓ Firmado</span>
                  ) : (doc as any).firmaKey ? (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#FDF5E6', color:'#BA7517', whiteSpace:'nowrap' }}>⏳ Pendiente firma</span>
                  ) : (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#FCEBEB', color:'#A32D2D', whiteSpace:'nowrap' }}>⏳ Pendiente</span>
                  )}
                  {existe && doc.id === 'reglamento' ? (
                    <button onClick={verReglamento} disabled={abriendo}
                      style={{ padding:'5px 10px', border:'1px solid #185FA5', borderRadius:6, background:'transparent', color:'#185FA5', fontSize:11, cursor:'pointer', opacity: abriendo ? 0.6 : 1 }}>
                      {abriendo ? '...' : 'Ver'}
                    </button>
                  ) : existe && doc.id !== 'reglamento' ? (
                    <>
                      <button onClick={() => verDocumento(doc.storageKey)}
                        style={{ padding:'5px 10px', border:'1px solid #185FA5', borderRadius:6, background:'transparent', color:'#185FA5', fontSize:11, cursor:'pointer' }}>
                        Ver
                      </button>
                      <button onClick={() => descargarDocumento(doc.storageKey, doc.nombre)}
                        style={{ padding:'5px 10px', border:'1px solid #e5e7eb', borderRadius:6, background:'transparent', color:'#6b7280', fontSize:11, cursor:'pointer' }}>
                        📥
                      </button>
                    </>
                  ) : !existe && !(doc as any).firmaKey ? (
                    <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>No subido aún</span>
                  ) : !existe && (doc as any).firmaKey ? (
                    <span style={{ fontSize:11, color:'#BA7517', fontStyle:'italic' }}>En revisión por directiva</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>🩺 Renovar receta médica</div>
          <p style={{ fontSize:12, color:'#6b7280', marginBottom:14, lineHeight:1.6 }}>
            Cuando obtengas una nueva receta, completa los datos médicos y adjunta el archivo. La directiva la revisará en 5 días hábiles.
            {fechaVencimientoLabel && <><br/>Tu receta actual vence en <strong style={{ color: recetaStatus.color }}>{fechaVencimientoLabel}</strong>.</>}
            {recetaStatus.alerta && <><br/><span style={{ color: recetaStatus.color, fontWeight:600 }}>{recetaStatus.alerta}</span></>}
          </p>

          {/* Receta en revisión */}
          {recetaPendiente ? (
            <div style={{ background:'#FDF5E6', border:'1px solid #F5D87A', borderRadius:10, padding:'12px 16px', fontSize:12 }}>
              <div style={{ fontWeight:600, color:'#BA7517', marginBottom:4 }}>⏳ Receta en revisión</div>
              <div style={{ color:'#6b7280' }}>Enviada el {new Date(recetaPendiente.created_at).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}. La directiva te notificará por email cuando sea revisada.</div>
            </div>
          ) : !subiendoReceta ? (
            <button onClick={() => setSubiendoReceta(true)}
              style={{ padding:'8px 18px', border:'1px solid #3B6D11', borderRadius:8, background:'transparent', color:'#3B6D11', fontSize:13, cursor:'pointer' }}>
              + Actualizar receta médica
            </button>
          ) : (
            <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:20, background:'#f9fafb' }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:16, color:'#111' }}>Datos de la nueva receta</div>

              {/* Grilla de campos */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Diagnóstico principal <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input value={formReceta.diagnostico} onChange={e => updateForm('diagnostico', e.target.value)}
                    placeholder="Ej: Dolor crónico" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Diagnóstico secundario</label>
                  <input value={formReceta.diagnostico_secundario} onChange={e => updateForm('diagnostico_secundario', e.target.value)}
                    placeholder="Opcional" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Nombre del médico <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input value={formReceta.medico_nombre} onChange={e => updateForm('medico_nombre', e.target.value)}
                    placeholder="Dr. Nombre Apellido" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>RUT del médico <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input value={formReceta.medico_rut}
                    onChange={e => {
                      const v = formatearRut(e.target.value)
                      updateForm('medico_rut', v)
                      setRutMedicoValido(v.length > 3 ? validarRut(v) : null)
                    }}
                    placeholder="12345678-9"
                    style={{ width:'100%', padding:'8px 10px', border:`1px solid ${rutMedicoValido === false ? '#f87171' : rutMedicoValido === true ? '#4ade80' : '#d1d5db'}`, borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                  {rutMedicoValido === false && <div style={{ fontSize:11, color:'#ef4444', marginTop:3 }}>RUT no válido</div>}
                  {rutMedicoValido === true && <div style={{ fontSize:11, color:'#16a34a', marginTop:3 }}>✓ RUT válido</div>}
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Folio de receta <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input value={formReceta.folio_receta} onChange={e => updateForm('folio_receta', e.target.value)}
                    placeholder="Folio" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Vencimiento de receta <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input type="date" value={formReceta.vencimiento_receta} onChange={e => updateForm('vencimiento_receta', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Cuota mensual indicada (gr) <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input type="number" min="0.5" step="0.5" value={formReceta.cuota_mensual} onChange={e => { updateForm('cuota_mensual', e.target.value); setDelegacionSolicitada(false); setCuotaDelegacion('') }}
                    placeholder="Ej: 30" style={{ width:'100%', padding:'8px 10px', border:`1px solid ${delegacionOpcional ? '#3b82f6' : '#d1d5db'}`, borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                  {delegacionObligatoria && (
                    <div style={{ fontSize:11, color:'#ea580c', marginTop:4 }}>⚠️ Menor a los gramos delegados ({gramosDelegados}g) — debes actualizar el contrato antes de enviar</div>
                  )}
                  {delegacionOpcional && (
                    <div style={{ fontSize:11, color:'#2563eb', marginTop:4 }}>ℹ️ Mayor a los gramos delegados ({gramosDelegados}g) — puedes actualizar el contrato opcionalmente</div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Observaciones</label>
                  <input value={formReceta.observaciones} onChange={e => updateForm('observaciones', e.target.value)}
                    placeholder="Opcional" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
              </div>

              {/* ── Sección delegación de cultivo ── */}
              {(delegacionObligatoria || delegacionOpcional) && (() => {
                const esObligatorio = delegacionObligatoria
                const inputValido = !!cuotaDelegacion && parseFloat(cuotaDelegacion) >= 0.5 && parseFloat(cuotaDelegacion) <= nuevaCuota
                return (
                  <div style={{
                    background: esObligatorio ? '#FFF7ED' : '#EFF6FF',
                    border: `1px solid ${esObligatorio ? '#FED7AA' : '#BFDBFE'}`,
                    borderRadius:10, padding:14, marginBottom:14, display:'flex', alignItems:'flex-start', gap:12
                  }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{esObligatorio ? '⚠️' : '🌱'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, color: esObligatorio ? '#92400E' : '#1D4ED8', fontSize:12, marginBottom:4 }}>
                        {esObligatorio ? 'Paso obligatorio: ' : ''}Actualizar contrato de delegación de cultivo
                      </div>
                      <p style={{ fontSize:12, color: esObligatorio ? '#78350F' : '#1E40AF', margin:'0 0 10px', lineHeight:1.5 }}>
                        {esObligatorio
                          ? <>Tu receta indica <strong>{nuevaCuota}g</strong> mensuales, que es menor a tu delegación actual de <strong>{gramosDelegados}g</strong>. Debes actualizar el contrato antes de enviar la receta. Indica cuántos gramos deseas delegar (entre 0.5 y {nuevaCuota}g).</>
                          : <>Tu receta indica <strong>{nuevaCuota}g</strong> mensuales. Si deseas actualizar tu delegación actual de <strong>{gramosDelegados}g</strong>, indica el nuevo monto (entre 0.5 y {nuevaCuota}g). Este paso es opcional.</>
                        }
                      </p>
                      {!delegacionSolicitada ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <input
                              type="number" min="0.5" step="0.5" max={nuevaCuota}
                              value={cuotaDelegacion}
                              onChange={e => setCuotaDelegacion(e.target.value)}
                              placeholder={`1 – ${nuevaCuota}`}
                              style={{ width:90, padding:'6px 10px', border:`1px solid ${esObligatorio ? '#FCD34D' : '#93C5FD'}`, borderRadius:7, fontSize:13, textAlign:'center' as const }}
                            />
                            <span style={{ fontSize:12, color: esObligatorio ? '#92400E' : '#1E40AF' }}>gr</span>
                          </div>
                          {cuotaDelegacion && !inputValido && (
                            <span style={{ fontSize:11, color:'#DC2626' }}>Debe ser entre 0.5 y {nuevaCuota}g</span>
                          )}
                          <button
                            onClick={iniciarActualizacionDelegacion}
                            disabled={firmandoContrato || !inputValido}
                            style={{ padding:'7px 16px', border:'none', borderRadius:8, fontSize:12, fontWeight:600, color:'#fff',
                              background: (firmandoContrato || !inputValido) ? '#9ca3af' : esObligatorio ? '#D97706' : '#2563EB',
                              cursor: (firmandoContrato || !inputValido) ? 'not-allowed' : 'pointer' }}>
                            {firmandoContrato ? '⏳ Generando...' : '🌱 Actualizar Delegación de Cultivo'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize:12, color:'#3B6D11', fontWeight:500 }}>✅ Solicitud enviada — la directiva gestionará la firma del nuevo contrato.</div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Upload archivo */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:6 }}>Archivo de receta (PDF o imagen) <span style={{ color:'#A32D2D' }}>*</span></label>
                <div style={{ border:'1px dashed #d1d5db', borderRadius:8, padding:16, textAlign:'center' as const, background:'#fff', cursor:'pointer' }}
                  onClick={() => document.getElementById('file-receta-nueva')?.click()}>
                  {archivoNuevo
                    ? <div><div style={{ fontSize:22 }}>📄</div><div style={{ fontSize:13, color:'#3B6D11', fontWeight:500 }}>{archivoNuevo.name}</div></div>
                    : <div><div style={{ fontSize:22 }}>☁️</div><div style={{ fontSize:12, color:'#6b7280' }}>Haz clic para seleccionar</div><div style={{ fontSize:11, color:'#9ca3af' }}>PDF, JPG, JPEG · máx. 10 MB</div></div>
                  }
                  <input id="file-receta-nueva" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                    onChange={e => e.target.files?.[0] && setArchivoNuevo(e.target.files[0])} />
                </div>
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => { setSubiendoReceta(false); setArchivoNuevo(null) }} disabled={enviando}
                  style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', color:'#6b7280' }}>
                  Cancelar
                </button>
                <button onClick={enviarSolicitudReceta}
                  disabled={enviando || !archivoNuevo || (delegacionObligatoria && !delegacionSolicitada)}
                  title={delegacionObligatoria && !delegacionSolicitada ? 'Debes actualizar el contrato de delegación primero' : undefined}
                  style={{ padding:'7px 16px', border:'none', borderRadius:8,
                    background:(enviando||!archivoNuevo||(delegacionObligatoria&&!delegacionSolicitada))?'#9ca3af':'#3B6D11',
                    color:'#EAF3DE', fontSize:13, fontWeight:600,
                    cursor:(enviando||!archivoNuevo||(delegacionObligatoria&&!delegacionSolicitada))?'not-allowed':'pointer' }}>
                  {enviando ? '⏳ Enviando...' : 'Enviar para revisión →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
