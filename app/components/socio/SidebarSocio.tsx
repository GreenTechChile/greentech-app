'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/socio', label: 'Mi panel', icon: '🏠' },
  { href: '/socio/dispensacion', label: 'Dispensar', icon: '🌿' },
  { href: '/socio/historial', label: 'Mi historial', icon: '🕐' },
  { href: '/socio/documentos', label: 'Mis documentos', icon: '📄' },
  { href: '/socio/aportes', label: 'Mis aportes', icon: '💳' },
  { href: '/socio/perfil', label: 'Mi perfil', icon: '👤' },
]

interface Props { nombre: string; rut: string; rol?: string }

export default function SidebarSocio({ nombre, rut, rol: rolProp }: Props) {
  const pathname = usePathname()
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    // Si ya nos pasaron el rol como prop, usarlo directo
    if (rolProp === 'admin' || rolProp === 'ambos') {
      setEsAdmin(true)
      return
    }

    // Si no, leer desde localStorage directamente
    const verificar = async () => {
      try {
        // Buscar la clave de sesión de Supabase en localStorage
        const keys = Object.keys(localStorage).filter(
          k => k.startsWith('sb-') && k.endsWith('-auth-token')
        )
        if (keys.length > 0) {
          const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
          const rut = token?.user?.user_metadata?.rut
          if (rut) {
            const { data } = await supabase
              .from('socios')
              .select('rol')
              .eq('rut', rut)
              .single()
            if (data?.rol === 'admin' || data?.rol === 'ambos') {
              setEsAdmin(true)
            }
            return
          }
        }
      } catch (e) {
        console.error('Error verificando rol:', e)
      }
    }

    verificar()
  }, [rolProp])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
    window.location.href = '/'
  }

  return (
    <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '16px 0', background: '#f9fafb', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 14px', borderBottom: '1px solid #e5e7eb', marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, background: '#EAF3DE', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌿</div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
      </div>

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

      {esAdmin && (
        <div style={{ padding: '12px 10px 0', marginTop: 8, borderTop: '1px solid #e5e7eb' }}>
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

      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
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
  )
}
