'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [rut, setRut] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Buscar socio por RUT para obtener el email
      const { data: socio, error: socioError } = await supabase
        .from('socios')
        .select('email, rol, estado')
        .eq('rut', rut.trim())
        .single()

      if (socioError || !socio) {
        setError('RUT no encontrado. Verifica tus datos.')
        setLoading(false)
        return
      }

      if (socio.estado !== 'activo') {
        setError('Tu cuenta aún no ha sido activada. Espera la aprobación de la directiva.')
        setLoading(false)
        return
      }

      // Login con Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: socio.email,
        password,
      })

      if (authError) {
        setError('Contraseña incorrecta. Intenta nuevamente.')
        setLoading(false)
        return
      }

      // Guardar RUT en metadatos de sesión para identificar al usuario
      await supabase.auth.updateUser({
        data: { rut: rut.trim() }
      })

      // Redirigir según rol
      if (socio.rol === 'admin') {
        router.push('/admin')
      } else {
        router.push('/socio')
      }
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#EAF3DE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>GreenTech</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Ingresar al portal</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
          Ingresa tu RUT y contraseña para acceder al sistema.
        </p>

        <form onSubmit={handleLogin}>
          {/* RUT */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>RUT</label>
            <input
              type="text"
              placeholder="Ej: 10.836.787-3"
              value={rut}
              onChange={e => setRut(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F5C5C5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#A32D2D', marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? '#9ca3af' : '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 8, padding: 11, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 14 }}
          >
            {loading ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          <Link href="#" style={{ color: '#3B6D11' }}>¿Olvidaste tu contraseña?</Link>
          <div style={{ margin: '12px 0', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            ¿Aún no eres socio?{' '}
            <Link href="/inscripcion" style={{ color: '#3B6D11', fontWeight: 500 }}>Solicita tu incorporación</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
