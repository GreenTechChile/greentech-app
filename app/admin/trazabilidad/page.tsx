'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Socio {
  id: string; rut: string; nombre: string; email: string; estado: string; created_at: string
  telefono?: string; direccion?: string; comuna?: string; ciudad?: string
  diagnostico?: string; medico_nombre?: string; medico_rut?: string
  folio_receta?: string; cuota_mensual?: number; gramos_delegados?: number
  vencimiento_receta?: string; notas_admin?: string
  reglamento_aceptado_at?: string; reglamento_ip?: string
}
interface Dispensacion { id: string; cepa: string; gramos: number; monto: number; orden_numero: string; estado: string; mes: number; año: number; medio_pago: string; created_at: string; rut_socio?: string }
interface AuditLogEntry { id: string; accion: string; entidad: string; entidad_id: string; realizado_por: string; detalles: Record<string, any>; created_at: string }

export default function Trazabilidad() {
  const [tab, setTab] = useState<'log'|'expediente'|'exportar'|'auditlog'>('log')
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio|null>(null)
  const [socioDispensaciones, setSocioDispensaciones] = useState<Dispensacion[]>([])
  const [exportTodos, setExportTodos] = useState(true)
  const [exportSocios, setExportSocios] = useState<string[]>([])
  const [exportando, setExportando] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('2026-03-01')
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [auditFiltroEntidad, setAuditFiltroEntidad] = useState('todas')
  const [auditFiltroAdmin, setAuditFiltroAdmin] = useState('')
  const [auditDesde, setAuditDesde] = useState('2026-01-01')
  const [auditHasta, setAuditHasta] = useState(new Date().toISOString().split('T')[0])
  const [dispModal, setDispModal] = useState<Dispensacion|null>(null)
  const [busquedaSocios, setBusquedaSocios] = useState('')

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [{ data: disp }, { data: soc }, { data: audit }] = await Promise.all([
      supabase.from('dispensaciones').select('*').order('created_at', { ascending: false }),
      supabase.from('socios').select('id,rut,nombre,email,estado,created_at,telefono,direccion,comuna,ciudad,diagnostico,medico_nombre,medico_rut,folio_receta,cuota_mensual,gramos_delegados,vencimiento_receta,notas_admin,reglamento_aceptado_at,reglamento_ip').order('nombre'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(1000),
    ])
    if (disp) setDispensaciones(disp)
    if (soc) setSocios(soc)
    if (audit) setAuditLog(audit)
    setLoading(false)
  }

  const cargarExpediente = async (socio: Socio) => {
    setSocioSeleccionado(socio)
    const { data } = await supabase.from('dispensaciones').select('*').eq('rut_socio', socio.rut).order('created_at', { ascending: false })
    if (data) setSocioDispensaciones(data)
  }

  const toggleExportSocio = (id: string) => {
    setExportSocios(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const toggleTodos = () => {
    if (exportSocios.length === socios.length) setExportSocios([])
    else setExportSocios(socios.map(s => s.id))
  }

  // Construir log unificado desde dispensaciones
  const logItems = dispensaciones.map(d => ({
    id: d.id,
    tipo: 'dispensacion',
    evento: `Dispensación confirmada · Orden #${d.orden_numero}`,
    detalle: `${d.cepa} · ${d.gramos} gr · $${d.monto.toLocaleString('es-CL')} · ${d.medio_pago||'—'}`,
    fecha: d.created_at,
    badgeBg: '#EAF3DE', badgeColor: '#3B6D11', badgeLabel: 'Dispensación',
  }))

  const logFiltrado = logItems.filter(l => {
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false
    if (busqueda && !l.evento.toLowerCase().includes(busqueda.toLowerCase()) && !l.detalle.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const estadoStyle: Record<string, {bg:string,color:string}> = {
    entregado: {bg:'#f3f4f6',color:'#374151'},
    despachado: {bg:'#E6F1FB',color:'#185FA5'},
    pagado: {bg:'#EAF3DE',color:'#3B6D11'},
    preparando: {bg:'#FAEEDA',color:'#633806'},
    pendiente: {bg:'#FAEEDA',color:'#633806'},
  }

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div style={{ display:'flex', minHeight:'100vh', overflowX:'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', minWidth:0, background:'#fff' }}>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Trazabilidad y auditoría</h1>
          <p style={{ fontSize:13, color:'#6b7280' }}>Registro de todos los eventos · Expedientes por socio · Exportación para fiscalización</p>
        </div>

        {/* Aviso legal */}
        <div style={{ background:'#E6F1FB', border:'1px solid #A8CBF0', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#0C447C', marginBottom:20, lineHeight:1.7, display:'flex', gap:8 }}>
          <span style={{ fontSize:16 }}>🛡️</span>
          <span>
            Todos los registros son <strong>inmutables</strong>. El sistema cumple con la <strong>Ley 19.628</strong> (datos personales), <strong>Ley 20.000</strong> y <strong>Ley 21.575</strong>.
            Ante cualquier fiscalización, usa la pestaña "Exportar" para generar el informe oficial.
          </span>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Dispensaciones trazadas', value:`${dispensaciones.length}`, sub:'registro completo' },
            { label:'Socios registrados', value:`${socios.length}`, sub:'en el sistema' },
            { label:'Socios activos', value:`${socios.filter(s=>s.estado==='activo').length}`, sub:'con acceso', color:'#3B6D11' },
            { label:'Alertas de seguridad', value:'0', sub:'sin incidentes', color:'#3B6D11' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:600, color:m.color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:20 }}>
          {[{key:'log',label:'📋 Log general'},{key:'expediente',label:'👤 Por socio'},{key:'auditlog',label:'🔐 Acciones admin'},{key:'exportar',label:'📤 Exportar fiscalización'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{ padding:'8px 18px', fontSize:13, background:'none', border:'none', cursor:'pointer', borderBottom:tab===t.key?'2px solid #185FA5':'2px solid transparent', color:tab===t.key?'#185FA5':'#6b7280', fontWeight:tab===t.key?600:400, marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── LOG GENERAL ── */}
        {tab === 'log' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
                style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, background:'#fff', outline:'none' }}>
                <option value="todos">Todos los eventos</option>
                <option value="dispensacion">Dispensaciones</option>
              </select>
              <div style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', marginLeft:'auto', background:'#fff' }}>
                <span style={{ fontSize:14, color:'#9ca3af' }}>🔍</span>
                <input type="text" placeholder="Buscar por orden, cepa..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}
                  style={{ border:'none', outline:'none', fontSize:12, width:200, background:'transparent', color:'#374151' }}/>
              </div>
            </div>

            {loading ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando registros...</div>
            ) : logFiltrado.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>
                No hay registros que coincidan
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    {['Fecha','Tipo','Evento','Detalle',''].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logFiltrado.map(item => (
                    <tr key={item.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'9px 12px', color:'#9ca3af', whiteSpace:'nowrap', fontSize:11 }}>
                        {new Date(item.fecha).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:item.badgeBg, color:item.badgeColor }}>{item.badgeLabel}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontWeight:500 }}>{item.evento}</td>
                      <td style={{ padding:'9px 12px', color:'#6b7280', fontSize:11 }}>{item.detalle}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <button onClick={() => setDispModal(dispensaciones.find(d => d.id === item.id) || null)} style={{ fontSize:11, padding:'3px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', cursor:'pointer', color:'#6b7280' }}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── POR SOCIO ── */}
        {tab === 'expediente' && (
          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20 }}>
            {/* Lista socios */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Socios</div>
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={busquedaSocios}
                onChange={e => setBusquedaSocios(e.target.value)}
                style={{ width:'100%', padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, outline:'none', marginBottom:8, boxSizing:'border-box' as const }}
              />
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, padding:'4px 6px', background:'#f9fafb', borderRadius:6, border:'1px solid #e5e7eb' }}>
                <input type="checkbox"
                  checked={socios.length > 0 && exportSocios.length === socios.length}
                  onChange={toggleTodos}
                  style={{ accentColor:'#185FA5', width:13, height:13, cursor:'pointer' }}
                />
                <span style={{ fontSize:11, color:'#6b7280', cursor:'pointer' }} onClick={toggleTodos}>
                  Seleccionar todos ({socios.length})
                </span>
              </div>
              {socios
                .filter(s => {
                  const q = busquedaSocios.toLowerCase()
                  return !q || s.nombre.toLowerCase().includes(q) || s.rut.toLowerCase().includes(q)
                })
                .map(s => (
                <div key={s.id}
                  style={{ padding:'8px 10px', borderRadius:8, marginBottom:4, cursor:'pointer', background:'#f9fafb', border:'1px solid #e5e7eb', display:'flex', alignItems:'flex-start', gap:8 }}>
                  <input type="checkbox"
                    checked={exportSocios.includes(s.id)}
                    onChange={e => { e.stopPropagation(); toggleExportSocio(s.id) }}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor:'#185FA5', width:13, height:13, marginTop:2, flexShrink:0, cursor:'pointer' }}
                  />
                  <div onClick={() => cargarExpediente(s)} style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#111' }}>{s.nombre.split(' ').slice(0,2).join(' ')}</div>
                    <div style={{ fontSize:10, color:'#9ca3af' }}>{s.rut}</div>
                    <span style={{ fontSize:9, background:s.estado==='activo'?'#EAF3DE':'#f3f4f6', color:s.estado==='activo'?'#3B6D11':'#9ca3af', padding:'1px 6px', borderRadius:20 }}>
                      {s.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Expediente del socio seleccionado */}
            <div>
              {!socioSeleccionado ? (
                <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>
                  Selecciona un socio para ver su expediente completo
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:14, background:'#f9fafb', borderRadius:12, border:'1px solid #e5e7eb' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#3B6D11', flexShrink:0 }}>
                      {socioSeleccionado.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{socioSeleccionado.nombre}</div>
                      <div style={{ fontSize:11, color:'#6b7280' }}>RUT {socioSeleccionado.rut} · {socioSeleccionado.email}</div>
                    </div>
                    <button onClick={async () => {
                      const selIds = exportSocios.length > 0 ? exportSocios : [socioSeleccionado.id]
                      const seleccionados = socios.filter(s => selIds.includes(s.id))
                      const secciones = await Promise.all(seleccionados.map(async s => {
                        const { data: disps } = await supabase.from('dispensaciones').select('*').eq('rut_socio', s.rut).order('created_at', { ascending: false })
                        const ds = disps || []
                        const totalGr = ds.reduce((a,d) => a + d.gramos, 0)
                        const totalMonto = ds.reduce((a,d) => a + d.monto, 0)
                        const filas = ds.map((d,i) => `
                          <tr style="border-bottom:1px solid #e5e7eb;${i%2===0?'':'background:#fafafa'}">
                            <td style="padding:7px 12px;color:#6b7280">${i+1}</td>
                            <td style="padding:7px 12px">${new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                            <td style="padding:7px 12px">Orden #${d.orden_numero||'—'}</td>
                            <td style="padding:7px 12px">${d.cepa||'—'}</td>
                            <td style="padding:7px 12px;text-align:right">${d.gramos} gr</td>
                            <td style="padding:7px 12px;text-align:right">$${d.monto.toLocaleString('es-CL')}</td>
                            <td style="padding:7px 12px">${d.medio_pago||'—'}</td>
                            <td style="padding:7px 12px"><span style="background:${d.estado==='entregado'||d.estado==='pagado'?'#EAF3DE':'#FAEEDA'};color:${d.estado==='entregado'||d.estado==='pagado'?'#3B6D11':'#633806'};padding:2px 8px;border-radius:20px;font-size:10px">${d.estado}</span></td>
                          </tr>`).join('')
                        return `<div style="margin-bottom:32px">
                          <div style="background:#EAF3DE;border:1px solid #97C459;border-radius:8px 8px 0 0;padding:10px 14px">
                            <div style="font-size:14px;font-weight:700">${s.nombre}</div>
                            <div style="font-size:11px;color:#3B6D11">RUT ${s.rut} · ${totalGr} gr · $${totalMonto.toLocaleString('es-CL')}</div>
                          </div>
                          <table style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
                            <thead><tr style="background:#f9fafb"><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">#</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">Fecha</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">Orden</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">Cepa</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:right">Gramos</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:right">Monto</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">Pago</th><th style="padding:7px 12px;font-size:11px;color:#9ca3af;font-weight:500;text-align:left">Estado</th></tr></thead>
                            <tbody>${filas || '<tr><td colspan="8" style="padding:16px;text-align:center;color:#9ca3af">Sin dispensaciones registradas</td></tr>'}</tbody>
                            <tfoot><tr style="font-weight:700;background:#f9fafb;border-top:2px solid #e5e7eb"><td colspan="4" style="padding:8px 12px">Total</td><td style="padding:8px 12px;text-align:right">${totalGr} gr</td><td style="padding:8px 12px;text-align:right;color:#185FA5">$${totalMonto.toLocaleString('es-CL')}</td><td colspan="2"></td></tr></tfoot>
                          </table>
                        </div>`
                      }))
                      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                        <title>Dispensaciones GreenTech</title>
                        <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;max-width:1000px;margin:0 auto}h1{font-size:18px;margin-bottom:4px}.sub{color:#6b7280;font-size:12px;margin-bottom:24px}table{width:100%;border-collapse:collapse}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}</style>
                      </head><body>
                        <h1>Historial de Dispensaciones</h1>
                        <div class="sub">Asociación GreenTech · Generado ${new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})} · ${seleccionados.length} socio${seleccionados.length!==1?'s':''}</div>
                        ${secciones.join('')}
                        <div class="footer">GreenTech · Registros inmutables · Ley 19.628, Ley 20.000, Ley 21.575</div>
                      </body></html>`
                      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `Dispensaciones_${seleccionados.length === 1 ? seleccionados[0].rut : 'GreenTech'}_${new Date().toISOString().split('T')[0]}.html`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                      style={{ padding:'6px 14px', border:'1px solid #185FA5', borderRadius:8, background:'#E6F1FB', color:'#185FA5', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                      📤 Exportar dispensaciones {exportSocios.length > 1 ? `(${exportSocios.length})` : ''}
                    </button>
                  </div>

                  {/* Stats del socio */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                    {[
                      { label:'Total dispensado', value:`${socioDispensaciones.reduce((a,d)=>a+d.gramos,0)} gr` },
                      { label:'Total aportado', value:`$${socioDispensaciones.reduce((a,d)=>a+d.monto,0).toLocaleString('es-CL')}` },
                      { label:'Dispensaciones', value:`${socioDispensaciones.length}` },
                    ].map((m,i) => (
                      <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:10 }}>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{m.label}</div>
                        <div style={{ fontSize:16, fontWeight:600 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Timeline dispensaciones */}
                  <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:8 }}>Historial de dispensaciones</div>
                  {socioDispensaciones.length === 0 ? (
                    <div style={{ fontSize:13, color:'#9ca3af', padding:20, textAlign:'center' }}>Sin dispensaciones registradas</div>
                  ) : socioDispensaciones.map((d,i) => {
                    const est = estadoStyle[d.estado] || estadoStyle.pendiente
                    return (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:i%2===0?'#fff':'#f9fafb', borderRadius:8, marginBottom:4, border:'1px solid #f3f4f6', fontSize:12 }}>
                        <span style={{ fontSize:16 }}>🌿</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:500 }}>{d.cepa} · {d.gramos} gr</div>
                          <div style={{ fontSize:10, color:'#9ca3af' }}>#{d.orden_numero} · {MESES[d.mes-1]} {d.año} · {d.medio_pago||'—'}</div>
                        </div>
                        <div style={{ fontWeight:600, color:'#3B6D11' }}>${d.monto.toLocaleString('es-CL')}</div>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:est.bg, color:est.color }}>{d.estado}</span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {tab === 'auditlog' && (() => {
          const adminsUnicos = Array.from(new Set(auditLog.map(e => e.realizado_por))).sort()
          const auditFiltrado = auditLog.filter(e => {
            if (auditFiltroEntidad !== 'todas' && e.entidad !== auditFiltroEntidad) return false
            if (auditFiltroAdmin && e.realizado_por !== auditFiltroAdmin) return false
            const fecha = e.created_at.split('T')[0]
            if (fecha < auditDesde || fecha > auditHasta) return false
            return true
          })

          const ACCION_LABELS: Record<string, {label:string; bg:string; color:string}> = {
            aprobar_socio:     { label:'Aprobar socio',      bg:'#EAF3DE', color:'#3B6D11' },
            rechazar_socio:    { label:'Rechazar socio',     bg:'#FEE2E2', color:'#991B1B' },
            aprobar_receta:    { label:'Aprobar receta',     bg:'#EAF3DE', color:'#3B6D11' },
            rechazar_receta:   { label:'Rechazar receta',    bg:'#FEE2E2', color:'#991B1B' },
            firmar_delegacion: { label:'Firmar delegación',  bg:'#E6F1FB', color:'#185FA5' },
            enviar_link_retorno: { label:'Enviar link',      bg:'#F5F3FF', color:'#5B21B6' },
          }

          const exportarCSV = () => {
            const headers = ['Fecha/Hora','Acción','Realizado por','Entidad','ID entidad','Detalles']
            const filas = auditFiltrado.map(e => {
              const fecha = new Date(e.created_at).toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })
              const detalles = Object.entries(e.detalles||{}).map(([k,v]) => `${k}: ${v}`).join(' | ')
              return [fecha, e.accion, e.realizado_por, e.entidad, e.entidad_id||'', detalles].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
            })
            const csv = [headers.join(','), ...filas].join('\n')
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `AuditLog_GreenTech_${auditDesde}_${auditHasta}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }

          return (
            <>
              <div style={{ background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#4C1D95', marginBottom:16, display:'flex', gap:8 }}>
                <span style={{ fontSize:16 }}>🔐</span>
                <span>Registro inmutable de todas las acciones realizadas por los administradores. Exporta como CSV para incluir en informes de fiscalización.</span>
              </div>

              {/* Filtros */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                <select value={auditFiltroEntidad} onChange={e=>setAuditFiltroEntidad(e.target.value)}
                  style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, background:'#fff', outline:'none' }}>
                  <option value="todas">Todas las acciones</option>
                  <option value="socio">Socios</option>
                  <option value="receta">Recetas</option>
                  <option value="delegacion">Delegaciones</option>
                  <option value="pago_incorporacion">Pagos inscripción</option>
                </select>
                <select value={auditFiltroAdmin} onChange={e=>setAuditFiltroAdmin(e.target.value)}
                  style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, background:'#fff', outline:'none' }}>
                  <option value="">Todos los admins</option>
                  {adminsUnicos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input type="date" value={auditDesde} onChange={e=>setAuditDesde(e.target.value)}
                  style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, outline:'none' }}/>
                <span style={{ fontSize:12, color:'#6b7280' }}>→</span>
                <input type="date" value={auditHasta} onChange={e=>setAuditHasta(e.target.value)}
                  style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, outline:'none' }}/>
                <span style={{ fontSize:12, color:'#9ca3af', marginLeft:4 }}>{auditFiltrado.length} registro{auditFiltrado.length !== 1 ? 's' : ''}</span>
                <button onClick={exportarCSV} disabled={auditFiltrado.length === 0}
                  style={{ marginLeft:'auto', padding:'7px 14px', border:'none', borderRadius:8, background:auditFiltrado.length>0?'#185FA5':'#9ca3af', color:'#fff', fontSize:12, fontWeight:600, cursor:auditFiltrado.length>0?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
                  📥 Exportar CSV
                </button>
              </div>

              {loading ? (
                <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando registros...</div>
              ) : auditFiltrado.length === 0 ? (
                <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>
                  No hay acciones registradas para los filtros seleccionados
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                      {['Fecha y hora','Acción','Realizado por','Entidad / ID','Detalles'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditFiltrado.map(entry => {
                      const badge = ACCION_LABELS[entry.accion]
                      const fecha = new Date(entry.created_at)
                      const detallesStr = Object.entries(entry.detalles||{}).map(([k,v]) => `${k}: ${v}`).join(' · ')
                      return (
                        <tr key={entry.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                          <td style={{ padding:'9px 12px', color:'#6b7280', whiteSpace:'nowrap', fontSize:11 }}>
                            <div>{fecha.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})}</div>
                            <div style={{ color:'#9ca3af' }}>{fecha.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div>
                          </td>
                          <td style={{ padding:'9px 12px' }}>
                            {badge
                              ? <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:badge.bg, color:badge.color, whiteSpace:'nowrap' }}>{badge.label}</span>
                              : <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#f3f4f6', color:'#374151' }}>{entry.accion}</span>
                            }
                          </td>
                          <td style={{ padding:'9px 12px', fontWeight:500 }}>{entry.realizado_por}</td>
                          <td style={{ padding:'9px 12px', fontSize:11 }}>
                            <div style={{ color:'#6b7280' }}>{entry.entidad}</div>
                            {entry.entidad_id && <div style={{ color:'#9ca3af', fontFamily:'monospace', fontSize:10 }}>{entry.entidad_id}</div>}
                          </td>
                          <td style={{ padding:'9px 12px', color:'#6b7280', fontSize:11, maxWidth:300 }}>
                            {detallesStr || <span style={{ color:'#d1d5db', fontStyle:'italic' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </>
          )
        })()}

        {/* ── EXPORTAR ── */}
        {tab === 'exportar' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            {/* Exportar por socio */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', background:'#EAF3DE', borderBottom:'1px solid #97C459' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#3B6D11', marginBottom:2 }}>👤 Expediente por socio</div>
                <div style={{ fontSize:11, color:'#3B6D11', opacity:0.8 }}>Selecciona uno o más socios para exportar sus expedientes individuales</div>
              </div>
              <div style={{ padding:14 }}>
                {/* Seleccionar todos */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #e5e7eb' }}>
                  <span style={{ fontSize:12, color:'#6b7280' }}>Socios disponibles</span>
                  <button onClick={toggleTodos}
                    style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#185FA5', background:'none', border:'none', cursor:'pointer', padding:'3px 8px', borderRadius:6 }}>
                    <input type="checkbox" checked={exportSocios.length === socios.length} onChange={toggleTodos} style={{ accentColor:'#185FA5', width:13, height:13 }}/>
                    Seleccionar todos
                  </button>
                </div>
                {socios.map(s => (
                  <div key={s.id} onClick={() => toggleExportSocio(s.id)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, marginBottom:4, cursor:'pointer', background:exportSocios.includes(s.id)?'#E6F1FB':'#fff', border:`1px solid ${exportSocios.includes(s.id)?'#185FA5':'#e5e7eb'}` }}>
                    <input type="checkbox" checked={exportSocios.includes(s.id)} onChange={()=>toggleExportSocio(s.id)} style={{ accentColor:'#185FA5', width:13, height:13 }}/>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#3B6D11', flexShrink:0 }}>
                      {s.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{s.nombre.split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{s.rut}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, background:'#E6F1FB', color:'#185FA5', padding:'2px 8px', borderRadius:20 }}>
                    {exportSocios.length} socio{exportSocios.length !== 1 ? 's' : ''} seleccionado{exportSocios.length !== 1 ? 's' : ''}
                  </span>
                  <button disabled={exportSocios.length === 0} onClick={async () => {
                    const seleccionados = socios.filter(s => exportSocios.includes(s.id))
                    // helpers
                    const DOCS_SOCIO = [
                      { key: 'cedula_anverso',           label: 'Cédula — Anverso' },
                      { key: 'cedula_reverso',           label: 'Cédula — Reverso' },
                      { key: 'receta',                   label: 'Receta médica vigente (última aprobada)' },
                      { key: 'antecedentes',             label: 'Certificado de antecedentes' },
                      { key: 'declaracion_jurada_firmada', label: 'Declaración jurada (firmada)' },
                      { key: 'contrato_firmado',         label: 'Contrato de delegación (firmado)' },
                    ]
                    const fetchDocB64 = async (rut: string, key: string): Promise<{b64:string,ext:string}|null> => {
                      for (const ext of ['pdf','jpg','jpeg','png']) {
                        const { data } = await supabase.storage.from('documentos').createSignedUrl(`${rut}/${key}.${ext}`, 3600)
                        if (data?.signedUrl) {
                          try {
                            const r = await fetch(data.signedUrl)
                            if (!r.ok) continue
                            const blob = await r.blob()
                            const b64 = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob) })
                            return { b64, ext }
                          } catch { continue }
                        }
                      }
                      return null
                    }
                    const filas = await Promise.all(seleccionados.map(async s => {
                      const [{ data: disps }, ...docResults] = await Promise.all([
                        supabase.from('dispensaciones').select('*').eq('rut_socio', s.rut).order('created_at', { ascending: false }),
                        ...DOCS_SOCIO.map(d => fetchDocB64(s.rut, d.key))
                      ])
                      const ds = disps || []
                      const totalGr = ds.reduce((a,d) => a + d.gramos, 0)
                      const totalMonto = ds.reduce((a,d) => a + d.monto, 0)
                      const filasDisp = ds.map((d,i) => `<tr style="border-bottom:1px solid #f3f4f6;${i%2===0?'':'background:#fafafa'}">
                        <td style="padding:7px 10px">${new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                        <td style="padding:7px 10px">Orden #${d.orden_numero||'—'}</td>
                        <td style="padding:7px 10px">${d.cepa||'—'}</td>
                        <td style="padding:7px 10px;text-align:right">${d.gramos} gr</td>
                        <td style="padding:7px 10px;text-align:right">$${d.monto.toLocaleString('es-CL')}</td>
                        <td style="padding:7px 10px">${d.medio_pago||'—'}</td>
                        <td style="padding:7px 10px">${d.estado}</td>
                      </tr>`).join('')
                      const docsHtml = DOCS_SOCIO.map((doc, idx) => {
                        const result = docResults[idx] as {b64:string,ext:string}|null
                        if (!result) return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:7px 10px;color:#9ca3af">📄 ${doc.label}</td><td style="padding:7px 10px;color:#9ca3af;font-style:italic">No disponible</td></tr>`
                        const esImg = ['jpg','jpeg','png'].includes(result.ext)
                        return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:7px 10px;vertical-align:top">📄 ${doc.label}</td><td style="padding:7px 10px">${esImg ? `<img src="${result.b64}" style="max-width:420px;max-height:280px;border-radius:4px;border:1px solid #e5e7eb"/>` : `<object data="${result.b64}" type="application/pdf" width="100%" height="400px" style="border:1px solid #e5e7eb;border-radius:4px"><a href="${result.b64}" download style="color:#185FA5">Descargar PDF</a></object>`}</td></tr>`
                      }).join('')
                      return `<div style="margin-bottom:40px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;page-break-inside:avoid">
                        <div style="background:#EAF3DE;padding:12px 16px;border-bottom:1px solid #97C459">
                          <div style="font-size:14px;font-weight:700">${s.nombre}</div>
                          <div style="font-size:12px;color:#3B6D11">RUT ${s.rut} · ${s.email} · ${s.estado}</div>
                          <div style="font-size:12px;color:#3B6D11;margin-top:4px">Cuota: ${s.cuota_mensual||0} gr/mes · Delegados: ${s.gramos_delegados||0} gr/mes · Receta vence: ${s.vencimiento_receta||'—'}</div>
                        </div>
                        <div style="padding:12px 16px">
                          <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Documentos</div>
                          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
                            <tbody>${docsHtml}<tr><td style="padding:7px 10px">✅ Reglamento interno</td><td style="padding:7px 10px"><span style="background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:20px;font-size:10px">Aceptado en línea</span></td></tr></tbody>
                          </table>
                          <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Dispensaciones (${ds.length} · ${totalGr} gr · $${totalMonto.toLocaleString('es-CL')})</div>
                          ${ds.length === 0 ? '<p style="color:#9ca3af;font-size:12px">Sin dispensaciones registradas</p>' : `
                          <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <thead><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb"><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:left;font-weight:500">Fecha</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:left;font-weight:500">Orden</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:left;font-weight:500">Cepa</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:right;font-weight:500">Gr</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:right;font-weight:500">Monto</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:left;font-weight:500">Pago</th><th style="padding:6px 10px;font-size:11px;color:#9ca3af;text-align:left;font-weight:500">Estado</th></tr></thead>
                            <tbody>${filasDisp}</tbody>
                            <tfoot><tr style="font-weight:700;border-top:2px solid #e5e7eb;background:#f9fafb"><td colspan="3" style="padding:7px 10px">Total</td><td style="padding:7px 10px;text-align:right">${totalGr} gr</td><td style="padding:7px 10px;text-align:right;color:#185FA5">$${totalMonto.toLocaleString('es-CL')}</td><td colspan="2"></td></tr></tfoot>
                          </table>`}
                        </div>
                      </div>`
                    }))
                    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                      <title>Expedientes GreenTech</title>
                      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;max-width:1000px;margin:0 auto}
                      h1{font-size:20px;color:#185FA5;margin-bottom:4px}.sub{color:#6b7280;font-size:12px;margin-bottom:28px}
                      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}</style>
                    </head><body>
                      <h1>Expedientes para Fiscalización</h1>
                      <div class="sub">Asociación GreenTech · Generado ${new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})} · ${seleccionados.length} socio${seleccionados.length!==1?'s':''}</div>
                      ${filas.join('')}
                      <div class="footer">GreenTech · Reg. 390054 · Registros inmutables · Ley 19.628, Ley 20.000, Ley 21.575</div>
                    </body></html>`
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `Expedientes_Fiscalizacion_${new Date().toISOString().split('T')[0]}.html`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                    style={{ padding:'7px 16px', border:'none', borderRadius:8, background:exportSocios.length>0?'#3B6D11':'#9ca3af', color:'#EAF3DE', fontSize:12, fontWeight:600, cursor:exportSocios.length>0?'pointer':'not-allowed' }}>
                    📥 Exportar seleccionados
                  </button>
                </div>
              </div>
            </div>

            {/* Exportar corporación completa */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', background:'#E6F1FB', borderBottom:'1px solid #A8CBF0' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#185FA5', marginBottom:2 }}>🏢 Informe corporativo completo</div>
                <div style={{ fontSize:11, color:'#185FA5', opacity:0.8 }}>Para presentar ante Carabineros, PDI, SII u otra autoridad fiscalizadora</div>
              </div>
              <div style={{ padding:14 }}>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:8, fontWeight:500 }}>Contenido del informe</div>
                {[
                  '✓ Acta de constitución y certificados legales',
                  '✓ Expediente completo de todos los socios',
                  '✓ Registro de todos los lotes de cultivo',
                  '✓ Historial de dispensaciones con trazabilidad',
                  '✓ Stock actual y movimientos de inventario',
                  '✓ Balance financiero y aportes',
                  '✓ Log completo de auditoría del sistema',
                ].map((item,i) => (
                  <div key={i} style={{ fontSize:12, color:'#374151', padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>{item}</div>
                ))}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>Rango de fechas del informe</div>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)}
                      style={{ flex:1, padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, outline:'none' }}/>
                    <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)}
                      style={{ flex:1, padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, outline:'none' }}/>
                  </div>
                </div>
                <div style={{ background:'#FAEEDA', border:'1px solid #EF9F27', borderRadius:8, padding:'8px 10px', fontSize:11, color:'#633806', marginBottom:12, lineHeight:1.6 }}>
                  ⚠️ Este informe contiene datos sensibles. Solo debe generarse ante una fiscalización formal o requerimiento judicial.
                </div>
                <button onClick={async () => {
                  setExportando(true)
                  try {
                  // ── helpers ──────────────────────────────────────────────────
                  const EXTS = ['pdf','jpg','jpeg','png']
                  const DOC_LABELS: Record<string, string> = {
                    cedula_anverso:    'Cédula de identidad — Anverso',
                    cedula_reverso:    'Cédula de identidad — Reverso',
                    receta:            'Receta médica vigente',
                    antecedentes:      'Certificado de antecedentes',
                    contrato:          'Contrato de membresía',
                    declaracion_jurada:'Declaración jurada',
                  }
                  // Claves del bucket documentos-corporacion/institucional/ → etiqueta
                  const CORP_DOC_LABELS: Record<string, string> = {
                    estatutos:               'Estatutos / Acta de constitución',
                    rut_corporacion:         'RUT corporación (SII)',
                    certificado_vigencia:    'Certificado de vigencia',
                    certificado_directorio:  'Certificado de directorio',
                    reglamento_interno:      'Reglamento interno',
                    protocolo_dispensacion:  'Protocolo de dispensación',
                    protocolo_envios:        'Protocolo de envíos',
                    poliza_seguro:           'Póliza de seguro',
                    resolucion_sanitaria:    'Resolución sanitaria',
                  }

                  // Devuelve la URL firmada del primer archivo que exista, o null
                  const getSignedUrl = async (path: string): Promise<string|null> => {
                    for (const ext of EXTS) {
                      const { data } = await supabase.storage.from('documentos')
                        .createSignedUrl(`${path}.${ext}`, 7200)
                      if (data?.signedUrl) {
                        // Verificar que el archivo existe con un HEAD
                        try {
                          const r = await fetch(data.signedUrl, { method: 'HEAD' })
                          if (r.ok) return data.signedUrl
                        } catch { /* no existe */ }
                      }
                    }
                    return null
                  }

                  // Convierte URL a base64 para embeber en el HTML
                  const toBase64 = async (url: string): Promise<{b64:string, mime:string}|null> => {
                    try {
                      const r = await fetch(url)
                      const blob = await r.blob()
                      const b64 = await new Promise<string>(res => {
                        const reader = new FileReader()
                        reader.onload = () => res(reader.result as string)
                        reader.readAsDataURL(blob)
                      })
                      return { b64, mime: blob.type }
                    } catch { return null }
                  }

                  // Renderiza un documento (imagen embebida o PDF embebido)
                  const renderDoc = (label: string, b64: string, mime: string) => {
                    if (mime.startsWith('image/')) {
                      return `<div style="margin-bottom:16px">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;font-weight:600">${label}</div>
                        <img src="${b64}" style="max-width:480px;max-height:320px;border-radius:6px;border:1px solid #e5e7eb;display:block"/>
                      </div>`
                    }
                    return `<div style="margin-bottom:16px">
                      <div style="font-size:11px;color:#6b7280;margin-bottom:4px;font-weight:600">${label}</div>
                      <object data="${b64}" type="application/pdf" width="100%" height="420px" style="border:1px solid #e5e7eb;border-radius:6px">
                        <a href="${b64}" download style="color:#185FA5;font-size:12px">📄 Descargar ${label}</a>
                      </object>
                    </div>`
                  }

                  // ── 1. Documentos corporativos (bucket documentos-corporacion) ─
                  // Listar todos los archivos una sola vez y filtrar por key
                  const { data: archivosCorpRaw } = await supabase.storage
                    .from('documentos-corporacion')
                    .list('institucional', { limit: 200, sortBy: { column: 'updated_at', order: 'desc' } })
                  const archivosCorp = archivosCorpRaw || []

                  const corpDocEntries = await Promise.all(
                    Object.entries(CORP_DOC_LABELS).map(async ([key, label]) => {
                      // El más reciente que empiece con esta clave
                      const archivo = archivosCorp.find(f => f.name.startsWith(key + '_') || f.name.startsWith(key + '.'))
                      if (!archivo) return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 10px;color:#9ca3af;width:220px">📄 ${label}</td><td style="padding:8px 10px;color:#9ca3af;font-style:italic">No subido</td></tr>`
                      const { data: urlData } = await supabase.storage
                        .from('documentos-corporacion')
                        .createSignedUrl(`institucional/${archivo.name}`, 7200)
                      if (!urlData?.signedUrl) return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 10px;color:#9ca3af;width:220px">📄 ${label}</td><td style="padding:8px 10px;color:#9ca3af;font-style:italic">Error al obtener URL</td></tr>`
                      const emb = await toBase64(urlData.signedUrl)
                      const ext = archivo.name.split('.').pop()?.toLowerCase() || ''
                      const esDocx = ext === 'docx' || ext === 'doc'
                      if (!emb || esDocx) {
                        // DOCX no se puede embeber — mostrar link de descarga
                        return `<tr style="border-bottom:1px solid #f3f4f6">
                          <td style="padding:8px 10px;vertical-align:top;width:220px">📄 ${label}</td>
                          <td style="padding:8px 10px">
                            <a href="${urlData.signedUrl}" target="_blank" download style="color:#185FA5;font-size:12px">⬇️ Descargar ${archivo.name.split('_').slice(-1)[0] || archivo.name}</a>
                            <div style="font-size:11px;color:#9ca3af;margin-top:3px">${archivo.name}</div>
                          </td>
                        </tr>`
                      }
                      const esImagen = emb.mime.startsWith('image/')
                      return `<tr style="border-bottom:1px solid #f3f4f6">
                        <td style="padding:8px 10px;vertical-align:top;width:220px">📄 ${label}</td>
                        <td style="padding:8px 10px">
                          ${esImagen
                            ? `<img src="${emb.b64}" style="max-width:480px;max-height:280px;border-radius:4px;border:1px solid #e5e7eb;display:block"/>`
                            : `<object data="${emb.b64}" type="application/pdf" width="100%" height="380px" style="border:1px solid #e5e7eb;border-radius:4px"><a href="${emb.b64}" download style="color:#185FA5">Descargar PDF</a></object>`
                          }
                          <div style="font-size:10px;color:#9ca3af;margin-top:3px">${archivo.name}</div>
                        </td>
                      </tr>`
                    })
                  )
                  const corpDocsHtml = corpDocEntries.join('')

                  // ── 2. Documentos por socio (en paralelo) ─────────────────
                  const sociosDocsHtml = (await Promise.all(socios.map(async (s, si) => {
                    const docKeys = Object.keys(DOC_LABELS)
                    const docEntries = await Promise.all(docKeys.map(async (key) => {
                      const url = await getSignedUrl(`${s.rut}/${key}`)
                      if (!url) return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:7px 10px;color:#9ca3af;width:220px">📄 ${DOC_LABELS[key]}</td><td style="padding:7px 10px;color:#9ca3af;font-style:italic">No subido</td></tr>`
                      const emb = await toBase64(url)
                      if (!emb) return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:7px 10px;width:220px">📄 ${DOC_LABELS[key]}</td><td style="padding:7px 10px"><a href="${url}" target="_blank" style="color:#185FA5">Ver</a></td></tr>`
                      const esImagen = emb.mime.startsWith('image/')
                      return `<tr style="border-bottom:1px solid #f3f4f6">
                        <td style="padding:7px 10px;vertical-align:top;width:220px">📄 ${DOC_LABELS[key]}</td>
                        <td style="padding:7px 10px">
                          ${esImagen
                            ? `<img src="${emb.b64}" style="max-width:420px;max-height:260px;border-radius:4px;border:1px solid #e5e7eb;display:block"/>`
                            : `<object data="${emb.b64}" type="application/pdf" width="100%" height="340px" style="border:1px solid #e5e7eb;border-radius:4px"><a href="${emb.b64}" download style="color:#185FA5">Descargar PDF</a></object>`
                          }
                        </td>
                      </tr>`
                    }))
                    // Reglamento: aceptación con timestamp e IP
                    const regAt = s.reglamento_aceptado_at
                      ? new Date(s.reglamento_aceptado_at).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})
                      : '—'
                    const regIp = s.reglamento_ip || '—'
                    docEntries.push(`<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:7px 10px;width:220px">✅ Reglamento interno</td><td style="padding:7px 10px"><span style="background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:20px;font-size:11px">Aceptado digitalmente</span><div style="margin-top:5px;font-size:11px;color:#6b7280"><strong>Fecha/hora:</strong> ${regAt} &nbsp;·&nbsp; <strong>IP:</strong> <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px">${regIp}</code></div></td></tr>`)
                    return `<div style="margin-bottom:32px;padding:16px;border:1px solid #e5e7eb;border-radius:10px;${si%2===0?'':'background:#fafafa'}">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">
                        <div style="width:34px;height:34px;border-radius:50%;background:#EAF3DE;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#3B6D11;flex-shrink:0">
                          ${s.nombre.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <div style="font-size:13px;font-weight:700">${s.nombre}</div>
                          <div style="font-size:11px;color:#6b7280">RUT ${s.rut} · ${s.email} · <span style="background:${s.estado==='activo'?'#EAF3DE':'#f3f4f6'};color:${s.estado==='activo'?'#3B6D11':'#9ca3af'};padding:1px 7px;border-radius:20px;">${s.estado}</span></div>
                        </div>
                      </div>
                      <table style="width:100%;border-collapse:collapse">${docEntries.join('')}</table>
                    </div>`
                  }))).join('')

                  // ── 3. Datos tabulares ────────────────────────────────────
                  const dispFiltradas = dispensaciones.filter(d => {
                    const fecha = d.created_at.split('T')[0]
                    return fecha >= fechaDesde && fecha <= fechaHasta
                  })

                  const filasSocios = socios.map((s, i) => {
                    const dispSocio = dispFiltradas.filter((d: any) => d.rut_socio === s.rut)
                    const totalGr = dispSocio.reduce((a: number, d: any) => a + d.gramos, 0)
                    const totalMonto = dispSocio.reduce((a: number, d: any) => a + d.monto, 0)
                    return `<tr style="border-bottom:1px solid #e5e7eb;${i%2===0?'':'background:#f9fafb'}">
                      <td style="padding:7px 10px">${i+1}</td>
                      <td style="padding:7px 10px;font-weight:500">${s.nombre}</td>
                      <td style="padding:7px 10px;color:#6b7280">${s.rut}</td>
                      <td style="padding:7px 10px">${s.email}</td>
                      <td style="padding:7px 10px;text-align:center"><span style="background:${s.estado==='activo'?'#EAF3DE':'#f3f4f6'};color:${s.estado==='activo'?'#3B6D11':'#9ca3af'};padding:2px 8px;border-radius:20px;font-size:11px">${s.estado}</span></td>
                      <td style="padding:7px 10px;text-align:right">${dispSocio.length}</td>
                      <td style="padding:7px 10px;text-align:right">${totalGr} gr</td>
                      <td style="padding:7px 10px;text-align:right;color:#185FA5;font-weight:500">$${totalMonto.toLocaleString('es-CL')}</td>
                    </tr>`
                  }).join('')

                  const filasDisp = dispFiltradas.map((d: any, i: number) => {
                    const socio = socios.find(s => s.rut === d.rut_socio)
                    return `<tr style="border-bottom:1px solid #e5e7eb;${i%2===0?'':'background:#f9fafb'}">
                      <td style="padding:7px 10px;color:#6b7280">${i+1}</td>
                      <td style="padding:7px 10px">${new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                      <td style="padding:7px 10px">Orden #${d.orden_numero||'—'}</td>
                      <td style="padding:7px 10px;font-weight:500">${socio?.nombre||d.rut_socio||'—'}</td>
                      <td style="padding:7px 10px">${d.cepa||'—'}</td>
                      <td style="padding:7px 10px;text-align:right">${d.gramos} gr</td>
                      <td style="padding:7px 10px;text-align:right">$${d.monto.toLocaleString('es-CL')}</td>
                      <td style="padding:7px 10px">${d.medio_pago||'—'}</td>
                      <td style="padding:7px 10px;text-align:center"><span style="background:${d.estado==='entregado'||d.estado==='pagado'?'#EAF3DE':'#FAEEDA'};color:${d.estado==='entregado'||d.estado==='pagado'?'#3B6D11':'#633806'};padding:2px 8px;border-radius:20px;font-size:10px">${d.estado}</span></td>
                    </tr>`
                  }).join('')

                  const totalGrGlobal = dispFiltradas.reduce((a: number, d: any) => a + d.gramos, 0)
                  const totalMontoGlobal = dispFiltradas.reduce((a: number, d: any) => a + d.monto, 0)
                  const sociosActivos = socios.filter(s => s.estado === 'activo').length

                  // ── 4. Generar HTML ───────────────────────────────────────
                  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                    <title>Informe Corporativo — Asociación GreenTech</title>
                    <style>
                      body{font-family:Arial,sans-serif;padding:32px 40px;color:#111;font-size:13px;max-width:1100px;margin:0 auto}
                      h1{font-size:22px;margin:0 0 4px;color:#185FA5}
                      h2{font-size:15px;font-weight:700;margin:36px 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
                      .sub{color:#6b7280;font-size:12px;margin-bottom:24px}
                      table{width:100%;border-collapse:collapse;margin-bottom:8px}
                      th{text-align:left;padding:8px 10px;font-size:11px;color:#9ca3af;border-bottom:2px solid #e5e7eb;white-space:nowrap}
                      .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
                      .metric{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
                      .metric .val{font-size:20px;font-weight:700;color:#185FA5;margin:4px 0}
                      .metric .lbl{font-size:11px;color:#9ca3af}
                      .aviso{background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E;margin:16px 0}
                      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
                      .note{background:#E6F1FB;border:1px solid #A8CBF0;border-radius:8px;padding:8px 12px;font-size:11px;color:#0C447C;margin-bottom:12px}
                      @media print{body{padding:20px}}
                    </style>
                  </head><body>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                      <div>
                        <div style="font-size:13px;color:#3B6D11;font-weight:600;margin-bottom:6px">🌿 Asociación de Usuarios de Plantas Medicinales GreenTech</div>
                        <h1>Informe Corporativo Completo</h1>
                        <div class="sub">Para uso ante autoridades fiscalizadoras · Registro Nº 390054</div>
                      </div>
                      <div style="text-align:right;font-size:11px;color:#6b7280;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;background:#f9fafb">
                        <div style="font-weight:600;margin-bottom:3px">Folio: INF-CORP-${Date.now().toString().slice(-8)}</div>
                        <div>Generado: ${new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})}</div>
                        <div style="margin-top:3px;color:#185FA5">Período: ${new Date(fechaDesde+'T00:00:00').toLocaleDateString('es-CL')} al ${new Date(fechaHasta+'T00:00:00').toLocaleDateString('es-CL')}</div>
                      </div>
                    </div>
                    <div class="aviso">⚠️ Este informe contiene datos sensibles protegidos por la Ley 19.628. Solo debe compartirse ante requerimiento formal de autoridad competente.</div>

                    <h2>Resumen ejecutivo</h2>
                    <div class="metrics">
                      <div class="metric"><div class="lbl">Total socios</div><div class="val">${socios.length}</div><div class="lbl">${sociosActivos} activos</div></div>
                      <div class="metric"><div class="lbl">Dispensaciones en período</div><div class="val">${dispFiltradas.length}</div><div class="lbl">registros trazables</div></div>
                      <div class="metric"><div class="lbl">Total dispensado</div><div class="val">${totalGrGlobal} gr</div><div class="lbl">en el período</div></div>
                      <div class="metric"><div class="lbl">Aportes recibidos</div><div class="val">$${totalMontoGlobal.toLocaleString('es-CL')}</div><div class="lbl">en el período</div></div>
                    </div>

                    <h2>Documentos corporativos</h2>
                    <div class="note">ℹ️ Los documentos que no han sido subidos al sistema aparecen como "No subido".</div>
                    <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
                      <thead><tr><th style="width:220px">Documento</th><th>Archivo</th></tr></thead>
                      <tbody>${corpDocsHtml}</tbody>
                    </table>

                    <h2>Registro de socios (${socios.length})</h2>
                    <table>
                      <thead><tr>
                        <th>#</th><th>Nombre</th><th>RUT</th><th>Email</th><th>Estado</th>
                        <th style="text-align:right">Dispensaciones</th><th style="text-align:right">Gramos</th><th style="text-align:right">Aportes</th>
                      </tr></thead>
                      <tbody>${filasSocios}</tbody>
                    </table>

                    <h2>Documentos de socios — expedientes individuales</h2>
                    <div class="note">ℹ️ Las imágenes están embebidas en este archivo. Los PDFs pueden requerir Adobe Reader para visualizarse correctamente.</div>
                    ${sociosDocsHtml}

                    <h2>Historial de dispensaciones — período seleccionado (${dispFiltradas.length})</h2>
                    ${dispFiltradas.length === 0
                      ? '<p style="color:#9ca3af;font-style:italic">Sin dispensaciones en el período seleccionado.</p>'
                      : `<table>
                          <thead><tr>
                            <th>#</th><th>Fecha</th><th>Orden</th><th>Socio</th><th>Cepa / Producto</th>
                            <th style="text-align:right">Gramos</th><th style="text-align:right">Monto</th><th>Medio pago</th><th>Estado</th>
                          </tr></thead>
                          <tbody>${filasDisp}</tbody>
                          <tfoot><tr style="border-top:2px solid #e5e7eb;font-weight:700;background:#f9fafb">
                            <td colspan="5" style="padding:9px 10px">Totales del período</td>
                            <td style="padding:9px 10px;text-align:right">${totalGrGlobal} gr</td>
                            <td style="padding:9px 10px;text-align:right;color:#185FA5">$${totalMontoGlobal.toLocaleString('es-CL')}</td>
                            <td colspan="2"></td>
                          </tr></tfoot>
                        </table>`
                    }
                    <h2>Log de auditoría — acciones de administradores</h2>
                    ${auditLog.length === 0
                      ? '<p style="color:#9ca3af;font-style:italic">Sin registros de auditoría.</p>'
                      : `<table>
                          <thead><tr>
                            <th>Fecha y hora</th><th>Acción</th><th>Realizado por</th><th>Entidad</th><th>ID</th><th>Detalles</th>
                          </tr></thead>
                          <tbody>${auditLog.map((e: AuditLogEntry, i: number) => {
                            const fechaAudit = new Date(e.created_at).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})
                            const detallesAudit = Object.entries(e.detalles||{}).map(([k,v]) => `${k}: ${v}`).join(' · ')
                            return `<tr style="border-bottom:1px solid #e5e7eb;${i%2===0?'':'background:#f9fafb'}">
                              <td style="padding:7px 10px;white-space:nowrap;font-size:11px;color:#6b7280">${fechaAudit}</td>
                              <td style="padding:7px 10px">${e.accion}</td>
                              <td style="padding:7px 10px;font-weight:500">${e.realizado_por}</td>
                              <td style="padding:7px 10px;color:#6b7280">${e.entidad}</td>
                              <td style="padding:7px 10px;font-size:10px;color:#9ca3af;font-family:monospace">${e.entidad_id||'—'}</td>
                              <td style="padding:7px 10px;font-size:11px;color:#6b7280">${detallesAudit||'—'}</td>
                            </tr>`
                          }).join('')}</tbody>
                        </table>`
                    }

                    <div class="footer">
                      Informe generado automáticamente por el sistema GreenTech.<br>
                      Los registros cumplen con Ley 19.628 (datos personales), Ley 20.000 y Ley 21.575.
                    </div>
                  </body></html>`

                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Informe_Corporativo_GreenTech_${fechaDesde}_${fechaHasta}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                  } finally { setExportando(false) }
                }}
                  disabled={exportando}
                  style={{ width:'100%', padding:'9px', border:'none', borderRadius:8, background:exportando?'#6b7280':'#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor:exportando?'not-allowed':'pointer' }}>
                  {exportando ? '⏳ Generando informe con documentos...' : '📥 Exportar informe corporativo completo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal detalle dispensación */}
      {dispModal && (
        <div onClick={() => setDispModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:14, padding:28, width:380, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <span style={{ fontWeight:700, fontSize:15 }}>Detalle dispensación</span>
              <button onClick={() => setDispModal(null)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#9ca3af' }}>×</button>
            </div>
            {[
              ['N° orden', dispModal.orden_numero || '—'],
              ['RUT socio', dispModal.rut_socio || '—'],
              ['Cepa', dispModal.cepa || '—'],
              ['Gramos', dispModal.gramos ? `${dispModal.gramos} g` : '—'],
              ['Monto', `$${dispModal.monto.toLocaleString('es-CL')}`],
              ['Medio de pago', dispModal.medio_pago || '—'],
              ['Estado', dispModal.estado || '—'],
              ['Fecha', dispModal.created_at ? new Date(dispModal.created_at).toLocaleString('es-CL') : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f3f4f6', fontSize:13 }}>
                <span style={{ color:'#6b7280' }}>{label}</span>
                <span style={{ fontWeight:500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
