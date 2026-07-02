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
  const [menuOpen, setMenuOpen] = useState(false)

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
    const fetchDatos = async () => {
      let rutBuscado = rut

      if (!rutBuscado) {
        const { data: { user } } = await supabase.auth.getUser()
        rutBuscado = user?.user_metadata?.rut || ''
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

  const navLinks = (onClickLink?: () => void) => (
    <>
      <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: '#0c2d48' }}>Green</span><span style={{ color: '#0ea5e9' }}>Tech</span></span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: 4, color: '#374151' }}
        >
          ☰
        </button>
      </div>

      {/* ── Espaciador (ocupa el lugar del sidebar en el flex row en móvil) ── */}
      <div className="gt-topbar-spacer" />

      {/* ── Overlay oscuro al abrir drawer ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* ── Drawer lateral ── */}
      <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: '#0c2d48' }}>Green</span><span style={{ color: '#0ea5e9' }}>Tech</span></span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}
          >✕</button>
        </div>
        {navLinks(() => setMenuOpen(false))}
      </div>

      {/* ── Sidebar escritorio ── */}
      <div className="gt-sidebar-desktop">
        <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: '#0c2d48' }}>Green</span><span style={{ color: '#0ea5e9' }}>Tech</span></span>
        </div>
        {navLinks()}
      </div>
    </>
  )
}
