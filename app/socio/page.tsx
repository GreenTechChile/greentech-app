'use client'
import { useEffect, useState } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface SocioData {
  nombre: string; rut: string; rol_admin: boolean; rol_cultivador: boolean; rol_despachador: boolean; cuota_mensual: number
  folio_receta: string; vencimiento_receta: string; medico_nombre: string; diagnostico: string
}

interface Dispensacion {
  id: string; cepa: string; gramos: number; orden_numero: string; estado: string; created_at: string
}

export default function SocioDashboard() {
  const [socio, setSocio] = useState<SocioData | null>(null)
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [dispensadoMes, setDispensadoMes] = useState(0)
  const [loading, setLoading] = useState(true)

  const estadoColor: Record<string, string> = {
    'despachado': '#185FA5', 'entregado': '#3B6D11', 'preparando': '#BA7517', 'pagado': '#3B6D11',
  }
  const estadoLabel: Record<string, string> = {
    'pagado': 'Pagado', 'preparando': 'Preparando', 'despachado': 'En camino', 'entregado': 'Entregado',
  }

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      // Leer RUT desde localStorage
      let rut = '10836787-3'
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        if (keys.length > 0) {
          const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
          if (token?.user?.user_metadata?.rut) rut = token.user.user_metadata.rut
        }
      } catch {}

      // Cargar datos del socio
      const { data: socioData } = await supabase
        .from('socios')
        .select('nombre,rut,rol_admin,rol_cultivador,rol_despachador,cuota_mensual,folio_receta,vencimiento_receta,medico_nombre,diagnostico')
        .eq('rut', rut)
        .single()
      if (socioData) setSocio(socioData)

      // Cargar dispensaciones reales
      const mes = new Date().getMonth() + 1
      const año = new Date().getFullYear()
      const { data: disps } = await supabase
        .from('dispensaciones')
        .select('id,cepa,gramos,orden_numero,estado,created_at')
        .eq('rut_socio', rut)
        .order('created_at', { ascending: false })
        .limit(5)
      if (disps) setDispensaciones(disps)

      // Total dispensado este mes
      const { data: dispsMes } = await supabase
        .from('dispensaciones')
        .select('gramos')
        .eq('rut_socio', rut)
        .eq('mes', mes)
        .eq('año', año)
      const total = dispsMes?.reduce((a, d) => a + d.gramos, 0) || 0
      setDispensadoMes(total)

      setLoading(false)
    }
    cargar()
  }, [])

  if (loading || !socio) return (
    <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>
      Cargando...
    </div>
  )

  const cuota = socio.cuota_mensual || 0
  const disponible = Math.max(0, cuota - dispensadoMes)
  const pct = cuota > 0 ? Math.min(100, Math.round((dispensadoMes / cuota) * 100)) : 0
  const mesNombre = new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SidebarSocio nombre={socio.nombre} rut={socio.rut} esAdmin={socio.rol_admin || socio.rol_cultivador || socio.rol_despachador} />
      <main style={{ flex:1, padding:24, overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Bienvenido, {socio.nombre.split(' ')[0]}</h1>
            <p style={{ fontSize:13, color:'#6b7280' }}>{new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <Link href="/socio/dispensacion" style={{ padding:'9px 18px', background:'#3B6D11', borderRadius:8, fontSize:13, color:'#EAF3DE', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
            🌿 Nueva dispensación
          </Link>
        </div>

        {/* Estado */}
        <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#3B6D11', marginBottom:20 }}>
          ✓ Socio activo
          {socio.vencimiento_receta && ` · Receta vigente hasta ${new Date(socio.vencimiento_receta).toLocaleDateString('es-CL',{month:'long',year:'numeric'})}`}
          {socio.folio_receta && ` · Folio ${socio.folio_receta}`}
          {socio.medico_nombre && ` · ${socio.medico_nombre}`}
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Cuota mensual', value: cuota > 0 ? `${cuota} gr` : 'Sin asignar', sub:'delegados a GreenTech' },
            { label:`Dispensado en ${new Date().toLocaleString('es-CL',{month:'long'})}`, value:`${dispensadoMes} gr`, sub:`${dispensaciones.filter(d => { const m = new Date(d.created_at).getMonth()+1; return m === new Date().getMonth()+1 }).length} dispensaciones`, color: dispensadoMes > 0 ? '#3B6D11' : undefined },
            { label:'Disponible este mes', value: cuota > 0 ? `${disponible} gr` : '—', sub:`hasta el ${new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()} ${new Date().toLocaleString('es-CL',{month:'short'})}` },
            { label:`Total dispensado ${new Date().getFullYear()}`, value:`${dispensaciones.reduce((a,d)=>a+d.gramos,0)} gr`, sub:'histórico del año' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:600, color:m.color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Barra cuota */}
        <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Uso de cuota — {mesNombre}</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6b7280', marginBottom:6 }}>
            <span>Progreso mensual</span>
            <span>{dispensadoMes} / {cuota} gr ({pct}%)</span>
          </div>
          <div style={{ height:10, background:'#f3f4f6', borderRadius:20, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background: pct >= 90 ? '#A32D2D' : '#3B6D11', borderRadius:20, transition:'0.3s' }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Últimas dispensaciones */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Últimas dispensaciones</span>
              <Link href="/socio/historial" style={{ fontSize:11, color:'#3B6D11', textDecoration:'none' }}>Ver todo →</Link>
            </div>
            {dispensaciones.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:'20px 0', textAlign:'center' }}>
                Sin dispensaciones aún.<br/>
                <Link href="/socio/dispensacion" style={{ color:'#3B6D11', fontSize:12 }}>Hacer primera dispensación →</Link>
              </div>
            ) : dispensaciones.slice(0,3).map((d,i) => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<2?'1px solid #f3f4f6':'none' }}>
                <span style={{ fontSize:18 }}>🌿</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{d.cepa} · {d.gramos} gr</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(d.created_at).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})} · #{d.orden_numero}</div>
                </div>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#f3f4f6', color:estadoColor[d.estado]||'#111' }}>
                  {estadoLabel[d.estado]||d.estado}
                </span>
              </div>
            ))}
          </div>

          {/* Receta médica */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Mi receta médica vigente</div>
            <div style={{ background:'#f9fafb', borderRadius:8, padding:12 }}>
              {[
                { key:'Médico', val: socio.medico_nombre || '—' },
                { key:'Folio', val: socio.folio_receta || '—' },
                { key:'Diagnóstico', val: socio.diagnostico || '—' },
                { key:'Cuota máx.', val: cuota > 0 ? `${cuota} gr / mes` : 'Sin asignar' },
                { key:'Vencimiento', val: socio.vencimiento_receta ? new Date(socio.vencimiento_receta).toLocaleDateString('es-CL',{month:'long',year:'numeric'}) : '—' },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:i<4?'1px solid #e5e7eb':'none' }}>
                  <span style={{ color:'#6b7280' }}>{r.key}</span>
                  <span style={{ fontWeight:500 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
