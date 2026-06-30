'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PagoExitosoContent() {
  const params = useSearchParams()
  const [estado, setEstado] = useState<'cargando' | 'exitoso' | 'error'>('cargando')
  const [userData, setUserData] = useState<{ nombre: string; email: string; rut: string } | null>(null)

  useEffect(() => {
    const paymentId = params.get('payment_id')
    const rut = params.get('external_reference')
    const status = params.get('status')

    if (!paymentId || !rut || status !== 'approved') {
      setEstado('error')
      return
    }

    const procesar = async () => {
      try {
        // Obtener nombre/email del pre-registro
        const res = await fetch(`/api/mp-pago-exitoso?rut=${encodeURIComponent(rut)}`)
        const data = res.ok ? await res.json() : {}

        // Actualizar registro con payment_id real y estado aprobado (belt-and-suspenders junto al webhook)
        await fetch('/api/registrar-pago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rut,
            nombre: data.nombre || '',
            email: data.email || '',
            monto: data.monto || 0,
            mp_payment_id: paymentId,
            estado: 'aprobado',
          }),
        })

        setUserData({ nombre: data.nombre || '', email: data.email || '', rut })
        setEstado('exitoso')
      } catch (e) {
        console.error(e)
        // Si falló la actualización pero MP aprobó, igual mostramos éxito
        setUserData({ nombre: '', email: '', rut })
        setEstado('exitoso')
      }
    }

    procesar()
  }, [params])

  if (estado === 'cargando') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          Confirmando tu pago...
        </div>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#A32D2D', marginBottom: 8 }}>Estado de pago no confirmado</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
            No pudimos confirmar tu pago automáticamente. Si realizaste el pago, guarda tu número de transacción y contáctanos a{' '}
            <a href="mailto:contacto@asociaciongreentech.cl" style={{ color: '#3B6D11' }}>contacto@asociaciongreentech.cl</a>.
          </p>
          <Link href="/inscripcion" style={{ display: 'inline-block', background: '#3B6D11', color: '#fff', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Intentar nuevamente →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#3B6D11', marginBottom: 8 }}>¡Pago aprobado!</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
          {userData?.nombre ? `Hola ${userData.nombre.split(' ')[0]}, t` : 'T'}u pago de incorporación fue procesado correctamente.<br />
          <strong>Ahora completa el resto del formulario para enviar tu solicitud.</strong>
        </p>
        <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: 16, marginBottom: 28, textAlign: 'left', fontSize: 13, color: '#3B6D11', lineHeight: 1.9 }}>
          <strong>Estado de tu proceso:</strong><br />
          ✅ Pago de incorporación — Confirmado<br />
          ⏳ Datos personales y domicilio — Pendiente<br />
          ⏳ Info médica y documentos — Pendiente<br />
          ⏳ Reglamento y contrato — Pendiente<br />
          ⏳ Envío a la directiva — Pendiente
        </div>
        <a
          href={`/inscripcion?retomar=1&rut=${encodeURIComponent(userData?.rut || '')}&nombre=${encodeURIComponent(userData?.nombre || '')}&email=${encodeURIComponent(userData?.email || '')}`}
          style={{ display: 'inline-block', background: '#3B6D11', color: '#EAF3DE', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 14, width: '100%', boxSizing: 'border-box' as const }}
        >
          Continuar con el formulario →
        </a>
        <br />
        <Link href="/" style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}>Volver al inicio</Link>
      </div>
    </div>
  )
}

export default function PagoExitoso() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9ca3af' }}>Cargando...</div>}>
      <PagoExitosoContent />
    </Suspense>
  )
}
