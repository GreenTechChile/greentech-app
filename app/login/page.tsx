'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Formatea RUT mientras el usuario escribe: strip todo, agrega guion antes del dígito verificador
function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${body}-${dv}`
}

// Valida dígito verificador chileno
function validarRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0, factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const expected = 11 - (sum % 11)
  const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return dv === dvCalc
}

export default function Login() {
  const router = useRouter()
  const [rut, setRut] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [rutInvalido, setRutInvalido] = useState(false)

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value)
    setRut(formatted)
    // Validar solo si ya tiene largo suficiente (mínimo 7+guion+1 = 9 chars)
    if (formatted.length >= 9) {
      setRutInvalido(!validarRut(formatted))
    } else {
      setRutInvalido(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validarRut(rut)) {
      setError('El RUT ingresado no es válido. Verifica el dígito verificador.')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Usar RPC SECURITY DEFINER para evitar bloqueo RLS pre-autenticación
      const { data: rows, error: socioError } = await supabase
        .rpc('login_by_rut', { p_rut: rut.trim() })

      const socio = rows?.[0]

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

      // Establecer cookie de sesión para el middleware de protección de rutas
      document.cookie = 'gt_auth=1; path=/; max-age=86400; SameSite=Lax'

      // Redirigir según rol
      const tieneRolOperativo = socio.rol_admin || socio.rol_cultivador || socio.rol_despachador
      if (tieneRolOperativo) {
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
              placeholder="Ej: 12345678-9"
              value={rut}
              onChange={handleRutChange}
              required
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${rutInvalido ? '#F5C5C5' : '#d1d5db'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: rutInvalido ? '#FFFAFA' : '#fff' }}
            />
            {rutInvalido && (
              <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 4 }}>RUT inválido — verifica el dígito verificador</div>
            )}
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
