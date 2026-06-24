'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

const documentosEsperados = [
  { id:'contrato',       nombre:'Contrato de previsión y delegación de cultivo', tipo:'contrato',    detalle:'Firma electrónica · Ley 19.799',    icon:'📋', storageKey:'contrato' },
  { id:'declaracion',    nombre:'Declaración jurada especial de ingreso',         tipo:'declaracion', detalle:'Firma electrónica · Ley 19.799',    icon:'✍️', storageKey:'declaracion_jurada' },
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
  const [docEstados, setDocEstados] = useState<Record<string, DocEstado>>({})
  const [cargandoDocs, setCargandoDocs] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [recetaPendiente, setRecetaPendiente] = useState<{id:string, created_at:string} | null>(null)
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
            .select('id, nombre, vencimiento_receta, reglamento_aceptado_at')
            .eq('rut', rut)
            .single()
            .then(({ data }) => {
              if (data?.nombre) setNombreSocio(data.nombre)
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
      const archivo = archivos?.find(f => f.name.split('.')[0] === doc.storageKey || f.name.split('.')[0] === doc.storageKey + '_nueva')
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
    const archivo = archivos?.find(f => f.name.split('.')[0] === storageKey)
    if (archivo) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(`${rutSocio}/${archivo.name}`, 120)
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
    }
    setMensaje('❌ Documento no encontrado en Storage.')
    setTimeout(() => setMensaje(''), 4000)
  }

  const descargarDocumento = async (storageKey: string, nombre: string) => {
    if (!rutSocio) return
    const { data: archivos } = await supabase.storage.from('documentos').list(rutSocio)
    const archivo = archivos?.find(f => f.name.split('.')[0] === storageKey)
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

  const enviarSolicitudReceta = async () => {
    if (!archivoNuevo || !rutSocio || !socioId) return
    const { diagnostico, medico_nombre, medico_rut, folio_receta, vencimiento_receta, cuota_mensual } = formReceta
    if (!diagnostico || !medico_nombre || !medico_rut || !folio_receta || !vencimiento_receta || !cuota_mensual) {
      setMensaje('❌ Completa todos los campos obligatorios.'); return
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
      const { error: insertErr } = await supabase.from('recetas_pendientes').insert({
        socio_id: socioId,
        diagnostico: formReceta.diagnostico,
        diagnostico_secundario: formReceta.diagnostico_secundario || null,
        medico_nombre: formReceta.medico_nombre,
        medico_rut: formReceta.medico_rut,
        folio_receta: formReceta.folio_receta,
        vencimiento_receta: formReceta.vencimiento_receta,
        cuota_mensual: parseInt(formReceta.cuota_mensual),
        observaciones: formReceta.observaciones || null,
        archivo_url: urlData.publicUrl,
        hash_sha256: hash,
        estado: 'pendiente',
      })
      if (insertErr) throw new Error(insertErr.message)
      setMensaje('✅ Solicitud enviada. La directiva revisará tu receta en 5 días hábiles.')
      setSubiendoReceta(false)
      setArchivoNuevo(null)
      setFormReceta({ diagnostico:'', diagnostico_secundario:'', medico_nombre:'', medico_rut:'', folio_receta:'', vencimiento_receta:'', cuota_mensual:'', observaciones:'' })
      // Refrescar estado pendiente
      const { data: rp } = await supabase.from('recetas_pendientes').select('id, created_at').eq('socio_id', socioId).eq('estado', 'pendiente').maybeSingle()
      setRecetaPendiente(rp ?? null)
    } catch (e: unknown) {
      setMensaje('❌ Error: ' + (e instanceof Error ? e.message : 'Error desconocido'))
    } finally {
      setEnviando(false)
      setTimeout(() => setMensaje(''), 6000)
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

            return (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:i<documentosEsperados.length-1?'1px solid #f3f4f6':'none', opacity: cargandoDocs ? 0.5 : 1 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:tipoColor[doc.tipo], display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {doc.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{doc.nombre}</div>
                  <div style={{ fontSize:11, color: doc.tipo==='receta' && recetaStatus.alerta ? recetaStatus.color : '#9ca3af' }}>{detalleReceta}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>{fecha}</span>
                  {existe ? (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#EAF3DE', color:'#3B6D11', whiteSpace:'nowrap' }}>✓ Presente</span>
                  ) : (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#FCEBEB', color:'#A32D2D', whiteSpace:'nowrap' }}>⏳ Pendiente</span>
                  )}
                  {/* El reglamento no tiene archivo descargable */}
                  {existe && doc.id !== 'reglamento' ? (
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
                  ) : !existe ? (
                    <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>No subido aún</span>
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
                  <input value={formReceta.medico_rut} onChange={e => updateForm('medico_rut', e.target.value)}
                    placeholder="12345678-9" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
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
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Cuota mensual propuesta (gr) <span style={{ color:'#A32D2D' }}>*</span></label>
                  <input type="number" min="1" value={formReceta.cuota_mensual} onChange={e => updateForm('cuota_mensual', e.target.value)}
                    placeholder="Ej: 30" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Observaciones</label>
                  <input value={formReceta.observaciones} onChange={e => updateForm('observaciones', e.target.value)}
                    placeholder="Opcional" style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, boxSizing:'border-box' as const }} />
                </div>
              </div>

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
                <button onClick={enviarSolicitudReceta} disabled={enviando || !archivoNuevo}
                  style={{ padding:'7px 16px', border:'none', borderRadius:8, background:(enviando||!archivoNuevo)?'#9ca3af':'#3B6D11', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
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
