'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Cepa {
  id: string; nombre: string; tipo: string; ratio_thc_cbd: string
  thc_pct: number; cbd_pct: number; stock_gramos: number
  precio_3gr: number; precio_7gr: number; precio_10gr: number; visible: boolean
}

const tipoColor: Record<string, {bg:string,color:string}> = {
  sativa:  { bg:'#e0f2fe', color:'#0369a1' },
  indica:  { bg:'#EEEDFE', color:'#534AB7' },
  hibrida: { bg:'#E6F1FB', color:'#185FA5' },
  cbd:     { bg:'#FDF5E6', color:'#BA7517' },
}

export default function Inventario() {
  const [cepas, setCepas] = useState<Cepa[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mostrarAjuste, setMostrarAjuste] = useState(false)

  // Ajuste manual
  const [ajusteCepa, setAjusteCepa] = useState('')
  const [ajusteTipo, setAjusteTipo] = useState<'agregar'|'restar'|'establecer'>('agregar')
  const [ajusteGramos, setAjusteGramos] = useState('')
  const [ajusteMotivo, setAjusteMotivo] = useState('')

  useEffect(() => { cargarCepas() }, [])

  const cargarCepas = async () => {
    setLoading(true)
    const { data } = await supabase.from('cepas').select('*').order('nombre')
    if (data) setCepas(data)
    setLoading(false)
  }

  const aplicarAjuste = async () => {
    if (!ajusteCepa || !ajusteGramos) { setMensaje('❌ Selecciona la cepa y los gramos'); return }
    if (!ajusteMotivo.trim()) { setMensaje('❌ El motivo es obligatorio para el registro de trazabilidad'); return }
    setGuardando(true)
    const cepa = cepas.find(c => c.id === ajusteCepa)
    if (!cepa) return
    let nuevoStock = cepa.stock_gramos
    const gramosNum = parseInt(ajusteGramos)
    if (ajusteTipo === 'agregar') nuevoStock += gramosNum
    else if (ajusteTipo === 'restar') nuevoStock = Math.max(0, nuevoStock - gramosNum)
    else nuevoStock = gramosNum

    const { error } = await supabase.from('cepas').update({ stock_gramos: nuevoStock }).eq('id', ajusteCepa)
    if (error) {
      setMensaje('❌ Error: ' + error.message)
    } else {
      // Identificar al admin autenticado
      const { data: { user: adminUser } } = await supabase.auth.getUser()
      const adminRut = adminUser?.user_metadata?.rut || ''
      let adminNombre = adminUser?.user_metadata?.nombre || ''
      // Si no tiene nombre en metadata, buscarlo en socios por RUT
      if (!adminNombre && adminRut) {
        const { data: adminSocio } = await supabase.from('socios').select('nombre').eq('rut', adminRut).single()
        adminNombre = adminSocio?.nombre || adminRut
      }
      if (!adminNombre) adminNombre = 'Admin'

      const deltaGramos = ajusteTipo === 'agregar' ? gramosNum
        : ajusteTipo === 'restar' ? -gramosNum
        : nuevoStock - cepa.stock_gramos
      const adminLabel = adminNombre + (adminRut ? ` (${adminRut})` : '')

      // 1. Registrar en movimientos_stock (historial de stock)
      await supabase.from('movimientos_stock').insert({
        cepa_nombre: cepa.nombre,
        tipo: 'ajuste_manual',
        gramos: deltaGramos,
        stock_antes: cepa.stock_gramos,
        stock_despues: nuevoStock,
        motivo: ajusteMotivo,
        registrado_por: adminLabel,
      })

      // 2. Registrar en audit_log (trazabilidad)
      await supabase.from('audit_log').insert({
        accion: 'ajuste_stock_manual',
        entidad: 'cepas',
        entidad_id: ajusteCepa,
        realizado_por: adminLabel,
        detalles: {
          cepa_nombre: cepa.nombre,
          tipo_ajuste: ajusteTipo,
          gramos_ajustados: gramosNum,
          delta: deltaGramos,
          stock_antes: cepa.stock_gramos,
          stock_despues: nuevoStock,
          motivo: ajusteMotivo,
          admin_rut: adminRut,
        },
      })

      setMensaje(`✅ Stock de ${cepa.nombre} actualizado a ${nuevoStock} gr — registrado en trazabilidad`)
      setMostrarAjuste(false)
      setAjusteCepa(''); setAjusteGramos(''); setAjusteMotivo('')
      cargarCepas()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 5000)
  }

  const toggleVisible = async (cepa: Cepa) => {
    await supabase.from('cepas').update({ visible: !cepa.visible }).eq('id', cepa.id)
    setCepas(prev => prev.map(c => c.id === cepa.id ? {...c, visible: !c.visible} : c))
  }

  const stockTotal = cepas.reduce((a, c) => a + c.stock_gramos, 0)
  const cepasConStock = cepas.filter(c => c.stock_gramos > 0).length
  const cepasStockBajo = cepas.filter(c => c.stock_gramos > 0 && c.stock_gramos < 20).length

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
            <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Inventario</h1>
            <p style={{ fontSize:13, color:'#6b7280' }}>Stock disponible por cepa, paquetes y movimientos</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => window.location.href='/admin/cultivo'}
              style={{ padding:'8px 14px', border:'1px solid #0369a1', borderRadius:8, background:'transparent', color:'#0369a1', fontSize:13, cursor:'pointer' }}>
              🌱 Ir a cultivo
            </button>
            <button onClick={() => setMostrarAjuste(!mostrarAjuste)}
              style={{ padding:'8px 14px', border:'none', borderRadius:8, background:'#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + Ajuste manual
            </button>
          </div>
        </div>

        {mensaje && (
          <div style={{ background:mensaje.startsWith('✅')?'#e0f2fe':'#FCEBEB', border:`1px solid ${mensaje.startsWith('✅')?'#7dd3fc':'#F5C5C5'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color:mensaje.startsWith('✅')?'#0369a1':'#A32D2D', marginBottom:16 }}>
            {mensaje}
          </div>
        )}

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Stock total disponible', value:`${stockTotal} gr`, sub:`${cepasConStock} cepas con stock`, color: stockTotal > 0 ? '#0369a1' : '#A32D2D' },
            { label:'Cepas activas', value:`${cepas.filter(c=>c.visible).length}`, sub:'visibles en catálogo' },
            { label:'Stock bajo', value:`${cepasStockBajo}`, sub:'menos de 20 gr', color: cepasStockBajo > 0 ? '#EF9F27' : '#9ca3af' },
            { label:'Cepas sin stock', value:`${cepas.filter(c=>c.stock_gramos===0).length}`, sub:'requieren reposición', color: cepas.filter(c=>c.stock_gramos===0).length > 0 ? '#A32D2D' : '#9ca3af' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:600, color:m.color||'#111' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Ajuste manual */}
        {mostrarAjuste && (
          <div style={{ border:'1px solid #A8CBF0', borderRadius:12, padding:18, marginBottom:20, background:'#F0F7FF' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'#185FA5' }}>📦 Ajuste manual de stock</div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr', gap:12, marginBottom:12 }}>
              <div style={s.field}>
                <label style={s.label}>Cepa *</label>
                <select style={s.input} value={ajusteCepa} onChange={e=>setAjusteCepa(e.target.value)}>
                  <option value="">Seleccionar cepa...</option>
                  {cepas.map(c => <option key={c.id} value={c.id}>{c.nombre} (stock actual: {c.stock_gramos} gr)</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Tipo de ajuste *</label>
                <select style={s.input} value={ajusteTipo} onChange={e=>setAjusteTipo(e.target.value as typeof ajusteTipo)}>
                  <option value="agregar">+ Agregar gramos</option>
                  <option value="restar">− Restar gramos</option>
                  <option value="establecer">= Establecer stock</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Gramos *</label>
                <input style={s.input} type="number" value={ajusteGramos} onChange={e=>setAjusteGramos(e.target.value)} placeholder="Ej: 50"/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Motivo * <span style={{ color:'#9ca3af', fontStyle:'italic' }}>(obligatorio para trazabilidad)</span></label>
                <input style={{ ...s.input, borderColor: ajusteMotivo.trim() ? '#d1d5db' : '#fca5a5' }} value={ajusteMotivo} onChange={e=>setAjusteMotivo(e.target.value)} placeholder="Ej: Merma por secado, corrección de inventario, cosecha..."/>
              </div>
            </div>
            {ajusteCepa && ajusteGramos && (
              <div style={{ background:'#E6F1FB', border:'1px solid #A8CBF0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#185FA5', marginBottom:12 }}>
                Stock de <strong>{cepas.find(c=>c.id===ajusteCepa)?.nombre}</strong>:{' '}
                {cepas.find(c=>c.id===ajusteCepa)?.stock_gramos} gr →{' '}
                <strong>
                  {ajusteTipo==='agregar' ? (cepas.find(c=>c.id===ajusteCepa)?.stock_gramos||0) + parseInt(ajusteGramos||'0')
                  : ajusteTipo==='restar' ? Math.max(0,(cepas.find(c=>c.id===ajusteCepa)?.stock_gramos||0) - parseInt(ajusteGramos||'0'))
                  : ajusteGramos} gr
                </strong>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setMostrarAjuste(false)} style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={aplicarAjuste} disabled={guardando} style={{ padding:'7px 16px', border:'none', borderRadius:8, background:'#185FA5', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {guardando ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </div>
          </div>
        )}

        {/* Tabla de cepas */}
        {loading ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando inventario...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
            {cepas.map(cepa => {
              const tc = tipoColor[cepa.tipo] || tipoColor.sativa
              const pct = Math.min(100, (cepa.stock_gramos / 100) * 100)
              const stockColor = cepa.stock_gramos === 0 ? '#A32D2D' : cepa.stock_gramos < 20 ? '#EF9F27' : '#0369a1'
              const paquetes = [
                { gr:3, precio:cepa.precio_3gr },
                { gr:7, precio:cepa.precio_7gr },
                { gr:10, precio:cepa.precio_10gr },
              ].filter(p => p.precio > 0)

              return (
                <div key={cepa.id} style={{ border:`1px solid ${cepa.stock_gramos < 20 && cepa.stock_gramos > 0 ? '#EF9F27' : cepa.stock_gramos === 0 ? '#F5C5C5' : '#e5e7eb'}`, borderRadius:14, overflow:'hidden' }}>

                  {/* Header cepa */}
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🌿</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{cepa.nombre}</div>
                      <span style={{ fontSize:10, background:tc.bg, color:tc.color, padding:'1px 7px', borderRadius:20 }}>
                        {cepa.tipo.charAt(0).toUpperCase()+cepa.tipo.slice(1)} · {cepa.ratio_thc_cbd || '—'}
                      </span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:700, color:stockColor }}>{cepa.stock_gramos} gr</div>
                      {cepa.stock_gramos === 0 && <div style={{ fontSize:10, color:'#A32D2D' }}>Sin stock</div>}
                      {cepa.stock_gramos > 0 && cepa.stock_gramos < 20 && <div style={{ fontSize:10, color:'#EF9F27' }}>⚠️ Stock bajo</div>}
                    </div>
                  </div>

                  {/* Barra de stock */}
                  <div style={{ padding:'10px 14px', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af', marginBottom:5 }}>
                      <span>Nivel de stock</span>
                      <span>{cepa.stock_gramos} / 100 gr ref.</span>
                    </div>
                    <div style={{ height:8, background:'#f3f4f6', borderRadius:20, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:stockColor, borderRadius:20, transition:'0.3s' }}/>
                    </div>
                  </div>

                  {/* Footer toggle visible */}
                  <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f9fafb' }}>
                    <span style={{ fontSize:12, color:'#6b7280' }}>
                      {cepa.visible ? '👁 Visible en catálogo' : '🙈 Oculto en catálogo'}
                    </span>
                    <div onClick={() => toggleVisible(cepa)}
                      style={{ width:36, height:20, borderRadius:10, background:cepa.visible?'#0369a1':'#d1d5db', position:'relative', cursor:'pointer' }}>
                      <div style={{ width:16, height:16, background:'#fff', borderRadius:'50%', position:'absolute', top:2, left:cepa.visible?18:2, transition:'0.2s' }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
