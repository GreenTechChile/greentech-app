'use client'
import { useState, useEffect, useRef } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

interface Socio {
  id: string; rut: string; nombre: string; email: string; telefono: string
  direccion: string; casa_depto: string; comuna: string; ciudad: string
  estado_civil: string; profesion: string; diagnostico: string
  diagnostico_secundario: string; medico_nombre: string; medico_rut: string
  folio_receta: string; cuota_mensual: number; gramos_delegados: number
  vencimiento_receta: string; estado: string; rol: string
  notas_admin: string; created_at: string
  aprobado_por?: string; aprobado_at?: string
  delegacion_nueva_cuota?: number; delegacion_pdf_url?: string; delegacion_estado?: string
}

// Qué documentos firmados se requieren antes de poder aprobar
const DOCS_FIRMA = [
  { label: 'Contrato de previsión y delegación', storageKey: 'contrato', firmaKey: 'contrato_firmado' },
  { label: 'Declaración jurada de ingreso',       storageKey: 'declaracion_jurada', firmaKey: 'declaracion_jurada_firmada' },
]

export default function AdminSocios() {
  const [tab, setTab] = useState<'pendientes'|'aprobados'|'rechazados'|'renovaciones'|'pagos_incompletos'>('pendientes')
  const [recetas, setRecetas] = useState<any[]>([])
  const [filtroRecetas, setFiltroRecetas] = useState<'pendiente'|'todas'>('pendiente')
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState<Record<string,string>>({})
  const [procesando, setProcesando] = useState<string|null>(null)
  const [mensaje, setMensaje] = useState('')
  const [expandido, setExpandido] = useState<string|null>(null)

  // { [socioId]: { contrato_firmado: true/false, declaracion_jurada_firmada: true/false } }
  const [firmados, setFirmados] = useState<Record<string, Record<string,boolean>>>({})
  const [subiendo, setSubiendo] = useState<Record<string,boolean>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement|null>>({})
  const [motivosRechazo, setMotivosRechazo] = useState<Record<string,string>>({})
  const [rechazandoRecetaId, setRechazandoRecetaId] = useState<string|null>(null)
  const [pagosIncompletos, setPagosIncompletos] = useState<any[]>([])
  const [tabCounts, setTabCounts] = useState<Record<string,number>>({})


  useEffect(() => { cargarConteos() }, [])
  useEffect(() => { cargarSocios() }, [tab, filtroRecetas])

  const cargarConteos = async () => {
    const [
      { count: pendientes },
      { count: renovaciones },
      { data: pagos },
      { count: delegaciones },
    ] = await Promise.all([
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('recetas_pendientes').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('pagos_incorporacion').select('rut').eq('estado', 'aprobado'),
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('delegacion_estado', 'pendiente_firma'),
    ])
    let incompletos = 0
    if (pagos && pagos.length > 0) {
      const ruts = pagos.map((p: any) => p.rut).filter(Boolean)
      const { data: sociosExist } = await supabase.from('socios').select('rut').in('rut', ruts.length > 0 ? ruts : ['__ninguno__'])
      const rutsCompletos = new Set((sociosExist || []).map((s: any) => s.rut))
      incompletos = pagos.filter((p: any) => !rutsCompletos.has(p.rut)).length
    }
    const totalPendiente = (pendientes || 0) + (renovaciones || 0) + incompletos + (delegaciones || 0)
    setTabCounts({ pendientes: pendientes || 0, renovaciones: renovaciones || 0, pagos_incompletos: incompletos, delegaciones: delegaciones || 0, total_pendiente: totalPendiente })
  }

  const cargarSocios = async () => {
    setLoading(true)
    if (tab === 'renovaciones') {
      let query = supabase
        .from('recetas_pendientes')
        .select('*, socios(nombre, rut, email)')
        .order('created_at', { ascending: false })
      if (filtroRecetas === 'pendiente') query = query.eq('estado', 'pendiente')
      const { data } = await query
      setRecetas(data || [])
    } else if (tab === 'pagos_incompletos') {
      // Buscar pagos aprobados cuyo RUT no tiene registro en socios
      const { data: pagos } = await supabase
        .from('pagos_incorporacion')
        .select('*')
        .eq('estado', 'aprobado')
        .order('fecha', { ascending: false })
      if (pagos && pagos.length > 0) {
        const ruts = pagos.map((p: any) => p.rut).filter(Boolean)
        const { data: sociosExistentes } = await supabase
          .from('socios')
          .select('rut')
          .in('rut', ruts.length > 0 ? ruts : ['__ninguno__'])
        const rutsCompletos = new Set((sociosExistentes || []).map((s: any) => s.rut))
        setPagosIncompletos(pagos.filter((p: any) => !rutsCompletos.has(p.rut)))
      } else {
        setPagosIncompletos([])
      }
    } else if (tab === 'delegaciones') {
      const { data } = await supabase.from('socios').select('*, delegacion_nueva_cuota, delegacion_pdf_url, delegacion_estado').eq('delegacion_estado', 'pendiente_firma').order('created_at', { ascending: false })
      if (data) setSocios(data)
    } else {
      const estadoMap = { pendientes: 'pendiente', aprobados: 'activo', rechazados: 'rechazado' }
      const { data } = await supabase.from('socios').select('*, delegacion_nueva_cuota, delegacion_pdf_url, delegacion_estado').eq('estado', estadoMap[tab as 'pendientes'|'aprobados'|'rechazados']).order('created_at', { ascending: false })
      if (data) setSocios(data)
    }
    setLoading(false)
  }

  // Verifica en storage si los documentos firmados ya fueron subidos
  const verificarFirmados = async (socio: Socio) => {
    const resultados: Record<string,boolean> = {}
    for (const doc of DOCS_FIRMA) {
      const { data } = await supabase.storage.from('documentos').list(socio.rut, { search: doc.firmaKey })
      resultados[doc.firmaKey] = !!(data && data.length > 0)
    }
    setFirmados(prev => ({ ...prev, [socio.id]: resultados }))
  }

  const toggleExpandido = async (socio: Socio) => {
    const abierto = expandido === socio.id
    setExpandido(abierto ? null : socio.id)
    if (!abierto && tab === 'pendientes') {
      await verificarFirmados(socio)
    }
  }

  // Descarga el PDF original (sin firma)
  const bajarDoc = async (e: React.MouseEvent, rut: string, storageKey: string) => {
    e.stopPropagation()
    for (const ext of ['pdf','jpg','jpeg','png']) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(`${rut}/${storageKey}.${ext}`, 60)
      if (data?.signedUrl) {
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = `${storageKey}.${ext}`
        a.click()
        return
      }
    }
    alert('Documento no encontrado.')
  }

  // Sube el documento ya firmado
  const subirFirmado = async (socio: Socio, firmaKey: string, file: File) => {
    const subiendoKey = `${socio.id}_${firmaKey}`
    setSubiendo(prev => ({ ...prev, [subiendoKey]: true }))
    try {
      const { error } = await supabase.storage.from('documentos').upload(
        `${socio.rut}/${firmaKey}.pdf`,
        file,
        { contentType: 'application/pdf', upsert: true }
      )
      if (error) throw error
      setFirmados(prev => ({
        ...prev,
        [socio.id]: { ...prev[socio.id], [firmaKey]: true }
      }))
    } catch (err) {
      alert(`Error al subir: ${err instanceof Error ? err.message : 'Intenta nuevamente'}`)
    } finally {
      setSubiendo(prev => ({ ...prev, [subiendoKey]: false }))
    }
  }

  const ambosDocsFirmados = (socioId: string) => {
    const f = firmados[socioId]
    if (!f) return false
    return DOCS_FIRMA.every(d => f[d.firmaKey] === true)
  }

  const aprobar = async (socio: Socio) => {
    setProcesando(socio.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const nombreAdmin = user?.user_metadata?.nombre || user?.email || user?.user_metadata?.rut || 'Admin'
      const res = await fetch('/api/aprobar-socio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socioId: socio.id, notas: notas[socio.id] || null, aprobadoPor: nombreAdmin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al aprobar')
      setMensaje(`✅ ${socio.nombre} aprobado. Usuario creado automáticamente. Contraseña temporal: ${data.tempPassword}`)
      setSocios(prev => prev.filter(s => s.id !== socio.id))
    } catch (err) {
      setMensaje(`❌ Error al aprobar: ${err instanceof Error ? err.message : 'Intenta nuevamente.'}`)
    } finally {
      setProcesando(null)
      setTimeout(() => setMensaje(''), 10000)
    }
  }

  const rechazar = async (socio: Socio) => {
    setProcesando(socio.id)
    const { data: { user } } = await supabase.auth.getUser()
    const nombreAdmin = user?.user_metadata?.nombre || user?.email || user?.user_metadata?.rut || 'Admin'
    await supabase.from('socios').update({
      estado: 'rechazado',
      notas_admin: notas[socio.id] || null,
      aprobado_por: nombreAdmin,
      aprobado_at: new Date().toISOString(),
    }).eq('id', socio.id)
    setMensaje(`Solicitud de ${socio.nombre} rechazada.`)
    setSocios(prev => prev.filter(s => s.id !== socio.id))
    setProcesando(null)
    setTimeout(() => setMensaje(''), 4000)
    // Registrar igualmente el ingreso — el pago ya fue cobrado aunque se rechace
    try {
      const { data: configPago } = await supabase.from('configuracion').select('datos').eq('id', 'pago_incorporacion').single()
      const monto: number = configPago?.datos?.monto ?? 25000
      const ahora = new Date()
      await supabase.from('movimientos_financieros').insert({
        tipo: 'ingreso',
        categoria: 'Incorporación',
        concepto: `Pago de incorporación (rechazado) — ${socio.nombre} (${socio.rut})`,
        monto,
        socio_id: socio.id,
        mes: ahora.getMonth() + 1,
        año: ahora.getFullYear(),
      })
    } catch (finErr) {
      console.error('[rechazar] error registrando movimiento financiero:', finErr)
    }
    try {
      const motivo = notas[socio.id] || 'No se especificó motivo.'
      await sendEmail('rechazo_solicitud', socio.email, { nombre: socio.nombre, motivo })
    } catch (emailErr) {
      console.error('[rechazar] email error:', emailErr)
    }
  }

  // Genera URL firmada desde la URL pública almacenada (bucket es privado)
  const verReceta = async (archivoUrl: string) => {
    try {
      // Extraer el path relativo del bucket desde la URL completa
      const match = archivoUrl.match(/\/documentos\/(.+)$/)
      if (!match) { window.open(archivoUrl, '_blank'); return }
      const path = match[1]
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 120)
      if (error || !data?.signedUrl) throw new Error('No se pudo generar el enlace')
      window.open(data.signedUrl, '_blank')
    } catch {
      setMensaje('❌ No se pudo abrir el archivo. Intenta nuevamente.')
      setTimeout(() => setMensaje(''), 4000)
    }
  }

  const aprobarReceta = async (receta: any) => {
    setProcesando(receta.id)
    try {
      const socio = receta.socios
      const { data: { user } } = await supabase.auth.getUser()
      const nombreAdmin = user?.user_metadata?.nombre || user?.email || user?.user_metadata?.rut || 'Admin'
      // 1. Actualizar datos médicos del socio
      await supabase.from('socios').update({
        diagnostico: receta.diagnostico,
        diagnostico_secundario: receta.diagnostico_secundario,
        medico_nombre: receta.medico_nombre,
        medico_rut: receta.medico_rut,
        folio_receta: receta.folio_receta,
        vencimiento_receta: receta.vencimiento_receta,
        cuota_mensual: receta.cuota_mensual,
      }).eq('id', receta.socio_id)
      // 2. Marcar receta como aprobada + audit trail
      await supabase.from('recetas_pendientes').update({
        estado: 'aprobada',
        aprobado_por: nombreAdmin,
        aprobado_at: new Date().toISOString(),
      }).eq('id', receta.id)
      // 3. Email al socio
      try {
        await sendEmail('receta_aprobada', socio.email, { nombre: socio.nombre, rut: socio.rut, vencimiento: receta.vencimiento_receta })
      } catch {}
      setMensaje(`✅ Receta de ${socio.nombre} aprobada por ${nombreAdmin}. Datos médicos actualizados.`)
      cargarSocios()
      cargarConteos()
    } catch (e: any) {
      setMensaje('❌ Error: ' + e.message)
    } finally {
      setProcesando(null)
      setTimeout(() => setMensaje(''), 5000)
    }
  }

  const rechazarReceta = async (receta: any, motivo: string) => {
    if (!motivo.trim()) { setMensaje('❌ Debes ingresar un motivo de rechazo.'); return }
    setProcesando(receta.id)
    try {
      const socio = receta.socios
      const { data: { user } } = await supabase.auth.getUser()
      const nombreAdmin = user?.user_metadata?.nombre || user?.email || user?.user_metadata?.rut || 'Admin'
      // Conservar nota de contrato si existe, agregar motivo de rechazo aparte
      const notaExistente = receta.notas_admin?.startsWith('⚠️') ? receta.notas_admin + '\n' : ''
      await supabase.from('recetas_pendientes').update({
        estado: 'rechazada',
        motivo_rechazo: motivo,
        notas_admin: notaExistente + `Rechazado: ${motivo}`,
        aprobado_por: nombreAdmin,
        aprobado_at: new Date().toISOString(),
      }).eq('id', receta.id)
      try {
        await sendEmail('receta_rechazada', socio.email, { nombre: socio.nombre, rut: socio.rut, motivo })
      } catch {}
      setMensaje(`✅ Receta de ${socio.nombre} rechazada por ${nombreAdmin}.`)
      setRechazandoRecetaId(null)
      cargarSocios()
      cargarConteos()
    } catch (e: any) {
      setMensaje('❌ Error: ' + e.message)
    } finally {
      setProcesando(null)
      setTimeout(() => setMensaje(''), 5000)
    }
  }

  const diasDesde = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / (1000*60*60*24))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0, background: '#fff' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Solicitudes de ingreso</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Revisa los antecedentes y aprueba o rechaza cada solicitud</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : mensaje.startsWith('❌') ? '#FCEBEB' : '#f9fafb', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : mensaje.startsWith('❌') ? '#F5C5C5' : '#e5e7eb'}`, borderRadius: 8, padding: '12px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : mensaje.startsWith('❌') ? '#A32D2D' : '#374151', marginBottom: 16, lineHeight: 1.6 }}>
            {mensaje}
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'pendientes', label: 'Pendientes', countKey: 'total_pendiente', badgeColor: '#A32D2D', badgeBg: '#FCEBEB' },
            { key: 'aprobados', label: 'Aprobados', countKey: '', badgeColor: '', badgeBg: '' },
            { key: 'rechazados', label: 'Rechazados', countKey: '', badgeColor: '', badgeBg: '' },
            { key: 'renovaciones', label: '🩺 Renovaciones', countKey: 'renovaciones', badgeColor: '#92400E', badgeBg: '#FEF3C7' },
            { key: 'pagos_incompletos', label: '💳 Pagos incompletos', countKey: 'pagos_incompletos', badgeColor: '#92400E', badgeBg: '#FEF3C7' },
            { key: 'delegaciones', label: '📋 Delegaciones', countKey: 'delegaciones', badgeColor: '#92400E', badgeBg: '#FEF3C7' },
          ].map(t => {
            const count = t.countKey ? tabCounts[t.countKey] : 0
            return (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                style={{ padding: '8px 18px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === t.key ? '2px solid #185FA5' : '2px solid transparent', color: tab === t.key ? '#185FA5' : '#6b7280', fontWeight: tab === t.key ? 600 : 400, marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.label}
                {count > 0 && (
                  <span style={{ background: t.badgeBg, color: t.badgeColor, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: 1.6 }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Panel de pagos incompletos ── */}
        {tab === 'pagos_incompletos' && (
          loading ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando...</div>
          ) : pagosIncompletos.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>✅ No hay pagos sin inscripción completada</div>
          ) : (
            <div>
              <div style={{ background: '#FFF3CD', border: '1px solid #FBBF24', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 18 }}>
                ⚠️ Estas personas realizaron el pago de incorporación pero <strong>no completaron el formulario de inscripción</strong>. Considera contactarlas para que finalicen el proceso.
              </div>
              {pagosIncompletos.map((p: any) => {
                const dias = diasDesde(p.fecha || p.created_at)
                return (
                  <div key={p.id} style={{ border: '1px solid #FBBF24', borderRadius: 12, marginBottom: 12, overflow: 'hidden', background: '#FFFDF0' }}>
                    <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nombre || '—'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.rut} {p.email ? `· ${p.email}` : ''}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Pagó hace {dias} días · ${(p.monto || 0).toLocaleString('es-CL')} CLP
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{ background: dias > 7 ? '#FEE2E2' : '#FEF3C7', color: dias > 7 ? '#991B1B' : '#92400E', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
                          {dias > 7 ? '🔴 Sin completar hace ' + dias + ' días' : '🟡 Pendiente · ' + dias + ' días'}
                        </span>
                        {p.email && (
                          <a href={`mailto:${p.email}?subject=Tu%20solicitud%20de%20ingreso%20a%20GreenTech&body=Hola%20${encodeURIComponent(p.nombre || '')}%2C%20realizaste%20el%20pago%20de%20incorporaci%C3%B3n%20pero%20a%C3%BAn%20no%20has%20completado%20el%20formulario%20de%20inscripci%C3%B3n.%20Puedes%20continuar%20en%3A%20https%3A%2F%2Fgreentech.vercel.app%2Finscripcion`}
                            style={{ fontSize: 11, color: '#185FA5', textDecoration: 'none', border: '1px solid #185FA5', padding: '4px 10px', borderRadius: 6 }}>
                            ✉️ Enviar recordatorio
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '8px 18px 12px', fontSize: 11, color: '#9ca3af', borderTop: '1px solid #FDE68A' }}>
                      ID pago: {p.mp_payment_id} · {new Date(p.fecha || p.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Panel de delegaciones pendientes ── */}
        {tab === 'delegaciones' && (() => {
          const pendDelegaciones = socios
          return loading ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando...</div>
          ) : pendDelegaciones.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>✅ No hay contratos de delegación pendientes de firma</div>
          ) : (
            <div>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 18 }}>
                📋 Estos socios solicitaron actualizar su contrato de delegación de cultivo. Descarga el PDF, gestiona la firma y sube la versión firmada.
              </div>
              {pendDelegaciones.map((socio: any) => (
                <div key={socio.id} style={{ border: '1px solid #FED7AA', borderRadius: 12, marginBottom: 12, overflow: 'hidden', background: '#FFFDF0' }}>
                  <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{socio.nombre}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{socio.rut} · {socio.email}</div>
                      <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>
                        Delegación actual: <strong>{socio.gramos_delegados}g</strong> → Nueva solicitud: <strong>{socio.delegacion_nueva_cuota}g</strong>
                      </div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
                      ⏳ Pendiente de firma
                    </span>
                  </div>
                  <div style={{ padding: '10px 18px 14px', borderTop: '1px solid #FDE68A', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <button onClick={async () => {
                      const { data } = await supabase.storage.from('documentos').createSignedUrl(`${socio.rut}/contrato_renovacion.pdf`, 120)
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                      else alert('No se pudo obtener el enlace del contrato.')
                    }} style={{ padding: '7px 14px', border: '1px solid #D97706', borderRadius: 8, background: '#fff', color: '#D97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ⬇ Descargar contrato
                    </button>
                    <label style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: '#3B6D11', color: '#EAF3DE', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ⬆ Subir firmado
                      <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const { error } = await supabase.storage.from('documentos').upload(`${socio.rut}/contrato_firmado.pdf`, file, { contentType: 'application/pdf', upsert: true })
                        if (error) { alert('Error al subir: ' + error.message); return }
                        await supabase.from('socios').update({
                          delegacion_estado: 'firmado',
                          gramos_delegados: socio.delegacion_nueva_cuota,
                        }).eq('id', socio.id)
                        setMensaje(`✅ Contrato de ${socio.nombre} subido. Gramos delegados actualizados a ${socio.delegacion_nueva_cuota}g.`)
                        setTimeout(() => setMensaje(''), 6000)
                        cargarSocios()
                        cargarConteos()
                        e.target.value = ''
                      }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* ── Panel de renovaciones de receta ── */}
        {tab === 'renovaciones' && (
          <>
          {/* Selector pendientes / historial */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {([['pendiente', 'Pendientes'], ['todas', 'Historial completo']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFiltroRecetas(val)}
                style={{ padding: '5px 14px', fontSize: 12, borderRadius: 20, border: '1px solid', cursor: 'pointer',
                  background: filtroRecetas === val ? '#185FA5' : '#fff',
                  color: filtroRecetas === val ? '#fff' : '#6b7280',
                  borderColor: filtroRecetas === val ? '#185FA5' : '#d1d5db' }}>
                {label}
              </button>
            ))}
          </div>
          {loading ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando...</div>
          ) : recetas.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>✅ No hay renovaciones pendientes</div>
          ) : recetas.map(r => {
            const socio = r.socios
            const esRechazando = rechazandoRecetaId === r.id
            const estadoBadge = r.estado === 'aprobada'
              ? { label: '✅ Aprobada', bg: '#EAF3DE', color: '#3B6D11' }
              : r.estado === 'rechazada'
              ? { label: '❌ Rechazada', bg: '#FEE2E2', color: '#991B1B' }
              : null
            return (
              <div key={r.id} style={{ border: `1px solid ${r.estado === 'pendiente' ? '#e5e7eb' : r.estado === 'aprobada' ? '#97C459' : '#F5C5C5'}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {socio?.nombre}
                      {estadoBadge && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: estadoBadge.bg, color: estadoBadge.color }}>{estadoBadge.label}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{socio?.rut} · {socio?.email}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Enviada hace {diasDesde(r.created_at)} días</div>
                  </div>
                  {r.archivo_url && (
                    <button onClick={() => verReceta(r.archivo_url)}
                      style={{ padding: '6px 12px', border: '1px solid #185FA5', borderRadius: 7, fontSize: 12, color: '#185FA5', background: '#fff', cursor: 'pointer' }}>
                      📄 Ver receta
                    </button>
                  )}
                </div>
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Diagnóstico', val: r.diagnostico },
                    { label: 'Diagnóstico secundario', val: r.diagnostico_secundario || '—' },
                    { label: 'Médico', val: r.medico_nombre },
                    { label: 'RUT médico', val: r.medico_rut },
                    { label: 'Folio', val: r.folio_receta },
                    { label: 'Vencimiento', val: r.vencimiento_receta ? new Date(r.vencimiento_receta).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) : '—' },
                    { label: 'Cuota propuesta', val: `${r.cuota_mensual} gr/mes` },
                    { label: 'Observaciones', val: r.observaciones || '—' },
                    { label: 'Hash SHA-256', val: r.hash_sha256 ? r.hash_sha256.slice(0, 16) + '...' : '—' },
                  ].map((f, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{f.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-all' }}>{f.val}</div>
                    </div>
                  ))}
                </div>
                {r.notas_admin && r.notas_admin.startsWith('⚠️') && (
                  <div style={{ padding: '10px 18px', background: '#FFF7ED', borderTop: '1px solid #FED7AA', fontSize: 12, color: '#92400E', fontWeight: 500 }}>
                    {r.notas_admin}
                  </div>
                )}
                {r.estado === 'pendiente' && <div style={{ padding: '12px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                  {!esRechazando ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => aprobarReceta(r)} disabled={procesando === r.id}
                        style={{ padding: '7px 18px', border: 'none', borderRadius: 8, background: procesando === r.id ? '#9ca3af' : '#3B6D11', color: '#EAF3DE', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {procesando === r.id ? 'Procesando...' : '✅ Aprobar receta'}
                      </button>
                      <button onClick={() => setRechazandoRecetaId(r.id)} disabled={procesando === r.id}
                        style={{ padding: '7px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#A32D2D', fontSize: 13, cursor: 'pointer' }}>
                        ❌ Rechazar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={motivosRechazo[r.id] || ''}
                        onChange={e => setMotivosRechazo(p => ({...p, [r.id]: e.target.value}))}
                        placeholder="Motivo del rechazo (se enviará por email)"
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 }} />
                      <button onClick={() => rechazarReceta(r, motivosRechazo[r.id] || '')}
                        disabled={!motivosRechazo[r.id] || procesando === r.id}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: motivosRechazo[r.id] ? '#A32D2D' : '#9ca3af', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                        Confirmar
                      </button>
                      <button onClick={() => setRechazandoRecetaId(null)}
                        style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>}
                {/* Pie: quién procesó / motivo de rechazo */}
                {r.estado !== 'pendiente' && (r.aprobado_por || r.motivo_rechazo) && (
                  <div style={{ padding: '8px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa', fontSize: 11, color: '#6b7280' }}>
                    {r.aprobado_por && <span>Procesado por <strong>{r.aprobado_por}</strong>{r.aprobado_at ? ` · ${new Date(r.aprobado_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</span>}
                    {r.motivo_rechazo && <span style={{ color: '#A32D2D', marginLeft: r.aprobado_por ? 12 : 0 }}>Motivo: {r.motivo_rechazo}</span>}
                  </div>
                )}
              </div>
            )
          })
          }
          </>
        )}

        {/* ── Panel de socios (pendientes / aprobados / rechazados) ── */}
        {tab !== 'renovaciones' && tab !== 'pagos_incompletos' && (loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando solicitudes...</div>
        ) : socios.length === 0 ? (
          <div>
            {tab === 'pendientes' && (tabCounts.renovaciones > 0 || tabCounts.pagos_incompletos > 0) ? (
              <div>
                <div style={{ fontSize: 13, color: '#9ca3af', padding: '24px 0 16px', textAlign: 'center' }}>✅ No hay solicitudes de ingreso nuevas</div>
                {tabCounts.renovaciones > 0 && (
                  <button onClick={() => setTab('renovaciones')} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: '#FFFBF5', border: '1px solid #EF9F27', borderRadius: 10, marginBottom: 10, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 22 }}>🩺</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{tabCounts.renovaciones} renovación{tabCounts.renovaciones > 1 ? 'es' : ''} de receta pendiente{tabCounts.renovaciones > 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Clic para revisar en el tab Renovaciones →</div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{tabCounts.renovaciones}</span>
                  </button>
                )}
                {tabCounts.pagos_incompletos > 0 && (
                  <button onClick={() => setTab('pagos_incompletos')} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: '#FFFDF0', border: '1px solid #FBBF24', borderRadius: 10, marginBottom: 10, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 22 }}>💳</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{tabCounts.pagos_incompletos} pago{tabCounts.pagos_incompletos > 1 ? 's' : ''} de inscripción sin completar</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Clic para revisar en el tab Pagos incompletos →</div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{tabCounts.pagos_incompletos}</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>
                {tab === 'pendientes' ? '✅ No hay solicitudes pendientes' : 'No hay registros'}
              </div>
            )}
          </div>
        ) : socios.map(socio => {
          const dias = diasDesde(socio.created_at)
          const urgente = dias >= 4 && tab === 'pendientes'
          const abierto = expandido === socio.id
          const listoParaAprobar = ambosDocsFirmados(socio.id)

          return (
            <div key={socio.id} style={{ border: `1px solid ${urgente ? '#F5C5C5' : '#e5e7eb'}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>

              {/* Header */}
              <div
                onClick={() => toggleExpandido(socio)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: urgente ? '#FFF8F8' : '#f9fafb', borderBottom: abierto ? '1px solid #e5e7eb' : 'none', cursor: 'pointer' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#185FA5', flexShrink: 0 }}>
                  {socio.nombre.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{socio.nombre}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>RUT {socio.rut} · {socio.email} · {socio.telefono}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: tab === 'pendientes' ? '#FAEEDA' : tab === 'aprobados' ? '#EAF3DE' : '#FCEBEB', color: tab === 'pendientes' ? '#633806' : tab === 'aprobados' ? '#3B6D11' : '#A32D2D' }}>
                    {tab === 'pendientes' ? 'Pendiente' : tab === 'aprobados' ? 'Aprobado' : 'Rechazado'}
                  </span>
                  <div style={{ fontSize: 11, color: urgente ? '#A32D2D' : '#9ca3af', marginTop: 3 }}>
                    {urgente ? `⚠️ Hace ${dias} días` : `Hace ${dias} día${dias !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{abierto ? '▲' : '▼'}</span>
              </div>

              {/* Body */}
              {abierto && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: tab === 'pendientes' ? '1px solid #e5e7eb' : 'none' }}>
                    <div style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Datos personales</div>
                      {[{k:'Estado civil',v:socio.estado_civil},{k:'Profesión',v:socio.profesion},{k:'Dirección',v:`${socio.direccion}${socio.casa_depto?', '+socio.casa_depto:''}`},{k:'Comuna / Ciudad',v:`${socio.comuna}, ${socio.ciudad}`}].map((r,i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.k}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Información médica</div>
                      {[{k:'Diagnóstico',v:socio.diagnostico},{k:'Médico',v:socio.medico_nombre},{k:'RUT médico',v:socio.medico_rut},{k:'Folio receta',v:socio.folio_receta},{k:'Cuota autorizada',v:`${socio.cuota_mensual} gr / mes`},{k:'Gramos delegados',v:`${socio.gramos_delegados} gr / mes`},{k:'Venc. receta',v:socio.vencimiento_receta}].map((r,i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.k}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Documentos</div>

                      {/* Documentos normales (solo Ver) */}
                      {[
                        { label: 'Cédula — Anverso',       key: 'cedula_anverso' },
                        { label: 'Cédula — Reverso',        key: 'cedula_reverso' },
                        { label: 'Receta médica vigente',   key: 'receta' },
                        { label: 'Cert. antecedentes',      key: 'antecedentes' },
                      ].map((d,i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                          <span>📄</span>
                          <span style={{ flex: 1 }}>{d.label}</span>
                          <button onClick={async (e) => {
                            e.stopPropagation()
                            for (const ext of ['pdf','jpg','jpeg','png']) {
                              const { data } = await supabase.storage.from('documentos').createSignedUrl(`${socio.rut}/${d.key}.${ext}`, 60)
                              if (data?.signedUrl) {
                                const w = window.screen.width * 0.4
                                const h = window.screen.height * 0.42
                                const left = (window.screen.width - w) / 2
                                const top = (window.screen.height - h) / 2
                                window.open(data.signedUrl, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`)
                                return
                              }
                            }
                            alert('Documento no encontrado.')
                          }} style={{ fontSize: 10, background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer' }}>
                            Ver
                          </button>
                        </div>
                      ))}

                      {/* Documentos que requieren firma manual */}
                      {DOCS_FIRMA.map((d,i) => {
                        const firmado = firmados[socio.id]?.[d.firmaKey]
                        const subiendoKey = `${socio.id}_${d.firmaKey}`
                        const estaSubiendo = subiendo[subiendoKey]
                        return (
                          <div key={i} style={{ background: firmado ? '#EAF3DE' : '#f9fafb', border: `1px solid ${firmado ? '#97C459' : '#e5e7eb'}`, borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                            {/* Fila principal */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 12 }}>
                              <span>📋</span>
                              <span style={{ flex: 1 }}>{d.label}</span>
                              {firmado
                                ? <span style={{ fontSize: 10, background: '#3B6D11', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>✓ Firmado</span>
                                : <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', padding: '2px 8px', borderRadius: 20 }}>Pendiente firma</span>
                              }
                            </div>
                            {/* Fila botones: solo en tab pendientes */}
                            {tab === 'pendientes' && (
                              <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px', alignItems: 'center' }}>
                                {/* Bajar original */}
                                <button
                                  onClick={(e) => bajarDoc(e, socio.rut, d.storageKey)}
                                  style={{ flex: 1, fontSize: 11, padding: '4px 0', background: '#E6F1FB', color: '#185FA5', border: '1px solid #A8CBF0', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                                  ⬇ Bajar para firmar
                                </button>
                                {/* Subir firmado */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); fileInputRefs.current[subiendoKey]?.click() }}
                                  disabled={estaSubiendo}
                                  style={{ flex: 1, fontSize: 11, padding: '4px 0', background: estaSubiendo ? '#9ca3af' : firmado ? '#EAF3DE' : '#fff', color: estaSubiendo ? '#fff' : firmado ? '#3B6D11' : '#374151', border: `1px solid ${firmado ? '#97C459' : '#e5e7eb'}`, borderRadius: 6, cursor: estaSubiendo ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                                  {estaSubiendo ? '⏳ Subiendo...' : firmado ? '↑ Reemplazar firmado' : '⬆ Subir firmado'}
                                </button>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  style={{ display: 'none' }}
                                  ref={el => { fileInputRefs.current[subiendoKey] = el }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (file) await subirFirmado(socio, d.firmaKey, file)
                                    e.target.value = ''
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Reglamento */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#EAF3DE', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                        <span>✅</span>
                        <span style={{ flex: 1 }}>Reglamento aceptado en línea</span>
                        <span style={{ fontSize: 10, background: '#3B6D11', color: '#EAF3DE', padding: '2px 8px', borderRadius: 20 }}>Firmado</span>
                      </div>

                      {/* Aviso si faltan documentos firmados (solo pendientes) */}
                      {tab === 'pendientes' && !listoParaAprobar && (
                        <div style={{ fontSize: 11, color: '#92400e', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '6px 8px', marginTop: 4 }}>
                          ⚠️ Sube ambos documentos firmados para habilitar la aprobación.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer acciones */}
                  {tab === 'pendientes' && (
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
                      <input type="text" placeholder="Notas internas (opcional, solo visibles para la directiva)..."
                        value={notas[socio.id] || ''} onChange={e => setNotas(prev => ({...prev,[socio.id]:e.target.value}))}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }}/>
                      <button onClick={(e) => { e.stopPropagation(); rechazar(socio) }} disabled={procesando === socio.id}
                        style={{ padding: '7px 16px', border: '1px solid #A32D2D', borderRadius: 8, background: 'transparent', color: '#A32D2D', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        ✕ Rechazar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (listoParaAprobar) aprobar(socio) }}
                        disabled={procesando === socio.id || !listoParaAprobar}
                        title={!listoParaAprobar ? 'Sube el contrato y la declaración firmados primero' : ''}
                        style={{ padding: '7px 16px', border: 'none', borderRadius: 8, background: procesando === socio.id ? '#9ca3af' : !listoParaAprobar ? '#d1d5db' : '#3B6D11', color: !listoParaAprobar ? '#6b7280' : '#EAF3DE', fontSize: 12, cursor: procesando === socio.id || !listoParaAprobar ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                        {procesando === socio.id ? 'Procesando...' : '✓ Aprobar'}
                      </button>
                    </div>
                  )}
                  {/* ── Delegación de cultivo pendiente (solo Aprobados) ── */}
                  {tab === 'aprobados' && socio.delegacion_estado === 'pendiente_firma' && (
                    <div style={{ padding: '12px 16px', background: '#FFF7ED', borderTop: '1px solid #FED7AA' }}>
                      <div style={{ fontWeight: 600, color: '#92400E', fontSize: 12, marginBottom: 8 }}>
                        📋 Actualización de contrato de delegación pendiente de firma
                      </div>
                      <div style={{ fontSize: 12, color: '#78350F', marginBottom: 10 }}>
                        El socio solicitó actualizar su delegación a <strong>{socio.delegacion_nueva_cuota}g</strong> (actual: {socio.gramos_delegados}g).
                        Descarga el contrato generado, envíalo a firmar y sube la versión firmada.
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                        <button onClick={async (e) => {
                          e.stopPropagation()
                          const { data } = await supabase.storage.from('documentos').createSignedUrl(`${socio.rut}/contrato_renovacion.pdf`, 120)
                          if (data?.signedUrl) {
                            const a = document.createElement('a')
                            a.href = data.signedUrl
                            a.download = `contrato_delegacion_${socio.rut}.pdf`
                            a.click()
                          } else { alert('Documento no encontrado en storage.') }
                        }} style={{ fontSize: 11, padding: '6px 12px', background: '#E6F1FB', color: '#185FA5', border: '1px solid #A8CBF0', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                          ⬇ Descargar contrato
                        </button>
                        <label style={{ fontSize: 11, padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                          ⬆ Subir firmado
                          <input type="file" accept="application/pdf" style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const { error } = await supabase.storage.from('documentos').upload(`${socio.rut}/contrato_firmado.pdf`, file, { contentType: 'application/pdf', upsert: true })
                              if (error) { alert('Error al subir: ' + error.message); return }
                              await supabase.from('socios').update({
                                delegacion_estado: 'firmado',
                                gramos_delegados: socio.delegacion_nueva_cuota,
                              }).eq('id', socio.id)
                              setMensaje(`✅ Contrato de ${socio.nombre} subido. Gramos delegados actualizados a ${socio.delegacion_nueva_cuota}g.`)
                              setTimeout(() => setMensaje(''), 6000)
                              cargarSocios()
                              e.target.value = ''
                            }} />
                        </label>
                      </div>
                    </div>
                  )}

                  {tab !== 'pendientes' && (socio.notas_admin || socio.aprobado_por) && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {socio.aprobado_por && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{tab === 'aprobados' ? '✅' : '✕'}</span>
                          <span style={{ fontWeight: 500, color: tab === 'aprobados' ? '#3B6D11' : '#A32D2D' }}>
                            {tab === 'aprobados' ? 'Aprobado' : 'Rechazado'} por {socio.aprobado_por}
                            {socio.aprobado_at && (
                              <span style={{ fontWeight: 400, color: '#9ca3af' }}>
                                {' '}· {new Date(socio.aprobado_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {socio.notas_admin && <div>📝 Nota: {socio.notas_admin}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }))}
      </main>
    </div>
  )
}
