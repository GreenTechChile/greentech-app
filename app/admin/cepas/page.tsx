'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Cepa {
  id: string
  nombre: string
  tipo: string
  thc_pct: number
  cbd_pct: number
  pct_indica?: number
  pct_sativa?: number
  efecto?: string
  horario?: string
  banco_semillas?: string
  descripcion?: string
  stock_gramos: number
  precio_gramo: number
  visible: boolean
  imagen_url?: string
  precio_modificado_por?: string
  precio_modificado_at?: string
}

const tipoOpciones = ['sativa', 'indica', 'hibrida', 'cbd']

const colorTipo: Record<string, { bg: string; color: string; border: string }> = {
  sativa:        { bg: '#EAF3DE', color: '#3B6D11', border: '#97C459' },
  indica:        { bg: '#EEEDFE', color: '#534AB7', border: '#A89FF0' },
  hibrida:       { bg: '#E6F1FB', color: '#185FA5', border: '#A8CBF0' },
  cbd:           { bg: '#FDF5E6', color: '#BA7517', border: '#EFC97A' },
  autoflowering: { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
}

export default function Cepas() {
  const [cepas, setCepas] = useState<Cepa[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)
  const [mostrarNuevaCepa, setMostrarNuevaCepa] = useState(false)

  const [form, setForm] = useState<Partial<Cepa>>({})
  const [imagenNueva, setImagenNueva] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  // Form nueva cepa
  const [ncNombre, setNcNombre] = useState('')
  const [ncTipo, setNcTipo] = useState('sativa')
  const [ncThc, setNcThc] = useState('')
  const [ncCbd, setNcCbd] = useState('')
  const [ncSativa, setNcSativa] = useState('')
  const [ncIndica, setNcIndica] = useState('')
  const [ncEfecto, setNcEfecto] = useState('')
  const [ncHorario, setNcHorario] = useState('')
  const [ncBanco, setNcBanco] = useState('')
  const [ncDescripcion, setNcDescripcion] = useState('')
  const [ncPrecioGramo, setNcPrecioGramo] = useState('')
  const [ncImagen, setNcImagen] = useState<File | null>(null)
  const [ncImagenPreview, setNcImagenPreview] = useState<string | null>(null)

  useEffect(() => { cargarCepas() }, [])

  const cargarCepas = async () => {
    setLoading(true)
    const { data } = await supabase.from('cepas').select('*').order('nombre')
    if (data) setCepas(data)
    setLoading(false)
  }

  const crearCepa = async () => {
    if (!ncNombre) { setMensaje('❌ El nombre es obligatorio'); return }
    setGuardando(true)
    const { data: { user: userActual } } = await supabase.auth.getUser()
    const nombreAdmin = userActual?.user_metadata?.nombre || userActual?.email || userActual?.user_metadata?.rut || 'Desconocido'
    let imagenUrl = null
    if (ncImagen) {
      const ext = ncImagen.name.split('.').pop()
      const path = `${ncNombre.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('cepas').upload(path, ncImagen, { upsert: true })
      if (uploadError) {
        setMensaje(`❌ Error al subir imagen: ${uploadError.message}`)
        setGuardando(false)
        return
      }
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
      descripcion: ncDescripcion || null,
      efecto: ncEfecto || null,
      horario: ncHorario || null,
      stock_gramos: 0,
      precio_gramo: parseInt(ncPrecioGramo) || 0,
      visible: true,
      imagen_url: imagenUrl,
      precio_modificado_por: nombreAdmin,
      precio_modificado_at: new Date().toISOString(),
    })
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      setMensaje(`✅ Cepa "${ncNombre}" creada`)
      setMostrarNuevaCepa(false)
      setNcNombre(''); setNcTipo('sativa'); setNcThc(''); setNcCbd('')
      setNcSativa(''); setNcIndica(''); setNcEfecto(''); setNcHorario('')
      setNcBanco(''); setNcPrecioGramo(''); setNcImagen(null); setNcImagenPreview(null)
        setNcDescripcion('')
      cargarCepas()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const iniciarEdicion = (cepa: Cepa) => {
    setEditando(cepa.id)
    setForm({ ...cepa })
    setImagenNueva(null)
    setImagenPreview(cepa.imagen_url || null)
    setConfirmEliminar(null)
    setMostrarNuevaCepa(false)
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setForm({})
    setImagenNueva(null)
    setImagenPreview(null)
  }

  const guardarCepa = async () => {
    if (!form.nombre) { setMensaje('❌ El nombre es obligatorio'); return }
    setGuardando(true)
    const { data: { user: userActual } } = await supabase.auth.getUser()
    const nombreAdmin = userActual?.user_metadata?.nombre || userActual?.email || userActual?.user_metadata?.rut || 'Desconocido'
    let imagen_url = form.imagen_url
    if (imagenNueva) {
      const ext = imagenNueva.name.split('.').pop()
      const path = `${form.nombre!.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('cepas').upload(path, imagenNueva, { upsert: true })
      if (uploadError) {
        setMensaje(`❌ Error al subir imagen: ${uploadError.message}`)
        setGuardando(false)
        return
      }
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('cepas').getPublicUrl(path)
        imagen_url = urlData?.publicUrl || imagen_url
      }
    }
    const { error } = await supabase.from('cepas').update({
      nombre: form.nombre, tipo: form.tipo,
      thc_pct: form.thc_pct ?? 0, cbd_pct: form.cbd_pct ?? 0,
      pct_indica: form.pct_indica ?? 0, pct_sativa: form.pct_sativa ?? 0,
      efecto: form.efecto || null, horario: form.horario || null,
      banco_semillas: form.banco_semillas || null,
      descripcion: form.descripcion || null,
      stock_gramos: form.stock_gramos ?? 0,
      precio_gramo: form.precio_gramo ?? 0,
      visible: form.visible, imagen_url,
    }).eq('id', editando!)
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      setMensaje(`✅ Cepa "${form.nombre}" actualizada`)
      cancelarEdicion()
      cargarCepas()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const toggleVisibilidad = async (cepa: Cepa) => {
    const { error } = await supabase.from('cepas').update({ visible: !cepa.visible }).eq('id', cepa.id)
    if (!error) { setMensaje(`${!cepa.visible ? '✅' : '⚠️'} Cepa "${cepa.nombre}" ${!cepa.visible ? 'activada' : 'desactivada'}`); cargarCepas(); setTimeout(() => setMensaje(''), 3000) }
  }

  const eliminarCepa = async (cepa: Cepa) => {
    // Verificar que no esté en uso en ningún lote (activo o procesado)
    const { data: lotes } = await supabase.from('lotes_cultivo').select('id').eq('cepa', cepa.nombre)
    if (lotes && lotes.length > 0) {
      setMensaje(`❌ No se puede eliminar "${cepa.nombre}" — está asignada a ${lotes.length} lote(s) de cultivo`)
      setConfirmEliminar(null)
      setTimeout(() => setMensaje(''), 4000)
      return
    }
    const { error } = await supabase.from('cepas').delete().eq('id', cepa.id)
    if (!error) { setMensaje(`🗑️ Cepa "${cepa.nombre}" eliminada`); setConfirmEliminar(null); cargarCepas(); setTimeout(() => setMensaje(''), 3000) }
  }

  const f = (field: keyof Cepa, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const cepasFiltradas = cepas.filter(c => {
    const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchBusqueda && matchTipo
  })

  const s = {
    input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    label: { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 },
    field: { display: 'flex', flexDirection: 'column' as const },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0, background: '#fff' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Gestión de cepas</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Administra el catálogo de cepas disponibles para dispensación</p>
          </div>
          <button onClick={() => { setMostrarNuevaCepa(!mostrarNuevaCepa); cancelarEdicion(); setConfirmEliminar(null) }}
            style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {mostrarNuevaCepa ? 'Cancelar' : '🌿 Nueva cepa'}
          </button>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : mensaje.startsWith('🗑️') ? '#f3f4f6' : '#FCEBEB', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : mensaje.startsWith('🗑️') ? '#d1d5db' : '#F5C5C5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : mensaje.startsWith('🗑️') ? '#374151' : '#A32D2D', marginBottom: 16 }}>
            {mensaje}
          </div>
        )}

        {/* Form nueva cepa */}
        {mostrarNuevaCepa && (
          <div style={{ border: '1px solid #C4B8F5', borderRadius: 12, padding: 18, marginBottom: 20, background: '#FAFAFE' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#534AB7' }}>🌿 Registrar nueva cepa</div>
            <div style={{ ...s.grid3, marginBottom: 12 }}>
              <div style={{ ...s.field, gridColumn: '1/-1' }}>
                <label style={s.label}>Nombre de la cepa *</label>
                <input style={s.input} value={ncNombre} onChange={e => setNcNombre(e.target.value)} placeholder="Ej: Jack 47 XL Auto" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Tipo</label>
                <select style={s.input} value={ncTipo} onChange={e => setNcTipo(e.target.value)}>
                  {tipoOpciones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Horario recomendado</label><input style={s.input} value={ncHorario} onChange={e => setNcHorario(e.target.value)} placeholder="Ej: Nocturno" /></div>
              <div style={s.field}><label style={s.label}>Efecto principal</label><input style={s.input} value={ncEfecto} onChange={e => setNcEfecto(e.target.value)} placeholder="Ej: Relajante" /></div>
              <div style={s.field}><label style={s.label}>THC %</label><input style={s.input} type="number" min="0" max="100" value={ncThc} onChange={e => setNcThc(e.target.value)} placeholder="0" /></div>
              <div style={s.field}><label style={s.label}>CBD %</label><input style={s.input} type="number" min="0" max="100" value={ncCbd} onChange={e => setNcCbd(e.target.value)} placeholder="0" /></div>
              <div style={s.field}><label style={s.label}>% Indica</label><input style={s.input} type="number" min="0" max="100" value={ncIndica} onChange={e => setNcIndica(e.target.value)} placeholder="0" /></div>
              <div style={s.field}><label style={s.label}>% Sativa</label><input style={s.input} type="number" min="0" max="100" value={ncSativa} onChange={e => setNcSativa(e.target.value)} placeholder="0" /></div>
              <div style={s.field}><label style={s.label}>Banco de semillas</label><input style={s.input} value={ncBanco} onChange={e => setNcBanco(e.target.value)} placeholder="Ej: Royal Queen Seeds" /></div>

              {/* Precio por gramo — campo único */}
              <div style={{ ...s.field, gridColumn: '1/-1' }}>
                <label style={s.label}>Precio por gramo ($) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input style={{ ...s.input, maxWidth: 200 }} type="number" min="0" value={ncPrecioGramo} onChange={e => setNcPrecioGramo(e.target.value)} placeholder="Ej: 8000" />
                </div>
              </div>
            </div>

            {/* Imagen */}
            <div style={{ ...s.field, marginBottom: 14 }}>
              <label style={s.label}>Imagen de la flor (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 80, height: 80, borderRadius: 10, border: '1px dashed #d1d5db', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => document.getElementById('nc-imagen')?.click()}>
                  {ncImagenPreview ? <img src={ncImagenPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🌿</span>}
                </div>
                <div>
                  <button type="button" onClick={() => document.getElementById('nc-imagen')?.click()}
                    style={{ padding: '7px 16px', border: '1px solid #534AB7', borderRadius: 8, background: 'transparent', color: '#534AB7', fontSize: 12, cursor: 'pointer' }}>
                    {ncImagen ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG · máx. 5 MB</div>
                  {ncImagen && <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 2 }}>✓ {ncImagen.name}</div>}
                </div>
                <input id="nc-imagen" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const file = e.target.files?.[0]; if (file) { setNcImagen(file); const reader = new FileReader(); reader.onload = ev => setNcImagenPreview(ev.target?.result as string); reader.readAsDataURL(file) } }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setMostrarNuevaCepa(false)} style={{ padding: '7px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearCepa} disabled={guardando} style={{ padding: '7px 20px', border: 'none', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Crear cepa'}
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <input style={{ ...s.input, maxWidth: 260 }} placeholder="🔍 Buscar cepa..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={{ ...s.input, width: 'auto' }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {tipoOpciones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{cepasFiltradas.length} cepa{cepasFiltradas.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando cepas...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cepasFiltradas.map(cepa => {
              const cfg = colorTipo[cepa.tipo] || colorTipo.sativa
              const estaEditando = editando === cepa.id
              return (
                <div key={cepa.id} style={{ border: `1px solid ${estaEditando ? cfg.border : '#e5e7eb'}`, borderRadius: 14, overflow: 'hidden', opacity: cepa.visible ? 1 : 0.6 }}>

                  {/* Fila resumen */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: estaEditando ? cfg.bg : '#fff' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${cfg.border}` }}>
                      {cepa.imagen_url ? <img src={cepa.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>🌿</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{cepa.nombre}</span>
                        <span style={{ fontSize: 10, background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 20, border: `1px solid ${cfg.border}`, fontWeight: 500 }}>
                          {cepa.tipo.charAt(0).toUpperCase() + cepa.tipo.slice(1)}
                        </span>
                        {!cepa.visible && <span style={{ fontSize: 10, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 20 }}>Oculta en catálogo</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                        <span>THC {cepa.thc_pct}% · CBD {cepa.cbd_pct}%</span>
                        {cepa.pct_indica ? <span>Indica {cepa.pct_indica}%</span> : null}
                        {cepa.pct_sativa ? <span>Sativa {cepa.pct_sativa}%</span> : null}
                        <span style={{ color: cepa.stock_gramos > 0 ? '#3B6D11' : '#A32D2D', fontWeight: 500 }}>Stock: {cepa.stock_gramos} gr</span>
                      </div>
                    </div>
                    {/* Precio por gramo destacado */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>precio/gr</div>
                      ${(cepa.precio_gramo || 0).toLocaleString('es-CL')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleVisibilidad(cepa)} title={cepa.visible ? 'Ocultar' : 'Mostrar'}
                        style={{ padding: '6px 10px', border: `1px solid ${cepa.visible ? '#97C459' : '#d1d5db'}`, borderRadius: 8, background: cepa.visible ? '#EAF3DE' : '#f9fafb', color: cepa.visible ? '#3B6D11' : '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                        {cepa.visible ? '👁️' : '🙈'}
                      </button>
                      <button onClick={() => estaEditando ? cancelarEdicion() : iniciarEdicion(cepa)}
                        style={{ padding: '6px 12px', border: `1px solid ${estaEditando ? cfg.border : '#e5e7eb'}`, borderRadius: 8, background: estaEditando ? cfg.bg : '#fff', color: estaEditando ? cfg.color : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                        {estaEditando ? 'Cancelar' : '✏️ Editar'}
                      </button>
                      {!estaEditando && (
                        <button onClick={() => setConfirmEliminar(confirmEliminar === cepa.id ? null : cepa.id)}
                          style={{ padding: '6px 10px', border: '1px solid #F5C5C5', borderRadius: 8, background: '#fff', color: '#A32D2D', fontSize: 13, cursor: 'pointer' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirmar eliminación */}
                  {confirmEliminar === cepa.id && !estaEditando && (
                    <div style={{ background: '#FCEBEB', borderTop: '1px solid #F5C5C5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#A32D2D' }}>⚠️ ¿Eliminar definitivamente <strong>{cepa.nombre}</strong>?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setConfirmEliminar(null)} style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={() => eliminarCepa(cepa)} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: '#A32D2D', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    </div>
                  )}

                  {/* Form edición */}
                  {estaEditando && (
                    <div style={{ borderTop: `1px solid ${cfg.border}`, padding: '18px 16px', background: '#fafafa' }}>
                      <div style={{ ...s.grid3, marginBottom: 12 }}>
                        <div style={{ ...s.field, gridColumn: '1/-1' }}><label style={s.label}>Nombre *</label><input style={s.input} value={form.nombre || ''} onChange={e => f('nombre', e.target.value)} /></div>
                        <div style={s.field}><label style={s.label}>Tipo</label>
                          <select style={s.input} value={form.tipo || 'sativa'} onChange={e => f('tipo', e.target.value)}>
                            {tipoOpciones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div style={s.field}><label style={s.label}>Horario</label><input style={s.input} value={form.horario || ''} onChange={e => f('horario', e.target.value)} /></div>
                        <div style={s.field}><label style={s.label}>Efecto</label><input style={s.input} value={form.efecto || ''} onChange={e => f('efecto', e.target.value)} /></div>
                        <div style={s.field}><label style={s.label}>THC %</label><input style={s.input} type="number" value={form.thc_pct ?? ''} onChange={e => f('thc_pct', parseFloat(e.target.value) || 0)} /></div>
                        <div style={s.field}><label style={s.label}>CBD %</label><input style={s.input} type="number" value={form.cbd_pct ?? ''} onChange={e => f('cbd_pct', parseFloat(e.target.value) || 0)} /></div>
                        <div style={s.field}><label style={s.label}>% Indica</label><input style={s.input} type="number" value={form.pct_indica ?? ''} onChange={e => f('pct_indica', parseFloat(e.target.value) || 0)} /></div>
                        <div style={s.field}><label style={s.label}>% Sativa</label><input style={s.input} type="number" value={form.pct_sativa ?? ''} onChange={e => f('pct_sativa', parseFloat(e.target.value) || 0)} /></div>
                        <div style={s.field}><label style={s.label}>Banco de semillas</label><input style={s.input} value={form.banco_semillas || ''} onChange={e => f('banco_semillas', e.target.value)} /></div>
                        <div style={s.field}><label style={s.label}>Stock (gr)</label><input style={s.input} type="number" value={form.stock_gramos ?? ''} onChange={e => f('stock_gramos', parseInt(e.target.value) || 0)} /></div>

                        {/* Descripción */}
                        <div style={{ ...s.field, gridColumn: '1/-1' }}>
                          <label style={s.label}>Descripción de la cepa</label>
                          <textarea
                            style={{ ...s.input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                            value={form.descripcion || ''}
                            onChange={e => f('descripcion', e.target.value)}
                            placeholder="Describe las características, efectos, aroma, sabor y uso terapéutico de la cepa..."
                          />
                        </div>

                        {/* Precio por gramo */}
                        <div style={{ ...s.field, gridColumn: '1/-1' }}>
                          <label style={s.label}>Precio por gramo ($)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input style={{ ...s.input, maxWidth: 200 }} type="number" value={form.precio_gramo ?? ''} onChange={e => f('precio_gramo', parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                      </div>

                      {/* Imagen */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={s.label}>Imagen de la flor</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 72, height: 72, borderRadius: 10, border: '1px dashed #d1d5db', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => document.getElementById(`img-${cepa.id}`)?.click()}>
                            {imagenPreview ? <img src={imagenPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🌿</span>}
                          </div>
                          <div>
                            <button type="button" onClick={() => document.getElementById(`img-${cepa.id}`)?.click()}
                              style={{ padding: '6px 14px', border: `1px solid ${cfg.border}`, borderRadius: 8, background: 'transparent', color: cfg.color, fontSize: 12, cursor: 'pointer' }}>
                              {imagenNueva ? 'Cambiar imagen' : 'Subir nueva imagen'}
                            </button>
                            {imagenNueva && <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 4 }}>✓ {imagenNueva.name}</div>}
                          </div>
                          <input id={`img-${cepa.id}`} type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => { const file = e.target.files?.[0]; if (file) { setImagenNueva(file); const reader = new FileReader(); reader.onload = ev => setImagenPreview(ev.target?.result as string); reader.readAsDataURL(file) } }} />
                        </div>
                      </div>

                      {/* Visibilidad */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: form.visible ? '#EAF3DE' : '#f9fafb', border: `1px solid ${form.visible ? '#97C459' : '#e5e7eb'}`, borderRadius: 8 }}>
                        <input type="checkbox" id={`vis-${cepa.id}`} checked={!!form.visible} onChange={e => f('visible', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <label htmlFor={`vis-${cepa.id}`} style={{ fontSize: 13, cursor: 'pointer', color: form.visible ? '#3B6D11' : '#6b7280', fontWeight: 500 }}>
                          {form.visible ? '👁️ Visible en el catálogo de dispensación' : '🙈 Oculta — no aparece en el catálogo'}
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={cancelarEdicion} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={guardarCepa} disabled={guardando} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: cfg.color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
