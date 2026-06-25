'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Lote {
  id: string; codigo: string; cepa: string; plantas: number
  fecha_germinacion: string; gramaje_humedo?: number; gramaje_seco?: number
  estado: 'crecimiento' | 'cosechado' | 'secado' | 'procesado'
  responsable: string; cosecha_estimada?: string; tipo_cultivo?: string
  notas?: string; created_at: string
}

const estadoConfig: Record<string, {label:string,bg:string,color:string,border:string}> = {
  crecimiento: { label:'🌱 En crecimiento', bg:'#EAF3DE', color:'#3B6D11', border:'#97C459' },
  cosechado:   { label:'✂️ Cosechado',       bg:'#FAEEDA', color:'#633806', border:'#EF9F27' },
  secado:      { label:'💨 En secado',        bg:'#E6F1FB', color:'#185FA5', border:'#A8CBF0' },
  procesado:   { label:'✅ Procesado',        bg:'#f3f4f6', color:'#374151', border:'#d1d5db' },
}

// Estado siguiente permitido para cada estado actual
const siguienteEstado: Record<string, {value:string, label:string}> = {
  crecimiento: { value:'cosechado', label:'Cosecha (registrar gramaje húmedo)' },
  cosechado:   { value:'secado',    label:'Inicio de curado' },
  secado:      { value:'procesado', label:'Secado completo → ingresar a stock' },
}

const tipoCultivoIcon: Record<string, string> = {
  indoor: '🏠', outdoor: '🌳', greenhouse: '🌿'
}

export default function Cultivo() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cepasDisponibles, setCepasDisponibles] = useState<string[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [mostrarNuevaCepa, setMostrarNuevaCepa] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [nuevaCepa, setNuevaCepa] = useState('')
  const [nuevasPlantas, setNuevasPlantas] = useState('')
  const [nuevaFechaGerm, setNuevaFechaGerm] = useState('')
  const [nuevaCosechaEst, setNuevaCosechaEst] = useState('')
  const [nuevoResponsable, setNuevoResponsable] = useState('')
  const [nuevoCultivo, setNuevoCultivo] = useState('indoor')
  const [nuevasNotas, setNuevasNotas] = useState('')

  const [ncNombre, setNcNombre] = useState('')
  const [ncTipo, setNcTipo] = useState('sativa')
  const [ncThc, setNcThc] = useState('')
  const [ncCbd, setNcCbd] = useState('')
  const [ncSativa, setNcSativa] = useState('')
  const [ncIndica, setNcIndica] = useState('')
  const [ncEfecto, setNcEfecto] = useState('')
  const [ncHorario, setNcHorario] = useState('')
  const [ncBanco, setNcBanco] = useState('')
  const [ncPrecio3, setNcPrecio3] = useState('')
  const [ncPrecio7, setNcPrecio7] = useState('')
  const [ncPrecio10, setNcPrecio10] = useState('')
  const [ncImagen, setNcImagen] = useState<File|null>(null)
  const [ncImagenPreview, setNcImagenPreview] = useState<string|null>(null)

  const [loteSeleccionado, setLoteSeleccionado] = useState('')
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0])
  const [gramHumedo, setGramHumedo] = useState('')
  const [gramSeco, setGramSeco] = useState('')
  const [responsableRegistro, setResponsableRegistro] = useState('')

  useEffect(() => { cargarLotes(); cargarCepas(); cargarResponsables() }, [])

  // Auto-seleccionar responsable cuando hay exactamente uno disponible
  useEffect(() => {
    if (responsables.length === 1) {
      setNuevoResponsable(responsables[0])
      setResponsableRegistro(responsables[0])
    }
  }, [responsables])

  const cargarLotes = async () => {
    setLoading(true)
    const { data } = await supabase.from('lotes_cultivo').select('*').order('created_at', { ascending: false })
    if (data) setLotes(data)
    setLoading(false)
  }

  const cargarCepas = async () => {
    const { data } = await supabase.from('cepas').select('nombre').order('nombre')
    if (data) setCepasDisponibles(data.map((c:{nombre:string}) => c.nombre))
  }

  const cargarResponsables = async () => {
    // Solo muestra al usuario logueado si tiene rol_cultivador activo
    // Busca por RUT (guardado en metadata al login) — más confiable que email (ya no es único)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const rut = session.user.user_metadata?.rut
    if (!rut) return
    const { data: socio } = await supabase
      .from('socios')
      .select('nombre, rol_cultivador')
      .eq('rut', rut)
      .single()
    if (socio?.rol_cultivador) {
      setResponsables([socio.nombre])
    } else {
      setResponsables([])
    }
  }

  const generarCodigo = () => {
    const numeros = lotes.map(l => parseInt(l.codigo.split('-')[1] || '0')).filter(n => !isNaN(n))
    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    return `A-${String(siguiente).padStart(3, '0')}`
  }

  // Lote actual seleccionado y su siguiente estado permitido
  const loteActual = lotes.find(l => l.id === loteSeleccionado)
  const estadoActualLote = loteActual?.estado || 'crecimiento'
  const proximoRegistro = siguienteEstado[estadoActualLote]
  const gramHumedoGuardado = loteActual?.gramaje_humedo

  // Validación botón guardar
  const puedeGuardar = (() => {
    if (!loteSeleccionado) return false
    if (responsables.length === 0) return false
    if (!proximoRegistro) return false
    if (proximoRegistro.value === 'cosechado' && !gramHumedo) return false
    if (proximoRegistro.value === 'procesado' && !gramSeco) return false
    return true
  })()

  const crearLote = async () => {
    if (!nuevaCepa || !nuevasPlantas) { setMensaje('❌ Selecciona la cepa y el número de plantas'); return }
    setGuardando(true)
    const codigo = generarCodigo()
    const { error } = await supabase.from('lotes_cultivo').insert({
      codigo, cepa: nuevaCepa, plantas: parseInt(nuevasPlantas),
      fecha_germinacion: nuevaFechaGerm || null,
      cosecha_estimada: nuevaCosechaEst || null,
      tipo_cultivo: nuevoCultivo,
      estado: 'crecimiento', responsable: nuevoResponsable,
      notas: nuevasNotas || null,
    })
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      setMensaje(`✅ Lote ${codigo} creado correctamente`)
      setMostrarForm(false)
      setNuevaCepa(''); setNuevasPlantas(''); setNuevaFechaGerm(''); setNuevaCosechaEst('')
      setNuevoResponsable(''); setNuevoCultivo('indoor'); setNuevasNotas('')
      cargarLotes()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const crearCepa = async () => {
    if (!ncNombre) { setMensaje('❌ El nombre de la cepa es obligatorio'); return }
    setGuardando(true)
    let imagenUrl = null
    if (ncImagen) {
      const ext = ncImagen.name.split('.').pop()
      const path = `${ncNombre.replace(/\s+/g,'-').toLowerCase()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('cepas').upload(path, ncImagen, { upsert: true })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('cepas').getPublicUrl(path)
        imagenUrl = urlData?.publicUrl || null
      }
    }
    const { error } = await supabase.from('cepas').insert({
      nombre: ncNombre, tipo: ncTipo,
      thc_pct: parseFloat(ncThc) || 0,
      cbd_pct: parseFloat(ncCbd) || 0,
      pct_sativa: parseFloat(ncSativa) || 0,
      pct_indica: parseFloat(ncIndica) || 0,
      banco_semillas: ncBanco || null,
      efecto: ncEfecto || null,
      horario: ncHorario || null,
      stock_gramos: 0,
      precio_3gr: parseInt(ncPrecio3) || 0,
      precio_7gr: parseInt(ncPrecio7) || 0,
      precio_10gr: parseInt(ncPrecio10) || 0,
      visible: true,
      imagen_url: imagenUrl,
    })
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      setMensaje(`✅ Cepa "${ncNombre}" creada y disponible en catálogo`)
      setMostrarNuevaCepa(false)
      setNcNombre(''); setNcTipo('sativa'); setNcThc(''); setNcCbd('')
      setNcSativa(''); setNcIndica(''); setNcEfecto(''); setNcHorario('')
      setNcBanco(''); setNcPrecio3(''); setNcPrecio7(''); setNcPrecio10('')
      setNcImagen(null); setNcImagenPreview(null)
      cargarCepas()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const registrarActualizacion = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    const nuevoEstado = proximoRegistro!.value
    const updates: Record<string, unknown> = { estado: nuevoEstado }
    if (gramHumedo) updates.gramaje_humedo = parseInt(gramHumedo)
    if (gramSeco) updates.gramaje_seco = parseInt(gramSeco)
    const { error } = await supabase.from('lotes_cultivo').update(updates).eq('id', loteSeleccionado)
    if (!error && nuevoEstado === 'procesado' && gramSeco) {
      const lote = lotes.find(l => l.id === loteSeleccionado)
      if (lote) {
        const gramosSecoNum = parseInt(gramSeco)
        const { data: cepa } = await supabase.from('cepas').select('id, stock_gramos').eq('nombre', lote.cepa).single()
        if (cepa) {
          const nuevoStock = cepa.stock_gramos + gramosSecoNum
          await supabase.from('cepas').update({ stock_gramos: nuevoStock }).eq('nombre', lote.cepa)
          // Registrar entrada de stock en audit trail
          await supabase.from('movimientos_stock').insert({
            cepa_nombre: lote.cepa,
            tipo: 'entrada_cultivo',
            gramos: gramosSecoNum,
            stock_antes: cepa.stock_gramos,
            stock_despues: nuevoStock,
            motivo: `Cosecha seca — lote ${lote.codigo}`,
            registrado_por: responsableRegistro || lote.responsable || 'Cultivador',
            lote_codigo: lote.codigo,
          })
        }
      }
    }
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      setMensaje('✅ Lote actualizado correctamente')
      setMostrarRegistro(false)
      setLoteSeleccionado(''); setGramHumedo(''); setGramSeco(''); setResponsableRegistro('')
      cargarLotes()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const totalPlantas = lotes.filter(l => l.estado !== 'procesado').reduce((a,l) => a+l.plantas, 0)
  const totalHumedo = lotes.reduce((a,l) => a+(l.gramaje_humedo||0), 0)
  const totalSeco = lotes.reduce((a,l) => a+(l.gramaje_seco||0), 0)
  const ratioPromedio = totalHumedo > 0 ? ((totalSeco/totalHumedo)*100).toFixed(1) : '—'

  const s = {
    input: { width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const },
    inputReadonly: { width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, boxSizing:'border-box' as const, background:'#f3f4f6', color:'#374151', fontWeight:500 as const },
    label: { fontSize:11, color:'#6b7280', display:'block', marginBottom:4 },
    field: { display:'flex', flexDirection:'column' as const, gap:4 },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
    grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', overflowX:'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', minWidth:0, background:'#fff' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Control de cultivo</h1>
            <p style={{ fontSize:13, color:'#6b7280' }}>Seguimiento de lotes, germinación, cosecha húmeda y producción seca</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setMostrarRegistro(!mostrarRegistro); setMostrarForm(false); setMostrarNuevaCepa(false) }}
              style={{ padding:'8px 14px', border:'1px solid #185FA5', borderRadius:8, background:'transparent', color:'#185FA5', fontSize:13, cursor:'pointer', fontWeight:500 }}>
              📝 Registrar actualización
            </button>
            <button onClick={() => { setMostrarForm(!mostrarForm); setMostrarRegistro(false); setMostrarNuevaCepa(false) }}
              style={{ padding:'8px 14px', border:'none', borderRadius:8, background:'#3B6D11', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + Nuevo lote
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
            { label:'Plantas activas', value:`${totalPlantas}`, sub:`en ${lotes.filter(l=>l.estado!=='procesado').length} lotes activos` },
            { label:'Cosecha húmeda total', value:`${totalHumedo} gr`, sub:'acumulado' },
            { label:'Producción seca total', value:`${totalSeco} gr`, sub:`ratio promedio ${ratioPromedio}%` },
            { label:'Cepas disponibles', value:`${cepasDisponibles.length}`, sub:'en catálogo' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:600 }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Form nueva cepa */}
        {mostrarNuevaCepa && (
          <div style={{ border:'1px solid #C4B8F5', borderRadius:12, padding:18, marginBottom:20, background:'#FAFAFE' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'#534AB7' }}>🌿 Registrar nueva cepa</div>
            <div style={{ ...s.grid3, marginBottom:12 }}>
              <div style={{ ...s.field, gridColumn:'1/-1' }}><label style={s.label}>Nombre de la cepa *</label><input style={s.input} value={ncNombre} onChange={e=>setNcNombre(e.target.value)} placeholder="Ej: Jack 47 XL Auto"/></div>
              <div style={s.field}><label style={s.label}>Tipo</label>
                <select style={s.input} value={ncTipo} onChange={e=>setNcTipo(e.target.value)}>
                  <option value="sativa">Sativa</option><option value="indica">Indica</option>
                  <option value="hibrida">Híbrida</option><option value="cbd">CBD alto</option>
                  <option value="autoflowering">Autofloreciente</option>
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Horario recomendado</label><input style={s.input} value={ncHorario} onChange={e=>setNcHorario(e.target.value)} placeholder="Ej: Nocturno"/></div>
              <div style={s.field}><label style={s.label}>Efecto principal</label><input style={s.input} value={ncEfecto} onChange={e=>setNcEfecto(e.target.value)} placeholder="Ej: Relajante"/></div>
              <div style={s.field}><label style={s.label}>THC %</label><input style={s.input} type="number" min="0" max="100" value={ncThc} onChange={e=>setNcThc(e.target.value)} placeholder="0"/></div>
              <div style={s.field}><label style={s.label}>CBD %</label><input style={s.input} type="number" min="0" max="100" value={ncCbd} onChange={e=>setNcCbd(e.target.value)} placeholder="0"/></div>
              <div style={s.field}><label style={s.label}>% Sativa</label><input style={s.input} type="number" min="0" max="100" value={ncSativa} onChange={e=>setNcSativa(e.target.value)} placeholder="0"/></div>
              <div style={s.field}><label style={s.label}>% Indica</label><input style={s.input} type="number" min="0" max="100" value={ncIndica} onChange={e=>setNcIndica(e.target.value)} placeholder="0"/></div>
              <div style={s.field}><label style={s.label}>Banco de semillas</label><input style={s.input} value={ncBanco} onChange={e=>setNcBanco(e.target.value)} placeholder="Ej: Royal Queen Seeds"/></div>
            </div>
            <div style={{ ...s.field, marginBottom:12 }}>
              <label style={s.label}>Imagen de la flor (opcional)</label>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:80, height:80, borderRadius:10, border:'1px dashed #d1d5db', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, cursor:'pointer' }}
                  onClick={() => document.getElementById('nc-imagen')?.click()}>
                  {ncImagenPreview ? <img src={ncImagenPreview} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:28 }}>🌿</span>}
                </div>
                <div>
                  <button type="button" onClick={() => document.getElementById('nc-imagen')?.click()}
                    style={{ padding:'7px 16px', border:'1px solid #534AB7', borderRadius:8, background:'transparent', color:'#534AB7', fontSize:12, cursor:'pointer' }}>
                    {ncImagen ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>JPG, PNG · máx. 5 MB</div>
                  {ncImagen && <div style={{ fontSize:11, color:'#3B6D11', marginTop:2 }}>✓ {ncImagen.name}</div>}
                </div>
                <input id="nc-imagen" type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => { const file = e.target.files?.[0]; if (file) { setNcImagen(file); const reader = new FileReader(); reader.onload = ev => setNcImagenPreview(ev.target?.result as string); reader.readAsDataURL(file) } }} />
              </div>
            </div>
            <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:12, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:10 }}>Precios por paquete</div>
              <div style={s.grid3}>
                <div style={s.field}><label style={s.label}>Precio paquete 3 gr ($)</label><input style={s.input} type="number" value={ncPrecio3} onChange={e=>setNcPrecio3(e.target.value)} placeholder="Ej: 2400"/></div>
                <div style={s.field}><label style={s.label}>Precio paquete 7 gr ($)</label><input style={s.input} type="number" value={ncPrecio7} onChange={e=>setNcPrecio7(e.target.value)} placeholder="Ej: 5250"/></div>
                <div style={s.field}><label style={s.label}>Precio paquete 10 gr ($)</label><input style={s.input} type="number" value={ncPrecio10} onChange={e=>setNcPrecio10(e.target.value)} placeholder="Ej: 7000"/></div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setMostrarNuevaCepa(false)} style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={crearCepa} disabled={guardando} style={{ padding:'7px 16px', border:'none', borderRadius:8, background:'#534AB7', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {guardando ? 'Guardando...' : 'Crear cepa'}
              </button>
            </div>
          </div>
        )}

        {/* Form nuevo lote */}
        {mostrarForm && (
          <div style={{ border:'1px solid #97C459', borderRadius:12, padding:18, marginBottom:20, background:'#FAFFF5' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#3B6D11' }}>🌱 Registrar nuevo lote</div>
              <div style={{ fontSize:12, background:'#EAF3DE', color:'#3B6D11', padding:'4px 12px', borderRadius:20 }}>
                Código: <strong>{generarCodigo()}</strong>
              </div>
            </div>
            <div style={{ ...s.grid3, marginBottom:12 }}>
              <div style={s.field}><label style={s.label}>Cepa *</label>
                <select style={s.input} value={nuevaCepa} onChange={e=>setNuevaCepa(e.target.value)}>
                  <option value="">Seleccionar cepa...</option>
                  {cepasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>N° plantas *</label><input style={s.input} type="number" value={nuevasPlantas} onChange={e=>setNuevasPlantas(e.target.value)} placeholder="Ej: 8"/></div>
              <div style={s.field}><label style={s.label}>Tipo de cultivo</label>
                <select style={s.input} value={nuevoCultivo} onChange={e=>setNuevoCultivo(e.target.value)}>
                  <option value="indoor">🏠 Indoor</option>
                  <option value="outdoor">🌳 Outdoor</option>
                  <option value="greenhouse">🌿 Greenhouse</option>
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Fecha de germinación</label><input style={s.input} type="date" value={nuevaFechaGerm} onChange={e=>setNuevaFechaGerm(e.target.value)}/></div>
              <div style={s.field}><label style={s.label}>Cosecha estimada</label><input style={s.input} type="date" value={nuevaCosechaEst} onChange={e=>setNuevaCosechaEst(e.target.value)}/></div>
              <div style={s.field}><label style={s.label}>Responsable</label>
                {responsables.length > 0 ? (
                  <div style={s.inputReadonly}>{responsables[0]}</div>
                ) : (
                  <div style={{ ...s.inputReadonly, color:'#9ca3af', fontWeight:400, fontSize:12 }}>
                    Sin rol de cultivador asignado
                  </div>
                )}
              </div>
            </div>
            <div style={{ ...s.field, marginBottom:14 }}>
              <label style={s.label}>Notas</label>
              <textarea style={{ ...s.input, height:60, resize:'none' }} value={nuevasNotas} onChange={e=>setNuevasNotas(e.target.value)} placeholder="Observaciones del lote..."/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setMostrarForm(false)} style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={crearLote} disabled={guardando} style={{ padding:'7px 16px', border:'none', borderRadius:8, background:'#3B6D11', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {guardando ? 'Guardando...' : `Crear lote ${generarCodigo()}`}
              </button>
            </div>
          </div>
        )}

        {/* Form actualización — con estados consecutivos */}
        {mostrarRegistro && (
          <div style={{ border:'1px solid #A8CBF0', borderRadius:12, padding:18, marginBottom:20, background:'#F0F7FF' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'#185FA5' }}>📝 Registrar actualización de lote</div>
            <div style={{ ...s.grid3, marginBottom:12 }}>

              {/* Selector de lote */}
              <div style={s.field}>
                <label style={s.label}>Lote a actualizar *</label>
                <select style={s.input} value={loteSeleccionado}
                  onChange={e => { setLoteSeleccionado(e.target.value); setGramHumedo(''); setGramSeco(''); setResponsableRegistro('') }}>
                  <option value="">Seleccionar lote...</option>
                  {lotes.filter(l=>l.estado!=='procesado').map(l => (
                    <option key={l.id} value={l.id}>{l.codigo} · {l.cepa} ({estadoConfig[l.estado].label})</option>
                  ))}
                </select>
              </div>

              {/* Tipo de registro — solo muestra el siguiente paso permitido */}
              <div style={s.field}>
                <label style={s.label}>Tipo de registro *</label>
                {loteSeleccionado && proximoRegistro ? (
                  <div style={{ ...s.inputReadonly, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>
                      {proximoRegistro.value === 'cosechado' ? '✂️' : proximoRegistro.value === 'secado' ? '💨' : '✅'}
                    </span>
                    <span>{proximoRegistro.label}</span>
                  </div>
                ) : (
                  <div style={{ ...s.inputReadonly, color:'#9ca3af', fontWeight:400 }}>
                    Selecciona un lote primero
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div style={s.field}>
                <label style={s.label}>Fecha</label>
                <input style={s.input} type="date" value={fechaRegistro} onChange={e=>setFechaRegistro(e.target.value)}/>
              </div>

              {/* Gramaje húmedo — solo en cosecha */}
              {loteSeleccionado && proximoRegistro?.value === 'cosechado' && (
                <div style={s.field}>
                  <label style={s.label}>Gramaje húmedo (gr) *</label>
                  <input style={s.input} type="number" value={gramHumedo} onChange={e=>setGramHumedo(e.target.value)} placeholder="Ej: 350"/>
                </div>
              )}

              {/* Secado: mostrar gramaje húmedo guardado + pedir gramaje seco */}
              {loteSeleccionado && proximoRegistro?.value === 'procesado' && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Gramaje húmedo registrado en cosecha</label>
                    {gramHumedoGuardado
                      ? <div style={s.inputReadonly}>{gramHumedoGuardado} gr</div>
                      : <div style={{ ...s.inputReadonly, color:'#9ca3af', fontWeight:400 }}>No registrado aún</div>
                    }
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Gramaje seco final (gr) *</label>
                    <input style={s.input} type="number" value={gramSeco} onChange={e=>setGramSeco(e.target.value)} placeholder="Ej: 120"/>
                  </div>
                </>
              )}

              {/* Responsable */}
              <div style={s.field}>
                <label style={s.label}>Responsable *</label>
                {responsables.length > 0 ? (
                  <div style={s.inputReadonly}>{responsables[0]}</div>
                ) : (
                  <div style={{ ...s.inputReadonly, color:'#9ca3af', fontWeight:400, fontSize:12 }}>
                    Sin rol de cultivador asignado
                  </div>
                )}
              </div>
            </div>

            {/* Ratio H/S */}
            {proximoRegistro?.value === 'procesado' && gramHumedoGuardado && gramSeco && (
              <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#3B6D11', marginBottom:12 }}>
                🧮 Ratio H/S: <strong>{((parseInt(gramSeco)/gramHumedoGuardado)*100).toFixed(1)}%</strong> · Se agregarán <strong>{gramSeco} gr</strong> al stock de {loteActual?.cepa||'—'}
              </div>
            )}

            {/* Indicador de campos faltantes */}
            {loteSeleccionado && !puedeGuardar && (
              <div style={{ background:'#FAEEDA', border:'1px solid #EF9F27', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#633806', marginBottom:12 }}>
                ⚠️ Completa todos los campos obligatorios para guardar:
                {responsables.length === 0 && <span> · Sin rol de cultivador asignado</span>}
                {proximoRegistro?.value === 'cosechado' && !gramHumedo && <span> · Gramaje húmedo</span>}
                {proximoRegistro?.value === 'procesado' && !gramSeco && <span> · Gramaje seco</span>}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => { setMostrarRegistro(false); setLoteSeleccionado(''); setGramHumedo(''); setGramSeco(''); setResponsableRegistro('') }}
                style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={registrarActualizacion} disabled={!puedeGuardar || guardando}
                style={{ padding:'7px 16px', border:'none', borderRadius:8, background: puedeGuardar && !guardando ? '#185FA5' : '#9ca3af', color:'#fff', fontSize:13, fontWeight:600, cursor: puedeGuardar && !guardando ? 'pointer' : 'not-allowed' }}>
                {guardando ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </div>
        )}

        {/* Lista lotes activos */}
        <div style={{ fontSize:13, fontWeight:600, marginBottom:12, paddingBottom:8, borderBottom:'1px solid #e5e7eb' }}>
          Lotes activos — {lotes.filter(l=>l.estado!=='procesado').length} en curso
        </div>

        {loading ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando lotes...</div>
        ) : lotes.filter(l=>l.estado!=='procesado').length === 0 ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>
            No hay lotes activos. Crea el primer lote con el botón "+ Nuevo lote".
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14, marginBottom:24 }}>
            {lotes.filter(l=>l.estado!=='procesado').map(lote => {
              const cfg = estadoConfig[lote.estado]
              const ratio = lote.gramaje_humedo && lote.gramaje_seco ? ((lote.gramaje_seco/lote.gramaje_humedo)*100).toFixed(1) : null
              const sigEstado = siguienteEstado[lote.estado]
              return (
                <div key={lote.id} style={{ border:`1px solid ${cfg.border}`, borderRadius:12, overflow:'hidden' }}>
                  <div style={{ background:cfg.bg, padding:'12px 14px', borderBottom:`1px solid ${cfg.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:cfg.color }}>{lote.codigo} · {lote.cepa}</div>
                      <div style={{ fontSize:11, color:cfg.color, opacity:0.8, marginTop:2 }}>
                        {lote.tipo_cultivo ? `${tipoCultivoIcon[lote.tipo_cultivo]} ${lote.tipo_cultivo.charAt(0).toUpperCase()+lote.tipo_cultivo.slice(1)}` : ''} · {lote.responsable||'—'}
                      </div>
                    </div>
                    <span style={{ fontSize:10, background:'rgba(255,255,255,0.7)', color:cfg.color, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{cfg.label}</span>
                  </div>
                  <div style={{ padding:'12px 14px' }}>
                    {[
                      { k:'Plantas', v:`${lote.plantas} plantas` },
                      { k:'Germinación', v:lote.fecha_germinacion||'—' },
                      { k:'Cosecha estimada', v:lote.cosecha_estimada||'—' },
                      ...(lote.gramaje_humedo ? [{k:'Gramaje húmedo',v:`${lote.gramaje_humedo} gr`}] : []),
                      ...(lote.gramaje_seco ? [{k:'Gramaje seco',v:`${lote.gramaje_seco} gr`}] : []),
                      ...(ratio ? [{k:'Ratio H/S',v:`${ratio}%`,color:'#3B6D11'}] : []),
                    ].map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>
                        <span style={{ color:'#6b7280' }}>{r.k}</span>
                        <span style={{ fontWeight:500, color:(r as any).color||'#111' }}>{r.v}</span>
                      </div>
                    ))}
                    {lote.notas && <div style={{ fontSize:11, color:'#9ca3af', marginTop:8, fontStyle:'italic' }}>📝 {lote.notas}</div>}
                    {/* Muestra el siguiente paso disponible */}
                    {sigEstado && (
                      <button onClick={() => { setLoteSeleccionado(lote.id); setGramHumedo(''); setGramSeco(''); setResponsableRegistro(''); setMostrarRegistro(true); setMostrarForm(false); setMostrarNuevaCepa(false) }}
                        style={{ marginTop:10, width:'100%', padding:'7px', border:`1px solid ${cfg.border}`, borderRadius:8, background:'transparent', color:cfg.color, fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        📝 Registrar: {sigEstado.label.split('(')[0].trim()}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lotes procesados */}
        {lotes.some(l=>l.estado==='procesado') && (
          <>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12, paddingBottom:8, borderBottom:'1px solid #e5e7eb', color:'#6b7280' }}>
              Lotes procesados — {lotes.filter(l=>l.estado==='procesado').length} completados
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
              {lotes.filter(l=>l.estado==='procesado').map(lote => {
                const ratio = lote.gramaje_humedo && lote.gramaje_seco ? ((lote.gramaje_seco/lote.gramaje_humedo)*100).toFixed(1) : null
                return (
                  <div key={lote.id} style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', opacity:0.85 }}>
                    <div style={{ background:'#f9fafb', padding:'10px 14px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{lote.codigo} · {lote.cepa}</div>
                        {lote.tipo_cultivo && <div style={{ fontSize:11, color:'#9ca3af' }}>{tipoCultivoIcon[lote.tipo_cultivo]} {lote.tipo_cultivo}</div>}
                      </div>
                      <span style={{ fontSize:10, background:'#EAF3DE', color:'#3B6D11', padding:'2px 8px', borderRadius:20 }}>✅ Procesado</span>
                    </div>
                    <div style={{ padding:'10px 14px' }}>
                      {[
                        {k:'Plantas',v:`${lote.plantas}`},
                        {k:'Gramaje húmedo',v:lote.gramaje_humedo?`${lote.gramaje_humedo} gr`:'—'},
                        {k:'Gramaje seco',v:lote.gramaje_seco?`${lote.gramaje_seco} gr`:'—'},
                        ...(ratio?[{k:'Ratio H/S',v:`${ratio}%`}]:[]),
                      ].map((r,i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>
                          <span style={{ color:'#6b7280' }}>{r.k}</span>
                          <span style={{ fontWeight:500 }}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
