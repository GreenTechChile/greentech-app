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
  const [nombreLocal, setNombreLocal] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchDatos = async () => {
      let rutBuscado = rut

      if (!rutBuscado) {
        try {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
          if (keys.length > 0) {
            const token = JSON.parse(localStorage.getItem(keys[0]) || '{}')
            rutBuscado = token?.user?.user_metadata?.rut || ''
          }
        } catch {}
      }

      if (!rutBuscado) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          const { data: d } = await supabase
            .from('socios')
            .select('rut')
            .eq('email', session.user.email)
            .single()
          rutBuscado = d?.rut || ''
        }
      }

      if (!rutBuscado) return

      const { data } = await supabase
        .from('socios')
        .select('nombre, rol_admin, rol_cultivador, rol_despachador')
        .eq('rut', rutBuscado)
        .single()

      if (data) {
        setEsAdmin(
          data.rol_admin === true ||
          data.rol_cultivador === true ||
          data.rol_despachador === true
        )
        if (data.nombre) setNombreLocal(data.nombre)
      }
    }

    fetchDatos()
  }, [rut])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
    document.cookie = 'gt_auth=; path=/; max-age=0'
    window.location.href = '/'
  }

  const displayNombre = nombre || nombreLocal

  // ── Contenido del menú (reutilizado en ambas versiones) ──
  const menuContent = (onClickLink?: () => void) => (
    <div>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '16px 16px 14px', borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{
          width: 28, height: 28, background: '#EAF3DE', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🌿</div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
      </div>

      {/* Nav items */}
      <div style={{ padding: '8px 0' }}>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              onClick={onClickLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', fontSize: 13,
                color: active ? '#3B6D11' : '#6b7280',
                fontWeight: active ? 600 : 400,
                background: active ? '#fff' : '#f9fafb',
                borderRight: active ? '2px solid #3B6D11' : '2px solid transparent',
                textDecoration: 'none',
              }}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Panel administrador (solo si tiene rol operativo) */}
      {esAdmin && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>
          <Link href="/admin" onClick={onClickLink} style={{
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

      {/* Nombre / RUT / Cerrar sesión */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb' }}>
        {displayNombre && (
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{displayNombre}</div>
        )}
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

  // ── MÓVIL: top bar + drawer ──
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 52,
          background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#EAF3DE', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌿</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
          </div>
          <button onClick={() => setMenuOpen(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, color: '#374151',
          }}>☰</button>
        </div>

        {/* Spacer para que el contenido no quede debajo del top bar */}
        <div style={{ height: 52 }} />

        {/* Overlay */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
        )}

        {/* Drawer */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 300,
          width: 240,
          background: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s ease',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: '#EAF3DE', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌿</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
            </div>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</button>
          </div>
          {/* Nav items */}
          <div style={{ padding: '8px 0' }}>
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', fontSize: 14,
                    color: active ? '#3B6D11' : '#6b7280',
                    fontWeight: active ? 600 : 400,
                    background: active ? '#fff' : '#f9fafb',
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
            <div style={{ padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>
              <Link href="/admin" onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                background: '#E6F1FB', borderRadius: 8, textDecoration: 'none',
                fontSize: 12, color: '#185FA5', fontWeight: 600,
              }}>
                <span>🛡️</span><span>Panel administrador</span><span style={{ marginLeft: 'auto' }}>→</span>
              </Link>
            </div>
          )}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb' }}>
            {displayNombre && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{displayNombre}</div>}
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>{rut}</div>
            <button onClick={cerrarSesion} style={{
              width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
              background: '#fff', color: '#6b7280', fontSize: 12, cursor: 'pointer',
              textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── ESCRITORIO: sidebar normal ──
  return (
    <div style={{
      width: 210,
      flexShrink: 0,
      alignSelf: 'stretch',
      background: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
    }}>
      {menuContent()}
    </div>
  )
}
