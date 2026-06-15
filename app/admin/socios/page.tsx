'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

interface Socio {
  id: string; rut: string; nombre: string; email: string; telefono: string
  direccion: string; casa_depto: string; comuna: string; ciudad: string
  estado_civil: string; profesion: string; diagnostico: string
  diagnostico_secundario: string; medico_nombre: string; medico_rut: string
  folio_receta: string; cuota_mensual: number; gramos_delegados: number
  vencimiento_receta: string; estado: string; rol: string
  notas_admin: string; created_at: string
}

export default function AdminSocios() {
  const [tab, setTab] = useState<'pendientes'|'aprobados'|'rechazados'>('pendientes')
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState<Record<string,string>>({})
  const [procesando, setProcesando] = useState<string|null>(null)
  const [mensaje, setMensaje] = useState('')
  const [expandido, setExpandido] = useState<string|null>(null)

  useEffect(() => { cargarSocios() }, [tab])

  const cargarSocios = async () => {
    setLoading(true)
    const estadoMap = { pendientes: 'pendiente', aprobados: 'activo', rechazados: 'rechazado' }
    const { data } = await supabase.from('socios').select('*').eq('estado', estadoMap[tab]).order('created_at', { ascending: false })
    if (data) setSocios(data)
    setLoading(false)
  }

  const aprobar = async (socio: Socio) => {
    setProcesando(socio.id)
    try {
      await supabase.from('socios').update({ estado: 'activo', notas_admin: notas[socio.id] || null }).eq('id', socio.id)
      const tempPassword = `GT${socio.rut.replace(/\./g,'').replace('-','').slice(-6)}!`
      setMensaje(`✅ ${socio.nombre} aprobado correctamente. Contraseña temporal asignada: ${tempPassword} — Ve a Supabase Auth para crear el usuario con este email y contraseña.`)
      setSocios(prev => prev.filter(s => s.id !== socio.id))
      // Correos de aprobación y credenciales
      try {
        await sendEmail('aprobacion_solicitud', socio.email, { nombre: socio.nombre, rut: socio.rut })
        await sendEmail('credenciales_enviadas', socio.email, { nombre: socio.nombre, rut: socio.rut, contrasena: tempPassword })
      } catch (emailErr) {
        console.error('[aprobar] email error:', emailErr)
      }
    } catch {
      setMensaje('❌ Error al aprobar. Intenta nuevamente.')
    } finally {
      setProcesando(null)
      setTimeout(() => setMensaje(''), 10000)
    }
  }

  const rechazar = async (socio: Socio) => {
    setProcesando(socio.id)
    await supabase.from('socios').update({ estado: 'rechazado', notas_admin: notas[socio.id] || null }).eq('id', socio.id)
    setMensaje(`Solicitud de ${socio.nombre} rechazada.`)
    setSocios(prev => prev.filter(s => s.id !== socio.id))
    setProcesando(null)
    setTimeout(() => setMensaje(''), 4000)
    // Correo de rechazo
    try {
      const motivo = notas[socio.id] || 'No se especificó motivo.'
      await sendEmail('rechazo_solicitud', socio.email, { nombre: socio.nombre, motivo })
    } catch (emailErr) {
      console.error('[rechazar] email error:', emailErr)
    }
  }

  const diasDesde = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / (1000*60*60*24))

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#fff' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Solicitudes de ingreso</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Revisa los antecedentes y aprueba o rechaza cada solicitud</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : mensaje.startsWith('❌') ? '#FCEBEB' : '#f9fafb', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : mensaje.startsWith('❌') ? '#F5C5C5' : '#e5e7eb'}`, borderRadius: 8, padding: '12px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : mensaje.startsWith('❌') ? '#A32D2D' : '#374151', marginBottom: 16, lineHeight: 1.6 }}>
            {mensaje}
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
          {[{key:'pendientes',label:'Pendientes'},{key:'aprobados',label:'Aprobados'},{key:'rechazados',label:'Rechazados'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{ padding: '8px 18px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === t.key ? '2px solid #185FA5' : '2px solid transparent', color: tab === t.key ? '#185FA5' : '#6b7280', fontWeight: tab === t.key ? 600 : 400, marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando solicitudes...</div>
        ) : socios.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>
            {tab === 'pendientes' ? '✅ No hay solicitudes pendientes' : 'No hay registros'}
          </div>
        ) : socios.map(socio => {
          const dias = diasDesde(socio.created_at)
          const urgente = dias >= 4 && tab === 'pendientes'
          const abierto = expandido === socio.id

          return (
            <div key={socio.id} style={{ border: `1px solid ${urgente ? '#F5C5C5' : '#e5e7eb'}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>

              {/* Header — clic para expandir */}
              <div
                onClick={() => setExpandido(abierto ? null : socio.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: urgente ? '#FFF8F8' : '#f9fafb', borderBottom: abierto ? '1px solid #e5e7eb' : 'none', cursor: 'pointer' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#185FA5', flexShrink: 0 }}>
                  {socio.nombre.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{socio.nombre}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>RUT {socio.rut} · {socio.email} · {socio.telefono}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: tab === 'pendientes' ? '#FAEEDA' : tab === 'aprobados' ? '#EAF3DE' : '#FCEBEB', color: tab === 'pendientes' ? '#633806' : tab === 'aprobados' ? '#3B6D11' : '#A32D2D' }}>
                    {tab === 'pendientes' ? 'Pendiente' : tab === 'aprobados' ? 'Aprobado' : 'Rechazado'}
                  </span>
                  <div style={{ fontSize: 11, color: urgente ? '#A32D2D' : '#9ca3af', marginTop: 3 }}>
                    {urgente ? `⚠️ Hace ${dias} días` : `Hace ${dias} día${dias !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{abierto ? '▲' : '▼'}</span>
              </div>

              {/* Body 3 columnas — solo visible si expandido */}
              {abierto && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: tab === 'pendientes' ? '1px solid #e5e7eb' : 'none' }}>
                    <div style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Datos personales</div>
                      {[{k:'Estado civil',v:socio.estado_civil},{k:'Profesión',v:socio.profesion},{k:'Dirección',v:`${socio.direccion}${socio.casa_depto?', '+socio.casa_depto:''}`},{k:'Comuna / Ciudad',v:`${socio.comuna}, ${socio.ciudad}`}].map((r,i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.k}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px 16px', borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Información médica</div>
                      {[{k:'Diagnóstico',v:socio.diagnostico},{k:'Médico',v:socio.medico_nombre},{k:'RUT médico',v:socio.medico_rut},{k:'Folio receta',v:socio.folio_receta},{k:'Cuota autorizada',v:`${socio.cuota_mensual} gr / mes`},{k:'Gramos delegados',v:`${socio.gramos_delegados} gr / mes`},{k:'Venc. receta',v:socio.vencimiento_receta}].map((r,i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.k}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Documentos</div>
                      {[
                        { label: 'Cédula — Anverso', key: 'cedula_anverso' },
                        { label: 'Cédula — Reverso', key: 'cedula_reverso' },
                        { label: 'Receta médica vigente', key: 'receta' },
                        { label: 'Cert. antecedentes', key: 'antecedentes' },
                        { label: 'Contrato de previsión y delegación', key: 'contrato' },
                        { label: 'Declaración jurada de ingreso', key: 'declaracion_jurada' },
                      ].map((d,i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                          <span>{['contrato','declaracion_jurada'].includes(d.key) ? '📋' : '📄'}</span>
                          <span style={{ flex: 1 }}>{d.label}</span>
                          <button onClick={async (e) => {
                            e.stopPropagation()
                            for (const ext of ['pdf','jpg','jpeg','png']) {
                              const { data } = await supabase.storage.from('documentos').createSignedUrl(`${socio.rut}/${d.key}.${ext}`, 60)
                              if (data?.signedUrl) {
                                const w = window.screen.width * 0.4
                                const h = window.screen.height * 0.42
                                const left = (window.screen.width - w) / 2
                                const top = (window.screen.height - h) / 2
                                window.open(data.signedUrl, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`)
                                return
                              }
                            }
                            alert('Documento no encontrado.')
                          }} style={{ fontSize: 10, background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer' }}>
                            Ver
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#EAF3DE', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                        <span>✅</span>
                        <span style={{ flex: 1 }}>Reglamento aceptado en línea</span>
                        <span style={{ fontSize: 10, background: '#3B6D11', color: '#EAF3DE', padding: '2px 8px', borderRadius: 20 }}>Firmado</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer acciones */}
                  {tab === 'pendientes' && (
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
                      <input type="text" placeholder="Notas internas (opcional, solo visibles para la directiva)..."
                        value={notas[socio.id] || ''} onChange={e => setNotas(prev => ({...prev,[socio.id]:e.target.value}))}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }}/>
                      <button onClick={(e) => { e.stopPropagation(); rechazar(socio) }} disabled={procesando === socio.id}
                        style={{ padding: '7px 16px', border: '1px solid #A32D2D', borderRadius: 8, background: 'transparent', color: '#A32D2D', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        ✕ Rechazar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); aprobar(socio) }} disabled={procesando === socio.id}
                        style={{ padding: '7px 16px', border: 'none', borderRadius: 8, background: procesando === socio.id ? '#9ca3af' : '#3B6D11', color: '#EAF3DE', fontSize: 12, cursor: procesando === socio.id ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                        {procesando === socio.id ? 'Procesando...' : '✓ Aprobar'}
                      </button>
                    </div>
                  )}
                  {tab !== 'pendientes' && socio.notas_admin && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                      📝 Nota: {socio.notas_admin}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
