'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    sociosActivos: 0, solicitudesPendientes: 0,
    despachosPendientes: 0, stockTotal: 0, cepasConStock: 0,
    ingresosMes: 0, dispensacionesMes: 0,
  })
  const [despachosPendientes, setDespachosPendientes] = useState<any[]>([])
  const [stockCepas, setStockCepas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const mes = new Date().getMonth() + 1
    const año = new Date().getFullYear()

    const [
      { count: sociosActivos },
      { count: solicitudesPendientes },
      { data: despachos },
      { data: cepas },
      { data: dispensaciones },
    ] = await Promise.all([
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('dispensaciones').select('*').in('estado', ['pagado','preparando','despachado']),
      supabase.from('cepas').select('*').eq('visible', true),
      supabase.from('dispensaciones').select('monto').eq('mes', mes).eq('año', año),
    ])

    const stockTotal = cepas?.reduce((a, c) => a + (c.stock_gramos || 0), 0) || 0
    const cepasConStock = cepas?.filter(c => c.stock_gramos > 0).length || 0
    const ingresosMes = dispensaciones?.reduce((a, d) => a + d.monto, 0) || 0

    // Agrupar despachos por orden base
    const ordenesUnicas = new Set((despachos || []).map((d: any) => d.orden_numero.split('-').slice(0,3).join('-')))
    setStats({
      sociosActivos: sociosActivos || 0,
      solicitudesPendientes: solicitudesPendientes || 0,
      despachosPendientes: ordenesUnicas.size,
      stockTotal, cepasConStock,
      ingresosMes, dispensacionesMes: dispensaciones?.length || 0,
    })
    setDespachosPendientes(despachos || [])
    setStockCepas(cepas || [])
    setLoading(false)
  }

  const fecha = new Date().toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1)

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', background:'#fff' }}>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Panel general</h1>
          <p style={{ fontSize:13, color:'#6b7280' }}>{fechaCap} · Resumen operacional</p>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Socios activos', value: loading ? '...' : `${stats.sociosActivos}`, sub: stats.solicitudesPendientes > 0 ? `${stats.solicitudesPendientes} solicitud${stats.solicitudesPendientes>1?'es':''} pendiente${stats.solicitudesPendientes>1?'s':''}` : 'sin solicitudes pendientes', color: stats.solicitudesPendientes > 0 ? '#EF9F27' : undefined },
            { label:'Despachos pendientes', value: loading ? '...' : `${stats.despachosPendientes}`, sub:'pago confirmado', color: stats.despachosPendientes > 0 ? '#A32D2D' : undefined },
            { label:'Stock flores secas', value: loading ? '...' : `${stats.stockTotal} gr`, sub:`${stats.cepasConStock} cepas disponibles` },
            { label:`Ingresos ${new Date().toLocaleString('es-CL',{month:'long'})}`, value: loading ? '...' : `$${stats.ingresosMes.toLocaleString('es-CL')}`, sub:`${stats.dispensacionesMes} dispensaciones`, color: stats.ingresosMes > 0 ? '#3B6D11' : undefined },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:m.color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Alertas */}
        <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Alertas y tareas pendientes</div>
          {loading ? (
            <div style={{ fontSize:13, color:'#9ca3af' }}>Cargando...</div>
          ) : (
            <>
              {stats.solicitudesPendientes > 0 && (
                <Link href="/admin/socios" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#FFF8F8', border:'1px solid #F5C5C5', borderRadius:8, marginBottom:8, textDecoration:'none', color:'#111' }}>
                  <span style={{ fontSize:20 }}>👤</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{stats.solicitudesPendientes} solicitud{stats.solicitudesPendientes>1?'es':''} de ingreso esperando aprobación</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>Revisa y aprueba desde Nuevos socios</div>
                  </div>
                  <span style={{ color:'#9ca3af' }}>→</span>
                </Link>
              )}
              {stats.despachosPendientes > 0 && (
                <Link href="/admin/despachos" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#FFFBF5', border:'1px solid #EF9F27', borderRadius:8, marginBottom:8, textDecoration:'none', color:'#111' }}>
                  <span style={{ fontSize:20 }}>🚚</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{stats.despachosPendientes} despacho{stats.despachosPendientes>1?'s':''} listo{stats.despachosPendientes>1?'s':''} para procesar</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>Pagos confirmados · Ir a Despachos</div>
                  </div>
                  <span style={{ color:'#9ca3af' }}>→</span>
                </Link>
              )}
              {stats.stockTotal === 0 && (
                <Link href="/admin/inventario" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#FCEBEB', border:'1px solid #F5C5C5', borderRadius:8, marginBottom:8, textDecoration:'none', color:'#111' }}>
                  <span style={{ fontSize:20 }}>📦</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>Sin stock disponible</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>Registra cepas y lotes de cultivo para comenzar</div>
                  </div>
                  <span style={{ color:'#9ca3af' }}>→</span>
                </Link>
              )}
              {stats.solicitudesPendientes === 0 && stats.despachosPendientes === 0 && stats.stockTotal > 0 && (
                <div style={{ fontSize:13, color:'#3B6D11', padding:'10px 14px', background:'#EAF3DE', borderRadius:8 }}>
                  ✅ Todo al día — sin tareas pendientes
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Despachos pendientes */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Despachos pendientes</span>
              <Link href="/admin/despachos" style={{ fontSize:11, color:'#185FA5', textDecoration:'none' }}>Ver todos →</Link>
            </div>
            {loading ? (
              <div style={{ fontSize:13, color:'#9ca3af' }}>Cargando...</div>
            ) : despachosPendientes.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:'20px 0', textAlign:'center' }}>Sin despachos pendientes</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #e5e7eb' }}>
                    {['Orden','Cepa','Gr',''].map(h => <th key={h} style={{ textAlign:'left', padding:'4px 8px', fontSize:11, color:'#9ca3af', fontWeight:500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {despachosPendientes.slice(0,5).map(d => (
                    <tr key={d.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'7px 8px', color:'#9ca3af' }}>#{d.orden_numero}</td>
                      <td style={{ padding:'7px 8px', fontWeight:500 }}>{d.cepa}</td>
                      <td style={{ padding:'7px 8px' }}>{d.gramos}</td>
                      <td style={{ padding:'7px 8px' }}>
                        <Link href="/admin/despachos" style={{ fontSize:10, padding:'2px 8px', background:'#EAF3DE', color:'#3B6D11', borderRadius:20, textDecoration:'none' }}>Despachar</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Stock actual */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Stock actual</span>
              <Link href="/admin/inventario" style={{ fontSize:11, color:'#185FA5', textDecoration:'none' }}>Ver inventario →</Link>
            </div>
            {loading ? (
              <div style={{ fontSize:13, color:'#9ca3af' }}>Cargando...</div>
            ) : stockCepas.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:'20px 0', textAlign:'center' }}>Sin cepas registradas aún</div>
            ) : stockCepas.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ fontSize:12, flex:1, fontWeight:500 }}>{c.nombre}</span>
                <div style={{ flex:2, height:8, background:'#f3f4f6', borderRadius:20, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(c.stock_gramos/100)*100)}%`, background: c.stock_gramos===0?'#F5C5C5':c.stock_gramos<20?'#EF9F27':'#3B6D11', borderRadius:20 }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:600, minWidth:45, textAlign:'right', color:c.stock_gramos===0?'#A32D2D':c.stock_gramos<20?'#EF9F27':'#111' }}>{c.stock_gramos} gr</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
