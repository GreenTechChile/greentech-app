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

interface InfoCepa {
  nombre: string
  tipo: string
  thc_pct: number | null
  cbd_pct: number | null
  pct_indica: number | null
  pct_sativa: number | null
  descripcion: string | null
}

interface ModalCepa {
  cepa: InfoCepa
  miCalif: number
  promedio: number
  total: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const estadoStyle: Record<string, {bg: string, color: string, label: string}> = {
  pagado:     { bg: '#EAF3DE', color: '#3B6D11', label: 'Pagado' },
  preparando: { bg: '#FAEEDA', color: '#633806', label: 'Preparando' },
  despachado: { bg: '#E6F1FB', color: '#185FA5', label: 'En camino' },
  entregado:  { bg: '#f3f4f6', color: '#374151', label: 'Entregado' },
  pendiente:  { bg: '#FAEEDA', color: '#633806', label: 'Pendiente' },
}

const colorTipo: Record<string, {bg: string, color: string}> = {
  sativa:        { bg: '#EAF3DE', color: '#3B6D11' },
  indica:        { bg: '#EEEDFE', color: '#534AB7' },
  hibrida:       { bg: '#E6F1FB', color: '#185FA5' },
  cbd:           { bg: '#FDF5E6', color: '#BA7517' },
  autoflowering: { bg: '#F3F4F6', color: '#374151' },
}

function StarRating({ value, hovered, onHover, onClick, readonly = false }: {
  value: number
  hovered?: number
  onHover?: (n: number) => void
  onClick?: (n: number) => void
  readonly?: boolean
}) {
  const display = hovered || value
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          onClick={() => !readonly && onClick?.(star)}
          onMouseEnter={() => !readonly && onHover?.(star)}
          onMouseLeave={() => !readonly && onHover?.(0)}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontSize: 24, cursor: readonly ? 'default' : 'pointer',
            color: star <= display ? '#F59E0B' : '#d1d5db',
            transition: 'color 0.1s',
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function Historial() {
  const [nombreSocio, setNombreSocio] = useState('...')
  const [rutDisplay, setRutDisplay] = useState('')
  const [dispensaciones, setDispensaciones] = useState<Dispensacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAño, setFiltroAño] = useState(2026)
  const [rutSocio, setRutSocio] = useState<string | null>(null)

  // Modal info cepa
  const [modalCepa, setModalCepa] = useState<ModalCepa | null>(null)
  const [cargandoModal, setCargandoModal] = useState(false)
  const [guardandoCalif, setGuardandoCalif] = useState(false)
  const [hoveredStar, setHoveredStar] = useState(0)

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

  const abrirInfoCepa = async (cepaNombre: string) => {
    if (!rutSocio) return
    setCargandoModal(true)
    setHoveredStar(0)

    const [{ data: cepaData }, { data: califPropia }, { data: todasCalifs }] = await Promise.all([
      supabase.from('cepas')
        .select('nombre, tipo, thc_pct, cbd_pct, pct_indica, pct_sativa, descripcion')
        .eq('nombre', cepaNombre)
        .single(),
      supabase.from('calificaciones_cepas')
        .select('estrellas')
        .eq('cepa_nombre', cepaNombre)
        .eq('rut_socio', rutSocio)
        .maybeSingle(),
      supabase.from('calificaciones_cepas')
        .select('estrellas')
        .eq('cepa_nombre', cepaNombre),
    ])

    if (cepaData) {
      const total = todasCalifs?.length || 0
      const promedio = total > 0
        ? (todasCalifs!.reduce((a, c) => a + c.estrellas, 0) / total)
        : 0
      setModalCepa({
        cepa: cepaData,
        miCalif: califPropia?.estrellas || 0,
        promedio,
        total,
      })
    }
    setCargandoModal(false)
  }

  const calificar = async (estrellas: number) => {
    if (!modalCepa || !rutSocio) return
    setGuardandoCalif(true)
    const { error } = await supabase
      .from('calificaciones_cepas')
      .upsert({
        rut_socio: rutSocio,
        cepa_nombre: modalCepa.cepa.nombre,
        estrellas,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'rut_socio,cepa_nombre' })

    if (!error) {
      // Refrescar promedio
      const { data: todasCalifs } = await supabase
        .from('calificaciones_cepas')
        .select('estrellas')
        .eq('cepa_nombre', modalCepa.cepa.nombre)
      const total = todasCalifs?.length || 0
      const promedio = total > 0
        ? (todasCalifs!.reduce((a, c) => a + c.estrellas, 0) / total)
        : 0
      setModalCepa(prev => prev ? { ...prev, miCalif: estrellas, promedio, total } : null)
      setHoveredStar(0)
    }
    setGuardandoCalif(false)
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
    <>
      {/* Modal info cepa */}
      {(modalCepa || cargandoModal) && (
        <div onClick={() => { setModalCepa(null); setHoveredStar(0) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 460, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>

            {cargandoModal ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>Cargando...</div>
            ) : modalCepa && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🌿 {modalCepa.cepa.nombre}</h3>
                  <button onClick={() => { setModalCepa(null); setHoveredStar(0) }}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                </div>

                {/* Tipo badge */}
                {modalCepa.cepa.tipo && (() => {
                  const tc = colorTipo[modalCepa.cepa.tipo] || colorTipo.sativa
                  return (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: tc.bg, color: tc.color, fontWeight: 600, display: 'inline-block', marginBottom: 14 }}>
                      {modalCepa.cepa.tipo.charAt(0).toUpperCase() + modalCepa.cepa.tipo.slice(1)}
                    </span>
                  )
                })()}

                {/* THC / CBD */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'THC', value: modalCepa.cepa.thc_pct },
                    { label: 'CBD', value: modalCepa.cepa.cbd_pct },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>
                        {value != null ? `${value}%` : '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barra Indica / Sativa */}
                {modalCepa.cepa.pct_indica != null && modalCepa.cepa.pct_sativa != null && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      <span>Indica {modalCepa.cepa.pct_indica}%</span>
                      <span>Sativa {modalCepa.cepa.pct_sativa}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: modalCepa.cepa.pct_indica + '%', background: 'linear-gradient(90deg, #534AB7, #7C75E0)', borderRadius: 20 }} />
                    </div>
                  </div>
                )}

                {/* Descripción */}
                {modalCepa.cepa.descripcion && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 6 }}>Descripción</div>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {modalCepa.cepa.descripcion}
                    </p>
                  </div>
                )}

                {/* Calificación */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                    Tu calificación
                  </div>
                  <StarRating
                    value={modalCepa.miCalif}
                    hovered={hoveredStar}
                    onHover={setHoveredStar}
                    onClick={guardandoCalif ? undefined : calificar}
                  />
                  {modalCepa.miCalif > 0 && !guardandoCalif && (
                    <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 6 }}>
                      Tu calificación: {modalCepa.miCalif} ★
                    </div>
                  )}
                  {guardandoCalif && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Guardando...</div>
                  )}

                  {/* Promedio */}
                  {modalCepa.total > 0 && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#F59E0B', fontSize: 16 }}>★</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{modalCepa.promedio.toFixed(1)}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>promedio de {modalCepa.total} {modalCepa.total === 1 ? 'calificación' : 'calificaciones'}</span>
                    </div>
                  )}
                  {modalCepa.total === 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>Sé el primero en calificar esta cepa.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{d.cepa} · {d.gramos} gr</span>
                            <button
                              onClick={() => abrirInfoCepa(d.cepa)}
                              style={{ fontSize: 10, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 20, padding: '1px 8px', color: '#6b7280', cursor: 'pointer', fontWeight: 500, lineHeight: 1.8 }}>
                              ℹ️ Info cepa
                            </button>
                          </div>
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
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </main>
      </div>
    </>
  )
}
