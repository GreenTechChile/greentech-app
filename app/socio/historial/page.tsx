'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

interface Dispensacion {
  id: string
  cepa: string
  gramos: number
  monto: number
  orden_numero: string
  estado: string
  mes: number
  año: number
  medio_pago: string
  created_at: string
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const estadoStyle: Record<string, {bg: string, color: string, label: string}> = {
  pagado:     { bg: '#EAF3DE', color: '#3B6D11', label: 'Pagado' },
  preparando: { bg: '#FAEEDA', color: '#633806', label: 'Preparando' },
  despachado: { bg: '#E6F1FB', color: '#185FA5', label: 'En camino' },
  entregado:  { bg: '#f3f4f6', color: '#374151', label: 'Entregado' },
  pendiente:  { bg: '#FAEEDA', color: '#633806', label: 'Pendiente' },
}

export default function Historial() {
  const [nombreSocio, setNombreSocio] = useState('...')
  const [rutDisplay, setRutDisplay] = useState('')
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAño, setFiltroAño] = useState(2026)
  const [rutSocio, setRutSocio] = useState<string | null>(null)

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (keys.length > 0) {
        const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
        const rut = token?.user?.user_metadata?.rut
        if (rut) {
          setRutSocio(rut)
          setRutDisplay(rut)
          supabase.from('socios').select('nombre').eq('rut', rut).single()
            .then(({ data }) => { if (data?.nombre) setNombreSocio(data.nombre) })
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (rutSocio) cargarHistorial()
  }, [filtroAño, rutSocio])

  const cargarHistorial = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dispensaciones')
      .select('*')
      .eq('rut_socio', rutSocio)
      .eq('año', filtroAño)
      .order('created_at', { ascending: false })
    if (data) setDispensaciones(data)
    setLoading(false)
  }

  const porMes: Record<number, Dispensacion[]> = {}
  dispensaciones.forEach(d => {
    if (!porMes[d.mes]) porMes[d.mes] = []
    porMes[d.mes].push(d)
  })
  const mesesOrdenados = Object.keys(porMes).map(Number).sort((a, b) => b - a)

  const totalAño = dispensaciones.reduce((acc, d) => acc + d.gramos, 0)
  const montoAño = dispensaciones.reduce((acc, d) => acc + d.monto, 0)

  if (!rutDisplay) return <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>Cargando...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarSocio nombre={nombreSocio} rut={rutDisplay} />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f9fafb' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Mi historial de dispensaciones</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Registro completo de todos tus pedidos</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filtroAño} onChange={e => setFiltroAño(Number(e.target.value))}
              style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none' }}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
            <button style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Exportar
            </button>
          </div>
        </div>

        {/* Métricas del año */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: `Total dispensado ${filtroAño}`, value: `${totalAño} gr`, sub: `${dispensaciones.length} dispensaciones` },
            { label: 'Total aportado', value: `$${montoAño.toLocaleString('es-CL')}`, sub: 'aportes ordinarios' },
            { label: 'Promedio mensual', value: `${mesesOrdenados.length > 0 ? Math.round(totalAño / mesesOrdenados.length) : 0} gr`, sub: `en ${mesesOrdenados.length} meses activos` },
          ].map((m, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando historial...</div>
        ) : dispensaciones.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            No hay dispensaciones registradas para {filtroAño}
          </div>
        ) : (
          mesesOrdenados.map(mes => {
            const items = porMes[mes]
            const totalMes = items.reduce((acc, d) => acc + d.gramos, 0)
            const montoMes = items.reduce((acc, d) => acc + d.monto, 0)
            return (
              <div key={mes} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{MESES[mes - 1]} {filtroAño}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                    <span>{totalMes} gr dispensados</span>
                    <span style={{ fontWeight: 600, color: '#3B6D11' }}>${montoMes.toLocaleString('es-CL')}</span>
                  </div>
                </div>
                {items.map((d) => {
                  const est = estadoStyle[d.estado] || estadoStyle.pendiente
                  const fecha = new Date(d.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🌿</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{d.cepa} · {d.gramos} gr</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {fecha} · #{d.orden_numero} {d.medio_pago && `· ${d.medio_pago}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11', marginBottom: 4 }}>
                          ${d.monto.toLocaleString('es-CL')}
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </div>
                      <button style={{ marginLeft: 8, padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#6b7280', whiteSpace: 'nowrap' as const }}>
                        📄 Comprobante
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
