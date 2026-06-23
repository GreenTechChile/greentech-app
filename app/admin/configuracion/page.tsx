'use client'
import { useState, useEffect, useRef } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'
import { CIUDADES, COMUNAS_POR_CIUDAD } from '@/lib/comunas'

interface Cobertura {
  id: string
  ciudad: string
  comuna: string
  activa: boolean
}

interface DatosCorp {
  nombre: string
  rut: string
  inscripcion: string
  domicilio: string
  email: string
  telefono: string
  presidente: string
  secretario: string
  tesorero: string
  vigencia: string
}

interface DocInstitucional {
  key: string
  label: string
  descripcion: string
  icono: string
  requerido: boolean
}

const DOCS_INSTITUCIONALES: DocInstitucional[] = [
  { key: 'estatutos', label: 'Estatutos / Acta de constitución', descripcion: 'Documento fundacional de la corporación', icono: '📜', requerido: true },
  { key: 'rut', label: 'RUT corporación (SII)', descripcion: 'Inscripción al Rol Único Tributario', icono: '🏛️', requerido: true },
  { key: 'certificado_vigencia', label: 'Certificado de vigencia', descripcion: 'Emitido por el Registro Civil', icono: '✅', requerido: true },
  { key: 'certificado_directorio', label: 'Certificado de directorio', descripcion: 'Nómina vigente de la directiva', icono: '👥', requerido: true },
  { key: 'reglamento_interno', label: 'Reglamento interno', descripcion: 'Documento interno de funcionamiento', icono: '📋', requerido: true },
  { key: 'protocolo_dispensacion', label: 'Protocolo de dispensación', descripcion: 'Procedimiento de entrega a socios', icono: '🌿', requerido: true },
  { key: 'protocolo_envios', label: 'Protocolo de envíos', descripcion: 'Procedimiento de despachos y delivery', icono: '🚚', requerido: true },
  { key: 'protocolo_sumarios', label: 'Protocolo de sumarios internos', descripcion: 'Procedimiento disciplinario interno', icono: '⚖️', requerido: false },
  { key: 'seguro', label: 'Póliza de seguro', descripcion: 'Seguro de instalaciones o responsabilidad civil', icono: '🛡️', requerido: false },
  { key: 'resolucion_sanitaria', label: 'Resolución sanitaria', descripcion: 'Autorización de la autoridad sanitaria si aplica', icono: '🏥', requerido: false },
  { key: 'otros', label: 'Otros documentos', descripcion: 'Documentos adicionales relevantes', icono: '📁', requerido: false },
]

export default function Configuracion() {
  const [tabActiva, setTabActiva] = useState<'corporacion' | 'cobertura' | 'notificaciones' | 'documentos'>('corporacion')
  const [cobertura, setCobertura] = useState<Cobertura[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  // Documentos institucionales
  const [docsSubidos, setDocsSubidos] = useState<Record<string, {name: string, url: string, size: number, updated_at: string}>>({})
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Actas de asambleas
  interface Acta { name: string; url: string; size: number; fecha: string; titulo: string }
  const [actas, setActas] = useState<Acta[]>([])
  const [mostrandoFormActa, setMostrandoFormActa] = useState(false)
  const [nuevaActaFecha, setNuevaActaFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevaActaTitulo, setNuevaActaTitulo] = useState('')
  const [nuevaActaFile, setNuevaActaFile] = useState<File | null>(null)
  const [subiendoActa, setSubiendoActa] = useState(false)
  const [eliminandoActa, setEliminandoActa] = useState<string | null>(null)
  const [confirmEliminarActa, setConfirmEliminarActa] = useState<string | null>(null)
  const fileActaRef = useRef<HTMLInputElement | null>(null)

  const [rutError, setRutError] = useState('')
  const [editando, setEditando] = useState(false)
  const [datosBancarios, setDatosBancarios] = useState({ banco:'', tipo_cuenta:'', numero_cuenta:'', titular:'', rut_titular:'' })
  const [editandoBanco, setEditandoBanco] = useState(false)
  const [guardandoBanco, setGuardandoBanco] = useState(false)
  const [envioGratis, setEnvioGratis] = useState({ activo: false, monto_minimo: 100000 })
  const [editandoEnvio, setEditandoEnvio] = useState(false)
  const [guardandoEnvio, setGuardandoEnvio] = useState(false)
  const [pagoIncorporacion, setPagoIncorporacion] = useState({ monto: 25000 })
  const [editandoPago, setEditandoPago] = useState(false)
  const [guardandoPago, setGuardandoPago] = useState(false)

  const validarRut = (rut: string): boolean => {
    if (!rut || rut.trim() === '') return true
    const clean = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase()
    if (clean.length < 2) return false
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    if (!/^\d+$/.test(body)) return false
    let sum = 0, mul = 2
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * mul
      mul = mul === 7 ? 2 : mul + 1
    }
    const expected = 11 - (sum % 11)
    const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
    return dv === dvCalc
  }

  const formatearRut = (raw: string): string => {
    const clean = raw.replace(/[^0-9kK]/g, '')
    if (clean.length < 2) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1).toUpperCase()
    return body + '-' + dv
  }

  const [corp, setCorp] = useState<DatosCorp>({
    nombre: 'Asociación de Usuarios de Plantas Medicinales GreenTech',
    rut: '',
    inscripcion: '390054 · 19-02-2026',
    domicilio: 'Monjitas 527 oficina 1207, Santiago',
    email: 'velopp@gmail.com',
    telefono: '+56 9 8502 6822',
    presidente: 'Patricio Osvaldo Veloso Alcota · 10.836.787-3',
    secretario: 'Juan Carlos Armijo Vásquez · 13.770.824-8',
    tesorero: 'Daniel Flavio Armijo Herrera · 13.550.645-1',
    vigencia: '19-02-2026 · Renovar en asamblea',
  })

  const [notifs, setNotifs] = useState({
    stockBajo: true,
    recetaVence: true,
    confirmDispensacion: true,
    nuevaSolicitud: true,
    plazoAprobacion: true,
  })

  useEffect(() => { cargarCobertura(); cargarCorporacion(); cargarDatosBancarios(); cargarEnvioGratis(); cargarPagoIncorporacion() }, [])
  useEffect(() => { if (tabActiva === 'documentos') { cargarDocsInstitucionales(); cargarActas() } }, [tabActiva])

  const cargarCobertura = async () => {
    setLoading(true)
    const { data } = await supabase.from('cobertura').select('*').order('ciudad').order('comuna')
    if (data) {
      setCobertura(data)
      if (data.length > 0 && !ciudadSeleccionada) setCiudadSeleccionada(data[0].ciudad)
    }
    setLoading(false)
  }

  const cargarDatosBancarios = async () => {
    const { data } = await supabase.from('configuracion').select('datos').eq('id', 'banco').single()
    if (data?.datos) setDatosBancarios(prev => ({ ...prev, ...data.datos }))
  }

  const guardarDatosBancarios = async () => {
    setGuardandoBanco(true)
    const { error } = await supabase.from('configuracion').upsert({ id:'banco', datos: datosBancarios, updated_at: new Date().toISOString() })
    if (!error) { setEditandoBanco(false); setMensaje('✅ Datos bancarios guardados') }
    else setMensaje('❌ Error al guardar datos bancarios')
    setGuardandoBanco(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cargarEnvioGratis = async () => {
    const { data } = await supabase.from('configuracion').select('datos').eq('id', 'envio_gratis').single()
    if (data?.datos) setEnvioGratis(prev => ({ ...prev, ...data.datos }))
  }

  const guardarEnvioGratis = async () => {
    setGuardandoEnvio(true)
    const { error } = await supabase.from('configuracion').upsert({ id:'envio_gratis', datos: envioGratis, updated_at: new Date().toISOString() })
    if (!error) { setEditandoEnvio(false); setMensaje('✅ Configuración de envío guardada') }
    else setMensaje('❌ Error al guardar')
    setGuardandoEnvio(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cargarPagoIncorporacion = async () => {
    const { data } = await supabase.from('configuracion').select('datos').eq('id', 'pago_incorporacion').single()
    if (data?.datos) setPagoIncorporacion(prev => ({ ...prev, ...data.datos }))
  }

  const guardarPagoIncorporacion = async () => {
    setGuardandoPago(true)
    const { error } = await supabase.from('configuracion').upsert({ id:'pago_incorporacion', datos: pagoIncorporacion, updated_at: new Date().toISOString() })
    if (!error) { setEditandoPago(false); setMensaje('✅ Monto de incorporación guardado') }
    else setMensaje('❌ Error al guardar')
    setGuardandoPago(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cargarCorporacion = async () => {
    const { data } = await supabase.from('configuracion').select('datos').eq('id', 'corporacion').single()
    if (data?.datos) setCorp(prev => ({ ...prev, ...data.datos }))
  }

  const guardarCorporacion = async () => {
    if (corp.rut && !validarRut(corp.rut)) {
      setRutError('RUT inválido. Verifica el dígito verificador.')
      return
    }
    setRutError('')
    setGuardando(true)
    const { error } = await supabase
      .from('configuracion')
      .upsert({ id: 'corporacion', datos: corp, updated_at: new Date().toISOString() })
    if (error) {
      setMensaje('❌ Error al guardar. Verifica que la tabla configuracion existe.')
    } else {
      setMensaje('✅ Datos de la corporación guardados correctamente')
      setEditando(false)
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cargarDocsInstitucionales = async () => {
    try {
      const { data } = await supabase.storage.from('documentos-corporacion').list('institucional', { limit: 100 })
      if (data) {
        const mapa: Record<string, {name: string, url: string, size: number, updated_at: string}> = {}
        for (const file of data) {
          // Ignorar carpetas (no tienen extensión o son .emptyFolderPlaceholder)
          if (!file.name.includes('.') || file.name === '.emptyFolderPlaceholder') continue
          // El nombre del archivo es key_timestamp.extension — extraemos el key base
          const keyDoc = file.name.replace(/_\d{4}-\d{2}-.*$/, '').replace(/\..*$/, '')
          const { data: urlData } = await supabase.storage
            .from('documentos-corporacion')
            .createSignedUrl(`institucional/${file.name}`, 3600)
          if (urlData?.signedUrl) {
            mapa[keyDoc] = {
              name: file.name,
              url: urlData.signedUrl,
              size: file.metadata?.size || 0,
              updated_at: file.updated_at || file.created_at || '',
            }
          }
        }
        setDocsSubidos(mapa)
      }
    } catch {
      // bucket puede no existir aún, no es error crítico
    }
  }

  const cargarActas = async () => {
    try {
      const { data } = await supabase.storage.from('documentos-corporacion').list('actas', { limit: 200, sortBy: { column: 'updated_at', order: 'desc' } })
      if (!data) return
      const lista: Acta[] = []
      for (const file of data) {
        if (!file.name.includes('.') || file.name === '.emptyFolderPlaceholder') continue
        const { data: urlData } = await supabase.storage
          .from('documentos-corporacion')
          .createSignedUrl(`actas/${file.name}`, 3600)
        if (!urlData?.signedUrl) continue
        // Formato nombre: acta_YYYY-MM-DD_titulo-sanitizado.ext
        const sinExt = file.name.replace(/\.[^.]+$/, '')
        const partes = sinExt.split('_')
        const fecha = partes[1] || ''
        const titulo = partes.slice(2).join(' ').replace(/-/g, ' ') || file.name
        lista.push({ name: file.name, url: urlData.signedUrl, size: file.metadata?.size || 0, fecha, titulo })
      }
      setActas(lista)
    } catch { /* bucket puede no tener carpeta actas aún */ }
  }

  const subirActa = async () => {
    if (!nuevaActaFile || !nuevaActaFecha) return
    setSubiendoActa(true)
    setMensaje('')
    try {
      const ext = nuevaActaFile.name.split('.').pop()
      const tituloSanitizado = (nuevaActaTitulo || 'asamblea').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const nombre = `acta_${nuevaActaFecha}_${tituloSanitizado}.${ext}`
      const { error } = await supabase.storage
        .from('documentos-corporacion')
        .upload(`actas/${nombre}`, nuevaActaFile, { upsert: true, contentType: nuevaActaFile.type })
      if (error) throw error
      setMostrandoFormActa(false)
      setNuevaActaTitulo('')
      setNuevaActaFile(null)
      await cargarActas()
      setMensaje('✅ Acta subida correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch {
      setMensaje('❌ Error al subir el acta.')
      setTimeout(() => setMensaje(''), 5000)
    } finally {
      setSubiendoActa(false)
    }
  }

  const eliminarActa = async (name: string) => {
    setEliminandoActa(name)
    try {
      await supabase.storage.from('documentos-corporacion').remove([`actas/${name}`])
      setActas(prev => prev.filter(a => a.name !== name))
      setConfirmEliminarActa(null)
      setMensaje('✅ Acta eliminada')
      setTimeout(() => setMensaje(''), 3000)
    } catch {
      setMensaje('❌ Error al eliminar')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setEliminandoActa(null)
    }
  }

  const subirDocumento = async (key: string, file: File) => {
    setSubiendo(key)
    setMensaje('')
    try {
      const ext = file.name.split('.').pop()
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      // Guardar con timestamp para mantener historial: key_2026-06-08T17-00-00.pdf
      const path = `institucional/${key}_${ts}.${ext}`
      const { error } = await supabase.storage
        .from('documentos-corporacion')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data: urlData } = await supabase.storage
        .from('documentos-corporacion')
        .createSignedUrl(path, 3600)
      if (urlData?.signedUrl) {
        setDocsSubidos(prev => ({
          ...prev,
          [key]: { name: `${key}_${ts}.${ext}`, url: urlData.signedUrl, size: file.size, updated_at: new Date().toISOString() }
        }))
      }
      setMensaje('✅ Nueva versión del documento guardada en el historial')
      setTimeout(() => setMensaje(''), 3000)
    } catch {
      setMensaje('❌ Error al subir el documento. Verifica que el bucket "documentos-corporacion" existe en Supabase Storage.')
      setTimeout(() => setMensaje(''), 6000)
    } finally {
      setSubiendo(null)
    }
  }


  const formatBytes = (b: number) => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${Math.round(b/1024)} KB`
  const formatFecha = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const ciudadesEnDB = [...new Set(cobertura.map(c => c.ciudad))]
  const comunasEnDB = cobertura.filter(c => c.ciudad === ciudadSeleccionada)
  const comunasActivas = (ciudad: string) => cobertura.filter(c => c.ciudad === ciudad && c.activa).length
  const totalComunas = (ciudad: string) => cobertura.filter(c => c.ciudad === ciudad).length

  const toggleComuna = (item: Cobertura) => {
    setCobertura(prev => prev.map(c => c.id === item.id ? { ...c, activa: !c.activa } : c))
  }
  const selectAll = (ciudad: string, valor: boolean) => {
    setCobertura(prev => prev.map(c => c.ciudad === ciudad ? { ...c, activa: valor } : c))
  }
  const agregarCiudad = async (ciudad: string) => {
    if (ciudadesEnDB.includes(ciudad)) return
    const comunas = COMUNAS_POR_CIUDAD[ciudad] || []
    const nuevas = comunas.map(comuna => ({ ciudad, comuna, activa: false }))
    const { data, error } = await supabase.from('cobertura').insert(nuevas).select()
    if (!error && data) {
      setCobertura(prev => [...prev, ...data])
      setCiudadSeleccionada(ciudad)
      setMensaje(`✅ ${ciudad} agregada.`)
      setTimeout(() => setMensaje(''), 4000)
    }
  }
  const eliminarCiudad = async (ciudad: string) => {
    const { error } = await supabase.from('cobertura').delete().eq('ciudad', ciudad)
    if (!error) {
      setCobertura(prev => prev.filter(c => c.ciudad !== ciudad))
      if (ciudadSeleccionada === ciudad) {
        const restantes = ciudadesEnDB.filter(c => c !== ciudad)
        setCiudadSeleccionada(restantes[0] || '')
      }
      setMensaje(`✅ ${ciudad} eliminada de la cobertura`)
      setConfirmEliminar(null)
      setTimeout(() => setMensaje(''), 3000)
    }
  }
  const guardarCobertura = async () => {
    setGuardando(true)
    try {
      for (const item of cobertura) {
        await supabase.from('cobertura').update({ activa: item.activa }).eq('id', item.id)
      }
      setMensaje('✅ Cobertura guardada correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch {
      setMensaje('❌ Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }


  const s = {
    input: (edit = true) => ({ width: '100%', padding: '8px 10px', border: edit ? '1px solid #d1d5db' : '1px solid transparent', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, background: edit ? '#fff' : '#f3f4f6', color: edit ? '#111' : '#6b7280', cursor: edit ? 'text' : 'default' }),
    label: { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 },
    field: { display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 12 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  }

  const requeridos = DOCS_INSTITUCIONALES.filter(d => d.requerido)
  const subidosRequeridos = requeridos.filter(d => docsSubidos[d.key]).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' as const, background: '#fff' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Configuración</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Parámetros generales del sistema, cobertura geográfica y preferencias</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : '#F5C5C5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : '#A32D2D', marginBottom: 16 }}>
            {mensaje}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          {[
            { key: 'corporacion', label: '🏛️ Corporación' },
            { key: 'cobertura', label: '🗺️ Cobertura geográfica' },
            { key: 'documentos', label: '📂 Documentos' },
            { key: 'notificaciones', label: '🔔 Notificaciones' },
          ].map(t => (
            <button key={t.key} onClick={() => setTabActiva(t.key as typeof tabActiva)}
              style={{ padding: '8px 18px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tabActiva === t.key ? '2px solid #185FA5' : '2px solid transparent', color: tabActiva === t.key ? '#185FA5' : '#6b7280', fontWeight: tabActiva === t.key ? 600 : 400, marginBottom: -1, whiteSpace: 'nowrap' as const }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB CORPORACIÓN ── */}
        {tabActiva === 'corporacion' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, margin:0 }}>Datos de la corporación</h3>
              {!editando ? (
                <button onClick={() => setEditando(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', border:'1px solid #185FA5', borderRadius:8, background:'#fff', color:'#185FA5', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Editar
                </button>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setEditando(false); setRutError(''); cargarCorporacion() }}
                    style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#6b7280', fontSize:13, cursor:'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={guardarCorporacion} disabled={guardando}
                    style={{ padding:'7px 16px', border:'none', borderRadius:8, background: guardando ? '#9ca3af' : '#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor: guardando ? 'not-allowed' : 'pointer' }}>
                    {guardando ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>Nombre legal</label>
              <input style={s.input(editando)} value={corp.nombre} readOnly={!editando}
                onChange={e => editando && setCorp(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>RUT corporación</label>
                {editando ? (
                  <>
                    <input
                      style={{ ...s.input(true), borderColor: rutError ? '#E24B4A' : corp.rut && validarRut(corp.rut) ? '#97C459' : '#d1d5db' }}
                      value={corp.rut}
                      placeholder="Ej: 65271661-K"
                      onChange={e => {
                        const val = formatearRut(e.target.value)
                        setCorp(p => ({ ...p, rut: val }))
                        if (val && !validarRut(val)) setRutError('RUT inválido. Verifica el dígito verificador.')
                        else setRutError('')
                      }}
                      onBlur={() => setRutError(corp.rut && !validarRut(corp.rut) ? 'RUT inválido. Verifica el dígito verificador.' : '')}
                    />
                    {rutError && <span style={{ fontSize:11, color:'#E24B4A', marginTop:2 }}>{rutError}</span>}
                    {!rutError && corp.rut && validarRut(corp.rut) && <span style={{ fontSize:11, color:'#3B6D11', marginTop:2 }}>✓ RUT válido</span>}
                    {!corp.rut && <span style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Dejar vacío si aún está en trámite</span>}
                  </>
                ) : (
                  <input style={s.input(false)} value={corp.rut || '—'} readOnly />
                )}
              </div>
              <div style={s.field}>
                <label style={s.label}>Nº inscripción</label>
                <input style={s.input(editando)} value={corp.inscripcion} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, inscripcion: e.target.value }))} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Domicilio legal</label>
              <input style={s.input(editando)} value={corp.domicilio} readOnly={!editando}
                onChange={e => editando && setCorp(p => ({ ...p, domicilio: e.target.value }))} />
            </div>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>Correo corporativo</label>
                <input style={s.input(editando)} value={corp.email} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Teléfono</label>
                <input style={s.input(editando)} value={corp.telefono} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, telefono: e.target.value }))} />
              </div>
            </div>
            <h3 style={{ fontSize:14, fontWeight:600, margin:'20px 0 14px' }}>Directiva actual</h3>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>Presidente</label>
                <input style={s.input(editando)} value={corp.presidente} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, presidente: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Secretario</label>
                <input style={s.input(editando)} value={corp.secretario} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, secretario: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Tesorero</label>
                <input style={s.input(editando)} value={corp.tesorero} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, tesorero: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Vigencia directiva</label>
                <input style={s.input(editando)} value={corp.vigencia} readOnly={!editando}
                  onChange={e => editando && setCorp(p => ({ ...p, vigencia: e.target.value }))} />
              </div>
            </div>
            {!editando && (
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:8, textAlign:'right' }}>
                Haz clic en ✏️ Editar para modificar los datos
              </div>
            )}

            {/* ── Envío gratis ── */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>🚚 Envío gratis por monto mínimo</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Cuando el pedido supere el monto indicado, el envío no se cobra</div>
                </div>
                {!editandoEnvio ? (
                  <button onClick={() => setEditandoEnvio(true)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', border:'1px solid #185FA5', borderRadius:8, background:'#fff', color:'#185FA5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    ✏️ Editar
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setEditandoEnvio(false); cargarEnvioGratis() }}
                      style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#6b7280', fontSize:12, cursor:'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={guardarEnvioGratis} disabled={guardandoEnvio}
                      style={{ padding:'6px 14px', border:'none', borderRadius:8, background: guardandoEnvio ? '#9ca3af' : '#185FA5', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {guardandoEnvio ? 'Guardando...' : '💾 Guardar'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ position:'relative', width:44, height:24, borderRadius:12, background: envioGratis.activo ? '#3B6D11' : '#d1d5db', cursor: editandoEnvio ? 'pointer' : 'default', transition:'0.2s' }}
                    onClick={() => editandoEnvio && setEnvioGratis(prev => ({ ...prev, activo: !prev.activo }))}>
                    <div style={{ position:'absolute', top:2, left: envioGratis.activo ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'0.2s' }}/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color: envioGratis.activo ? '#3B6D11' : '#6b7280' }}>
                    {envioGratis.activo ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>Monto mínimo para envío gratis</div>
                  {editandoEnvio ? (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:13, color:'#6b7280' }}>$</span>
                      <input type="number" value={envioGratis.monto_minimo}
                        onChange={e => setEnvioGratis(prev => ({ ...prev, monto_minimo: parseInt(e.target.value) || 0 }))}
                        style={{ width:120, padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none' }} />
                      <span style={{ fontSize:11, color:'#9ca3af' }}>CLP</span>
                    </div>
                  ) : (
                    <div style={{ fontSize:15, fontWeight:600, color: envioGratis.activo ? '#3B6D11' : '#9ca3af' }}>
                      ${envioGratis.monto_minimo.toLocaleString('es-CL')}
                      {!envioGratis.activo && <span style={{ fontSize:11, fontWeight:400, marginLeft:8 }}>(inactivo)</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Pago de incorporación ── */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>💳 Pago de incorporación</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Monto que deben pagar los nuevos socios al inscribirse</div>
                </div>
                {!editandoPago ? (
                  <button onClick={() => setEditandoPago(true)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', border:'1px solid #185FA5', borderRadius:8, background:'#fff', color:'#185FA5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    ✏️ Editar
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setEditandoPago(false); cargarPagoIncorporacion() }}
                      style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#6b7280', fontSize:12, cursor:'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={guardarPagoIncorporacion} disabled={guardandoPago}
                      style={{ padding:'6px 14px', border:'none', borderRadius:8, background: guardandoPago ? '#9ca3af' : '#185FA5', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {guardandoPago ? 'Guardando...' : '💾 Guardar'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ fontSize:24, flexShrink:0 }}>🌿</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>Monto de incorporación</div>
                  {editandoPago ? (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:13, color:'#6b7280' }}>$</span>
                      <input type="number" value={pagoIncorporacion.monto}
                        onChange={e => setPagoIncorporacion(prev => ({ ...prev, monto: parseInt(e.target.value) || 0 }))}
                        style={{ width:140, padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none' }} />
                      <span style={{ fontSize:11, color:'#9ca3af' }}>CLP</span>
                    </div>
                  ) : (
                    <div style={{ fontSize:20, fontWeight:700, color:'#3B6D11' }}>
                      ${pagoIncorporacion.monto.toLocaleString('es-CL')} CLP
                    </div>
                  )}
                </div>
                <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'8px 14px', fontSize:11, color:'#3B6D11', textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontWeight:600 }}>Pago único</div>
                  <div>por incorporación</div>
                </div>
              </div>
            </div>

            {/* ── Datos bancarios ── */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>🏦 Cuenta bancaria de la asociación</div>
                {!editandoBanco ? (
                  <button onClick={() => setEditandoBanco(true)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', border:'1px solid #185FA5', borderRadius:8, background:'#fff', color:'#185FA5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    ✏️ Editar
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setEditandoBanco(false); cargarDatosBancarios() }}
                      style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#6b7280', fontSize:12, cursor:'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={guardarDatosBancarios} disabled={guardandoBanco}
                      style={{ padding:'6px 14px', border:'none', borderRadius:8, background: guardandoBanco ? '#9ca3af' : '#185FA5', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {guardandoBanco ? 'Guardando...' : '💾 Guardar'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[
                  { label:'Banco', field:'banco', placeholder:'Ej: BancoEstado' },
                  { label:'Tipo de cuenta', field:'tipo_cuenta', placeholder:'Ej: Cuenta Vista' },
                  { label:'Número de cuenta', field:'numero_cuenta', placeholder:'Ej: 12345678' },
                  { label:'Titular', field:'titular', placeholder:'Ej: Asociación GreenTech' },
                  { label:'RUT titular', field:'rut_titular', placeholder:'Ej: 65.271.661-K' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>{label}</div>
                    {editandoBanco ? (
                      <input style={{ width:'100%', padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                        value={datosBancarios[field as keyof typeof datosBancarios]}
                        placeholder={placeholder}
                        onChange={e => setDatosBancarios(prev => ({ ...prev, [field]: e.target.value }))} />
                    ) : (
                      <div style={{ fontSize:13, fontWeight:500, color: datosBancarios[field as keyof typeof datosBancarios] ? '#111' : '#d1d5db', background:'#f9fafb', padding:'7px 10px', borderRadius:8 }}>
                        {datosBancarios[field as keyof typeof datosBancarios] || '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB DOCUMENTOS ── */}
        {tabActiva === 'documentos' && (
          <div>
            {/* Resumen cumplimiento */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: subidosRequeridos === requeridos.length ? '#EAF3DE' : '#FAEEDA', border: `1px solid ${subidosRequeridos === requeridos.length ? '#97C459' : '#FAC775'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 28 }}>{subidosRequeridos === requeridos.length ? '✅' : '⚠️'}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: subidosRequeridos === requeridos.length ? '#3B6D11' : '#633806' }}>
                  {subidosRequeridos}/{requeridos.length} documentos obligatorios subidos
                </div>
                <div style={{ fontSize: 11, color: subidosRequeridos === requeridos.length ? '#3B6D11' : '#633806', marginTop: 2 }}>
                  {subidosRequeridos === requeridos.length
                    ? 'Carpeta institucional completa'
                    : 'Faltan documentos requeridos para la operación legal de la corporación'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Total subidos</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>{Object.keys(docsSubidos).length}</div>
              </div>
            </div>

            {/* Listado documentos */}
            <div style={{ display: 'grid', gap: 10 }}>
              {DOCS_INSTITUCIONALES.map(doc => {
                const subido = docsSubidos[doc.key]
                const cargando = subiendo === doc.key
                return (
                  <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `1px solid ${subido ? '#97C459' : doc.requerido ? '#FAC775' : '#e5e7eb'}`, borderRadius: 10, background: subido ? '#f6fdf0' : '#fff' }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{doc.icono}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{doc.label}</span>
                        {doc.requerido && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: subido ? '#EAF3DE' : '#FAEEDA', color: subido ? '#3B6D11' : '#633806' }}>
                            {subido ? 'Requerido ✓' : 'Requerido'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{doc.descripcion}</div>
                      {subido && (
                        <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span>📎 {subido.name}</span>
                          <span style={{ color: '#9ca3af' }}>·</span>
                          <span>{formatBytes(subido.size)}</span>
                          <span style={{ color: '#9ca3af' }}>·</span>
                          <span>Subido {formatFecha(subido.updated_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      {subido && (
                        <>
                          <a href={subido.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #97C459', borderRadius: 7, background: '#EAF3DE', color: '#3B6D11', textDecoration: 'none', fontWeight: 500 }}>
                            👁 Ver
                          </a>
                          <a href={subido.url} download
                            style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #A8CBF0', borderRadius: 7, background: '#E6F1FB', color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>
                            ⬇ Descargar
                          </a>
                        </>
                      )}

                      {/* Subir / Actualizar */}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        ref={el => { fileInputRefs.current[doc.key] = el }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento(doc.key, f); e.target.value = '' }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[doc.key]?.click()}
                        disabled={cargando}
                        style={{ fontSize: 12, padding: '6px 14px', border: 'none', borderRadius: 7, background: cargando ? '#9ca3af' : subido ? '#f3f4f6' : '#185FA5', color: cargando ? '#fff' : subido ? '#374151' : '#fff', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                        {cargando ? '⏳ Subiendo...' : subido ? '↩ Actualizar' : '⬆ Subir'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── ACTAS DE ASAMBLEAS ── */}
            <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>📋 Actas de Asambleas</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Registro oficial de las actas de asamblea de socios</div>
                </div>
                <button
                  onClick={() => { setMostrandoFormActa(true); setNuevaActaTitulo(''); setNuevaActaFile(null) }}
                  style={{ fontSize: 12, padding: '8px 16px', border: 'none', borderRadius: 8, background: '#185FA5', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                  + Nueva acta
                </button>
              </div>

              {/* Formulario nueva acta */}
              {mostrandoFormActa && (
                <div style={{ background: '#f0f7ff', border: '1px solid #A8CBF0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#185FA5', marginBottom: 14 }}>Nueva acta de asamblea</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Fecha de la asamblea</label>
                      <input
                        type="date"
                        value={nuevaActaFecha}
                        onChange={e => setNuevaActaFecha(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Título / descripción</label>
                      <input
                        type="text"
                        placeholder="Ej: Asamblea ordinaria anual, Elección directiva..."
                        value={nuevaActaTitulo}
                        onChange={e => setNuevaActaTitulo(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Documento (PDF, Word)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      ref={fileActaRef}
                      onChange={e => setNuevaActaFile(e.target.files?.[0] || null)}
                      style={{ fontSize: 12 }}
                    />
                    {nuevaActaFile && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{nuevaActaFile.name}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={subirActa}
                      disabled={subiendoActa || !nuevaActaFile || !nuevaActaFecha}
                      style={{ fontSize: 13, padding: '8px 18px', border: 'none', borderRadius: 8, background: (subiendoActa || !nuevaActaFile || !nuevaActaFecha) ? '#9ca3af' : '#185FA5', color: '#fff', cursor: (subiendoActa || !nuevaActaFile || !nuevaActaFecha) ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                      {subiendoActa ? '⏳ Subiendo...' : '⬆ Subir acta'}
                    </button>
                    <button
                      onClick={() => setMostrandoFormActa(false)}
                      style={{ fontSize: 13, padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de actas */}
              {actas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af', fontSize: 13, border: '1px dashed #e5e7eb', borderRadius: 10 }}>
                  No hay actas registradas aún
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {actas.map(acta => (
                    <div key={acta.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>📋</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{acta.titulo || acta.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          {acta.fecha ? new Date(acta.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                          {acta.size > 0 && ` · ${(acta.size / 1024 / 1024).toFixed(1)} MB`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <a href={acta.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#f9fafb', color: '#374151', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>
                          👁 Ver
                        </a>
                        {confirmEliminarActa === acta.name ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => eliminarActa(acta.name)} disabled={eliminandoActa === acta.name} style={{ fontSize: 12, padding: '6px 10px', border: 'none', borderRadius: 7, background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>
                              {eliminandoActa === acta.name ? '...' : 'Eliminar'}
                            </button>
                            <button onClick={() => setConfirmEliminarActa(null)} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmEliminarActa(acta.name)} style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #fecaca', borderRadius: 7, background: '#fff5f5', color: '#A32D2D', cursor: 'pointer' }}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB COBERTURA ── */}
        {tabActiva === 'cobertura' && (
          <div>
            <div style={{ background: '#E6F1FB', border: '1px solid #A8CBF0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#0C447C', marginBottom: 20, lineHeight: 1.6 }}>
              ℹ️ Las ciudades y comunas activas serán las únicas disponibles en el formulario de inscripción.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Ciudades con cobertura</div>
                {ciudadesEnDB.map(ciudad => (
                  <div key={ciudad} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: ciudadSeleccionada === ciudad ? '#E6F1FB' : '#f9fafb', border: `1px solid ${ciudadSeleccionada === ciudad ? '#A8CBF0' : '#e5e7eb'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCiudadSeleccionada(ciudad)}>
                        <div style={{ fontSize: 13, fontWeight: ciudadSeleccionada === ciudad ? 600 : 400, color: ciudadSeleccionada === ciudad ? '#185FA5' : '#111' }}>{ciudad}</div>
                        <div style={{ fontSize: 10, color: comunasActivas(ciudad) > 0 ? '#3B6D11' : '#9ca3af' }}>
                          {comunasActivas(ciudad)}/{totalComunas(ciudad)} comunas activas
                        </div>
                      </div>
                      {confirmEliminar === ciudad ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => eliminarCiudad(ciudad)} style={{ fontSize: 10, padding: '2px 6px', border: 'none', borderRadius: 4, background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>Sí</button>
                          <button onClick={() => setConfirmEliminar(null)} style={{ fontSize: 10, padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmEliminar(ciudad)} style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px 4px', borderRadius: 4 }}>🗑️</button>
                      )}
                    </div>
                    {confirmEliminar === ciudad && (
                      <div style={{ fontSize: 10, color: '#A32D2D', marginTop: 4 }}>¿Eliminar {ciudad} y todas sus comunas?</div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Agregar ciudad</div>
                  <select defaultValue="" onChange={e => { if (e.target.value) agregarCiudad(e.target.value); e.target.value = '' }}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', outline: 'none', boxSizing: 'border-box' as const }}>
                    <option value="">+ Seleccionar ciudad...</option>
                    {CIUDADES.filter(c => !ciudadesEnDB.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                {!ciudadSeleccionada ? (
                  <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 12 }}>
                    Selecciona una ciudad para gestionar sus comunas
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        Comunas de {ciudadSeleccionada}
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>{comunasEnDB.filter(c => c.activa).length} de {comunasEnDB.length} activas</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => selectAll(ciudadSeleccionada, true)} style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #3B6D11', borderRadius: 6, background: 'transparent', color: '#3B6D11', cursor: 'pointer' }}>Activar todas</button>
                        <button onClick={() => selectAll(ciudadSeleccionada, false)} style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>Desactivar todas</button>
                      </div>
                    </div>
                    {loading ? (
                      <div style={{ fontSize: 13, color: '#9ca3af' }}>Cargando comunas...</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                        {comunasEnDB.map(item => (
                          <div key={item.id} onClick={() => toggleComuna(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${item.activa ? '#97C459' : '#e5e7eb'}`, background: item.activa ? '#EAF3DE' : '#fff', cursor: 'pointer', userSelect: 'none' as const }}>
                            <input type="checkbox" checked={item.activa} onChange={() => {}} style={{ accentColor: '#3B6D11', width: 14, height: 14, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: item.activa ? '#3B6D11' : '#374151', fontWeight: item.activa ? 500 : 400 }}>{item.comuna}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Los cambios se reflejan en el formulario de inscripción al guardar</span>
              <button onClick={guardarCobertura} disabled={guardando}
                style={{ background: guardando ? '#9ca3af' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB NOTIFICACIONES ── */}
        {tabActiva === 'notificaciones' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Notificaciones del sistema</h3>
            {[
              { key: 'stockBajo', label: 'Alerta stock bajo (menos de 20 gr por cepa)', desc: 'Notifica al admin cuando una cepa baja de 20 gr disponibles' },
              { key: 'recetaVence', label: 'Alerta receta próxima a vencer (60 días)', desc: 'Avisa al socio y al admin cuando una receta vence en menos de 60 días' },
              { key: 'confirmDispensacion', label: 'Correo de confirmación de dispensación', desc: 'Envía comprobante al correo del socio tras cada pago' },
              { key: 'nuevaSolicitud', label: 'Notificación de nueva solicitud de ingreso', desc: 'Alerta al presidente cuando llega una nueva solicitud' },
              { key: 'plazoAprobacion', label: 'Alerta plazo de aprobación (4 días)', desc: 'Recuerda al presidente que quedan 24 hrs para responder una solicitud' },
            ].map((n) => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{n.desc}</div>
                </div>
                <div onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                  style={{ width: 36, height: 20, borderRadius: 10, background: notifs[n.key as keyof typeof notifs] ? '#3B6D11' : '#d1d5db', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: '0.2s' }}>
                  <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: notifs[n.key as keyof typeof notifs] ? 18 : 2, transition: '0.2s' }} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={async () => { setGuardando(true); await new Promise(r=>setTimeout(r,500)); setMensaje('✅ Preferencias guardadas'); setGuardando(false); setTimeout(()=>setMensaje(''),3000) }}
                style={{ background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
