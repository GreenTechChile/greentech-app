'use client'
import Link from 'next/link'

export default function PagoFallido() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#A32D2D', marginBottom: 8 }}>Pago no completado</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
          El pago no pudo ser procesado. Puedes intentarlo nuevamente sin perder los datos que ya ingresaste.
        </p>
        <div style={{ background: '#FFF8F8', border: '1px solid #F5C5C5', borderRadius: 12, padding: 16, marginBottom: 28, textAlign: 'left', fontSize: 13, color: '#A32D2D', lineHeight: 1.8 }}>
          <strong>Posibles causas:</strong><br />
          • Fondos insuficientes en la tarjeta<br />
          • Tarjeta rechazada por el banco<br />
          • Cancelaste el proceso de pago<br />
          • Tiempo de sesión expirado en MercadoPago
        </div>
        <Link
          href="/inscripcion"
          style={{ display: 'inline-block', background: '#0369a1', color: '#e0f2fe', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 14, width: '100%', boxSizing: 'border-box' as const }}
        >
          Intentar nuevamente →
        </Link>
        <br />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          ¿Sigues teniendo problemas?{' '}
          <a href="mailto:contacto@asociaciongreentech.cl" style={{ color: '#0369a1' }}>Contáctanos</a>
        </p>
      </div>
    </div>
  )
}
