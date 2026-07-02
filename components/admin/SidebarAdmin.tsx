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
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Cierre de sesión automático por inactividad (10 minutos) ──
  useEffect(() => {
    const IDLE_MS = 10 * 60 * 1000
    let timer: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await supabase.auth.signOut()
        Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
        document.cookie = 'gt_auth=; path=/; max-age=0'
        window.location.href = '/login?timeout=1'
      }, IDLE_MS)
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      eventos.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Superusuario: detectado por app_metadata, no existe en socios
      if (user.app_metadata?.superadmin === true) {
        setNombre('Superadmin')
        setRut(user.user_metadata?.rut || '99999999-9')
        setRoles({ rol_socio: true, rol_admin: true, rol_cultivador: true, rol_despachador: true })
        return
      }

      const rutUsuario = user.user_metadata?.rut
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
    })
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
    document.cookie = 'gt_auth=; path=/; max-age=0'
    window.location.href = '/'
  }

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
        { href: '/admin/socios', label: 'Solicitudes',       icon: '👤', visible: verSocios },
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
        { href: '/admin/cumplimiento',  label: 'Cumplimiento',  icon: '⚖️', visible: verTodo },
        { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️', visible: verTodo },
      ]
    },
  ]

  // ── Contenido del nav (reutilizado) ──
  const navContent = (onClickLink?: () => void) => (
    <div>
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, background: '#E6F1FB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
        </div>
        <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 7px', borderRadius: 20 }}>Administrador</span>
      </div>

      {/* Nav */}
      <div style={{ padding: '8px 0' }}>
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
                  <Link key={item.href} href={item.href} onClick={onClickLink} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', fontSize: 13,
                    color: active ? '#185FA5' : '#6b7280',
                    fontWeight: active ? 600 : 400,
                    background: active ? '#fff' : '#f9fafb',
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
      </div>

      {/* Portal socio */}
      {roles.rol_socio && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>
          <Link href="/socio" onClick={onClickLink} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            background: '#e0f2fe', borderRadius: 8, textDecoration: 'none',
            fontSize: 12, color: '#0369a1', fontWeight: 600,
          }}>
            <span>🌿</span>
            <span>Mi portal de socio</span>
            <span style={{ marginLeft: 'auto' }}>→</span>
          </Link>
        </div>
      )}

      {/* Nombre / RUT / Cerrar sesión */}
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
            <div style={{ width: 28, height: 28, background: '#E6F1FB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
            <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 7px', borderRadius: 20 }}>Admin</span>
          </div>
          <button onClick={() => setMenuOpen(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, color: '#374151',
          }}>☰</button>
        </div>

        {/* Spacer */}
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
              <div style={{ width: 28, height: 28, background: '#E6F1FB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>GreenTech</span>
            </div>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</button>
          </div>
          {navContent(() => setMenuOpen(false))}
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
      <div>
        {navContent()}
      </div>
    </div>
  )
}
