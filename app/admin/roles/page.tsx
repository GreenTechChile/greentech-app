'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Socio {
  id: string
  rut: string
  nombre: string
  email: string
  estado: string
  rol: 'socio' | 'admin' | 'ambos'
  created_at: string
}

const rolConfig = {
  socio:  { label: 'Solo socio',        bg: '#EAF3DE', color: '#3B6D11' },
  admin:  { label: 'Solo administrador', bg: '#E6F1FB', color: '#185FA5' },
  ambos:  { label: 'Socio + Admin',      bg: '#EEEDFE', color: '#534AB7' },
}

export default function Roles() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { cargarSocios() }, [])

  const cargarSocios = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('socios')
      .select('id, rut, nombre, email, estado, rol, created_at')
      .order('nombre')
    if (data) setSocios(data)
    setLoading(false)
  }

  const cambiarRol = async (socio: Socio, nuevoRol: Socio['rol']) => {
    if (socio.rol === nuevoRol) return
    const confirmar = window.confirm(
      `¿Cambiar el rol de ${socio.nombre.split(' ')[0]} de "${rolConfig[socio.rol].label}" a "${rolConfig[nuevoRol].label}"?\n\nEste cambio es efectivo de inmediato.`
    )
    if (!confirmar) return
    setGuardando(socio.id)
    const { error } = await supabase.from('socios').update({ rol: nuevoRol }).eq('id', socio.id)
    if (error) {
      setMensaje('❌ Error al actualizar el rol')
    } else {
      setSocios(prev => prev.map(s => s.id === socio.id ? { ...s, rol: nuevoRol } : s))
      setMensaje(`✅ Rol de ${socio.nombre.split(' ')[0]} actualizado a "${rolConfig[nuevoRol].label}"`)
    }
    setGuardando(null)
    setTimeout(() => setMensaje(''), 3000)
  }

  const sociosFiltrados = socios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.rut.includes(busqueda) ||
    s.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalAdmins = socios.filter(s => s.rol === 'admin' || s.rol === 'ambos').length
  const totalSocios = socios.filter(s => s.rol === 'socio' || s.rol === 'ambos').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#fff' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Usuarios y roles</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Gestiona los permisos de acceso de cada socio al sistema</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#EAF3DE' : '#FCEBEB', border: `1px solid ${mensaje.startsWith('✅') ? '#97C459' : '#F5C5C5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#3B6D11' : '#A32D2D', marginBottom: 16 }}>
            {mensaje}
          </div>
        )}

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total usuarios', value: `${socios.length}`, sub: 'registrados en el sistema' },
            { label: 'Con acceso de socio', value: `${totalSocios}`, sub: 'pueden dispensar', color: '#3B6D11' },
            { label: 'Con acceso admin', value: `${totalAdmins}`, sub: 'pueden administrar', color: '#185FA5' },
            { label: 'Usuarios activos', value: `${socios.filter(s => s.estado === 'activo').length}`, sub: 'con login habilitado', color: '#3B6D11' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: m.color || '#111' }}>{m.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Info sobre roles */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { rol: 'socio', icon: '🌿', titulo: 'Solo socio', desc: 'Puede dispensar, ver su historial, documentos y perfil. No tiene acceso al panel administrativo.' },
            { rol: 'admin', icon: '🛡️', titulo: 'Solo administrador', desc: 'Accede al panel de administración completo pero no puede realizar dispensaciones como socio.' },
            { rol: 'ambos', icon: '⚡', titulo: 'Socio + Administrador', desc: 'Acceso completo: puede dispensar como socio y también administrar el sistema.' },
          ].map(r => (
            <div key={r.rol} style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{r.titulo}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', marginBottom: 16, background: '#fff', maxWidth: 360 }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>🔍</span>
          <input type="text" placeholder="Buscar por nombre, RUT o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', background: 'transparent', color: '#374151' }} />
        </div>

        {/* Tabla de usuarios */}
        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando usuarios...</div>
        ) : sociosFiltrados.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 12 }}>
            No se encontraron usuarios
          </div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Usuario', 'RUT', 'Estado', 'Rol actual', 'Cambiar rol'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sociosFiltrados.map(socio => {
                  const rc = rolConfig[socio.rol] || rolConfig.socio
                  const cargando = guardando === socio.id
                  return (
                    <tr key={socio.id} style={{ borderBottom: '1px solid #f3f4f6' }}>

                      {/* Usuario */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#3B6D11', flexShrink: 0 }}>
                            {socio.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{socio.nombre}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{socio.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* RUT */}
                      <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>{socio.rut}</td>

                      {/* Estado */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: socio.estado === 'activo' ? '#EAF3DE' : '#f3f4f6', color: socio.estado === 'activo' ? '#3B6D11' : '#9ca3af' }}>
                          {socio.estado === 'activo' ? '● Activo' : socio.estado}
                        </span>
                      </td>

                      {/* Rol actual */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: rc.bg, color: rc.color, fontWeight: 500 }}>
                          {rc.label}
                        </span>
                      </td>

                      {/* Selectores de rol */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['socio', 'admin', 'ambos'] as const).map(r => (
                            <button key={r} onClick={() => cambiarRol(socio, r)} disabled={cargando}
                              style={{
                                padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: cargando ? 'not-allowed' : 'pointer',
                                border: `1px solid ${socio.rol === r ? rolConfig[r].color : '#e5e7eb'}`,
                                background: socio.rol === r ? rolConfig[r].bg : '#fff',
                                color: socio.rol === r ? rolConfig[r].color : '#6b7280',
                                fontWeight: socio.rol === r ? 600 : 400,
                                opacity: cargando ? 0.6 : 1,
                                transition: '0.15s',
                              }}>
                              {r === 'socio' ? '🌿 Socio' : r === 'admin' ? '🛡️ Admin' : '⚡ Ambos'}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Advertencia */}
        <div style={{ marginTop: 16, background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          ⚠️ <strong>Importante:</strong> Los cambios de rol son efectivos de inmediato. Asigna el rol de administrador solo a personas de confianza de la directiva.
          Un administrador tiene acceso a todos los datos de la corporación, socios y dispensaciones.
        </div>

      </main>
    </div>
  )
}
