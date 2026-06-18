'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Tarea {
  id: string
  categoria: string
  titulo: string
  detalle: string
  referencia: string
  plazo: string | null
  prioridad: 'alta' | 'media' | 'baja'
}

const TAREAS: Tarea[] = [
  { id: 'u1', categoria: '🔴 Urgente', titulo: 'Designar Comisión Revisora de Cuentas', detalle: 'Ente externo imparcial mediante resolución fundada del Directorio', referencia: 'Acta 001 punto 5 / Art. 36° Estatutos', plazo: '2026-11-15', prioridad: 'alta' },
  { id: 'u2', categoria: '🔴 Urgente', titulo: 'Designar Comisión de Ética', detalle: 'Ente externo imparcial mediante resolución fundada del Directorio', referencia: 'Acta 001 punto 5 / Art. 38° Estatutos', plazo: '2026-11-15', prioridad: 'alta' },
  { id: 'u3', categoria: '🔴 Urgente', titulo: 'Enterar patrimonio inicial $1.500.000', detalle: 'Aporte en bienes muebles por parte del Presidente conforme a escritura', referencia: 'Art. 42° Estatutos / SII folio 15276029', plazo: '2028-02-19', prioridad: 'alta' },
  { id: 'f1', categoria: '📄 Firma documentos', titulo: 'Firmar Acta N° 001 — Primera Asamblea General Ordinaria', detalle: 'Firmas de los 3 directivos + 3 socios asistentes como testigos', referencia: 'Art. 20° Estatutos', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f2', categoria: '📄 Firma documentos', titulo: 'Firmar Reglamento Interno v2', detalle: 'Firma del Presidente y Secretario como constancia de aprobación en asamblea', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f3', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Dispensación v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f4', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Envíos de Dispensaciones v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f5', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Sumarios Internos v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'a1', categoria: '📲 App — Documentos', titulo: 'Subir Estatutos / Acta de Constitución', detalle: 'PDF del Adobe Scan ya disponible', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a2', categoria: '📲 App — Documentos', titulo: 'Subir RUT corporación SII', detalle: 'PDF folio 15276029 ya disponible', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a3', categoria: '📲 App — Documentos', titulo: 'Obtener y subir Certificado de Vigencia', detalle: 'Obtener desde Registro Civil, luego subir a la app', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'alta' },
  { id: 'a4', categoria: '📲 App — Documentos', titulo: 'Obtener y subir Certificado de Directorio', detalle: 'Obtener desde Registro Civil, luego subir a la app', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'alta' },
  { id: 'a5', categoria: '📲 App — Documentos', titulo: 'Subir Acta N° 001 firmada', detalle: 'Versión firmada física escaneada', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a6', categoria: '📲 App — Documentos', titulo: 'Subir Reglamento Interno v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a7', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Dispensación v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a8', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Despachos v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a9', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Sumarios v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 't1', categoria: '🌐 Tecnología', titulo: 'Verificar propagación DNS de OVH', detalle: 'Nameservers ya configurados en NIC Chile: dns19.ovh.net / ns19.ovh.net', referencia: 'NIC Chile → asociaciongreentech.cl', plazo: null, prioridad: 'alta' },
  { id: 't2', categoria: '🌐 Tecnología', titulo: 'Conectar dominio asociaciongreentech.cl a Vercel', detalle: 'Una vez propagado el DNS', referencia: 'Vercel → Domains', plazo: null, prioridad: 'alta' },
  { id: 't3', categoria: '🌐 Tecnología', titulo: 'Agregar registros DNS de Resend en OVH', detalle: 'Para verificar dominio de correo transaccional', referencia: 'OVHcloud DNS Manager', plazo: null, prioridad: 'alta' },
  { id: 't4', categoria: '🌐 Tecnología', titulo: 'Activar correo contacto@asociaciongreentech.cl', detalle: 'Configurar buzón en OVHcloud', referencia: 'OVHcloud email hosting', plazo: null, prioridad: 'alta' },
  { id: 't5', categoria: '🌐 Tecnología', titulo: 'Agregar RESEND_API_KEY en Vercel', detalle: 'Una vez verificado el dominio de correo en Resend', referencia: 'Vercel → Environment Variables', plazo: null, prioridad: 'media' },
  { id: 't6', categoria: '🌐 Tecnología', titulo: 'Actualizar URLs de redirect en Supabase', detalle: 'Actualizar al dominio custom una vez conectado', referencia: 'Supabase → Auth → URL Configuration', plazo: null, prioridad: 'media' },
  { id: 't7', categoria: '🌐 Tecnología', titulo: "Corregir botón 'Panel administrador' en SidebarSocio", detalle: 'Bug: prop rut llega vacío en primer render por carga asíncrona', referencia: 'components/SidebarSocio.tsx', plazo: null, prioridad: 'alta' },
  { id: 't8', categoria: '🌐 Tecnología', titulo: 'Resolver políticas RLS en Supabase', detalle: 'RLS deshabilitado en mayoría de tablas — riesgo de seguridad crítico', referencia: 'Supabase → Table Editor → RLS', plazo: null, prioridad: 'alta' },
  { id: 't9', categoria: '🌐 Tecnología', titulo: 'Implementar hash SHA-256 de prescripciones', detalle: 'Registrar hash del archivo de receta en Supabase para trazabilidad', referencia: 'Protocolo de Dispensación v2, punto 3.2c', plazo: null, prioridad: 'media' },
  { id: 't10', categoria: '🌐 Tecnología', titulo: 'Implementar alerta de vencimiento de receta', detalle: 'Evento de notificación via Resend cuando la receta está por vencer', referencia: 'Roadmap app', plazo: null, prioridad: 'media' },
  { id: 't11', categoria: '🌐 Tecnología', titulo: 'Activar MercadoPago en producción', detalle: 'Cambiar BYPASS_PAGO = false en dispensacion/page.tsx e inscripcion/page.tsx', referencia: 'Una vez verificada la cuenta MP de la asociación', plazo: null, prioridad: 'media' },
  { id: 't12', categoria: '🌐 Tecnología', titulo: 'Integración FirmaVirtual — reunión y API key', detalle: 'Contacto: Karianny Farias — karianny@firmavirtual.legal. Flujo ANF para contratos y declaraciones.', referencia: 'Sandbox: test.firmavirtual.legal', plazo: null, prioridad: 'media' },
  { id: 'l1', categoria: '⚖️ Legal operativo', titulo: 'Registrar GreenTech en RECEMED/SNRE', detalle: 'Como establecimiento dispensador autorizado. Workaround actual: médico retiene receta en consulta.', referencia: 'DS 867/2015', plazo: null, prioridad: 'alta' },
  { id: 'l2', categoria: '⚖️ Legal operativo', titulo: 'Fijar tabla de aportes por dispensación', detalle: 'El Directorio debe aprobar tabla de aportes proporcionales por tipo y volumen de producto', referencia: 'Reglamento Interno v2, sección 2.7 / Protocolo Dispensación v2, punto 3.4', plazo: null, prioridad: 'alta' },
  { id: 'l3', categoria: '⚖️ Legal operativo', titulo: 'Verificar documentación completa de cada socio activo', detalle: 'DJ ingreso firmada, contrato delegación cultivo vigente, receta vigente, cédula cargada', referencia: 'Reglamento v2 sección 2.2', plazo: null, prioridad: 'media' },
  { id: 'p1', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo nuevo miembro', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'media' },
  { id: 'p2', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo acceso a cultivos', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'media' },
  { id: 'p3', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo anti-asalto', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'baja' },
  { id: 'p4', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo emergencias', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'media' },
  { id: 'p5', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo manicurado', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'baja' },
  { id: 'p6', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo socios con uso problemático', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'media' },
  { id: 'p7', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo fertirriego', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'baja' },
  { id: 'p8', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo manejo integrado de plagas', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'baja' },
  { id: 'p9', categoria: '📋 Protocolos pendientes', titulo: 'Redactar Protocolo secado y curado', detalle: 'Mandato de la Directiva', referencia: 'Reglamento v2, sección 5.3', plazo: null, prioridad: 'baja' },
]

const CATEGORIAS = [...new Set(TAREAS.map(t => t.categoria))]

const CAT_STYLES: Record<string, { bg: string; border: string; header: string; badge: string; dot: string }> = {
  '🔴 Urgente':               { bg: '#fff5f5', border: '#fecaca', header: '#fee2e2', badge: '#fecaca', dot: '#ef4444' },
  '📄 Firma documentos':      { bg: '#fff7ed', border: '#fed7aa', header: '#ffedd5', badge: '#fed7aa', dot: '#f97316' },
  '📲 App — Documentos':      { bg: '#eff6ff', border: '#bfdbfe', header: '#dbeafe', badge: '#bfdbfe', dot: '#3b82f6' },
  '🌐 Tecnología':            { bg: '#faf5ff', border: '#e9d5ff', header: '#f3e8ff', badge: '#e9d5ff', dot: '#a855f7' },
  '⚖️ Legal operativo':       { bg: '#fefce8', border: '#fde68a', header: '#fef9c3', badge: '#fde68a', dot: '#eab308' },
  '📋 Protocolos pendientes': { bg: '#f0fdf4', border: '#bbf7d0', header: '#dcfce7', badge: '#bbf7d0', dot: '#22c55e' },
}

interface TareaDB { id: string; completada: boolean; nota: string | null; completada_at: string | null }

function diasRestantes(plazo: string): number {
  return Math.ceil((new Date(plazo + 'T12:00:00').getTime() - Date.now()) / 86400000)
}
function formatFecha(plazo: string): string {
  return new Date(plazo + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Cumplimiento() {
  const [datos, setDatos] = useState<Record<string, TareaDB>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({})
  const [editandoNota, setEditandoNota] = useState<string | null>(null)
  const [notaTemp, setNotaTemp] = useState('')
  const [filtrocat, setFiltrocat] = useState('Todas')
  const [filtroest, setFiltroest] = useState('Pendientes')
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await supabase.from('tareas_cumplimiento').select('*')
      if (data) {
        const map: Record<string, TareaDB> = {}
        data.forEach((r: TareaDB) => { map[r.id] = r })
        setDatos(map)
      }
    } catch { /* tabla vacía o sin registros aún */ }
    setLoading(false)
  }

  async function toggleTarea(id: string) {
    const actual = datos[id]
    const completada = !actual?.completada
    setGuardando(id)
    const payload = { id, completada, completada_at: completada ? new Date().toISOString() : null, nota: actual?.nota ?? null, updated_at: new Date().toISOString() }
    await supabase.from('tareas_cumplimiento').upsert(payload)
    setDatos(prev => ({ ...prev, [id]: { ...prev[id], ...payload } }))
    setGuardando(null)
  }

  async function guardarNota(id: string) {
    setGuardando(id)
    const payload = { id, nota: notaTemp, completada: datos[id]?.completada ?? false, updated_at: new Date().toISOString() }
    await supabase.from('tareas_cumplimiento').upsert(payload)
    setDatos(prev => ({ ...prev, [id]: { ...prev[id], nota: notaTemp } }))
    setEditandoNota(null)
    setGuardando(null)
    setMensaje('Nota guardada')
    setTimeout(() => setMensaje(''), 2000)
  }

  const total = TAREAS.length
  const completadas = TAREAS.filter(t => datos[t.id]?.completada).length
  const pct = Math.round((completadas / total) * 100)
  const vencenProximo = TAREAS.filter(t => t.plazo && !datos[t.id]?.completada && diasRestantes(t.plazo) <= 30).length

  const tareasFiltradas = TAREAS.filter(t => {
    if (filtrocat !== 'Todas' && t.categoria !== filtrocat) return false
    if (filtroest === 'Pendientes' && datos[t.id]?.completada) return false
    if (filtroest === 'Completadas' && !datos[t.id]?.completada) return false
    if (busqueda && !t.titulo.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <SidebarAdmin />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
          <p style={{ fontSize: 14, margin: 0 }}>Cargando tareas de cumplimiento...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <SidebarAdmin />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* HEADER */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>⚖️ Cumplimiento Institucional</h1>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>GreenTech · RUT 65.271.661-K · Registro N° 390054</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{completadas} de {total} completadas</div>
              {vencenProximo > 0 && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 2 }}>⚠️ {vencenProximo} vencen en 30 días</div>}
            </div>
          </div>

          <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 16 }}>
            <div style={{ width: `${pct}%`, background: '#16a34a', height: 8, borderRadius: 999, transition: 'width 0.5s' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Buscar tarea..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <select value={filtroest} onChange={e => setFiltroest(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
              <option>Todas</option><option>Pendientes</option><option>Completadas</option>
            </select>
            <select value={filtrocat} onChange={e => setFiltrocat(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
              <option value="Todas">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {mensaje && <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{mensaje}</div>}
        </div>

        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

          {/* TARJETAS RESUMEN */}
          {filtrocat === 'Todas' && filtroest !== 'Completadas' && !busqueda && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {CATEGORIAS.map(cat => {
                const s = CAT_STYLES[cat] || { bg: '#f9fafb', border: '#e5e7eb', header: '#f3f4f6', badge: '#f3f4f6', dot: '#6b7280' }
                const del_cat = TAREAS.filter(t => t.categoria === cat)
                const comp_cat = del_cat.filter(t => datos[t.id]?.completada).length
                const p = Math.round((comp_cat / del_cat.length) * 100)
                const conPlazo = del_cat.filter(t => t.plazo && !datos[t.id]?.completada && diasRestantes(t.plazo) <= 30).length
                return (
                  <button key={cat} onClick={() => setFiltrocat(cat)}
                    style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: 12, textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8, lineHeight: 1.4 }}>{cat}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{comp_cat}/{del_cat.length}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: s.badge, color: '#374151' }}>{p}%</span>
                    </div>
                    <div style={{ width: '100%', background: '#fff', borderRadius: 999, height: 6 }}>
                      <div style={{ width: `${p}%`, background: s.dot, height: 6, borderRadius: 999 }} />
                    </div>
                    {conPlazo > 0 && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontWeight: 500 }}>⚠️ {conPlazo} por vencer</div>}
                  </button>
                )
              })}
            </div>
          )}

          {filtrocat !== 'Todas' && (
            <button onClick={() => setFiltrocat('Todas')} style={{ marginBottom: 16, fontSize: 13, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Todas las categorías
            </button>
          )}

          {tareasFiltradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 600, margin: 0 }}>No hay tareas con estos filtros</p>
            </div>
          )}

          {CATEGORIAS.filter(cat => filtrocat === 'Todas' || filtrocat === cat).map(cat => {
            const tareasDeEsta = tareasFiltradas.filter(t => t.categoria === cat)
            if (tareasDeEsta.length === 0) return null
            const s = CAT_STYLES[cat] || { bg: '#f9fafb', border: '#e5e7eb', header: '#f3f4f6', badge: '#f3f4f6', dot: '#6b7280' }

            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ background: s.header, borderRadius: '12px 12px 0 0', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#374151', fontSize: 13 }}>{cat}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: s.badge, color: '#374151' }}>{tareasDeEsta.length}</span>
                </div>
                <div style={{ border: `1px solid ${s.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                  {tareasDeEsta.map((t, i) => {
                    const db = datos[t.id]
                    const completada = db?.completada ?? false
                    const expandida = expandidas[t.id]
                    const cargandoEsta = guardando === t.id
                    const dias = t.plazo ? diasRestantes(t.plazo) : null

                    return (
                      <div key={t.id} style={{ background: completada ? '#f9fafb' : '#fff', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          {/* Checkbox */}
                          <button onClick={() => toggleTarea(t.id)} disabled={cargandoEsta}
                            style={{ marginTop: 2, width: 20, height: 20, borderRadius: '50%', border: completada ? 'none' : '2px solid #d1d5db', background: completada ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: cargandoEsta ? 0.5 : 1 }}>
                            {completada && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                          </button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: completada ? '#9ca3af' : '#111827', textDecoration: completada ? 'line-through' : 'none', lineHeight: 1.4 }}>
                                {t.titulo}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {t.plazo && !completada && (
                                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 500, background: dias !== null && dias <= 30 ? '#fee2e2' : dias !== null && dias <= 90 ? '#ffedd5' : '#f3f4f6', color: dias !== null && dias <= 30 ? '#991b1b' : dias !== null && dias <= 90 ? '#9a3412' : '#6b7280' }}>
                                    📅 {formatFecha(t.plazo)}{dias !== null && dias >= 0 ? ` · ${dias}d` : ' · vencido'}
                                  </span>
                                )}
                                {completada && db?.completada_at && (
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>✓ {new Date(db.completada_at).toLocaleDateString('es-CL')}</span>
                                )}
                                <button onClick={() => setExpandidas(prev => ({ ...prev, [t.id]: !expandida }))}
                                  style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                                  {expandida ? '▲' : '▼'}
                                </button>
                              </div>
                            </div>

                            {!expandida && db?.nota && (
                              <p style={{ fontSize: 11, color: '#92400e', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 0 }}>📝 {db.nota}</p>
                            )}

                            {expandida && (
                              <div style={{ marginTop: 10 }}>
                                {t.detalle && <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 8, marginTop: 0 }}>{t.detalle}</p>}
                                <p style={{ fontSize: 11, fontFamily: 'monospace', background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 6, marginBottom: 8, marginTop: 0 }}>{t.referencia}</p>

                                {editandoNota === t.id ? (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <textarea value={notaTemp} onChange={e => setNotaTemp(e.target.value)} placeholder="Escribe una nota..."
                                      style={{ flex: 1, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, resize: 'none', height: 64, outline: 'none' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <button onClick={() => guardarNota(t.id)} style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
                                      <button onClick={() => setEditandoNota(null)} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                                    </div>
                                  </div>
                                ) : db?.nota ? (
                                  <div onClick={() => { setEditandoNota(t.id); setNotaTemp(db.nota ?? '') }}
                                    style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                                    📝 {db.nota}
                                  </div>
                                ) : (
                                  <button onClick={() => { setEditandoNota(t.id); setNotaTemp('') }}
                                    style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    + Agregar nota
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 32, paddingBottom: 16 }}>
            GreenTech · Cumplimiento Institucional 2026 · Estado sincronizado con Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
