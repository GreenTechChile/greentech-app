'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

// ─── DATOS DE TAREAS ──────────────────────────────────────────────────────────

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
  // URGENTE
  { id: 'u1', categoria: '🔴 Urgente', titulo: 'Designar Comisión Revisora de Cuentas', detalle: 'Ente externo imparcial mediante resolución fundada del Directorio', referencia: 'Acta 001 punto 5 / Art. 36° Estatutos', plazo: '2026-11-15', prioridad: 'alta' },
  { id: 'u2', categoria: '🔴 Urgente', titulo: 'Designar Comisión de Ética', detalle: 'Ente externo imparcial mediante resolución fundada del Directorio', referencia: 'Acta 001 punto 5 / Art. 38° Estatutos', plazo: '2026-11-15', prioridad: 'alta' },
  { id: 'u3', categoria: '🔴 Urgente', titulo: 'Enterar patrimonio inicial $1.500.000', detalle: 'Aporte en bienes muebles por parte del Presidente conforme a escritura', referencia: 'Art. 42° Estatutos / SII folio 15276029', plazo: '2028-02-19', prioridad: 'alta' },
  // FIRMA
  { id: 'f1', categoria: '📄 Firma documentos', titulo: 'Firmar Acta N° 001 — Primera Asamblea General Ordinaria', detalle: 'Firmas de los 3 directivos + 3 socios asistentes como testigos', referencia: 'Art. 20° Estatutos', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f2', categoria: '📄 Firma documentos', titulo: 'Firmar Reglamento Interno v2', detalle: 'Firma del Presidente y Secretario como constancia de aprobación en asamblea', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f3', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Dispensación v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f4', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Envíos de Dispensaciones v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  { id: 'f5', categoria: '📄 Firma documentos', titulo: 'Firmar Protocolo de Sumarios Internos v2', detalle: 'Firma de los 3 directivos', referencia: 'Aprobado en Asamblea 15 mayo 2026', plazo: '2026-07-15', prioridad: 'alta' },
  // APP DOCUMENTOS
  { id: 'a1', categoria: '📲 App — Documentos', titulo: 'Subir Estatutos / Acta de Constitución', detalle: 'PDF del Adobe Scan ya disponible', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a2', categoria: '📲 App — Documentos', titulo: 'Subir RUT corporación SII', detalle: 'PDF folio 15276029 ya disponible', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a3', categoria: '📲 App — Documentos', titulo: 'Obtener y subir Certificado de Vigencia', detalle: 'Obtener desde Registro Civil, luego subir a la app', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'alta' },
  { id: 'a4', categoria: '📲 App — Documentos', titulo: 'Obtener y subir Certificado de Directorio', detalle: 'Obtener desde Registro Civil, luego subir a la app', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'alta' },
  { id: 'a5', categoria: '📲 App — Documentos', titulo: 'Subir Acta N° 001 firmada', detalle: 'Versión firmada física escaneada', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a6', categoria: '📲 App — Documentos', titulo: 'Subir Reglamento Interno v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a7', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Dispensación v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a8', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Despachos v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  { id: 'a9', categoria: '📲 App — Documentos', titulo: 'Subir Protocolo de Sumarios v2 firmado', detalle: '', referencia: '/admin/configuracion → Documentos', plazo: null, prioridad: 'media' },
  // TECNOLOGÍA
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
  // LEGAL
  { id: 'l1', categoria: '⚖️ Legal operativo', titulo: 'Registrar GreenTech en RECEMED/SNRE', detalle: 'Como establecimiento dispensador autorizado. Workaround actual: médico retiene receta en consulta.', referencia: 'DS 867/2015', plazo: null, prioridad: 'alta' },
  { id: 'l2', categoria: '⚖️ Legal operativo', titulo: 'Fijar tabla de aportes por dispensación', detalle: 'El Directorio debe aprobar tabla de aportes proporcionales por tipo y volumen de producto', referencia: 'Reglamento Interno v2, sección 2.7 / Protocolo Dispensación v2, punto 3.4', plazo: null, prioridad: 'alta' },
  { id: 'l3', categoria: '⚖️ Legal operativo', titulo: 'Verificar documentación completa de cada socio activo', detalle: 'DJ ingreso firmada, contrato delegación cultivo vigente, receta vigente, cédula cargada', referencia: 'Reglamento v2 sección 2.2', plazo: null, prioridad: 'media' },
  // PROTOCOLOS
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

const CAT_COLORS: Record<string, { bg: string; border: string; badge: string; header: string; dot: string }> = {
  '🔴 Urgente':             { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',      header: 'bg-red-100',    dot: 'bg-red-500' },
  '📄 Firma documentos':    { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', header: 'bg-orange-100', dot: 'bg-orange-500' },
  '📲 App — Documentos':    { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',    header: 'bg-blue-100',   dot: 'bg-blue-500' },
  '🌐 Tecnología':          { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', header: 'bg-purple-100', dot: 'bg-purple-500' },
  '⚖️ Legal operativo':     { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', header: 'bg-yellow-100', dot: 'bg-yellow-500' },
  '📋 Protocolos pendientes':{ bg: 'bg-green-50', border: 'border-green-200',  badge: 'bg-green-100 text-green-700',  header: 'bg-green-100',  dot: 'bg-green-500' },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function diasRestantes(plazo: string): number {
  return Math.ceil((new Date(plazo).getTime() - Date.now()) / 86400000)
}

function formatFecha(plazo: string): string {
  return new Date(plazo).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function BadgePlazo({ plazo }: { plazo: string }) {
  const dias = diasRestantes(plazo)
  let cls = 'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 '
  if (dias < 0)    cls += 'bg-red-200 text-red-800'
  else if (dias <= 30)  cls += 'bg-red-100 text-red-700'
  else if (dias <= 90)  cls += 'bg-orange-100 text-orange-700'
  else             cls += 'bg-gray-100 text-gray-500'
  return <span className={cls}>📅 {formatFecha(plazo)}{dias >= 0 ? ` · ${dias}d` : ' · vencido'}</span>
}

// ─── TIPOS SUPABASE ───────────────────────────────────────────────────────────

interface TareaDB {
  id: string
  completada: boolean
  nota: string | null
  completada_at: string | null
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

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
    const { data } = await supabase.from('tareas_cumplimiento').select('*')
    if (data) {
      const map: Record<string, TareaDB> = {}
      data.forEach((r: TareaDB) => { map[r.id] = r })
      setDatos(map)
    }
    setLoading(false)
  }

  async function toggleTarea(id: string) {
    const actual = datos[id]
    const completada = !actual?.completada
    setGuardando(id)
    const payload = {
      id,
      completada,
      completada_at: completada ? new Date().toISOString() : null,
      nota: actual?.nota ?? null,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('tareas_cumplimiento').upsert(payload)
    setDatos(prev => ({ ...prev, [id]: { ...prev[id], ...payload } }))
    setGuardando(null)
  }

  async function guardarNota(id: string) {
    setGuardando(id)
    const payload = {
      id,
      nota: notaTemp,
      completada: datos[id]?.completada ?? false,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('tareas_cumplimiento').upsert(payload)
    setDatos(prev => ({ ...prev, [id]: { ...prev[id], nota: notaTemp } }))
    setEditandoNota(null)
    setGuardando(null)
    setMensaje('Nota guardada')
    setTimeout(() => setMensaje(''), 2000)
  }

  // Estadísticas
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
    <div className="flex min-h-screen bg-gray-50">
      <SidebarAdmin />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">⚖️</div>
          <p>Cargando tareas de cumplimiento...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarAdmin />
      <div className="flex-1 overflow-y-auto">

        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">⚖️ Cumplimiento Institucional</h1>
              <p className="text-sm text-gray-500 mt-0.5">GreenTech · RUT 65.271.661-K · Registro N° 390054</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-700">{pct}%</div>
              <div className="text-xs text-gray-500">{completadas} de {total} completadas</div>
              {vencenProximo > 0 && (
                <div className="text-xs text-red-600 font-medium mt-0.5">⚠️ {vencenProximo} vencen en 30 días</div>
              )}
            </div>
          </div>

          {/* Barra progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <select
              value={filtroest}
              onChange={e => setFiltroest(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option>Todas</option>
              <option>Pendientes</option>
              <option>Completadas</option>
            </select>
            <select
              value={filtrocat}
              onChange={e => setFiltrocat(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {mensaje && <div className="mt-2 text-xs text-green-600 font-medium">{mensaje}</div>}
        </div>

        <div className="px-6 py-6 max-w-4xl mx-auto">

          {/* TARJETAS RESUMEN */}
          {filtrocat === 'Todas' && filtroest !== 'Completadas' && !busqueda && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {CATEGORIAS.map(cat => {
                const c = CAT_COLORS[cat] || { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', header: 'bg-gray-100', dot: 'bg-gray-400' }
                const del_cat = TAREAS.filter(t => t.categoria === cat)
                const comp_cat = del_cat.filter(t => datos[t.id]?.completada).length
                const p = Math.round((comp_cat / del_cat.length) * 100)
                const conPlazo = del_cat.filter(t => t.plazo && !datos[t.id]?.completada && diasRestantes(t.plazo) <= 30).length
                return (
                  <button key={cat} onClick={() => setFiltrocat(cat)}
                    className={`${c.bg} ${c.border} border rounded-xl p-3 text-left hover:shadow-md transition-all`}>
                    <div className="text-xs font-semibold text-gray-700 mb-2 leading-tight">{cat}</div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">{comp_cat}/{del_cat.length}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>{p}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-1.5">
                      <div className={`${c.dot} h-1.5 rounded-full transition-all`} style={{ width: `${p}%` }} />
                    </div>
                    {conPlazo > 0 && <div className="text-xs text-red-600 mt-1.5 font-medium">⚠️ {conPlazo} por vencer</div>}
                  </button>
                )
              })}
            </div>
          )}

          {/* BOTÓN VOLVER */}
          {filtrocat !== 'Todas' && (
            <button onClick={() => setFiltrocat('Todas')} className="mb-4 text-sm text-green-700 hover:underline flex items-center gap-1">
              ← Todas las categorías
            </button>
          )}

          {tareasFiltradas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">No hay tareas con estos filtros</p>
              <p className="text-sm mt-1">¡Buen trabajo!</p>
            </div>
          )}

          {/* TAREAS POR CATEGORÍA */}
          {CATEGORIAS.filter(cat => filtrocat === 'Todas' || filtrocat === cat).map(cat => {
            const tareasDeEsta = tareasFiltradas.filter(t => t.categoria === cat)
            if (tareasDeEsta.length === 0) return null
            const c = CAT_COLORS[cat] || { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', header: 'bg-gray-100', dot: 'bg-gray-400' }

            return (
              <div key={cat} className="mb-5">
                <div className={`${c.header} rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                  <h2 className="font-bold text-gray-700 text-sm">{cat}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>{tareasDeEsta.length}</span>
                </div>
                <div className={`${c.border} border border-t-0 rounded-b-xl overflow-hidden divide-y divide-gray-100`}>
                  {tareasDeEsta.map(t => {
                    const db = datos[t.id]
                    const completada = db?.completada ?? false
                    const expandida = expandidas[t.id]
                    const cargando_esta = guardando === t.id

                    return (
                      <div key={t.id} className={`${completada ? 'bg-gray-50' : 'bg-white'} transition-colors`}>
                        <div className="px-4 py-3 flex items-start gap-3">

                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTarea(t.id)}
                            disabled={cargando_esta}
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                              ${cargando_esta ? 'opacity-50' : ''}
                              ${completada ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}
                          >
                            {completada && <span className="text-white text-xs font-bold">✓</span>}
                          </button>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <span className={`text-sm font-medium leading-snug ${completada ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {t.titulo}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {t.plazo && !completada && <BadgePlazo plazo={t.plazo} />}
                                {completada && db?.completada_at && (
                                  <span className="text-xs text-gray-400">
                                    ✓ {new Date(db.completada_at).toLocaleDateString('es-CL')}
                                  </span>
                                )}
                                <button
                                  onClick={() => setExpandidas(prev => ({ ...prev, [t.id]: !expandida }))}
                                  className="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100"
                                >
                                  {expandida ? '▲' : '▼'}
                                </button>
                              </div>
                            </div>

                            {/* Nota preview cuando no expandida */}
                            {!expandida && db?.nota && (
                              <p className="text-xs text-amber-700 mt-0.5 truncate">📝 {db.nota}</p>
                            )}

                            {/* Expandido */}
                            {expandida && (
                              <div className="mt-2 space-y-2">
                                {t.detalle && (
                                  <p className="text-xs text-gray-500 leading-relaxed">{t.detalle}</p>
                                )}
                                <p className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded">{t.referencia}</p>

                                {/* Nota */}
                                {editandoNota === t.id ? (
                                  <div className="flex gap-2 mt-1">
                                    <textarea
                                      value={notaTemp}
                                      onChange={e => setNotaTemp(e.target.value)}
                                      placeholder="Escribe una nota..."
                                      className="flex-1 text-xs border border-gray-200 rounded-lg p-2 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <div className="flex flex-col gap-1">
                                      <button onClick={() => guardarNota(t.id)}
                                        className="text-xs bg-green-600 text-white px-2 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                                        Guardar
                                      </button>
                                      <button onClick={() => setEditandoNota(null)}
                                        className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100">
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  db?.nota ? (
                                    <div
                                      onClick={() => { setEditandoNota(t.id); setNotaTemp(db.nota ?? '') }}
                                      className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-gray-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                    >
                                      📝 {db.nota}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setEditandoNota(t.id); setNotaTemp('') }}
                                      className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1"
                                    >
                                      <span className="text-base leading-none">+</span> Agregar nota
                                    </button>
                                  )
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

          <p className="text-center text-xs text-gray-400 mt-8 pb-4">
            GreenTech · Cumplimiento Institucional 2026 · Estado sincronizado con Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
