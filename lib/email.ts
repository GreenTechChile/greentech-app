// lib/email.ts
// Helper para enviar correos desde cualquier componente o Server Action de GreenTech.
// Llama a /api/email (POST) con el evento y los datos necesarios.

type Evento =
  | 'inscripcion_recibida'
  | 'aprobacion_solicitud'
  | 'rechazo_solicitud'
  | 'credenciales_enviadas'
  | 'pago_incorporacion'
  | 'dispensacion_confirmada'
  | 'despacho_enviado'
  | 'despacho_entregado'

type Datos = Record<string, string | number | undefined>

/**
 * Envía un correo transaccional a través de /api/email.
 *
 * @param evento   - Clave del template de correo
 * @param destinatario - Email del destinatario
 * @param datos    - Datos dinámicos del template (nombre, rut, etc.)
 * @returns        - { ok: true, id } si éxito, o lanza Error si falla
 *
 * Ejemplos de uso:
 *
 * await sendEmail('inscripcion_recibida', socio.email, { nombre: socio.nombre, rut: socio.rut })
 * await sendEmail('credenciales_enviadas', socio.email, { nombre, rut, contrasena })
 * await sendEmail('dispensacion_confirmada', email, { nombre, cepa, gramos, orden })
 * await sendEmail('despacho_enviado', email, { nombre, cepa, gramos, orden, tracking })
 */
export async function sendEmail(
  evento: Evento,
  destinatario: string,
  datos: Datos = {}
): Promise<{ ok: boolean; id?: string }> {
  const base = typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://greentech-app.vercel.app')

  const res = await fetch(`${base}/api/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evento, destinatario, datos }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`[sendEmail] ${evento}: ${err?.error || res.statusText}`)
  }

  return res.json()
}
