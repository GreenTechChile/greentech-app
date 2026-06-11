'use client'
import { useState, useEffect } from 'react'
import SidebarSocio from '@/components/socio/SidebarSocio'
import { supabase } from '@/lib/supabase'

interface SocioData {
  nombre: string; rut: string; email: string; telefono: string
  profesion: string; fecha_nacimiento: string; estado_civil: string
  direccion: string; casa_depto: string; comuna: string; ciudad: string
  rol: string; estado: string; created_at: string
  folio_receta: string; vencimiento_receta: string; medico_nombre: string; diagnostico: string
}

export default function MiPerfil() {
  const [socio, setSocio] = useState<SocioData | null>(null)
  const [rutActual, setRutActual] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<'personal' | 'domicilio' | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [profesion, setProfesion] = useState('')
  const [direccion, setDireccion] = useState('')
  const [casaDepto, setCasaDepto] = useState('')
  const [comuna, setComuna] = useState('')
  const [ciudad, setCiudad] = useState('')

  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [cambiandoPw, setCambiandoPw] = useState(false)

  const [notifDispensacion, setNotifDispensacion] = useState(true)
  const [notifDespacho, setNotifDespacho] = useState(true)
  const [notifReceta, setNotifReceta] = useState(true)
  const [notifBoletin, setNotifBoletin] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      let rut = ''
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        if (keys.length > 0) {
          const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
          rut = token?.user?.user_metadata?.rut || ''
        }
      } catch {}

      if (!rut) { setLoading(false); return }
      setRutActual(rut)

      const { data } = await supabase.from('socios').select('*').eq('rut', rut).single()
      if (data) {
        setSocio(data)
        setTelefono(data.telefono || '')
        setEmail(data.email || '')
        setProfesion(data.profesion || '')
        setDireccion(data.direccion || '')
        setCasaDepto(data.casa_depto || '')
        setComuna(data.comuna || '')
        setCiudad(data.ciudad || '')
      }
      setLoading(false)
    }
    cargar()
  }, [])

  const guardarPerfil = async () => {
    setGuardando(true)
    const campos = editando === 'personal'
      ? { telefono, email, profesion }
      : { direccion, casa_depto: casaDepto, comuna, ciudad }
    const { error } = await supabase.from('socios').update(campos).eq('rut', rutActual)
    if (error) setMensaje('❌ Error al guardar: ' + error.message)
    else {
      setMensaje('✅ Cambios guardados correctamente')
      setEditando(null)
      setSocio(prev => prev ? { ...prev, ...campos } : prev)
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cambiarPassword = async () => {
    if (pwNueva !== pwConfirm) { setMensaje('❌ Las contraseñas no coinciden'); return }
    if (pwNueva.length < 8) { setMensaje('❌ La contraseña debe tener al menos 8 caracteres'); return }
    setCambiandoPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwNueva })
    if (error) setMensaje('❌ Error al cambiar la contraseña')
    else { setMensaje('✅ Contraseña actualizada correctamente'); setPwActual(''); setPwNueva(''); setPwConfirm('') }
    setCambiandoPw(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const s = {
    input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    inputDisabled: { width: '100%', padding: '8px 10px', border: '1px solid #f3f4f6', borderRadius: 8, fontSize: 13, background: '#f9fafb', color: '#374151', boxSizing: 'border-box' as const },
    label: { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 },
    field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 16 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  }

  const Toggle = ({ on, onChange }: { on: boolean, onChange: () => void }) => (
    <div onClick={onChange} style={{ width: 36, height: 20, borderRadius: 10, background: on ? '#3B6D11' : '#d1d5db', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: '0.2s' }}>
      <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: on ? 18 : 2, transition: '0.2s' }} />
    </div>
  )

  if (loading || !socio) return (
    <div style={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center', fontSize:13, color:'#9ca3af' }}>Cargando...</div>
  )

  const iniciales = socio.nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
  const fechaIncorporacion = new Date(socio.created_at).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarSocio nombre={socio.nombre} rut={socio.rut} />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f9fafb' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Mi perfil</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Administra tus datos personales, contraseña y preferencias</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : '#F5C5C5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : '#A32D2D', marginBottom: 16 }}>
            {mensaje}
          </div>
        )}

        {/* Avatar y resumen */}
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#3B6D11', flexShrink: 0 }}>
            {iniciales}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{socio.nombre}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>RUT {socio.rut} · {socio.email} · Socio desde {fechaIncorporacion}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 10, background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20 }}>● Activo</span>
              <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 20 }}>Socio</span>
              {(socio.rol === 'admin' || socio.rol === 'ambos') && (
                <span style={{ fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 20 }}>Administrador</span>
              )}
              <span style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 20 }}>Incorporado {fechaIncorporacion}</span>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Datos personales</span>
            <button onClick={() => setEditando(editando === 'personal' ? null : 'personal')}
              style={{ fontSize: 12, color: '#3B6D11', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✏️ {editando === 'personal' ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          <div style={s.grid2}>
            <div style={s.field}><label style={s.label}>Nombre completo</label><input style={s.inputDisabled} value={socio.nombre} disabled /></div>
            <div style={s.field}><label style={s.label}>RUT</label><input style={s.inputDisabled} value={socio.rut} disabled /></div>
            {socio.fecha_nacimiento && <div style={s.field}><label style={s.label}>Fecha de nacimiento</label><input style={s.inputDisabled} value={new Date(socio.fecha_nacimiento).toLocaleDateString('es-CL')} disabled /></div>}
            {socio.estado_civil && <div style={s.field}><label style={s.label}>Estado civil</label><input style={s.inputDisabled} value={socio.estado_civil} disabled /></div>}
            <div style={s.field}>
              <label style={s.label}>Profesión</label>
              <input style={editando === 'personal' ? s.input : s.inputDisabled} value={profesion} onChange={e => setProfesion(e.target.value)} disabled={editando !== 'personal'} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Teléfono</label>
              <input style={editando === 'personal' ? s.input : s.inputDisabled} value={telefono} onChange={e => setTelefono(e.target.value)} disabled={editando !== 'personal'} />
            </div>
            <div style={{ ...s.field, gridColumn: '1/-1' }}>
              <label style={s.label}>Correo electrónico</label>
              <input style={editando === 'personal' ? s.input : s.inputDisabled} value={email} onChange={e => setEmail(e.target.value)} disabled={editando !== 'personal'} />
            </div>
          </div>
          {editando === 'personal' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={guardarPerfil} disabled={guardando}
                style={{ padding: '7px 18px', background: guardando ? '#9ca3af' : '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>

        {/* Domicilio */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Domicilio</span>
            <button onClick={() => setEditando(editando === 'domicilio' ? null : 'domicilio')}
              style={{ fontSize: 12, color: '#3B6D11', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✏️ {editando === 'domicilio' ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          <div style={s.grid2}>
            <div style={{ ...s.field, gridColumn: '1/-1' }}>
              <label style={s.label}>Calle y número</label>
              <input style={editando === 'domicilio' ? s.input : s.inputDisabled} value={direccion} onChange={e => setDireccion(e.target.value)} disabled={editando !== 'domicilio'} />
            </div>
            <div style={{ ...s.field, gridColumn: '1/-1' }}>
              <label style={s.label}>Casa / Departamento</label>
              <input style={editando === 'domicilio' ? s.input : s.inputDisabled} value={casaDepto} onChange={e => setCasaDepto(e.target.value)} disabled={editando !== 'domicilio'} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Comuna</label>
              <input style={editando === 'domicilio' ? s.input : s.inputDisabled} value={comuna} onChange={e => setComuna(e.target.value)} disabled={editando !== 'domicilio'} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Ciudad</label>
              <input style={editando === 'domicilio' ? s.input : s.inputDisabled} value={ciudad} onChange={e => setCiudad(e.target.value)} disabled={editando !== 'domicilio'} />
            </div>
          </div>
          {editando === 'domicilio' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={guardarPerfil} disabled={guardando}
                style={{ padding: '7px 18px', background: guardando ? '#9ca3af' : '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>🔒 Cambiar contraseña</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={s.field}>
              <label style={s.label}>Contraseña actual</label>
              <input type="password" style={s.input} value={pwActual} onChange={e => setPwActual(e.target.value)} placeholder="••••••••" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Nueva contraseña</label>
              <input type="password" style={s.input} value={pwNueva} onChange={e => setPwNueva(e.target.value)} placeholder="••••••••" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirmar nueva</label>
              <input type="password" style={s.input} value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button onClick={cambiarPassword} disabled={cambiandoPw || !pwActual || !pwNueva || !pwConfirm}
            style={{ padding: '7px 16px', background: cambiandoPw || !pwActual ? '#9ca3af' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {cambiandoPw ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </div>

        {/* Notificaciones */}
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>🔔 Notificaciones</div>
          {[
            { label: 'Confirmación de dispensación', desc: 'Recibe un correo cuando se confirme tu pago', on: notifDispensacion, toggle: () => setNotifDispensacion(!notifDispensacion) },
            { label: 'Estado del despacho', desc: 'Notificaciones cuando tu pedido sea preparado y despachado', on: notifDespacho, toggle: () => setNotifDespacho(!notifDespacho) },
            { label: 'Alerta de vencimiento de receta', desc: 'Aviso 60 y 30 días antes de que venza tu receta médica', on: notifReceta, toggle: () => setNotifReceta(!notifReceta) },
            { label: 'Boletín mensual de la corporación', desc: 'Novedades y comunicados de GreenTech', on: notifBoletin, toggle: () => setNotifBoletin(!notifBoletin) },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{n.desc}</div>
              </div>
              <Toggle on={n.on} onChange={n.toggle} />
            </div>
          ))}
        </div>

        {/* Zona crítica */}
        <div style={{ background: '#FFF8F8', border: '1px solid #F5C5C5', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#A32D2D', marginBottom: 6 }}>⚠️ Zona de acciones críticas</div>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>
            Estas acciones son irreversibles o requieren aprobación de la directiva.
          </p>
          <button style={{ padding: '7px 16px', border: '1px solid #A32D2D', borderRadius: 8, background: 'transparent', color: '#A32D2D', fontSize: 13, cursor: 'pointer' }}>
            Solicitar baja como socio
          </button>
        </div>

      </main>
    </div>
  )
}
