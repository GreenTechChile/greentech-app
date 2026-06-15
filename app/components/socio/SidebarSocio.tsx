'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/socio',              label: 'Mi panel',       icon: '🏠' },
  { href: '/socio/dispensacion', label: 'Dispensar',      icon: '🌿' },
  { href: '/socio/historial',    label: 'Mi historial',   icon: '🕐' },
  { href: '/socio/documentos',   label: 'Mis documentos', icon: '📄' },
  { href: '/socio/aportes',      label: 'Mis aportes',    icon: '💳' },
  { href: '/socio/perfil',       label: 'Mi perfil',      icon: '👤' },
]

interface Props {
  nombre: string
  rut: string
}

export default function SidebarSocio({ nombre, rut }: Props) {
  const pathname = usePathname()
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    const fetchRoles = async () => {
      // Intentar con rut primero (cuando esté disponible)
      if (rut) {
        const { data } = await supabase
          .from('socios')
          .select('rol_admin, rol_cultivador, rol_despachador')
          .eq('rut', rut)
          .single()

        if (data) {
          setEsAdmin(
            data.rol_admin === true ||
            data.rol_cultivador === true ||
            data.rol_despachador === true
          )
          return
        }
      }

      // Fallback: usar el email de la sesión activa
      // Cubre el caso donde rut llega tarde o RLS requiere autenticación
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) return

      const { data } = await supabase
        .from('socios')
        .select('rol_admin, rol_cultivador, rol_despachador')
        .eq('email', session.user.email)
        .single()

      if (data) {
        setEsAdmin(
          data.rol_admin === true ||
          data.rol_cultivador === true ||
          data.rol_despachador === true
        )
      }
    }

    fetchRoles()
  }, [rut])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
    window.location.href = '/'
  }

  return (
    <>
    {/* Placeholder mantiene el espacio en el flex layout */}
    <div style={{ width: 210, flexShrink: 0 }} />

    {/* Sidebar fijo — independiente del scroll del main */}
    <div style={{ position: 'fixed', top: 0, left: 0, width: 210, height: '100vh', background: '#f9fafb', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: '#EAF3DE', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌿</div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 0' }}>
      {navItems.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px', fontSize: 13,
            color: active ? '#3B6D11' : '#6b7280',
            fontWeight: active ? 600 : 400,
            background: active ? '#fff' : 'transparent',
            borderRight: active ? '2px solid #3B6D11' : '2px solid transparent',
            textDecoration: 'none',
          }}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}

      </div>

      {esAdmin && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            background: '#E6F1FB', borderRadius: 8, textDecoration: 'none',
            fontSize: 12, color: '#185FA5', fontWeight: 600,
          }}>
            <span>🛡️</span>
            <span>Panel administrador</span>
            <span style={{ marginLeft: 'auto' }}>→</span>
          </Link>
        </div>
      )}

      <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{nombre}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>{rut}</div>
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
    </>
  )
}
