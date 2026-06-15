import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'GreenTech <no-reply@asociaciongreentech.cl>'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://greentech-app.vercel.app'
const WEBSITE_URL = 'https://www.asociaciongreentech.cl'

// ─── Colores de marca ────────────────────────────────────────────────
const C = {
  verde: '#3B6D11',
  verdeClaro: '#EAF3DE',
  borde: '#97C459',
  gris: '#6b7280',
  fondo: '#f9fafb',
}

// ─── Layout base ─────────────────────────────────────────────────────
function layout(titulo: string, cuerpo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;padding:0;background:${C.fondo};font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${C.verde};padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:${C.verdeClaro};letter-spacing:-0.3px;">🌿 Asociación GreenTech</p>
            <p style="margin:4px 0 0;font-size:12px;color:#c5dfa0;">Asociación de Usuarios de Plantas Medicinales · Registro 390054</p>
          </td>
        </tr>
        <!-- Contenido -->
        <tr><td style="padding:32px;">${cuerpo}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:${C.fondo};border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Este es un correo automático, no respondas a este mensaje.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;"><a href="${WEBSITE_URL}" style="color:${C.verde};text-decoration:none;">${WEBSITE_URL}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function h1(texto: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${C.verde};">${texto}</h1>`
}
function p(texto: string) {
  return `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">${texto}</p>`
}
function infoBox(contenido: string) {
  return `<div style="background:${C.verdeClaro};border:1px solid ${C.borde};border-radius:10px;padding:16px 20px;margin:16px 0;font-size:13px;color:${C.verde};line-height:1.8;">${contenido}</div>`
}
function warningBox(contenido: string) {
  return `<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:16px 20px;margin:16px 0;font-size:13px;color:#92400E;line-height:1.8;">${contenido}</div>`
}
function btn(texto: string, url: string) {
  return `<div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;background:${C.verde};color:${C.verdeClaro};border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;">${texto}</a></div>`
}
function dato(label: string, valor: string) {
  return `<tr><td style="padding:6px 0;font-size:13px;color:${C.gris};width:160px;">${label}</td><td style="padding:6px 0;font-size:13px;color:#111;font-weight:500;">${valor}</td></tr>`
}
function tabla(filas: string) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:8px;padding:4px 16px;margin:12px 0;">${filas}</table>`
}

// ─── Templates por evento ─────────────────────────────────────────────
type Datos = Record<string, string | number | undefined>

function template(evento: string, datos: Datos): { subject: string; html: string } | null {
  switch (evento) {

    case 'inscripcion_recibida': {
      const nombre = String(datos.nombre || 'Socio')
      const rut = String(datos.rut || '')
      const html = layout('Inscripción recibida — GreenTech', `
        ${h1('¡Solicitud recibida!')}
        ${p(`Hola <strong>${nombre}</strong>, hemos recibido tu solicitud de ingreso a la Asociación GreenTech.`)}
        ${infoBox(`<strong>¿Qué pasa ahora?</strong><br>
          1. La directiva revisará tu solicitud y documentos adjuntos.<br>
          2. Recibirás un correo con la resolución en un plazo máximo de <strong>5 días hábiles</strong>.<br>
          3. Si es aprobada, se te informará los pasos para generar tu contraseña de acceso.`)}
        ${tabla(
          dato('RUT', rut) +
          dato('Estado', 'En revisión')
        )}
        ${p(`Si tienes dudas, responde a este correo o contáctanos por los medios habituales.`)}
      `)
      return { subject: 'Solicitud de ingreso recibida — GreenTech', html }
    }

    case 'aprobacion_solicitud': {
      const nombre = String(datos.nombre || 'Socio')
      const rut = String(datos.rut || '')
      const html = layout('Solicitud aprobada — GreenTech', `
        ${h1('¡Tu solicitud fue aprobada! 🎉')}
        ${p(`Hola <strong>${nombre}</strong>, nos alegra informarte que la directiva ha aprobado tu solicitud de ingreso a la Asociación GreenTech.`)}
        ${infoBox(`Recibirás tus credenciales de acceso en un correo separado que te enviamos ahora mismo. Con ellas podrás ingresar al portal del socio y comenzar a gestionar tus dispensaciones.`)}
        ${tabla(dato('RUT', rut) + dato('Estado', '✅ Aprobado'))}
        ${btn('Ir al portal', `${APP_URL}/login`)}
      `)
      return { subject: '¡Tu solicitud a GreenTech fue aprobada!', html }
    }

    case 'rechazo_solicitud': {
      const nombre = String(datos.nombre || 'Socio')
      const motivo = String(datos.motivo || 'No se especificó motivo.')
      const html = layout('Resolución de solicitud — GreenTech', `
        ${h1('Resolución de tu solicitud')}
        ${p(`Hola <strong>${nombre}</strong>, lamentamos informarte que la directiva no ha podido aprobar tu solicitud de ingreso en esta oportunidad.`)}
        ${warningBox(`<strong>Motivo:</strong> ${motivo}`)}
        ${p(`Si crees que hay un error o deseas apelar esta decisión, puedes contactarnos respondiendo este correo. También puedes volver a postular si las condiciones cambian.`)}
      `)
      return { subject: 'Resolución de tu solicitud — GreenTech', html }
    }

    case 'credenciales_enviadas': {
      const nombre = String(datos.nombre || 'Socio')
      const rut = String(datos.rut || '')
      const contrasena = String(datos.contrasena || '')
      const html = layout('Tus credenciales — GreenTech', `
        ${h1('¡Tu cuenta está activada!')}
        ${p(`Hola <strong>${nombre}</strong>, tu cuenta ha sido activada. A continuación encontrarás tus credenciales de acceso al portal.`)}
        ${infoBox(`<strong>🔑 Credenciales de acceso</strong><br>
          <strong>Portal:</strong> <a href="${APP_URL}/login" style="color:${C.verde};">${APP_URL}/login</a><br>
          <strong>Usuario (RUT):</strong> ${rut}<br>
          <strong>Contraseña:</strong> <span style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid ${C.borde};">${contrasena}</span>`)}
        ${p(`Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión. Puedes hacerlo en <strong>Mi perfil → Cambiar contraseña</strong> dentro del portal.`)}
        ${btn('Iniciar sesión', `${APP_URL}/login`)}
        ${p(`<small style="color:${C.gris};">Si no solicitaste una cuenta, ignora este correo.</small>`)}
      `)
      return { subject: 'Tus credenciales de acceso — GreenTech', html }
    }

    case 'pago_incorporacion': {
      const nombre = String(datos.nombre || 'Socio')
      const monto = datos.monto ? `$${Number(datos.monto).toLocaleString('es-CL')}` : '$25.000'
      const fecha = String(datos.fecha || new Date().toLocaleDateString('es-CL'))
      const html = layout('Pago confirmado — GreenTech', `
        ${h1('Pago de incorporación confirmado ✅')}
        ${p(`Hola <strong>${nombre}</strong>, hemos registrado correctamente tu pago de incorporación.`)}
        ${tabla(
          dato('Concepto', 'Pago de incorporación') +
          dato('Monto', monto) +
          dato('Fecha', fecha) +
          dato('Estado', '✅ Confirmado')
        )}
        ${p(`Recibirás tus credenciales de acceso al portal en un breve plazo, una vez que la directiva active tu cuenta.`)}
        ${btn('Ir al portal', APP_URL)}
      `)
      return { subject: 'Pago de incorporación confirmado — GreenTech', html }
    }

    case 'dispensacion_confirmada': {
      const nombre = String(datos.nombre || 'Socio')
      const cepa = String(datos.cepa || '')
      const gramos = String(datos.gramos || '')
      const orden = String(datos.orden || '')
      const html = layout('Dispensación confirmada — GreenTech', `
        ${h1('Dispensación confirmada 🌿')}
        ${p(`Hola <strong>${nombre}</strong>, tu solicitud de dispensación ha sido confirmada y está siendo preparada.`)}
        ${tabla(
          dato('N° de orden', `#${orden}`) +
          dato('Cepa', cepa) +
          dato('Cantidad', `${gramos} gr`) +
          dato('Estado', '🌿 Confirmada')
        )}
        ${p(`Recibirás un correo cuando tu dispensación sea despachada con los detalles de seguimiento.`)}
        ${btn('Ver historial', `${APP_URL}/socio/historial`)}
      `)
      return { subject: `Dispensación #${orden} confirmada — GreenTech`, html }
    }

    case 'despacho_enviado': {
      const nombre = String(datos.nombre || 'Socio')
      const cepa = String(datos.cepa || '')
      const gramos = String(datos.gramos || '')
      const orden = String(datos.orden || '')
      const tracking = datos.tracking ? String(datos.tracking) : null
      const html = layout('Despacho enviado — GreenTech', `
        ${h1('Tu despacho está en camino 🚚')}
        ${p(`Hola <strong>${nombre}</strong>, tu dispensación ha sido despachada y está en camino.`)}
        ${tabla(
          dato('N° de orden', `#${orden}`) +
          dato('Cepa', cepa) +
          dato('Cantidad', `${gramos} gr`) +
          (tracking ? dato('N° de seguimiento', tracking) : '') +
          dato('Estado', '🚚 En camino')
        )}
        ${tracking
          ? infoBox(`Puedes hacer seguimiento de tu envío con el número <strong>${tracking}</strong> en el sitio de correos o courier correspondiente.`)
          : p('El equipo de GreenTech te contactará cuando el envío esté próximo a entregarse.')}
        ${btn('Ver mis pedidos', `${APP_URL}/socio/historial`)}
      `)
      return { subject: `Tu dispensación #${orden} fue despachada — GreenTech`, html }
    }

    default:
      return null
  }
}

// ─── Handler POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { evento, destinatario, datos = {} } = body as {
      evento: string
      destinatario: string
      datos?: Datos
    }

    if (!evento || !destinatario) {
      return NextResponse.json({ error: 'Faltan campos: evento, destinatario' }, { status: 400 })
    }

    const tpl = template(evento, datos)
    if (!tpl) {
      return NextResponse.json({ error: `Evento desconocido: ${evento}` }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: destinatario,
      subject: tpl.subject,
      html: tpl.html,
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    console.error('[email] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
