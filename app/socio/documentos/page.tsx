'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

// Documentos esperados en el expediente — la página verifica cuáles existen en Storage
const documentosEsperados = [
  { id:'contrato',          nombre:'Contrato de previsión y delegación de cultivo', tipo:'contrato',    detalle:'Firma electrónica · Ley 19.799',      icon:'📋', storageKey:'contrato' },
  { id:'declaracion',       nombre:'Declaración jurada especial de ingreso',         tipo:'declaracion', detalle:'Firma electrónica · Ley 19.799',      icon:'✍️', storageKey:'declaracion_jurada' },
  { id:'reglamento',        nombre:'Reglamento interno — aceptación',                tipo:'reglamento',  detalle:'Aceptado en línea · IP registrada',   icon:'📖', storageKey:'reglamento' },
  { id:'cedula_anverso',    nombre:'Cédula de identidad — Anverso (frente)',         tipo:'cedula',      detalle:'Verificada por la directiva',         icon:'🪪', storageKey:'cedula_anverso' },
  { id:'cedula_reverso',    nombre:'Cédula de identidad — Reverso (dorso)',          tipo:'cedula',      detalle:'Verificada por la directiva',         icon:'🪪', storageKey:'cedula_reverso' },
  { id:'receta',            nombre:'Receta médica vigente',                          tipo:'receta',      detalle:'',                                    icon:'🩺', storageKey:'receta' },
  { id:'antecedentes',      nombre:'Certificado de antecedentes penales',            tipo:'cedula',      detalle:'Verificado por la directiva',         icon:'📋', storageKey:'antecedentes' },
]

const tipoColor: Record<string,string> = {
  contrato:'#E6F1FB', declaracion:'#EEEDFE', reglamento:'#EAF3DE', cedula:'#FDF5E6', receta:'#FCEBEB',
}

interface DocEstado {
  existe: boolean
  path: string | null
  fecha: string | null
}

export default function MisDocumentos() {
  const [rutSocio, setRutSocio] = useState('')
  const [nombreSocio, setNombreSocio] = useState('...')
  const [subiendoReceta, setSubiendoReceta] = useState(false)
  const [archivoNuevo, setArchivoNuevo] = useState<File|null>(null)
  const [mensaje, setMensaje] = useState('')
  const [vencimientoReceta, setVencimientoReceta] = useState<string|null>(null)
  const [docEstados, setDocEstados] = useState<Record<string, DocEstado>>({})
  const [cargandoDocs, setCargandoDocs] = useState(true)

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (keys.length > 0) {
        const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
        const rut = token?.user?.user_metadata?.rut
        if (rut) {
          setRutSocio(rut)
          supabase.from('socios').select('nombre,vencimiento_receta').eq('rut', rut).single()
            .then(({ data }) => {
              if (data?.nombre) setNombreSocio(data.nombre)
              if (data?.vencimiento_receta) setVencimientoReceta(data.vencimiento_receta)
            })
          verificarDocumentos(rut)
        }
      }
    } catch {}
  }, [])

  const verificarDocumentos = async (rut: string) => {
    setCargandoDocs(true)
    // Listar todos los archivos en la carpeta del socio
    const { data: archivos } = await supabase.storage.from('documentos').list(rut)
    const estados: Record<string, DocEstado> = {}

    for (const doc of documentosEsperados) {
      // Buscar cualquier archivo que empiece con el storageKey del documento
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
    // Listar carpeta y buscar el archivo
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
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = nombre + '.' + archivo.name.split('.').pop()
        a.click()
        return
      }
    }
    setMensaje('❌ Documento no encontrado.')
    setTimeout(() => setMensaje(''), 4000)
  }

  const subirReceta = async () => {
    if (!archivoNuevo || !rutSocio) return
    const ext = archivoNuevo.name.split('.').pop()
    const { error } = await supabase.storage.from('documentos').upload(`${rutSocio}/receta_nueva.${ext}`, archivoNuevo, { upsert: true })
    if (error) { setMensaje('❌ Error al subir: ' + error.message); return }
    setMensaje('✅ Receta enviada. La directiva la revisará en 5 días hábiles.')
    setSubiendoReceta(false); setArchivoNuevo(null)
    await verificarDocumentos(rutSocio)
    setTimeout(() => setMensaje(''), 5000)
  }

  if (!rutSocio) return <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>Cargando...</div>

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SidebarSocio nombre={nombreSocio} rut={rutSocio} />
      <main style={{ flex:1, padding:24, overflowY:'auto', background:'#f9fafb' }}>
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
              <div style={{ fontSize:18, fontWeight:600, color:m.color||'#111' }}>{m.value}</div>
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
                  {existe ? (
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
                  ) : (
                    <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>No subido aún</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>🩺 Renovar receta médica</div>
          <p style={{ fontSize:12, color:'#6b7280', marginBottom:14, lineHeight:1.6 }}>
            Cuando obtengas una nueva receta, súbela aquí. La directiva la revisará en 5 días hábiles.<br/>
            Tu receta actual vence en <strong style={{ color: recetaStatus.color }}>{fechaVencimientoLabel}</strong>.
            {recetaStatus.alerta && <><br/><span style={{ color: recetaStatus.color, fontWeight:600 }}>{recetaStatus.alerta}</span></>}
          </p>
          {!subiendoReceta ? (
            <button onClick={() => setSubiendoReceta(true)}
              style={{ padding:'8px 18px', border:'1px solid #3B6D11', borderRadius:8, background:'transparent', color:'#3B6D11', fontSize:13, cursor:'pointer' }}>
              + Subir nueva receta
            </button>
          ) : (
            <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:16, background:'#f9fafb' }}>
              <div style={{ border:'1px dashed #d1d5db', borderRadius:8, padding:20, textAlign:'center' as const, background:'#fff', marginBottom:12, cursor:'pointer' }}
                onClick={() => document.getElementById('file-receta')?.click()}>
                {archivoNuevo
                  ? <div><div style={{ fontSize:24 }}>📄</div><div style={{ fontSize:13, color:'#3B6D11', fontWeight:500 }}>{archivoNuevo.name}</div></div>
                  : <div><div style={{ fontSize:24 }}>☁️</div><div style={{ fontSize:13, color:'#6b7280' }}>Haz clic para seleccionar</div><div style={{ fontSize:11, color:'#9ca3af' }}>PDF, JPG, JPEG · máx. 10 MB</div></div>
                }
                <input id="file-receta" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && setArchivoNuevo(e.target.files[0])} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => { setSubiendoReceta(false); setArchivoNuevo(null) }}
                  style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', color:'#6b7280' }}>Cancelar</button>
                <button onClick={subirReceta} disabled={!archivoNuevo}
                  style={{ padding:'7px 16px', border:'none', borderRadius:8, background:archivoNuevo?'#3B6D11':'#9ca3af', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Enviar para revisión →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
