'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const sections = [
  { label: 'Principal', items: [{ href: '/admin', label: 'Panel general', icon: '📊' }] },
  { label: 'Socios', items: [
    { href: '/admin/socios', label: 'Nuevos socios', icon: '👤' },
    { href: '/admin/roles', label: 'Usuarios y roles', icon: '🛡️' },
  ]},
  { label: 'Operaciones', items: [
    { href: '/admin/despachos', label: 'Despachos', icon: '🚚' },
    { href: '/admin/cepas', label: 'Cepas', icon: '🌿' },
    { href: '/admin/cultivo', label: 'Cultivo', icon: '🌱' },
    { href: '/admin/inventario', label: 'Inventario', icon: '📦' },
  ]},
  { label: 'Administración', items: [
    { href: '/admin/finanzas', label: 'Finanzas', icon: '💰' },
    { href: '/admin/contratos', label: 'Contratos', icon: '📋' },
    { href: '/admin/trazabilidad', label: 'Trazabilidad', icon: '🔒' },
    { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
  ]},
]

export default function SidebarAdmin() {
  const pathname = usePathname()
  const router = useRouter()
  const [esSocio, setEsSocio] = useState(false)
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (keys.length === 0) return
      const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
      const rutUsuario = token?.user?.user_metadata?.rut
      if (!rutUsuario) return
      supabase.from('socios').select('rol,nombre,rut').eq('rut', rutUsuario).single()
        .then(({ data }) => {
          if (data?.nombre) setNombre(data.nombre.split(' ')[0])
          if (data?.rut) setRut(data.rut)
          if (data?.rol === 'ambos') setEsSocio(true)
        })
    } catch {}
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '16px 0', background: '#f9fafb', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Logo */}
      <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #e5e7eb', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, background: '#E6F1FB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
        </div>
        <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 7px', borderRadius: 20 }}>Administrador</span>
      </div>

      {/* Nav */}
      {sections.map(section => (
        <div key={section.label}>
          <div style={{ fontSize: 10, color: '#9ca3af', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', fontSize: 13,
                color: active ? '#185FA5' : '#6b7280',
                fontWeight: active ? 600 : 400,
                background: active ? '#fff' : 'transparent',
                borderRight: active ? '2px solid #185FA5' : '2px solid transparent',
                textDecoration: 'none',
              }}>
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Botón portal socio — solo si rol es ambos */}
      {esSocio && (
        <div style={{ padding: '0 10px 8px' }}>
          <Link href="/socio" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            background: '#EAF3DE', borderRadius: 8, textDecoration: 'none',
            fontSize: 12, color: '#3B6D11', fontWeight: 600,
          }}>
            <span>🌿</span>
            <span>Mi portal de socio</span>
            <span style={{ marginLeft: 'auto' }}>→</span>
          </Link>
        </div>
      )}

      {/* Usuario + cerrar sesión */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb' }}>
        {nombre && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{nombre}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{rut}</div>
          </div>
        )}
        <button onClick={cerrarSesion} style={{
          width: '100%', padding: '7px 10px',
          border: '1px solid #e5e7eb', borderRadius: 8,
          background: '#fff', color: '#6b7280', fontSize: 12,
          cursor: 'pointer', textAlign: 'left' as const,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🚪</span> Cerrar sesión
        </button>
      </div>

    </div>
  )
}
