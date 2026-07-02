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
  rol_socio: boolean
  rol_admin: boolean
  rol_cultivador: boolean
  rol_despachador: boolean
  created_at: string
}

type RolKey = 'rol_socio' | 'rol_admin' | 'rol_cultivador' | 'rol_despachador'

const roles: { key: RolKey; label: string; icon: string; bg: string; color: string; desc: string }[] = [
  { key: 'rol_socio',       label: 'Socio',       icon: '🌿', bg: '#e0f2fe', color: '#0369a1', desc: 'Puede dispensar, ver historial, documentos y perfil.' },
  { key: 'rol_admin',       label: 'Admin',       icon: '🛡️', bg: '#E6F1FB', color: '#185FA5', desc: 'Acceso completo al panel de administración.' },
  { key: 'rol_cultivador',  label: 'Cultivador',  icon: '🌱', bg: '#FDF5E6', color: '#BA7517', desc: 'Acceso al módulo de cultivo: plantas, gramaje húmedo y seco.' },
  { key: 'rol_despachador', label: 'Despachador', icon: '📦', bg: '#FDE8F0', color: '#A32D6B', desc: 'Acceso al módulo de despachos y seguimiento de envíos.' },
]

export default function Roles() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { cargarSocios() }, [])

  const cargarSocios = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('socios')
      .select('id, rut, nombre, email, estado, rol_socio, rol_admin, rol_cultivador, rol_despachador, created_at')
      .eq('estado', 'activo')
      .order('nombre')
    if (data) setSocios(data)
    setLoading(false)
  }

  const toggleRol = async (socio: Socio, rolKey: RolKey) => {
    const nuevoValor = !socio[rolKey]
    const rolLabel = roles.find(r => r.key === rolKey)?.label || rolKey
    const accion = nuevoValor ? 'activar' : 'desactivar'

    const confirmar = window.confirm(
      `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el rol "${rolLabel}" para ${socio.nombre.split(' ')[0]}?\n\nEste cambio es efectivo de inmediato.`
    )
    if (!confirmar) return

    setGuardando(socio.id + rolKey)
    const { error } = await supabase
      .from('socios')
      .update({ [rolKey]: nuevoValor })
      .eq('id', socio.id)

    if (error) {
      setMensaje('❌ Error al actualizar el rol')
    } else {
      setSocios(prev => prev.map(s => s.id === socio.id ? { ...s, [rolKey]: nuevoValor } : s))
      setMensaje(`✅ Rol "${rolLabel}" ${nuevoValor ? 'activado' : 'desactivado'} para ${socio.nombre.split(' ')[0]}`)
    }
    setGuardando(null)
    setTimeout(() => setMensaje(''), 3000)
  }

  const sociosFiltrados = socios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.rut.includes(busqueda) ||
    s.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0, background: '#fff' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}>Usuarios y roles</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Gestiona los permisos de acceso de cada socio al sistema</p>
        </div>

        {mensaje && (
          <div style={{ background: mensaje.startsWith('✅') ? '#e0f2fe' : '#FCEBEB', border: `1px solid ${mensaje.startsWith('✅') ? '#7dd3fc' : '#F5C5C5'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: mensaje.startsWith('✅') ? '#0369a1' : '#A32D2D', marginBottom: 16 }}>
            {mensaje}
          </div>
        )}

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total',           value: socios.length,                                    sub: 'usuarios',           color: '#111'    },
            { label: 'Socios',          value: socios.filter(s => s.rol_socio).length,           sub: 'pueden dispensar',   color: '#0369a1' },
            { label: 'Admins',          value: socios.filter(s => s.rol_admin).length,           sub: 'acceso admin',       color: '#185FA5' },
            { label: 'Cultivadores',    value: socios.filter(s => s.rol_cultivador).length,      sub: 'acceso a cultivo',   color: '#BA7517' },
            { label: 'Despachadores',   value: socios.filter(s => s.rol_despachador).length,     sub: 'acceso a despachos', color: '#A32D6B' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: isMobile ? '10px' : '14px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Info sobre roles */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          {roles.map(r => (
            <div key={r.key} style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: r.color }}>{r.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', marginBottom: 16, background: '#fff', maxWidth: isMobile ? '100%' : 360 }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>🔍</span>
          <input type="text" placeholder="Buscar por nombre, RUT o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', background: 'transparent', color: '#374151' }} />
        </div>

        {/* Tabla / Cards */}
        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center' }}>Cargando usuarios...</div>
        ) : sociosFiltrados.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 40, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 12 }}>
            No se encontraron usuarios
          </div>
        ) : isMobile ? (
          /* Cards en móvil */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sociosFiltrados.map(socio => (
              <div key={socio.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff' }}>
                {/* Header usuario */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0369a1', flexShrink: 0 }}>
                    {socio.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{socio.nombre}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{socio.rut}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#e0f2fe', color: '#0369a1', flexShrink: 0 }}>● Activo</span>
                </div>
                {/* Roles en grid 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {roles.map(r => {
                    const activo = socio[r.key]
                    const cargando = guardando === socio.id + r.key
                    return (
                      <button
                        key={r.key}
                        onClick={() => toggleRol(socio, r.key)}
                        disabled={cargando}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 10px', borderRadius: 8, cursor: cargando ? 'not-allowed' : 'pointer',
                          border: `1px solid ${activo ? r.color : '#e5e7eb'}`,
                          background: activo ? r.bg : '#f9fafb',
                          color: activo ? r.color : '#9ca3af',
                          fontSize: 12, fontWeight: activo ? 600 : 400,
                          opacity: cargando ? 0.6 : 1,
                          transition: '0.15s',
                          textAlign: 'left',
                        }}>
                        <span style={{ fontSize: 14 }}>{r.icon}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{r.label}</div>
                          <div style={{ fontSize: 10 }}>{cargando ? '...' : activo ? '● Activo' : '○ Inactivo'}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tabla en desktop */
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Usuario', 'RUT', 'Estado', ...roles.map(r => r.icon + ' ' + r.label)].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sociosFiltrados.map(socio => (
                  <tr key={socio.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0369a1', flexShrink: 0 }}>
                          {socio.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{socio.nombre}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{socio.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>{socio.rut}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: socio.estado === 'activo' ? '#e0f2fe' : '#f3f4f6', color: socio.estado === 'activo' ? '#0369a1' : '#9ca3af' }}>
                        {socio.estado === 'activo' ? '● Activo' : socio.estado}
                      </span>
                    </td>
                    {roles.map(r => {
                      const activo = socio[r.key]
                      const cargando = guardando === socio.id + r.key
                      return (
                        <td key={r.key} style={{ padding: '12px 14px' }}>
                          <button
                            onClick={() => toggleRol(socio, r.key)}
                            disabled={cargando}
                            title={activo ? `Desactivar ${r.label}` : `Activar ${r.label}`}
                            style={{
                              padding: '5px 12px', fontSize: 11, borderRadius: 20, cursor: cargando ? 'not-allowed' : 'pointer',
                              border: `1px solid ${activo ? r.color : '#e5e7eb'}`,
                              background: activo ? r.bg : '#fff',
                              color: activo ? r.color : '#9ca3af',
                              fontWeight: activo ? 600 : 400,
                              opacity: cargando ? 0.6 : 1,
                              transition: '0.15s',
                              minWidth: 70,
                            }}>
                            {cargando ? '...' : activo ? '● Activo' : '○ Inactivo'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
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
