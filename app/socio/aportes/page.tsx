'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

interface Dispensacion {
  id: string; cepa: string; gramos: number; monto: number
  orden_numero: string; estado: string; mes: number; año: number
  medio_pago: string; created_at: string
}

interface OrdenResumen {
  ordenBase: string; items: Dispensacion[]; montoTotal: number; mes: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function MisAportes() {
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAño, setFiltroAño] = useState(2026)
  const [rutSocio, setRutSocio] = useState<string | null>(null)
  const [nombreSocio, setNombreSocio] = useState('')
  const [rutDisplay, setRutDisplay] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const rut = user.user_metadata?.rut
      if (!rut) return
      setRutSocio(rut)
      setRutDisplay(rut)
      supabase.from('socios').select('nombre').eq('rut', rut).single()
        .then(({ data }) => { if (data?.nombre) setNombreSocio(data.nombre) })
    })
  }, [])

  useEffect(() => { if (rutSocio) cargarAportes() }, [filtroAño, rutSocio])

  const cargarAportes = async () => {
    setLoading(true)
    const { data } = await supabase.from('dispensaciones').select('*')
      .eq('rut_socio', rutSocio).eq('año', filtroAño)
      .order('created_at', { ascending: false })
    if (data) setDispensaciones(data)
    setLoading(false)
  }

  // Agrupar por orden base (GT-2026-XXXXX)
  const getOrdenBase = (orden: string) => orden.split('-').slice(0, 3).join('-')

  const ordenMap: Record<string, OrdenResumen> = {}
  dispensaciones.forEach(d => {
    const base = getOrdenBase(d.orden_numero)
    if (!ordenMap[base]) ordenMap[base] = { ordenBase: base, items: [], montoTotal: 0, mes: d.mes }
    ordenMap[base].items.push(d)
    ordenMap[base].montoTotal += d.monto
  })

  const ordenesPorMes: Record<number, OrdenResumen[]> = {}
  Object.values(ordenMap).forEach(o => {
    if (!ordenesPorMes[o.mes]) ordenesPorMes[o.mes] = []
    ordenesPorMes[o.mes].push(o)
  })

  const mesesOrdenados = Object.keys(ordenesPorMes).map(Number).sort((a, b) => b - a)
  const totalAño = Object.values(ordenMap).reduce((acc, o) => acc + o.montoTotal, 0)

  const imprimirComprobante = (o: OrdenResumen) => {
    const fecha = new Date(o.items[0].created_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
    const lineas = o.items.map(i =>
      `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px">
        <span style="color:#666">${i.cepa}</span>
        <span style="font-weight:600">${i.gramos} gr · $${i.monto.toLocaleString('es-CL')}</span>
      </div>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Comprobante ${o.ordenBase}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px}
      .c{border:2px solid #185FA5;padding:20px;max-width:500px;margin:0 auto}
      .titulo{font-size:16px;font-weight:bold;text-align:center;margin:14px 0;padding:8px;background:#E6F1FB;border-radius:6px;color:#185FA5}
      .orden{font-size:20px;font-weight:bold;text-align:center;letter-spacing:2px;color:#185FA5;margin:8px 0}
      .monto{font-size:28px;font-weight:bold;text-align:center;color:#185FA5;margin:16px 0 4px}
      .sep{border-top:1px dashed #ccc;margin:12px 0}
      .st{font-size:10px;text-transform:uppercase;color:#999;letter-spacing:1px;margin:12px 0 6px}
      .pie{font-size:9px;color:#999;text-align:center;margin-top:16px;padding-top:8px;border-top:1px solid #eee}
      @media print{body{padding:0}}</style></head><body>
      <div class="c">
        <div style="font-size:18px;font-weight:bold;margin-bottom:4px"><span style="color:#0c2d48">Green</span><span style="color:#0ea5e9">Tech</span></div>
        <div class="titulo">COMPROBANTE DE APORTE ORDINARIO</div>
        <div class="orden">#${o.ordenBase}</div>
        <div style="text-align:center;margin-bottom:12px">
          <span style="padding:4px 14px;background:#e0f2fe;border-radius:20px;font-size:12px;font-weight:600;color:#0369a1">✅ Pago confirmado</span>
        </div>
        <div class="monto">$${o.montoTotal.toLocaleString('es-CL')}</div>
        <div style="font-size:11px;text-align:center;color:#666;margin-bottom:12px">${o.items[0].medio_pago || 'Webpay Plus'} · ${fecha}</div>
        <div class="sep"></div>
        <div class="st">Productos dispensados</div>
        ${lineas}
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding-top:8px;color:#0369a1">
          <span>Total aportado</span><span>$${o.montoTotal.toLocaleString('es-CL')}</span>
        </div>
        <div class="pie">GreenTech · Asociación sin fines de lucro · Reg. 390054<br/>Aporte ordinario del socio · ${fecha}</div>
      </div>
      <script>// no print</script></body></html>`
    const v = window.open('', '_blank', 'width=600,height=750')
    if (v) { v.document.write(html); v.document.close() }
  }

  if (!rutDisplay) return (
    <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarSocio nombre={nombreSocio} rut={rutDisplay} />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f9fafb' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Mis aportes</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Registro de todos tus aportes sociales a la corporación</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filtroAño} onChange={e => setFiltroAño(Number(e.target.value))}
              style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none' }}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
            <button style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
              📥 Exportar PDF
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Total aportado {filtroAño}</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>${totalAño.toLocaleString('es-CL')}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {Object.values(ordenMap).length > 0 ? `${Object.values(ordenMap).length} aportes` : '—'}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Aportes ordinarios</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#0369a1' }}>${totalAño.toLocaleString('es-CL')}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>vinculados a dispensaciones</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Aportes extraordinarios</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>$0</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>sin movimientos</div>
          </div>
        </div>

        {/* Caja informativa */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: '#111', marginBottom: 6 }}>¿Qué son los aportes sociales?</div>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>Los <strong>aportes ordinarios</strong> se generan automáticamente con cada dispensación. Su valor corresponde al costo del producto dispensado.</li>
            <li>Los <strong>aportes extraordinarios</strong> son contribuciones voluntarias o acordadas en Asamblea General para financiar inversiones de la corporación.</li>
            <li>Todos los aportes financian exclusivamente la operación del cultivo colectivo. GreenTech es una asociación sin fines de lucro.</li>
          </ul>
        </div>

        {/* Lista por mes */}
        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando aportes...</div>
        ) : Object.values(ordenMap).length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            No hay aportes registrados para {filtroAño}
          </div>
        ) : (
          mesesOrdenados.map(mes => {
            const ordenes = ordenesPorMes[mes]
            const totalMes = ordenes.reduce((acc, o) => acc + o.montoTotal, 0)
            return (
              <div key={mes} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{MESES[mes - 1]} {filtroAño}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>${totalMes.toLocaleString('es-CL')}</span>
                </div>

                {ordenes.map((o) => (
                  <div key={o.ordenBase} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>

                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      🌿
                    </div>

                    {/* Monto destacado */}
                    <div style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0369a1' }}>${o.montoTotal.toLocaleString('es-CL')}</div>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#e0f2fe', color: '#0369a1', display: 'inline-block', marginTop: 2 }}>
                        Ordinario
                      </span>
                    </div>

                    <div style={{ width: 1, height: 36, background: '#e5e7eb', flexShrink: 0 }} />

                    {/* Detalle */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        {o.items.map(i => `${i.cepa} ${i.gramos}gr`).join(' · ')}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Orden #{o.ordenBase} · {o.items[0].medio_pago || 'Webpay Plus'} · {new Date(o.items[0].created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <button onClick={() => imprimirComprobante(o)}
                      style={{ padding: '5px 12px', border: '1px solid #185FA5', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#185FA5', whiteSpace: 'nowrap' as const }}>
                      📄 Comprobante
                    </button>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
