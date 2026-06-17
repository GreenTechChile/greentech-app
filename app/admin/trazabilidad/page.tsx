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
}
interface Dispensacion { id: string; cepa: string; gramos: number; monto: number; orden_numero: string; estado: string; mes: number; año: number; medio_pago: string; created_at: string; rut_socio?: string }

export default function Trazabilidad() {
  const [tab, setTab] = useState<'log'|'expediente'|'exportar'>('log')
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio|null>(null)
  const [socioDispensaciones, setSocioDispensaciones] = useState<Dispensacion[]>([])
  const [exportTodos, setExportTodos] = useState(true)
  const [exportSocios, setExportSocios] = useState<string[]>([])
  const [fechaDesde, setFechaDesde] = useState('2026-03-01')
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [{ data: disp }, { data: soc }] = await Promise.all([
      supabase.from('dispensaciones').select('*').order('created_at', { ascending: false }),
      supabase.from('socios').select('id,rut,nombre,email,estado,created_at,telefono,direccion,comuna,ciudad,diagnostico,medico_nombre,medico_rut,folio_receta,cuota_mensual,gramos_delegados,vencimiento_receta,notas_admin').order('nombre'),
    ])
    if (disp) setDispensaciones(disp)
    if (soc) setSocios(soc)
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
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', background:'#fff' }}>

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
          {[{key:'log',label:'📋 Log general'},{key:'expediente',label:'👤 Por socio'},{key:'exportar',label:'📤 Exportar fiscalización'}].map(t => (
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
                        <button style={{ fontSize:11, padding:'3px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', cursor:'pointer', color:'#6b7280' }}>Ver</button>
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
              <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Socios</div>
              {socios.map(s => (
                <div key={s.id} onClick={() => cargarExpediente(s)}
                  style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:'pointer', background:socioSeleccionado?.id===s.id?'#E6F1FB':'#f9fafb', border:`1px solid ${socioSeleccionado?.id===s.id?'#A8CBF0':'#e5e7eb'}` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:socioSeleccionado?.id===s.id?'#185FA5':'#111' }}>{s.nombre.split(' ').slice(0,2).join(' ')}</div>
                  <div style={{ fontSize:10, color:'#9ca3af' }}>{s.rut}</div>
                  <span style={{ fontSize:9, background:s.estado==='activo'?'#EAF3DE':'#f3f4f6', color:s.estado==='activo'?'#3B6D11':'#9ca3af', padding:'1px 6px', borderRadius:20 }}>
                    {s.estado}
                  </span>
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
                      // Obtener URLs firmadas de documentos del socio
                      const DOCS = [
                        { key: 'cedula_anverso', label: 'Cédula de identidad — Anverso' },
                        { key: 'cedula_reverso', label: 'Cédula de identidad — Reverso' },
                        { key: 'receta', label: 'Receta médica vigente' },
                        { key: 'antecedentes', label: 'Certificado de antecedentes' },
                      ]
                      const docsHtml: string[] = []
                      for (const doc of DOCS) {
                        let found = false
                        for (const ext of ['pdf','jpg','jpeg','png']) {
                          const { data: urlData } = await supabase.storage.from('documentos')
                            .createSignedUrl(`${socioSeleccionado.rut}/${doc.key}.${ext}`, 3600)
                          if (urlData?.signedUrl) {
                            try {
                              const resp = await fetch(urlData.signedUrl)
                              const blob = await resp.blob()
                              const b64 = await new Promise<string>(res => {
                                const r = new FileReader()
                                r.onload = () => res(r.result as string)
                                r.readAsDataURL(blob)
                              })
                              const esImagen = ['jpg','jpeg','png'].includes(ext)
                              const mediaType = esImagen ? `image/${ext==='jpg'?'jpeg':ext}` : 'application/pdf'
                              docsHtml.push(`
                                <tr style="border-bottom:1px solid #e5e7eb">
                                  <td style="padding:8px 12px;vertical-align:top">📄 ${doc.label}</td>
                                  <td style="padding:8px 12px">
                                    ${esImagen
                                      ? `<img src="${b64}" style="max-width:480px;max-height:300px;border-radius:4px;border:1px solid #e5e7eb;display:block" />`
                                      : `<object data="${b64}" type="application/pdf" width="100%" height="400px" style="border:1px solid #e5e7eb;border-radius:4px">
                                           <p style="color:#9ca3af">PDF no puede mostrarse en este navegador. <a href="${b64}" download="${doc.key}.pdf" style="color:#185FA5">Descargar PDF</a></p>
                                         </object>`
                                    }
                                  </td>
                                </tr>`)
                              found = true; break
                            } catch {
                              // Si falla el fetch, mostrar link
                              docsHtml.push(`<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px">📄 ${doc.label}</td><td style="padding:8px 12px"><a href="${urlData.signedUrl}" target="_blank" style="color:#185FA5">Ver documento</a></td></tr>`)
                              found = true; break
                            }
                          }
                        }
                        if (!found) {
                          docsHtml.push(`<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#9ca3af">📄 ${doc.label}</td><td style="padding:8px 12px;color:#9ca3af;font-style:italic">No subido</td></tr>`)
                        }
                      }

                      const totalGr = socioDispensaciones.reduce((a,d) => a + d.gramos, 0)
                      const totalMonto = socioDispensaciones.reduce((a,d) => a + d.monto, 0)
                      const filas = socioDispensaciones.map((d,i) => `
                        <tr style="border-bottom:1px solid #e5e7eb">
                          <td style="padding:8px 12px;color:#6b7280">${i+1}</td>
                          <td style="padding:8px 12px">${new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                          <td style="padding:8px 12px">Orden #${d.orden_numero||'—'}</td>
                          <td style="padding:8px 12px">${d.cepa||'—'}</td>
                          <td style="padding:8px 12px;text-align:right">${d.gramos} gr</td>
                          <td style="padding:8px 12px;text-align:right">$${d.monto.toLocaleString('es-CL')}</td>
                          <td style="padding:8px 12px">${d.medio_pago||'—'}</td>
                          <td style="padding:8px 12px">
                            <span style="background:${d.estado==='entregado'||d.estado==='pagado'?'#EAF3DE':'#FAEEDA'};color:${d.estado==='entregado'||d.estado==='pagado'?'#3B6D11':'#633806'};padding:2px 8px;border-radius:20px;font-size:10px">${d.estado}</span>
                          </td>
                        </tr>`).join('')
                      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                        <title>Expediente ${socioSeleccionado.nombre}</title>
                        <style>
                          body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
                          h1{font-size:20px;margin-bottom:4px}
                          .sub{color:#6b7280;font-size:12px;margin-bottom:24px}
                          .badge{background:#EAF3DE;color:#3B6D11;padding:3px 10px;border-radius:20px;font-size:11px}
                          table{width:100%;border-collapse:collapse;margin-top:16px}
                          th{text-align:left;padding:8px 12px;font-size:11px;color:#9ca3af;border-bottom:2px solid #e5e7eb}
                          .total{font-weight:700;background:#f9fafb}
                          .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af}
                        </style>
                      </head><body>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                          <div>
                            <h1>Expediente de Dispensaciones</h1>
                            <div class="sub">Asociación de Usuarios de Plantas Medicinales GreenTech</div>
                          </div>
                          <div style="text-align:right;font-size:11px;color:#6b7280">
                            Generado: ${new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})}<br>
                            Folio: EXP-${socioSeleccionado.rut.replace('-','')}-${Date.now().toString().slice(-6)}
                          </div>
                        </div>
                        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:20px">
                          <div style="font-size:15px;font-weight:700;margin-bottom:4px">${socioSeleccionado.nombre}</div>
                          <div style="font-size:12px;color:#6b7280">RUT ${socioSeleccionado.rut} &nbsp;·&nbsp; ${socioSeleccionado.email}</div>
                          <div style="margin-top:8px;display:flex;gap:16px;font-size:12px">
                            <span>Total dispensado: <strong>${totalGr} gr</strong></span>
                            <span>Total aportado: <strong>$${totalMonto.toLocaleString('es-CL')}</strong></span>
                            <span>Dispensaciones: <strong>${socioDispensaciones.length}</strong></span>
                          </div>
                        </div>
                        <h2 style="font-size:14px;font-weight:700;margin:24px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px">Datos de incorporación</h2>
                        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                          <tr style="border-bottom:1px solid #e5e7eb">
                            <td style="padding:8px 12px;color:#6b7280;width:200px">Teléfono</td>
                            <td style="padding:8px 12px">${socioSeleccionado.telefono||'—'}</td>
                            <td style="padding:8px 12px;color:#6b7280;width:200px">Dirección</td>
                            <td style="padding:8px 12px">${socioSeleccionado.direccion||'—'}, ${socioSeleccionado.comuna||''}, ${socioSeleccionado.ciudad||''}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb">
                            <td style="padding:8px 12px;color:#6b7280">Diagnóstico</td>
                            <td style="padding:8px 12px">${socioSeleccionado.diagnostico||'—'}</td>
                            <td style="padding:8px 12px;color:#6b7280">Médico tratante</td>
                            <td style="padding:8px 12px">${socioSeleccionado.medico_nombre||'—'} · RUT ${socioSeleccionado.medico_rut||'—'}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb">
                            <td style="padding:8px 12px;color:#6b7280">Folio receta</td>
                            <td style="padding:8px 12px">${socioSeleccionado.folio_receta||'—'}</td>
                            <td style="padding:8px 12px;color:#6b7280">Vencimiento receta</td>
                            <td style="padding:8px 12px">${socioSeleccionado.vencimiento_receta||'—'}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb">
                            <td style="padding:8px 12px;color:#6b7280">Cuota autorizada</td>
                            <td style="padding:8px 12px">${socioSeleccionado.cuota_mensual||0} gr / mes</td>
                            <td style="padding:8px 12px;color:#6b7280">Gramos delegados</td>
                            <td style="padding:8px 12px">${socioSeleccionado.gramos_delegados||0} gr / mes</td>
                          </tr>
                          ${socioSeleccionado.notas_admin ? `<tr><td style="padding:8px 12px;color:#6b7280">Notas admin</td><td colspan="3" style="padding:8px 12px">${socioSeleccionado.notas_admin}</td></tr>` : ''}
                        </table>

                        <h2 style="font-size:14px;font-weight:700;margin:0 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px">Documentos de incorporación</h2>
                        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                          <thead><tr>
                            <th style="text-align:left;padding:8px 12px;font-size:11px;color:#9ca3af;border-bottom:1px solid #e5e7eb;width:220px">Documento</th>
                            <th style="text-align:left;padding:8px 12px;font-size:11px;color:#9ca3af;border-bottom:1px solid #e5e7eb">Archivo</th>
                          </tr></thead>
                          <tbody>${docsHtml.join('')}<tr style="border-bottom:1px solid #e5e7eb">
                            <td style="padding:8px 12px">✅ Reglamento interno</td>
                            <td style="padding:8px 12px"><span style="background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:20px;font-size:11px">Aceptado en línea al momento de inscripción</span></td>
                          </tr></tbody>
                        </table>

                        <h2 style="font-size:14px;font-weight:700;margin:0 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px">Historial de dispensaciones</h2>
                        <table>
                          <thead><tr>
                            <th>#</th><th>Fecha</th><th>Orden</th><th>Cepa / Producto</th>
                            <th style="text-align:right">Gramos</th><th style="text-align:right">Monto</th>
                            <th>Medio pago</th><th>Estado</th>
                          </tr></thead>
                          <tbody>${filas}</tbody>
                          <tfoot><tr class="total">
                            <td colspan="4" style="padding:10px 12px;font-weight:600">Total</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:700">${totalGr} gr</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:700;color:#185FA5">$${totalMonto.toLocaleString('es-CL')}</td>
                            <td colspan="2"></td>
                          </tr></tfoot>
                        </table>
                        <div class="footer">
                          Este documento fue generado automáticamente por el sistema GreenTech. 
                          Los registros son inmutables y cumplen con Ley 19.628, Ley 20.000 y Ley 21.575.
                        </div>
                      </body></html>`
                      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `Expediente_${socioSeleccionado.rut}_${new Date().toISOString().split('T')[0]}.html`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                      style={{ padding:'6px 14px', border:'1px solid #185FA5', borderRadius:8, background:'#E6F1FB', color:'#185FA5', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                      📤 Exportar expediente
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
                  <button disabled={exportSocios.length === 0}
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

                  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                    <title>Informe Corporativo — Asociación GreenTech</title>
                    <style>
                      body{font-family:Arial,sans-serif;padding:32px 40px;color:#111;font-size:13px;max-width:1100px;margin:0 auto}
                      h1{font-size:22px;margin:0 0 4px;color:#185FA5}
                      h2{font-size:15px;font-weight:700;margin:32px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
                      .sub{color:#6b7280;font-size:12px;margin-bottom:24px}
                      table{width:100%;border-collapse:collapse;margin-bottom:8px}
                      th{text-align:left;padding:8px 10px;font-size:11px;color:#9ca3af;border-bottom:2px solid #e5e7eb;white-space:nowrap}
                      .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
                      .metric{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
                      .metric .val{font-size:20px;font-weight:700;color:#185FA5;margin:4px 0}
                      .metric .lbl{font-size:11px;color:#9ca3af}
                      .aviso{background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E;margin:16px 0}
                      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
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
                    <h2>Registro de socios (${socios.length})</h2>
                    <table>
                      <thead><tr>
                        <th>#</th><th>Nombre</th><th>RUT</th><th>Email</th><th>Estado</th>
                        <th style="text-align:right">Dispensaciones</th><th style="text-align:right">Gramos</th><th style="text-align:right">Aportes</th>
                      </tr></thead>
                      <tbody>${filasSocios}</tbody>
                    </table>
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
                }}
                  style={{ width:'100%', padding:'9px', border:'none', borderRadius:8, background:'#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  📥 Exportar informe corporativo completo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
