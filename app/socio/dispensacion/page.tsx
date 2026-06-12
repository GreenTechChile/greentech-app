'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

interface Cepa {
  id: string
  nombre: string
  tipo: string
  thc_pct: number
  cbd_pct: number
  efecto: string
  horario: string
  stock_gramos: number
  precio_gramo: number
  visible: boolean
  imagen_url?: string
  pct_indica?: number
  pct_sativa?: number
}

interface ItemCarrito {
  id: string
  cepa: Cepa
  gramos: number
  precio: number
}

type Paso = 'catalogo' | 'checkout' | 'confirmacion'

export default function Dispensacion() {
  const [paso, setPaso] = useState<Paso>('catalogo')
  const [cepas, setCepas] = useState<Cepa[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [ordenNumero, setOrdenNumero] = useState('')
  const [cepaExpandida, setCepaExpandida] = useState<string|null>(null)
  const [gramosInput, setGramosInput] = useState<Record<string, string>>({})
  const [rutSocio, setRutSocio] = useState<string>('')
  const [nombreSocio, setNombreSocio] = useState<string>('')
  const [emailSocio, setEmailSocio] = useState<string>('')
  const [cuota, setCuota] = useState<number>(30)
  const [dispensadoMes, setDispensadoMes] = useState<number>(0)
  const [tbkUser, setTbkUser] = useState<string|null>(null)
  const [tarjetaInfo, setTarjetaInfo] = useState<{tipo:string, ultimos4:string}|null>(null)
  const [medioPago, setMedioPago] = useState<'oneclick'|'webpay'|'khipu'>('webpay')

  useEffect(() => {
    // Manejar retorno desde MercadoPago
    const params = new URLSearchParams(window.location.search)
    const pago = params.get('pago')
    const orden = params.get('orden')
    if (pago === 'success' && orden) {
      // Registrar dispensaciones ahora que el pago fue aprobado
      const saved = sessionStorage.getItem('mp_carrito')
      if (saved) {
        const { carrito: savedCarrito, mesActual, añoActual, rutSocio: savedRut } = JSON.parse(saved)
        ;(async () => {
          for (const item of savedCarrito) {
            await supabase.from('dispensaciones').insert({
              rut_socio: savedRut,
              cepa: item.cepa.nombre,
              gramos: item.gramos,
              monto: item.precio,
              orden_numero: orden + '-' + item.cepa.nombre.slice(0,3).toUpperCase(),
              estado: 'pagado',
              mes: mesActual,
              año: añoActual,
              medio_pago: 'MercadoPago',
            })
            const { data: cepaActual } = await supabase.from('cepas').select('stock_gramos').eq('id', item.cepa.id).single()
            if (cepaActual) {
              await supabase.from('cepas').update({ stock_gramos: cepaActual.stock_gramos - item.gramos }).eq('id', item.cepa.id)
            }
          }
          sessionStorage.removeItem('mp_carrito')
        })()
      }
      setOrdenNumero(orden)
      setPaso('confirmacion')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (pago === 'failure' || pago === 'pending') {
      sessionStorage.removeItem('mp_carrito')
      alert(pago === 'failure' ? 'El pago fue rechazado. Intenta nuevamente.' : 'El pago está pendiente de confirmación.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (keys.length > 0) {
        const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
        const rut = token?.user?.user_metadata?.rut
        if (rut) {
          setRutSocio(rut)
          supabase.from('socios').select('nombre,email,cuota_mensual,tbk_user,tbk_tarjeta_tipo,tbk_tarjeta_ultimos4').eq('rut', rut).single()
            .then(({ data }) => {
              if (data?.nombre) setNombreSocio(data.nombre)
              if (data?.email) setEmailSocio(data.email)
              if (data?.cuota_mensual) setCuota(data.cuota_mensual)
              if (data?.tbk_user) {
                setTbkUser(data.tbk_user)
                setTarjetaInfo({ tipo: data.tbk_tarjeta_tipo || 'Tarjeta', ultimos4: data.tbk_tarjeta_ultimos4 || '****' })
                setMedioPago('oneclick')
              }
            })
          const mesActual = new Date().getMonth() + 1
          const añoActual2 = new Date().getFullYear()
          supabase.from('dispensaciones').select('gramos').eq('rut_socio', rut).eq('mes', mesActual).eq('año', añoActual2).neq('estado', 'pendiente_pago')
            .then(({ data: disp }) => {
              if (disp) setDispensadoMes(disp.reduce((acc, d) => acc + d.gramos, 0))
            })
        }
      }
    } catch {}
    cargarCepas()
  }, [])

  const cargarCepas = async () => {
    setLoading(true)
    const { data } = await supabase.from('cepas').select('*').eq('visible', true).order('nombre')
    if (data) setCepas(data)
    setLoading(false)
  }

  const totalCarrito = carrito.reduce((acc, item) => acc + item.gramos, 0)
  const COSTO_DESPACHO = 4900
  const totalMonto = carrito.reduce((acc, item) => acc + item.precio, 0) + COSTO_DESPACHO
  const totalItems = carrito.length
  const disponibleRestante = cuota - dispensadoMes - totalCarrito

  const agregarAlCarrito = (cepa: Cepa) => {
    const gramos = parseInt(gramosInput[cepa.id] || '0')
    if (!gramos || gramos <= 0) return
    if (gramos > disponibleRestante) return
    if (gramos > cepa.stock_gramos) return
    const precioGramo = cepa.precio_gramo || 0
    const precio = gramos * precioGramo
    const nuevoItem: ItemCarrito = { id: cepa.id + '-' + gramos + '-' + Date.now(), cepa, gramos, precio }
    setCarrito(prev => [...prev, nuevoItem])
    setGramosInput(prev => ({ ...prev, [cepa.id]: '' }))
  }

  const quitarDelCarrito = (id: string) => setCarrito(prev => prev.filter(item => item.id !== id))

  // 🚧 BYPASS TEMPORAL — cambiar a false para activar MP en producción
  const BYPASS_PAGO = true

  const confirmarPago = async () => {
    setProcesando(true)
    try {
      const orden = 'GT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 90000) + 10000)
      const mesActual = new Date().getMonth() + 1
      const añoActual = new Date().getFullYear()

      if (BYPASS_PAGO) {
        // ── MODO BYPASS: registrar dispensaciones directamente como pagado ──
        for (const item of carrito) {
          await supabase.from('dispensaciones').insert({
            rut_socio: rutSocio,
            cepa_id: item.cepa.id,
            gramos: item.gramos,
            precio: item.precio,
            estado: 'pagado',
            numero_orden: orden,
            mes: mesActual,
            año: añoActual,
            mp_payment_id: 'BYPASS-' + orden,
          })
          await supabase.from('cepas').update({ stock_gramos: item.cepa.stock_gramos - item.gramos }).eq('id', item.cepa.id)
        }
        setOrdenNumero(orden)
        setPaso('confirmacion')
        setProcesando(false)
        return
      }

      // ── MODO PRODUCCIÓN: flujo real MercadoPago ──
      sessionStorage.setItem('mp_carrito', JSON.stringify({ orden, mesActual, añoActual, carrito, rutSocio }))

      const items = [
        ...carrito.map(item => ({
          id: item.cepa.id,
          title: `${item.cepa.nombre} — ${item.gramos} gr`,
          quantity: 1,
          unit_price: item.precio,
          currency_id: 'CLP',
        })),
        {
          id: 'despacho',
          title: 'Despacho a domicilio',
          quantity: 1,
          unit_price: COSTO_DESPACHO,
          currency_id: 'CLP',
        }
      ]

      const res = await fetch('/api/mercadopago/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          pagador: { email: emailSocio || rutSocio + '@greentech.cl' },
          external_reference: `${rutSocio}|dispensacion|${orden}`,
          back_urls: {
            success: `${window.location.origin}/socio/dispensacion?pago=success&orden=${orden}`,
            failure: `${window.location.origin}/socio/dispensacion?pago=failure`,
            pending: `${window.location.origin}/socio/dispensacion?pago=pending`,
          }
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error('Error al crear preferencia')
      window.location.href = data.init_point

    } catch {
      alert('Error al procesar el pago. Intenta nuevamente.')
      setProcesando(false)
    }
  }

  const eliminarTarjeta = async () => {
    if (!confirm('¿Eliminar la tarjeta guardada? Tendrás que inscribirla nuevamente la próxima vez.')) return
    // TODO (OneClick): llamar a /api/oneclick/eliminar cuando esté contratado
    // await fetch('/api/oneclick/eliminar', { method:'POST', body: JSON.stringify({ tbkUser, rutSocio }) })
    await supabase.from('socios').update({ tbk_user: null, tbk_tarjeta_tipo: null, tbk_tarjeta_ultimos4: null }).eq('rut', rutSocio)
    setTbkUser(null)
    setTarjetaInfo(null)
    setMedioPago('webpay')
  }

  const colorTipo: Record<string, {bg: string, color: string}> = {
    sativa:        { bg: '#EAF3DE', color: '#3B6D11' },
    indica:        { bg: '#EEEDFE', color: '#534AB7' },
    hibrida:       { bg: '#E6F1FB', color: '#185FA5' },
    cbd:           { bg: '#FDF5E6', color: '#BA7517' },
    autoflowering: { bg: '#F3F4F6', color: '#374151' },
  }

  const carritoResumen = carrito.reduce<Record<string, number>>((acc, item) => {
    acc[item.cepa.id] = (acc[item.cepa.id] || 0) + item.gramos
    return acc
  }, {})

  const mesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][new Date().getMonth()]

  if (!rutSocio) return <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>Cargando...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarSocio nombre={nombreSocio} rut={rutSocio} />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f9fafb' }}>

        {paso === 'catalogo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Dispensar flores medicinales</h1>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Indica los gramos que necesitas. No puedes superar tu cuota mensual.</p>
              </div>
              <button onClick={() => totalItems > 0 && setPaso('checkout')} disabled={totalItems === 0}
                style={{ background: totalItems > 0 ? '#3B6D11' : '#e5e7eb', color: totalItems > 0 ? '#EAF3DE' : '#9ca3af', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: totalItems > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                Checkout
                {totalItems > 0 && (
                  <span style={{ background: '#EAF3DE', color: '#3B6D11', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {totalItems} items - ${(totalMonto - COSTO_DESPACHO).toLocaleString('es-CL')}
                  </span>
                )}
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Cuota mensual - {mesNombre} {new Date().getFullYear()}</span>
                <span style={{ color: '#6b7280' }}>
                  {dispensadoMes + totalCarrito} / {cuota} gr usados
                  {totalCarrito > 0 && <span style={{ color: '#3B6D11', marginLeft: 6 }}>(+{totalCarrito} gr en carrito)</span>}
                </span>
              </div>
              <div style={{ height: 10, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(100, ((dispensadoMes + totalCarrito) / cuota) * 100) + '%', background: '#3B6D11', borderRadius: 20, transition: '0.3s' }} />
              </div>
              {totalCarrito > 0 && (
                <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 6 }}>
                  Despues de este pedido te quedaran {disponibleRestante} gr disponibles este mes
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando catalogo...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {cepas.map(cepa => {
                  const tipo = colorTipo[cepa.tipo] || colorTipo.sativa
                  const expandida = cepaExpandida === cepa.id
                  const gramsEnCarrito = carritoResumen[cepa.id] || 0
                  const gramosVal = parseInt(gramosInput[cepa.id] || '0')
                  const precioGramo = cepa.precio_gramo || 0
                  const precioPreview = gramosVal > 0 ? gramosVal * precioGramo : 0
                  const superariaLimite = gramosVal > disponibleRestante
                  const sinStock = gramosVal > cepa.stock_gramos
                  const puedeAgregar = gramosVal > 0 && !superariaLimite && !sinStock

                  return (
                    <div key={cepa.id} style={{ background: '#fff', border: '1px solid ' + (expandida ? tipo.color + '44' : '#e5e7eb'), borderRadius: 14, overflow: 'hidden', transition: '0.2s' }}>
                      <div onClick={() => setCepaExpandida(expandida ? null : cepa.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ width: '100%', height: 160, background: tipo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                          {cepa.imagen_url
                            ? <img src={cepa.imagen_url} alt={cepa.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ fontSize: 64, opacity: 0.4 }}>🌿</div>}
                          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, background: tipo.bg, color: tipo.color, padding: '3px 10px', borderRadius: 20, fontWeight: 600, border: '1px solid ' + tipo.color + '44' }}>
                            {cepa.tipo.charAt(0).toUpperCase() + cepa.tipo.slice(1)}
                          </span>
                          {(cepa.pct_indica || cepa.pct_sativa) ? (
                            <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '3px 8px', borderRadius: 20 }}>
                              {cepa.pct_indica ? 'Indica ' + cepa.pct_indica + '%' : ''}{cepa.pct_indica && cepa.pct_sativa ? ' - ' : ''}{cepa.pct_sativa ? 'Sativa ' + cepa.pct_sativa + '%' : ''}
                            </span>
                          ) : null}
                          {gramsEnCarrito > 0 && (
                            <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, background: '#3B6D11', color: '#fff', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                              {gramsEnCarrito} gr en carrito
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '10px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{cepa.nombre}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>${precioGramo.toLocaleString('es-CL')}/gr</span>
                            <span style={{ fontSize: 12, color: '#9ca3af', transform: expandida ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: '0.2s' }}>v</span>
                          </div>
                        </div>
                      </div>

                      {expandida && (
                        <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                            <div>THC: {cepa.thc_pct ?? '--'}%</div>
                            <div>CBD: {cepa.cbd_pct ?? '--'}%</div>
                            {cepa.pct_indica != null && <div>Indica: {cepa.pct_indica}%</div>}
                            {cepa.pct_sativa != null && <div>Sativa: {cepa.pct_sativa}%</div>}
                            {cepa.efecto && <div>Efecto: {cepa.efecto}</div>}
                            {cepa.horario && <div>Horario: {cepa.horario}</div>}
                          </div>

                          {cepa.pct_indica != null && cepa.pct_sativa != null && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
                                <span>Indica {cepa.pct_indica}%</span><span>Sativa {cepa.pct_sativa}%</span>
                              </div>
                              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: cepa.pct_indica + '%', background: 'linear-gradient(90deg, #534AB7, #7C75E0)', borderRadius: 20 }} />
                              </div>
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                              Gramos a dispensar - ${precioGramo.toLocaleString('es-CL')}/gr
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ flex: 1, position: 'relative' as const }}>
                                <input
                                  type="number" min="0"
                                  value={gramosInput[cepa.id] || ''}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => setGramosInput(prev => ({ ...prev, [cepa.id]: e.target.value }))}
                                  placeholder="Ej: 10"
                                  style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 15, fontWeight: 600, boxSizing: 'border-box' as const }}
                                />
                                <span style={{ position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af', pointerEvents: 'none' as const }}>gr</span>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: precioPreview > 0 ? '#3B6D11' : '#9ca3af', minWidth: 100, textAlign: 'right' as const }}>
                                {precioPreview > 0 ? '$' + precioPreview.toLocaleString('es-CL') : '—'}
                              </span>
                            </div>

                            {gramosVal > 0 && superariaLimite && (
                              <div style={{ fontSize: 11, color: '#A32D2D', marginBottom: 6 }}>Supera tu cuota - te quedan {disponibleRestante} gr disponibles</div>
                            )}
                            {gramosVal > 0 && sinStock && (
                              <div style={{ fontSize: 11, color: '#A32D2D', marginBottom: 6 }}>Sin stock suficiente</div>
                            )}

                            <button onClick={e => { e.stopPropagation(); agregarAlCarrito(cepa) }} disabled={!puedeAgregar}
                              style={{ width: '100%', padding: '9px', border: 'none', borderRadius: 9, background: puedeAgregar ? tipo.color : '#f3f4f6', color: puedeAgregar ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: 600, cursor: puedeAgregar ? 'pointer' : 'not-allowed', transition: '0.15s' }}>
                              {gramosVal > 0 ? '+ Agregar ' + gramosVal + ' gr al carrito' : '+ Agregar al carrito'}
                            </button>

                            {carrito.filter(i => i.cepa.id === cepa.id).length > 0 && (
                              <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                                {carrito.filter(i => i.cepa.id === cepa.id).map(item => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f9fafb' }}>
                                    <span>{item.gramos} gr - ${item.precio.toLocaleString('es-CL')}</span>
                                    <button onClick={() => quitarDelCarrito(item.id)} style={{ background: 'none', border: 'none', color: '#A32D2D', cursor: 'pointer', fontSize: 14 }}>x</button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                              Cuota restante: <strong style={{ color: disponibleRestante <= 0 ? '#A32D2D' : '#3B6D11' }}>{disponibleRestante} gr</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {!expandida && (
                        <div style={{ padding: '6px 14px 10px', fontSize: 11, color: '#9ca3af', textAlign: 'center' as const }}>
                          Toca para ver detalle y agregar
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {paso === 'checkout' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <button onClick={() => setPaso('catalogo')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}>Volver al catalogo</button>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Confirmar pedido</h1>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Productos seleccionados</div>
              {carrito.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < carrito.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.cepa.nombre}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{item.gramos} gr - ${(item.cepa.precio_gramo || 0).toLocaleString('es-CL')}/gr</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 600 }}>${item.precio.toLocaleString('es-CL')}</span>
                    <button onClick={() => quitarDelCarrito(item.id)} style={{ background: 'none', border: 'none', color: '#A32D2D', cursor: 'pointer', fontSize: 16 }}>x</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>🚚 Despacho a domicilio</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Envío a tu dirección registrada</div>
                </div>
                <span style={{ fontWeight: 600 }}>${COSTO_DESPACHO.toLocaleString('es-CL')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14, paddingTop: 10, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                <span>Total ({totalCarrito} gr)</span>
                <span style={{ color: '#3B6D11' }}>${totalMonto.toLocaleString('es-CL')}</span>
              </div>
            </div>
            <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#3B6D11' }}>
              Dentro de tu cuota: usaras {dispensadoMes + totalCarrito} de {cuota} gr este mes
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Direccion de despacho</div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>El Molino 45, Casa 55</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Colina, Santiago</div>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Medio de pago</div>
              <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#633806', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🧪 <span><strong>Modo prueba</strong> — Los pagos usan el sandbox de MercadoPago.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '2px solid #009EE3', borderRadius: 10, background: '#F0F9FF' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💙</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>MercadoPago</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Tarjeta de crédito, débito o transferencia</div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #009EE3', background: '#009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => { setCarrito([]); setPaso('catalogo') }}
                style={{ flex:1, padding:'14px', border:'1px solid #d1d5db', borderRadius:10, background:'#fff', color:'#6b7280', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                ← Cancelar
              </button>
              <button onClick={confirmarPago} disabled={procesando}
                style={{ flex:3, background: procesando ? '#9ca3af' : '#009EE3', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                {procesando ? 'Redirigiendo...' : `💙 Pagar $${totalMonto.toLocaleString('es-CL')} con MercadoPago`}
              </button>
            </div>
          </div>
        )}

        {paso === 'confirmacion' && (
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' as const, paddingTop: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#3B6D11' }}>Pago confirmado</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Tu pedido fue recibido y sera preparado por la corporacion.</p>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>
              Orden <strong>{ordenNumero}</strong> · 💙 MercadoPago
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'left' as const }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Resumen del pedido</div>
              {carrito.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span>{item.cepa.nombre} - {item.gramos} gr</span>
                  <span style={{ fontWeight: 600 }}>${item.precio.toLocaleString('es-CL')}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, paddingTop: 8, color: '#3B6D11' }}>
                <span>Total pagado</span><span>${totalMonto.toLocaleString('es-CL')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setCarrito([]); setPaso('catalogo') }}
                style={{ flex: 1, background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Nueva dispensacion
              </button>
              <a href="/socio/historial" style={{ flex: 1, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Ver mi historial
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
