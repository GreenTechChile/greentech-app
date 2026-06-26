'use client'
import { useState, useEffect } from 'react'
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
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryRut, setRecoveryRut] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState('')
  const [sessionTimeout, setSessionTimeout] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSessionTimeout(params.get('timeout') === '1')
  }, [])

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

      // Login con Supabase Auth usando email sintético por RUT (no el email personal)
      // Esto evita conflictos cuando dos socios comparten el mismo email personal
      const rutLimpio = rut.trim().replace(/\./g, '').replace('-', '')
      const authEmail = `${rutLimpio}@greentech.cl`
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
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
      // Refrescar el JWT para que incluya el rut en user_metadata desde ya
      // (sin esto, el token viejo no pasa las policies RLS del sidebar)
      await supabase.auth.refreshSession()

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
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: sessionTimeout ? 12 : 24, lineHeight: 1.6 }}>
          Ingresa tu RUT y contraseña para acceder al sistema.
        </p>

        {sessionTimeout && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
            <span>Tu sesión se cerró automáticamente por <strong>10 minutos de inactividad</strong>. Por seguridad, debes ingresar nuevamente.</span>
          </div>
        )}

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
          <button onClick={() => { setShowRecovery(true); setRecoveryMsg(''); setRecoveryRut('') }}
            style={{ background: 'none', border: 'none', color: '#3B6D11', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            ¿Olvidaste tu contraseña?
          </button>
          <div style={{ margin: '12px 0', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            ¿Aún no eres socio?{' '}
            <Link href="/inscripcion" style={{ color: '#3B6D11', fontWeight: 500 }}>Solicita tu incorporación</Link>
          </div>
        </div>

      </div>

      {/* Modal recuperación de contraseña */}
      {showRecovery && (
        <div onClick={() => setShowRecovery(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 28, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Recuperar contraseña</span>
              <button onClick={() => setShowRecovery(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            {recoveryMsg ? (
              <p style={{ fontSize: 13, color: '#3B6D11', background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 8, padding: '10px 14px', margin: 0 }}>{recoveryMsg}</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Ingresa tu RUT y te enviaremos un link de recuperación a tu correo registrado.</p>
                <input
                  value={recoveryRut}
                  onChange={e => setRecoveryRut(formatRut(e.target.value))}
                  placeholder="12345678-9"
                  maxLength={12}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                />
                <button
                  disabled={recoveryLoading || !validarRut(recoveryRut)}
                  onClick={async () => {
                    setRecoveryLoading(true)
                    try {
                      await fetch('/api/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rut: recoveryRut }),
                      })
                    } catch {}
                    setRecoveryLoading(false)
                    setRecoveryMsg('Si tu RUT está registrado, recibirás un correo con las instrucciones para restablecer tu contraseña.')
                  }}
                  style={{ width: '100%', background: recoveryLoading || !validarRut(recoveryRut) ? '#9ca3af' : '#3B6D11', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: recoveryLoading || !validarRut(recoveryRut) ? 'not-allowed' : 'pointer' }}
                >
                  {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
