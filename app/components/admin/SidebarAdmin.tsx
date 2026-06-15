'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Roles {
  rol_socio: boolean
  rol_admin: boolean
  rol_cultivador: boolean
  rol_despachador: boolean
}

export default function SidebarAdmin() {
  const pathname = usePathname()
  const [roles, setRoles] = useState<Roles>({
    rol_socio: false, rol_admin: false, rol_cultivador: false, rol_despachador: false
  })
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (keys.length === 0) return
      const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
      const rutUsuario = token?.user?.user_metadata?.rut
      if (!rutUsuario) return
      supabase.from('socios')
        .select('nombre, rut, rol_socio, rol_admin, rol_cultivador, rol_despachador')
        .eq('rut', rutUsuario)
        .single()
        .then(({ data }) => {
          if (data?.nombre) setNombre(data.nombre)
          if (data?.rut) setRut(data.rut)
          setRoles({
            rol_socio:       data?.rol_socio       ?? false,
            rol_admin:       data?.rol_admin        ?? false,
            rol_cultivador:  data?.rol_cultivador   ?? false,
            rol_despachador: data?.rol_despachador  ?? false,
          })
        })
    } catch {}
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
    window.location.href = '/'
  }

  // Visibilidad de cada item según roles
  const verTodo = roles.rol_admin
  const verDespachos = roles.rol_admin || roles.rol_despachador
  const verCultivo = roles.rol_admin || roles.rol_cultivador
  const verSocios = roles.rol_admin

  const sections = [
    {
      label: 'Principal',
      visible: true,
      items: [
        { href: '/admin', label: 'Panel general', icon: '📊', visible: true },
      ]
    },
    {
      label: 'Socios',
      visible: verSocios,
      items: [
        { href: '/admin/socios', label: 'Nuevos socios',    icon: '👤', visible: verSocios },
        { href: '/admin/roles',  label: 'Usuarios y roles', icon: '🛡️', visible: verSocios },
      ]
    },
    {
      label: 'Operaciones',
      visible: verDespachos || verCultivo,
      items: [
        { href: '/admin/despachos',  label: 'Despachos',  icon: '🚚', visible: verDespachos },
        { href: '/admin/cepas',      label: 'Cepas',      icon: '🌿', visible: verCultivo },
        { href: '/admin/cultivo',    label: 'Cultivo',    icon: '🌱', visible: verCultivo },
        { href: '/admin/inventario', label: 'Inventario', icon: '📦', visible: verTodo },
      ]
    },
    {
      label: 'Administración',
      visible: verTodo,
      items: [
        { href: '/admin/finanzas',      label: 'Finanzas',      icon: '💰', visible: verTodo },
        { href: '/admin/contratos',     label: 'Contratos',     icon: '📋', visible: verTodo },
        { href: '/admin/trazabilidad',  label: 'Trazabilidad',  icon: '🔒', visible: verTodo },
        { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️', visible: verTodo },
      ]
    },
  ]

  return (
    <div style={{ width: 210, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto', borderRight: '1px solid #e5e7eb', padding: '16px 0', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Logo */}
      <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #e5e7eb', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, background: '#E6F1FB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
        </div>
        <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 7px', borderRadius: 20 }}>Administrador</span>
      </div>

      {/* Nav */}
      {sections.filter(s => s.visible).map(section => {
        const itemsVisibles = section.items.filter(i => i.visible)
        if (itemsVisibles.length === 0) return null
        return (
          <div key={section.label}>
            <div style={{ fontSize: 10, color: '#9ca3af', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {section.label}
            </div>
            {itemsVisibles.map(item => {
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
        )
      })}

      {/* Botón portal socio — solo si tiene rol_socio */}
      {roles.rol_socio && (
        <div style={{ padding: '8px 10px 0', marginTop: 8, borderTop: '1px solid #e5e7eb' }}>
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
