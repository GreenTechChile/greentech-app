'use client'
import { useState, useEffect, useRef } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Movimiento {
  id: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  concepto: string
  monto: number
  mes: number
  año: number
  created_at: string
  registrado_por?: string
}

interface Dispensacion {
  id: string
  monto: number
  mes: number
  año: number
}

interface PagoContrato {
  id: string
  contrato_id: string
  mes: number
  año: number
  monto_liquido: number
  retencion: number
  estado: string
  fecha_pago: string | null
  contrato?: { nombre: string; tipo: string; rol_funcion: string }
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Finanzas() {
  const [tab, setTab] = useState<'resumen'|'aportes'|'incorporaciones'|'costos'|'extraordinarios'>('resumen')
  const [aportesExt, setAportesExt] = useState<any[]>([])
  const [nuevoAporteConcepto, setNuevoAporteConcepto] = useState('')
  const [nuevoAporteMonto, setNuevoAporteMonto] = useState('')
  const [nuevoAporteSocio, setNuevoAporteSocio] = useState('')
  const [nuevoAporteMes, setNuevoAporteMes] = useState(new Date().getMonth()+1)
  const [nuevoAporteFile, setNuevoAporteFile] = useState<File|null>(null)
  const [guardandoAporte, setGuardandoAporte] = useState(false)
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [ingresosIncorporacion, setIngresosIncorporacion] = useState<Movimiento[]>([])
  const [costos, setCostos] = useState<Movimiento[]>([])
  const [pagosContratos, setPagosContratos] = useState<PagoContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [filtroAño, setFiltroAño] = useState(2026)
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1)

  // Form nuevo costo
  const [ncConcepto, setNcConcepto] = useState('')
  const [ncMonto, setNcMonto] = useState('')
  const [ncCategoria, setNcCategoria] = useState('Producción')
  const [ncMes, setNcMes] = useState(new Date().getMonth() + 1)
  const [ncComprobante, setNcComprobante] = useState<File|null>(null)
  const [subiendoComp, setSubiendoComp] = useState(false)
  const comprobanteRef = useRef<HTMLInputElement>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<string|null>(null)
  const [datosBancarios, setDatosBancarios] = useState({ banco:'', tipo_cuenta:'', numero_cuenta:'', titular:'', rut_titular:'' })
  const [editandoBanco, setEditandoBanco] = useState(false)
  const [guardandoBanco, setGuardandoBanco] = useState(false)

  useEffect(() => { cargarDatos(); cargarDatosBancarios() }, [filtroAño])

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

  const cargarDatos = async () => {
    setLoading(true)
    const [dispRes, movEgresoRes, movIngresoRes, pagContRes] = await Promise.all([
      supabase.from('dispensaciones').select('id,monto,mes,año').eq('año', filtroAño),
      supabase.from('movimientos_financieros').select('*').eq('año', filtroAño).eq('tipo','egreso').order('created_at', { ascending: false }),
      supabase.from('movimientos_financieros').select('*').eq('año', filtroAño).eq('tipo','ingreso').order('created_at', { ascending: false }),
      supabase.from('pagos_contratos').select('*, contrato:contratos(nombre,tipo,rol_funcion)').eq('año', filtroAño).eq('estado','pagado').order('mes', { ascending: true }),
    ])
    if (dispRes.data) setDispensaciones(dispRes.data as unknown as Dispensacion[])
    if (movEgresoRes.data) setCostos(movEgresoRes.data as unknown as Movimiento[])
    if (movIngresoRes.data) setIngresosIncorporacion(movIngresoRes.data as unknown as Movimiento[])
    const { data: ae } = await supabase.from('aportes_extraordinarios').select('*').eq('año', filtroAño).order('created_at', { ascending: false })
    if (ae) setAportesExt(ae)
    if (pagContRes.data) setPagosContratos(pagContRes.data as any[])
    setLoading(false)
  }

  const agregarCosto = async () => {
    if (!ncConcepto || !ncMonto) { setMensaje('❌ Completa concepto y monto'); return }
    setGuardando(true)
    const { data: { user: userActual } } = await supabase.auth.getUser()
    const nombreAdmin = userActual?.user_metadata?.nombre || userActual?.email || userActual?.user_metadata?.rut || 'Desconocido'
    const { data: inserted, error } = await supabase.from('movimientos_financieros').insert({
      tipo: 'egreso', categoria: ncCategoria, concepto: ncConcepto,
      monto: parseInt(ncMonto), mes: ncMes, año: filtroAño,
      registrado_por: nombreAdmin,
    }).select().single()
    if (error) { setMensaje('❌ Error: ' + error.message); setGuardando(false); return }
    // Subir comprobante si se adjuntó
    if (ncComprobante && inserted?.id) {
      setSubiendoComp(true)
      const ext = ncComprobante.name.split('.').pop()
      await supabase.storage.from('finanzas').upload(
        `comprobantes/${inserted.id}.${ext}`,
        ncComprobante,
        { upsert: true, contentType: ncComprobante.type }
      )
      setSubiendoComp(false)
    }
    setMensaje('✅ Costo registrado correctamente')
    setNcConcepto(''); setNcMonto(''); setNcComprobante(null); if (comprobanteRef.current) comprobanteRef.current.value = ''
    cargarDatos()
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  // Calcular datos por mes
  const agregarAporteExtraordinario = async () => {
    if (!nuevoAporteConcepto || !nuevoAporteMonto) return
    setGuardandoAporte(true)
    const { data: { user: userActual } } = await supabase.auth.getUser()
    const nombreAdmin = userActual?.user_metadata?.nombre || userActual?.email || userActual?.user_metadata?.rut || 'Desconocido'
    let comprobante_url = null
    if (nuevoAporteFile) {
      const ext = nuevoAporteFile.name.split('.').pop()
      const path = `aportes_ext/${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('documentos').upload(path, nuevoAporteFile, { upsert: true })
      if (up) {
        const { data: ud } = await supabase.storage.from('documentos').createSignedUrl(path, 60 * 60 * 24 * 365)
        comprobante_url = ud?.signedUrl || null
      }
    }
    const { error } = await supabase.from('aportes_extraordinarios').insert({
      concepto: nuevoAporteConcepto,
      monto: parseInt(nuevoAporteMonto),
      socio_rut: nuevoAporteSocio || null,
      mes: nuevoAporteMes,
      año: filtroAño,
      comprobante_url,
      registrado_por: nombreAdmin,
    })
    if (!error) {
      setNuevoAporteConcepto(''); setNuevoAporteMonto(''); setNuevoAporteSocio(''); setNuevoAporteFile(null)
      const { data: ae } = await supabase.from('aportes_extraordinarios').select('*').eq('año', filtroAño).order('created_at', { ascending: false })
      if (ae) setAportesExt(ae)
    }
    setGuardandoAporte(false)
  }


  const ingresosPorMes = (mes: number) => dispensaciones.filter(d => d.mes === mes).reduce((a, d) => a + d.monto, 0)
  const verComprobante = async (costoId: string) => {
    for (const ext of ['pdf','jpg','jpeg','png']) {
      const { data } = await supabase.storage.from('finanzas').createSignedUrl(`comprobantes/${costoId}.${ext}`, 3600)
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
    }
    alert('Sin comprobante adjunto para este costo.')
  }

  const costosPorMes = (mes: number) => costos.filter(c => c.mes === mes).reduce((a, c) => a + c.monto, 0) + pagosContratos.filter(p => p.mes === mes).reduce((a, p) => a + p.monto_liquido, 0)

  const totalIngresoDispensaciones = dispensaciones.reduce((a, d) => a + d.monto, 0)
  const totalIngresoIncorporaciones = ingresosIncorporacion.reduce((a, m) => a + m.monto, 0)
  const totalIngresos = totalIngresoDispensaciones + totalIngresoIncorporaciones
  const totalCostosDirectos = costos.reduce((a, c) => a + c.monto, 0)
  const totalPagosContratos = pagosContratos.reduce((a, p) => a + p.monto_liquido, 0)
  const totalCostos = totalCostosDirectos + totalPagosContratos
  const superavit = totalIngresos - totalCostos

  const mesesConActividad = [...new Set([
    ...dispensaciones.map(d => d.mes),
    ...costos.map(c => c.mes),
    ...pagosContratos.map(p => p.mes),
  ])].sort((a,b) => a - b)

  const maxCosto = Math.max(...mesesConActividad.map(m => costosPorMes(m)), 1)
  const maxIngreso = Math.max(...mesesConActividad.map(m => ingresosPorMes(m)), maxCosto, 1)

  const costosMes = costos.filter(c => c.mes === mesFiltro)
  const pagosContratosMes = pagosContratos.filter(p => p.mes === mesFiltro)
  const costosMesTotal = costosMes.reduce((a,c)=>a+c.monto,0) + pagosContratosMes.reduce((a,p)=>a+p.monto_liquido,0)
  const ingresosMes = ingresosPorMes(mesFiltro)

  const s = {
    input: { width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const },
    label: { fontSize:11, color:'#6b7280', display:'block', marginBottom:4 },
    field: { display:'flex', flexDirection:'column' as const, gap:4 },
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', overflowX:'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', minWidth:0, background:'#fff' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Finanzas</h1>
            <p style={{ fontSize:13, color:'#6b7280' }}>Aportes de socios, costos de producción y balance</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={filtroAño} onChange={e => setFiltroAño(Number(e.target.value))}
              style={{ padding:'7px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
            <button style={{ padding:'7px 14px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              📥 Exportar para asamblea
            </button>
          </div>
        </div>

        {mensaje && (
          <div style={{ background:mensaje.startsWith('✅')?'#EAF3DE':'#FCEBEB', border:`1px solid ${mensaje.startsWith('✅')?'#97C459':'#F5C5C5'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color:mensaje.startsWith('✅')?'#3B6D11':'#A32D2D', marginBottom:16 }}>
            {mensaje}
          </div>
        )}

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:`Ingresos ${filtroAño}`, value:`$${totalIngresos.toLocaleString('es-CL')}`, sub:`${dispensaciones.length} dispensaciones · ${ingresosIncorporacion.length} incorporaciones`, color:'#3B6D11' },
            { label:`Costos ${filtroAño}`, value:`$${totalCostos.toLocaleString('es-CL')}`, sub:`${costos.length} registros`, color:'#A32D2D' },
            { label:'Superávit acumulado', value:`$${Math.abs(superavit).toLocaleString('es-CL')}`, sub:superavit >= 0 ? 'balance positivo ✓' : 'balance negativo ⚠️', color: superavit >= 0 ? '#185FA5' : '#A32D2D' },
            { label:`Promedio mensual`, value:`$${mesesConActividad.length>0 ? Math.round(totalIngresos/mesesConActividad.length).toLocaleString('es-CL') : 0}`, sub:'en ingresos' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:18, fontWeight:600, color:m.color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:20 }}>
          {[{key:'resumen',label:'📊 Resumen'},{key:'aportes',label:'💰 Aportes socios'},{key:'incorporaciones',label:'💳 Incorporaciones'},{key:'costos',label:'📋 Costos'},{key:'extraordinarios',label:'⭐ Aportes extraordinarios'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{ padding:'8px 18px', fontSize:13, background:'none', border:'none', cursor:'pointer', borderBottom:tab===t.key?'2px solid #185FA5':'2px solid transparent', color:tab===t.key?'#185FA5':'#6b7280', fontWeight:tab===t.key?600:400, marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB RESUMEN */}
        {tab === 'resumen' && (
          <>
            {/* Gráfico de barras */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Ingresos vs Costos — {filtroAño}</div>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6b7280' }}><div style={{ width:10, height:10, borderRadius:2, background:'#3B6D11' }}/> Ingresos</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6b7280' }}><div style={{ width:10, height:10, borderRadius:2, background:'#FCEBEB', border:'1px solid #F5C5C5' }}/> Costos</div>
              </div>
              {mesesConActividad.length === 0 ? (
                <div style={{ fontSize:13, color:'#9ca3af', textAlign:'center', padding:20 }}>Sin datos para {filtroAño}</div>
              ) : (
                <div style={{ display:'flex', gap:10, alignItems:'flex-end', height:100 }}>
                  {MESES.map((mes, i) => {
                    const m = i + 1
                    const ing = ingresosPorMes(m)
                    const cos = costosPorMes(m)
                    const hIng = maxIngreso > 0 ? (ing / maxIngreso) * 80 : 0
                    const hCos = maxIngreso > 0 ? (cos / maxIngreso) * 80 : 0
                    const activo = ing > 0 || cos > 0
                    return (
                      <div key={m} style={{ flex:1, textAlign:'center' }}>
                        <div style={{ display:'flex', gap:2, justifyContent:'center', alignItems:'flex-end', height:80, marginBottom:4 }}>
                          <div style={{ width:10, borderRadius:'3px 3px 0 0', background: activo ? '#3B6D11' : '#f3f4f6', height:`${Math.max(hIng, activo?3:0)}px` }}/>
                          <div style={{ width:10, borderRadius:'3px 3px 0 0', background: cos > 0 ? '#F5C5C5' : '#f3f4f6', border: cos > 0 ? '1px solid #F5C5C5' : 'none', height:`${Math.max(hCos, cos>0?3:0)}px` }}/>
                        </div>
                        <div style={{ fontSize:9, color: activo ? '#374151' : '#d1d5db' }}>{mes}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Balance acumulado */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Balance acumulado {filtroAño}</div>
              {[
                { label:'Total ingresos', value:totalIngresos, color:'#3B6D11', pct:totalIngresos>0||totalCostos>0?(totalIngresos/Math.max(totalIngresos,totalCostos))*100:0 },
                { label:'Total costos', value:totalCostos, color:'#A32D2D', pct:totalIngresos>0||totalCostos>0?(totalCostos/Math.max(totalIngresos,totalCostos))*100:0 },
                { label:'Fondo de reserva', value:superavit, color: superavit>=0?'#185FA5':'#A32D2D', pct:totalIngresos>0||totalCostos>0?(Math.abs(superavit)/Math.max(totalIngresos,totalCostos))*100:0 },
              ].map((r,i) => (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                    <span style={{ color:'#6b7280' }}>{r.label}</span>
                    <span style={{ fontWeight:600, color:r.color }}>${Math.max(0,r.value).toLocaleString('es-CL')}</span>
                  </div>
                  <div style={{ height:9, background:'#f3f4f6', borderRadius:20, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${totalIngresos > 0 ? Math.max(0,Math.min(100,r.pct)) : 0}%`, background:r.color, borderRadius:20 }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Datos bancarios */}
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
                      <input
                        style={{ width:'100%', padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                        value={datosBancarios[field as keyof typeof datosBancarios]}
                        placeholder={placeholder}
                        onChange={e => setDatosBancarios(prev => ({ ...prev, [field]: e.target.value }))}
                      />
                    ) : (
                      <div style={{ fontSize:13, fontWeight:500, color: datosBancarios[field as keyof typeof datosBancarios] ? '#111' : '#d1d5db', background:'#f9fafb', padding:'7px 10px', borderRadius:8, border:'1px solid transparent' }}>
                        {datosBancarios[field as keyof typeof datosBancarios] || '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!editandoBanco && !datosBancarios.banco && (
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:10, fontStyle:'italic' }}>
                  Haz clic en ✏️ Editar para agregar los datos bancarios de la asociación
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB APORTES */}
        {tab === 'aportes' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#6b7280' }}>Filtrar mes:</span>
              <select value={mesFiltro} onChange={e=>setMesFiltro(Number(e.target.value))}
                style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
                {MESES_FULL.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f9fafb', fontSize:13, fontWeight:600 }}>
                <span>Aportes de socios — {MESES_FULL[mesFiltro-1]} {filtroAño}</span>
                <span style={{ color:'#3B6D11' }}>${ingresosMes.toLocaleString('es-CL')}</span>
              </div>
              {loading ? (
                <div style={{ padding:20, fontSize:13, color:'#9ca3af', textAlign:'center' }}>Cargando...</div>
              ) : dispensaciones.filter(d=>d.mes===mesFiltro).length === 0 ? (
                <div style={{ padding:20, fontSize:13, color:'#9ca3af', textAlign:'center' }}>Sin dispensaciones en {MESES_FULL[mesFiltro-1]}</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #e5e7eb' }}>
                      {['#','Concepto','Tipo','Monto',''].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 14px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dispensaciones.filter(d=>d.mes===mesFiltro).map((d,i) => (
                      <tr key={d.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'9px 14px', color:'#9ca3af' }}>{i+1}</td>
                        <td style={{ padding:'9px 14px' }}>Dispensación</td>
                        <td style={{ padding:'9px 14px' }}><span style={{ fontSize:10, background:'#EAF3DE', color:'#3B6D11', padding:'2px 8px', borderRadius:20 }}>Ordinario</span></td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:'#3B6D11' }}>${d.monto.toLocaleString('es-CL')}</td>
                        <td style={{ padding:'9px 14px' }}><button style={{ fontSize:11, padding:'3px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', cursor:'pointer', color:'#6b7280' }}>Ver</button></td>
                      </tr>
                    ))}
                    <tr style={{ background:'#f9fafb', borderTop:'1px solid #e5e7eb' }}>
                      <td colSpan={3} style={{ padding:'9px 14px', fontWeight:600 }}>Total {MESES_FULL[mesFiltro-1]}</td>
                      <td style={{ padding:'9px 14px', fontWeight:700, color:'#3B6D11', fontSize:14 }}>${ingresosMes.toLocaleString('es-CL')}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* TAB INCORPORACIONES */}
        {tab === 'incorporaciones' && (
          <>
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f9fafb', fontSize:13, fontWeight:600 }}>
                <span>Pagos de incorporación — {filtroAño}</span>
                <span style={{ color:'#3B6D11' }}>${totalIngresoIncorporaciones.toLocaleString('es-CL')}</span>
              </div>
              {loading ? (
                <div style={{ padding:20, fontSize:13, color:'#9ca3af', textAlign:'center' }}>Cargando...</div>
              ) : ingresosIncorporacion.length === 0 ? (
                <div style={{ padding:40, fontSize:13, color:'#9ca3af', textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12, margin:16 }}>
                  Sin pagos de incorporación registrados para {filtroAño}
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #e5e7eb' }}>
                      {['#','Concepto','Categoría','Mes','Monto'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 14px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingresosIncorporacion.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'9px 14px', color:'#9ca3af' }}>{i + 1}</td>
                        <td style={{ padding:'9px 14px', fontWeight:500 }}>{m.concepto}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ fontSize:10, background:'#E6F1FB', color:'#185FA5', padding:'2px 8px', borderRadius:20 }}>{m.categoria}</span>
                        </td>
                        <td style={{ padding:'9px 14px', color:'#6b7280' }}>{MESES_FULL[m.mes - 1]}</td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:'#3B6D11' }}>${m.monto.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                    <tr style={{ background:'#f9fafb', borderTop:'1px solid #e5e7eb' }}>
                      <td colSpan={4} style={{ padding:'9px 14px', fontWeight:600 }}>Total incorporaciones {filtroAño}</td>
                      <td style={{ padding:'9px 14px', fontWeight:700, color:'#3B6D11', fontSize:14 }}>${totalIngresoIncorporaciones.toLocaleString('es-CL')}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* TAB COSTOS */}
        {tab === 'extraordinarios' && (
          <div>
            <div style={{ background:'#FAFFF5', border:'1px solid #97C459', borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#3B6D11', marginBottom:14 }}>⭐ Registrar aporte extraordinario</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                  <label style={{ fontSize:11, color:'#6b7280' }}>Concepto *</label>
                  <input value={nuevoAporteConcepto} onChange={e=>setNuevoAporteConcepto(e.target.value)} placeholder="Ej: Aporte asamblea marzo"
                    style={{ padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none' }}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                  <label style={{ fontSize:11, color:'#6b7280' }}>Monto ($) *</label>
                  <input type="number" value={nuevoAporteMonto} onChange={e=>setNuevoAporteMonto(e.target.value)} placeholder="0"
                    style={{ padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none' }}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                  <label style={{ fontSize:11, color:'#6b7280' }}>Mes</label>
                  <select value={nuevoAporteMes} onChange={e=>setNuevoAporteMes(Number(e.target.value))}
                    style={{ padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none' }}>
                    {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                  <label style={{ fontSize:11, color:'#6b7280' }}>Comprobante</label>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button type="button" onClick={() => document.getElementById('file-aporte-ext')?.click()}
                      style={{ padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:12, cursor:'pointer', background:'#fff', color:'#6b7280', flex:1 }}>
                      {nuevoAporteFile ? `✓ ${nuevoAporteFile.name.slice(0,12)}...` : '📎 Adjuntar'}
                    </button>
                    <input id="file-aporte-ext" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                      onChange={e => e.target.files?.[0] && setNuevoAporteFile(e.target.files[0])} />
                  </div>
                </div>
              </div>
              <button onClick={agregarAporteExtraordinario} disabled={guardandoAporte || !nuevoAporteConcepto || !nuevoAporteMonto}
                style={{ padding:'8px 20px', background: guardandoAporte || !nuevoAporteConcepto || !nuevoAporteMonto ? '#9ca3af' : '#3B6D11', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {guardandoAporte ? 'Guardando...' : 'Registrar aporte'}
              </button>
            </div>

            {aportesExt.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' as const, border:'1px dashed #e5e7eb', borderRadius:12 }}>
                Sin aportes extraordinarios registrados para {filtroAño}
              </div>
            ) : (
              <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 1fr 1fr', padding:'10px 16px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', fontSize:11, color:'#9ca3af', fontWeight:500 }}>
                  {['Concepto','Socio','Mes','Monto','Comprobante'].map(h => <span key={h}>{h}</span>)}
                </div>
                {aportesExt.map((a: any) => (
                  <div key={a.id} style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 1fr 1fr', padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:13, alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:500 }}>{a.concepto}</div>
                      {a.registrado_por && <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>Ingresado por {a.registrado_por}</div>}
                    </div>
                    <span style={{ fontSize:12, color:'#6b7280' }}>{a.socio_rut || '—'}</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>
                      {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][a.mes-1]}
                    </span>
                    <span style={{ fontWeight:600, color:'#3B6D11' }}>${a.monto.toLocaleString('es-CL')}</span>
                    <span>
                      {a.comprobante_url
                        ? <button onClick={() => window.open(a.comprobante_url, '_blank')}
                            style={{ padding:'4px 10px', border:'1px solid #185FA5', borderRadius:6, background:'transparent', color:'#185FA5', fontSize:11, cursor:'pointer' }}>Ver</button>
                        : <span style={{ color:'#9ca3af', fontSize:11 }}>Sin comprobante</span>
                      }
                    </span>
                  </div>
                ))}
                <div style={{ padding:'10px 16px', display:'flex', justifyContent:'space-between', background:'#f9fafb', fontSize:13, fontWeight:600 }}>
                  <span>Total aportes extraordinarios {filtroAño}</span>
                  <span style={{ color:'#3B6D11' }}>${aportesExt.reduce((a: number, e: any) => a + e.monto, 0).toLocaleString('es-CL')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'costos' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#6b7280' }}>Mes:</span>
                <select value={mesFiltro} onChange={e=>setMesFiltro(Number(e.target.value))}
                  style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, background:'#fff', outline:'none' }}>
                  {MESES_FULL.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Form nuevo costo */}
            <div style={{ border:'1px solid #F5C5C5', borderRadius:10, padding:14, marginBottom:16, background:'#FFF8F8' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#A32D2D', marginBottom:10 }}>+ Registrar nuevo costo</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:10, alignItems:'flex-end' }}>
                <div style={s.field}><label style={s.label}>Concepto *</label><input style={s.input} value={ncConcepto} onChange={e=>setNcConcepto(e.target.value)} placeholder="Ej: Insumos cultivo"/></div>
                <div style={s.field}><label style={s.label}>Monto ($) *</label><input style={s.input} type="number" value={ncMonto} onChange={e=>setNcMonto(e.target.value)} placeholder="0"/></div>
                <div style={s.field}><label style={s.label}>Categoría</label>
                  <select style={s.input} value={ncCategoria} onChange={e=>setNcCategoria(e.target.value)}>
                    {['Producción','Servicios','Arriendo','Operación','Transporte','Otro'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.field}><label style={s.label}>Mes</label>
                  <select style={s.input} value={ncMes} onChange={e=>setNcMes(Number(e.target.value))}>
                    {MESES_FULL.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Comprobante</label>
                  <input
                    ref={comprobanteRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display:'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0] || null
                      setNcComprobante(f)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => comprobanteRef.current?.click()}
                    style={{
                      padding:'7px 10px', border:`1px solid ${ncComprobante ? '#97C459' : '#d1d5db'}`,
                      borderRadius:8, cursor:'pointer', background: ncComprobante ? '#EAF3DE' : '#fff',
                      fontSize:12, color: ncComprobante ? '#3B6D11' : '#9ca3af',
                      textAlign:'left' as const, whiteSpace:'nowrap' as const, overflow:'hidden',
                      textOverflow:'ellipsis', maxWidth:160
                    }}>
                    {ncComprobante ? `✓ ${ncComprobante.name.slice(0,16)}…` : '📎 Adjuntar'}
                  </button>
                </div>
                <button onClick={agregarCosto} disabled={guardando||subiendoComp}
                  style={{ padding:'8px 16px', border:'none', borderRadius:8, background:'#A32D2D', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {subiendoComp ? '⏳' : guardando ? '...' : 'Agregar'}
                </button>
              </div>
            </div>

            {/* Tabla costos */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f9fafb', fontSize:13, fontWeight:600 }}>
                <span>Costos — {MESES_FULL[mesFiltro-1]} {filtroAño}</span>
                <span style={{ color:'#A32D2D' }}>${costosMesTotal.toLocaleString('es-CL')}</span>
              </div>
              {costosMes.length === 0 && pagosContratosMes.length === 0 ? (
                <div style={{ padding:20, fontSize:13, color:'#9ca3af', textAlign:'center' }}>Sin costos registrados en {MESES_FULL[mesFiltro-1]}</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #e5e7eb' }}>
                      {['Concepto','Categoría','Monto','Comprobante / Acciones'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 14px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {costosMes.map(c => (
                      <tr key={c.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'9px 14px' }}>
                          <div style={{ fontWeight:500 }}>{c.concepto}</div>
                          {c.registrado_por && <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>Ingresado por {c.registrado_por}</div>}
                        </td>
                        <td style={{ padding:'9px 14px' }}><span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'2px 8px', borderRadius:20 }}>{c.categoria}</span></td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:'#A32D2D' }}>${c.monto.toLocaleString('es-CL')}</td>
                        <td style={{ padding:'9px 14px', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' as const }}>
                          <button onClick={() => verComprobante(c.id)}
                            style={{ fontSize:11, padding:'3px 8px', border:'1px solid #A8CBF0', borderRadius:6, background:'#E6F1FB', cursor:'pointer', color:'#185FA5' }}>📎 Ver</button>
                          <button onClick={async () => {
                            for (const ext of ['pdf','jpg','jpeg','png']) {
                              const { data } = await supabase.storage.from('finanzas').createSignedUrl(`comprobantes/${c.id}.${ext}`, 3600)
                              if (data?.signedUrl) { const a = document.createElement('a'); a.href=data.signedUrl; a.download=`comprobante_${c.concepto}.${ext}`; a.click(); return }
                            }
                          }} style={{ fontSize:11, padding:'3px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#f9fafb', cursor:'pointer', color:'#374151' }}>⬇ Bajar</button>
                          {confirmEliminar === c.id ? (
                            <div style={{ display:'flex', alignItems:'center', gap:4, background:'#FCEBEB', border:'1px solid #F5C5C5', borderRadius:6, padding:'2px 6px' }}>
                              <span style={{ fontSize:10, color:'#A32D2D' }}>¿Eliminar?</span>
                              <button onClick={async () => { await supabase.from('movimientos_financieros').delete().eq('id',c.id); setConfirmEliminar(null); cargarDatos() }}
                                style={{ fontSize:11, padding:'2px 7px', border:'none', borderRadius:4, background:'#A32D2D', color:'#fff', cursor:'pointer' }}>Sí</button>
                              <button onClick={() => setConfirmEliminar(null)}
                                style={{ fontSize:11, padding:'2px 7px', border:'1px solid #e5e7eb', borderRadius:4, background:'#fff', cursor:'pointer' }}>No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmEliminar(c.id)}
                              style={{ fontSize:11, padding:'3px 8px', border:'1px solid #F5C5C5', borderRadius:6, background:'#FFF8F8', cursor:'pointer', color:'#A32D2D' }}>Eliminar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {pagosContratosMes.map(p => (
                      <tr key={`pc-${p.id}`} style={{ borderBottom:'1px solid #f3f4f6', background:'#FAFAF5' }}>
                        <td style={{ padding:'9px 14px', fontWeight:500 }}>{p.contrato?.nombre || 'Contrato'} · {p.contrato?.rol_funcion || ''}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ fontSize:10, background:'#E6F1FB', color:'#185FA5', padding:'2px 8px', borderRadius:20 }}>
                            {p.contrato?.tipo === 'empresa' ? 'Contrato empresa' : 'Honorarios'}
                          </span>
                        </td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:'#A32D2D' }}>${p.monto_liquido.toLocaleString('es-CL')}</td>
                        <td style={{ padding:'9px 14px' }}><span style={{ fontSize:10, color:'#9ca3af' }}>Auto · {p.fecha_pago || ''}</span></td>
                      </tr>
                    ))}
                    <tr style={{ background:'#f9fafb', borderTop:'1px solid #e5e7eb' }}>
                      <td colSpan={2} style={{ padding:'9px 14px', fontWeight:600 }}>Total costos {MESES_FULL[mesFiltro-1]}</td>
                      <td style={{ padding:'9px 14px', fontWeight:700, color:'#A32D2D', fontSize:14 }}>${costosMesTotal.toLocaleString('es-CL')}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
