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
function formatFecha(fecha: string): string {
  if (!fecha) return ''
  const partes = fecha.split('-')
  if (partes.length !== 3) return fecha
  return `${partes[2]}-${partes[1]}-${partes[0]}`
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
        ${p(`Si tienes dudas, contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
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
        ${p(`Si crees que hay un error o deseas apelar esta decisión, puedes contactarnos enviando un correo a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>. También puedes volver a postular si las condiciones cambian.`)}
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

    case 'despacho_entregado': {
      const nombre = String(datos.nombre || 'Socio')
      const cepa = String(datos.cepa || '')
      const gramos = String(datos.gramos || '')
      const orden = String(datos.orden || '')
      const html = layout('Dispensación entregada — GreenTech', `
        ${h1('Tu dispensación fue entregada ✅')}
        ${p(`Hola <strong>${nombre}</strong>, confirmamos que tu dispensación ha sido entregada exitosamente en tu domicilio.`)}
        ${tabla(
          dato('N° de orden', `#${orden}`) +
          dato('Cepa', cepa) +
          dato('Cantidad', `${gramos} gr`) +
          dato('Estado', '✅ Entregada')
        )}
        ${infoBox(`Recuerda que el uso de este tratamiento es estrictamente personal y debe seguir las indicaciones de tu médico tratante.`)}
        ${btn('Ver mi historial', `${APP_URL}/socio/historial`)}
        ${p(`Si tienes dudas, contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
      `)
      return { subject: `Tu dispensación #${orden} fue entregada — GreenTech`, html }
    }

    case 'alerta_stock_bajo': {
      const nombre = String(datos.nombre || 'Administrador')
      const cepas = String(datos.cepas || '')
      const html = layout('⚠️ Alerta: Stock bajo en cepas — GreenTech', `
        ${h1('⚠️ Alerta de stock bajo')}
        ${p(`Hola <strong>${nombre}</strong>, las siguientes cepas tienen menos de 20 gramos disponibles y requieren reposición:`)}
        ${warningBox(cepas || 'Ver inventario para más detalles.')}
        ${p('Te recomendamos revisar el inventario y coordinar la reposición de stock lo antes posible para no interrumpir las dispensaciones.')}
        ${btn('Ver inventario', `${APP_URL}/admin/inventario`)}
      `)
      return { subject: '⚠️ Alerta de stock bajo — GreenTech', html }
    }

    case 'alerta_receta_vence': {
      const nombre = String(datos.nombre || 'Socio')
      const vencimiento = String(datos.vencimiento || '')
      const dias = String(datos.dias || '')
      const html = layout('Tu receta médica vence pronto — GreenTech', `
        ${h1('Tu receta médica vence pronto')}
        ${p(`Hola <strong>${nombre}</strong>, te informamos que tu receta médica está próxima a vencer.`)}
        ${warningBox(`<strong>Fecha de vencimiento:</strong> ${vencimiento}<br>
          ${dias ? `<strong>Días restantes:</strong> ${dias} días` : ''}`)}
        ${p('Para continuar recibiendo tus dispensaciones sin interrupciones, debes renovar tu receta médica. Puedes hacerlo desde la sección <strong>Mis Documentos</strong> en el portal.')}
        ${btn('Renovar receta médica', `${APP_URL}/socio/documentos`)}
        ${p(`Si ya presentaste tu nueva receta y está en proceso de revisión, puedes ignorar este mensaje. Ante cualquier duda, contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
      `)
      return { subject: 'Tu receta médica vence pronto — GreenTech', html }
    }

    case 'alerta_plazo_aprobacion': {
      const nombre = String(datos.nombre || 'Administrador')
      const cantidad = String(datos.cantidad || '1')
      const socios = String(datos.socios || '')
      const html = layout('⚠️ Solicitudes pendientes por más de 4 días — GreenTech', `
        ${h1('⚠️ Solicitudes pendientes sin resolver')}
        ${p(`Hola <strong>${nombre}</strong>, hay <strong>${cantidad} solicitud(es)</strong> de ingreso que llevan más de 4 días esperando revisión:`)}
        ${warningBox(socios || 'Revisar solicitudes en el panel de administración.')}
        ${p('Los socios esperan una respuesta en un plazo máximo de 5 días hábiles. Por favor revisa y resuelve estas solicitudes a la brevedad.')}
        ${btn('Revisar solicitudes', `${APP_URL}/admin/socios`)}
      `)
      return { subject: `⚠️ ${cantidad} solicitud(es) sin resolver por más de 4 días — GreenTech`, html }
    }

    case 'receta_aprobada': {
      const nombre = String(datos.nombre || 'Socio')
      const diagnostico = String(datos.diagnostico || '')
      const medico = String(datos.medico || '')
      const folio = String(datos.folio || '')
      const vencimiento = formatFecha(String(datos.vencimiento || ''))
      const cuota = datos.cuota ? `$${Number(datos.cuota).toLocaleString('es-CL')}` : ''
      const html = layout('Receta médica aprobada — GreenTech', `
        ${h1('Tu receta médica fue aprobada ✅')}
        ${p(`Hola <strong>${nombre}</strong>, la directiva ha revisado y aprobado tu solicitud de renovación de receta médica.`)}
        ${infoBox(`<strong>Datos actualizados en tu ficha:</strong><br>
          ${diagnostico ? `<strong>Diagnóstico:</strong> ${diagnostico}<br>` : ''}
          ${medico ? `<strong>Médico tratante:</strong> ${medico}<br>` : ''}
          ${folio ? `<strong>Folio receta:</strong> ${folio}<br>` : ''}
          ${vencimiento ? `<strong>Vencimiento:</strong> ${vencimiento}<br>` : ''}
          ${cuota ? `<strong>Cuota mensual:</strong> ${cuota}` : ''}`)}
        ${p('Tus datos médicos han sido actualizados en el sistema. Puedes continuar realizando tus solicitudes de dispensación normalmente.')}
        ${btn('Ir al portal', `${APP_URL}/socio/documentos`)}
      `)
      return { subject: 'Tu receta médica fue aprobada — GreenTech', html }
    }

    case 'renovacion_receta_enviada': {
      const nombre     = String(datos.nombre     || 'Socio')
      const folio      = String(datos.folio      || '')
      const medico     = String(datos.medico     || '')
      const vencimiento= formatFecha(String(datos.vencimiento|| ''))
      const cuota      = String(datos.cuota      || '')
      const conDelegacion = !!datos.delegacion_gramos
      const delegGramos= conDelegacion ? String(datos.delegacion_gramos) : ''
      const html = layout('Renovación de receta médica recibida — GreenTech', `
        ${h1('Renovación de receta médica recibida 📋')}
        ${p(`Hola <strong>${nombre}</strong>, hemos recibido correctamente tu solicitud de renovación de receta médica. La directiva la revisará en un plazo máximo de <strong>5 días hábiles</strong>.`)}
        ${infoBox(`
          <strong>Datos enviados:</strong><br>
          ${folio       ? `<strong>Folio receta:</strong> ${folio}<br>` : ''}
          ${medico      ? `<strong>Médico:</strong> ${medico}<br>`      : ''}
          ${vencimiento ? `<strong>Vencimiento:</strong> ${vencimiento}<br>` : ''}
          ${cuota       ? `<strong>Cuota mensual indicada:</strong> ${cuota} gr<br>` : ''}
          <strong>Estado:</strong> ⏳ En revisión
        `)}
        ${conDelegacion ? warningBox(`<strong>📋 Actualización de contrato de delegación de cultivo</strong><br>
          Has solicitado actualizar tu delegación a <strong>${delegGramos} gr</strong> mensuales.<br>
          La directiva descargará el nuevo contrato, lo gestionará para su firma y te informará cuando esté listo.`) : ''}
        ${p('Recibirás un correo cuando la directiva resuelva tu solicitud. Si tienes consultas, contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:' + C.verde + ';">contacto@asociaciongreentech.cl</a>.')}
        ${btn('Ver mis documentos', `${APP_URL}/socio/documentos`)}
      `)
      return { subject: 'Renovación de receta médica recibida — GreenTech', html }
    }

    case 'receta_rechazada': {
      const nombre = String(datos.nombre || 'Socio')
      const motivo = String(datos.motivo || 'No se especificó motivo.')
      const html = layout('Resolución de receta médica — GreenTech', `
        ${h1('Revisión de receta médica')}
        ${p(`Hola <strong>${nombre}</strong>, lamentamos informarte que la directiva no pudo aprobar tu solicitud de renovación de receta médica en esta oportunidad.`)}
        ${warningBox(`<strong>Motivo:</strong> ${motivo}`)}
        ${p(`Si tienes dudas o deseas presentar documentación adicional, contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
        ${btn('Ir a Mis Documentos', `${APP_URL}/socio/documentos`)}
      `)
      return { subject: 'Resolución de tu solicitud de renovación de receta — GreenTech', html }
    }

    case 'retorno_inscripcion': {
      const nombre = String(datos.nombre || 'Estimado/a')
      const link = String(datos.link || `${APP_URL}/inscripcion`)
      const html = layout('Completa tu inscripción — GreenTech', `
        ${h1('Completa tu proceso de inscripción 🌿')}
        ${p(`Hola <strong>${nombre}</strong>, te enviamos este correo para que puedas retomar y completar tu solicitud de ingreso a la Asociación GreenTech.`)}
        ${warningBox('Tu solicitud quedó pendiente. El link a continuación te llevará directamente al formulario con tus datos guardados para que solo debas completar los pasos que faltan.')}
        ${btn('Completar mi inscripción →', link)}
        ${p('Si no solicitaste este correo o no reconoces esta solicitud, puedes ignorarlo. El link es personal e intransferible.')}
      `)
      return { subject: 'Completa tu inscripción en GreenTech', html }
    }

    case 'baja_aprobada': {
      const nombre = String(datos.nombre || 'Socio/a')
      const html = layout('Baja de socio aprobada — GreenTech', `
        ${h1('Tu solicitud de baja fue aprobada')}
        ${p(`Hola <strong>${nombre}</strong>, la directiva ha procesado tu solicitud de baja como socio/a de la Asociación GreenTech.`)}
        ${infoBox(`Tu cuenta ha sido desactivada. Si en el futuro deseas reincorporarte, puedes enviar una nueva solicitud de ingreso a través de nuestro sitio web.`)}
        ${p(`Ha sido un placer tenerte como parte de nuestra comunidad. Si tienes alguna consulta, puedes contactarnos a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
        ${btn('Sitio web GreenTech', WEBSITE_URL)}
      `)
      return { subject: 'Tu baja como socio ha sido procesada — GreenTech', html }
    }

    case 'baja_rechazada': {
      const nombre = String(datos.nombre || 'Socio/a')
      const html = layout('Solicitud de baja — GreenTech', `
        ${h1('Solicitud de baja revisada')}
        ${p(`Hola <strong>${nombre}</strong>, hemos recibido y revisado tu solicitud de baja como socio/a de la Asociación GreenTech.`)}
        ${warningBox(`La directiva no ha podido procesar tu baja en este momento. Por favor contáctanos para coordinar el proceso o si tienes alguna consulta al respecto.`)}
        ${p(`Puedes comunicarte con nosotros a <a href="mailto:contacto@asociaciongreentech.cl" style="color:${C.verde};">contacto@asociaciongreentech.cl</a>.`)}
        ${btn('Ir al portal', `${APP_URL}/socio/perfil`)}
      `)
      return { subject: 'Resolución de solicitud de baja — GreenTech', html }
    }

    case 'reset_password': {
      const nombre = String(datos.nombre || 'Socio/a')
      const link = String(datos.link || `${APP_URL}/login`)
      const html = layout('Recuperación de contraseña — GreenTech', `
        ${h1('Recupera tu contraseña 🔑')}
        ${p(`Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en el portal GreenTech.`)}
        ${warningBox('Este link es válido por 1 hora y solo puede usarse una vez. Si no solicitaste este cambio, ignora este correo.')}
        ${btn('Restablecer mi contraseña →', link)}
        ${p('Si tienes problemas para ingresar, contacta a la directiva.')}
      `)
      return { subject: 'Recuperación de contraseña — GreenTech', html }
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
