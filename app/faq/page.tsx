'use client'
import { useState } from 'react'
import Link from 'next/link'

const FAQS: { categoria: string; items: { pregunta: string; respuesta: string }[] }[] = [
  {
    categoria: 'Membresía y acceso',
    items: [
      {
        pregunta: '¿Quién puede asociarse a GreenTech?',
        respuesta: 'Cualquier persona mayor de 18 años con diagnóstico médico que indique cannabis como tratamiento. Se requiere cédula de identidad vigente, receta médica actualizada y completar el proceso de inscripción online a través de nuestra plataforma.',
      },
      {
        pregunta: '¿Cuánto cuesta inscribirse?',
        respuesta: 'El aporte de inscripción es de $30.000 CLP. Este pago único cubre la revisión de tu solicitud, la elaboración de tu contrato de delegación de cultivo, la declaración jurada de ingreso y la activación de tu cuenta en la plataforma. Los aportes mensuales por dispensación se determinan según el tipo y volumen de producto, conforme a la tabla aprobada por el Directorio.',
      },
      {
        pregunta: '¿Cuánto tarda el proceso de admisión?',
        respuesta: 'Entre 3 y 7 días hábiles desde que subiste todos tus documentos correctamente. Te notificamos por correo electrónico en cada etapa del proceso: recepción de solicitud, revisión documental, aprobación o si se requiere información adicional, y finalmente la activación de tu cuenta.',
      },
      {
        pregunta: '¿Puedo asociarme si ya consumo cannabis sin receta?',
        respuesta: 'La asociación es exclusivamente para uso medicinal certificado. Necesitas contar con receta de un médico habilitado en Chile antes de postular. Si aún no tienes receta, podemos orientarte sobre cómo obtener una consulta con un especialista en cannabis medicinal.',
      },
    ],
  },
  {
    categoria: 'Marco legal',
    items: [
      {
        pregunta: '¿Es legal pertenecer a una asociación de cannabis medicinal en Chile?',
        respuesta: 'Sí. Las asociaciones cannábicas funcionan bajo el amparo del artículo 4° de la Ley 20.000, que permite el cultivo y consumo personal en el contexto de una agrupación sin fines de lucro con fines terapéuticos documentados. GreenTech opera como corporación legalmente constituida, con RUT 65.271.661-K, inscrita en el Registro Civil bajo el N° 390054.',
      },
      {
        pregunta: '¿Qué pasa si me fiscaliza Carabineros?',
        respuesta: 'Todos los socios activos tienen acceso a sus documentos desde la app en todo momento: contrato de delegación de cultivo, declaración jurada de ingreso firmada y receta médica vigente. Esos documentos acreditan tu calidad de socio y la legalidad de tu acceso al cannabis. Te recomendamos mantenerlos siempre descargados en tu celular.',
      },
      {
        pregunta: '¿GreenTech vende cannabis?',
        respuesta: 'No. GreenTech es una asociación sin fines de lucro. Los socios realizan aportes para cubrir los costos operativos del cultivo colectivo y reciben su dispensación como parte del acuerdo asociativo, no como compraventa. Este esquema es lo que le da el amparo legal a la actividad.',
      },
    ],
  },
  {
    categoria: 'Cultivo y dispensación',
    items: [
      {
        pregunta: '¿Puedo elegir la cepa que quiero?',
        respuesta: 'Puedes indicar preferencias al momento de inscribirte y tu médico puede orientarte según tu condición. El stock disponible depende de los ciclos de cultivo activos. Desde la app puedes consultar en tiempo real las cepas disponibles con sus perfiles de cannabinoides (THC, CBD) y características.',
      },
      {
        pregunta: '¿Con qué frecuencia puedo dispensar?',
        respuesta: 'La frecuencia y el gramaje máximo están determinados por tu receta médica. El sistema solo permite autorizar dispensaciones dentro de los márgenes prescritos y con receta vigente. Si tu prescripción cambia, puedes actualizarla desde tu perfil subiendo la nueva receta.',
      },
      {
        pregunta: '¿Puedo visitar el lugar de cultivo?',
        respuesta: 'El acceso a las instalaciones está regulado por nuestro Protocolo de Acceso a Cultivos. En general no se permiten visitas abiertas para proteger la seguridad del espacio y la privacidad de los socios. Sin embargo, la trazabilidad completa de tu cultivo — desde la siembra hasta el procesado — está disponible en tiempo real desde tu perfil en la app.',
      },
      {
        pregunta: '¿Cómo se entrega la dispensación?',
        respuesta: 'Las dispensaciones se coordinan mediante despacho a domicilio o retiro acordado. Recibirás una notificación cuando tu dispensación esté lista. Todo el proceso queda registrado digitalmente en tu historial dentro de la plataforma, junto con el detalle del producto, gramaje y fecha.',
      },
    ],
  },
  {
    categoria: 'App y datos personales',
    items: [
      {
        pregunta: '¿Mis datos médicos están protegidos?',
        respuesta: 'Sí. Toda la información personal y médica se almacena cifrada en servidores seguros (Supabase con RLS activo). No compartimos ningún dato con terceros. El acceso a tu información es estrictamente personal y requiere autenticación con tu RUT y contraseña.',
      },
      {
        pregunta: 'Olvidé mi contraseña, ¿qué hago?',
        respuesta: 'En la pantalla de login encontrarás el enlace "Olvidé mi contraseña". Ingresa tu RUT y te enviaremos un link de recuperación al correo registrado en tu ficha de socio. Si tienes problemas para acceder, escríbenos a contacto@asociaciongreentech.cl.',
      },
      {
        pregunta: '¿Puedo acceder desde el celular?',
        respuesta: 'Sí. La plataforma está optimizada para dispositivos móviles. Solo necesitas un navegador actualizado — no requiere instalación de ninguna aplicación. Accede desde cualquier dispositivo en app.asociaciongreentech.cl con tu RUT y contraseña.',
      },
    ],
  },
]

export default function FaqPage() {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => {
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f0f9ff;
          color: #0c2d48;
          line-height: 1.6;
        }

        /* NAV */
        .faq-nav {
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #bae6fd;
          padding: 0 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 62px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .faq-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .faq-nav-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #0ea5e9, #7dd3fc);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
        }
        .faq-nav-name {
          font-size: 18px;
          font-weight: 700;
          color: #0c2d48;
          font-family: 'Georgia', serif;
        }
        .faq-nav-name span { color: #0ea5e9; }
        .faq-nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          list-style: none;
        }
        .faq-nav-links a {
          font-size: 14px;
          color: rgba(12,45,72,0.65);
          text-decoration: none;
        }
        .faq-nav-links a:hover { color: #0ea5e9; }
        .faq-nav-login {
          background: #0ea5e9;
          color: #fff !important;
          padding: 8px 20px;
          border-radius: 7px;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(14,165,233,0.3);
        }

        /* HERO */
        .faq-hero {
          background: linear-gradient(160deg, #0ea5e9 0%, #0c2d48 100%);
          padding: 64px 2rem 56px;
          text-align: center;
        }
        .faq-hero-tag {
          display: inline-block;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          color: #e0f2fe;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 5px 16px;
          border-radius: 100px;
          margin-bottom: 1rem;
        }
        .faq-hero h1 {
          font-size: 2.2rem;
          font-weight: 700;
          color: #fff;
          font-family: 'Georgia', serif;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }
        .faq-hero p {
          font-size: 1rem;
          color: rgba(255,255,255,0.75);
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* CONTENT */
        .faq-content {
          max-width: 780px;
          margin: 0 auto;
          padding: 56px 1.5rem 80px;
        }

        /* CATEGORÍA */
        .faq-categoria {
          margin-bottom: 2.5rem;
        }
        .faq-categoria-titulo {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #0ea5e9;
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          display: inline-block;
          padding: 4px 14px;
          border-radius: 100px;
          margin-bottom: 14px;
          font-family: 'Segoe UI', sans-serif;
        }

        /* ACORDEÓN */
        .faq-item {
          background: #fff;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          margin-bottom: 8px;
          overflow: hidden;
          transition: box-shadow 0.15s;
        }
        .faq-item:hover {
          box-shadow: 0 2px 12px rgba(14,165,233,0.1);
        }
        .faq-item.open {
          border-color: #7dd3fc;
          box-shadow: 0 2px 16px rgba(14,165,233,0.12);
        }
        .faq-pregunta {
          width: 100%;
          background: none;
          border: none;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          text-align: left;
        }
        .faq-pregunta-texto {
          font-size: 14px;
          font-weight: 600;
          color: #0c2d48;
          line-height: 1.4;
          font-family: 'Segoe UI', sans-serif;
        }
        .faq-item.open .faq-pregunta-texto {
          color: #0369a1;
        }
        .faq-icono {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #e0f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
          color: #0369a1;
          font-weight: 700;
          transition: background 0.15s, transform 0.2s;
        }
        .faq-item.open .faq-icono {
          background: #0ea5e9;
          color: #fff;
          transform: rotate(45deg);
        }
        .faq-respuesta {
          display: none;
          padding: 0 20px 20px;
          font-size: 14px;
          color: #4a90b8;
          line-height: 1.75;
          font-family: 'Segoe UI', sans-serif;
          border-top: 1px solid #e0f2fe;
          padding-top: 14px;
        }
        .faq-item.open .faq-respuesta {
          display: block;
        }

        /* CTA BOTTOM */
        .faq-cta {
          background: linear-gradient(160deg, #0ea5e9 0%, #0c2d48 100%);
          border-radius: 20px;
          padding: 48px 36px;
          text-align: center;
          margin-top: 48px;
        }
        .faq-cta h2 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
          font-family: 'Georgia', serif;
          margin-bottom: 10px;
        }
        .faq-cta p {
          font-size: 14px;
          color: rgba(255,255,255,0.75);
          margin-bottom: 24px;
          line-height: 1.6;
        }
        .faq-cta-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-blanco {
          background: #fff;
          color: #0369a1;
          font-size: 14px;
          font-weight: 600;
          padding: 11px 26px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
        }
        .btn-outline-blanco {
          background: rgba(255,255,255,0.12);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          padding: 11px 26px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.3);
          text-decoration: none;
          display: inline-block;
        }

        /* FOOTER */
        .faq-footer {
          background: #0c2d48;
          color: rgba(125,211,252,0.5);
          padding: 1.5rem;
          text-align: center;
          font-size: 12px;
          border-top: 1px solid rgba(14,165,233,0.12);
        }
        .faq-footer strong { color: rgba(186,230,253,0.75); }
      `}</style>

      {/* NAV */}
      <nav className="faq-nav">
        <Link href="/" className="faq-nav-brand">
          <div className="faq-nav-icon">🌿</div>
          <span className="faq-nav-name">Green<span>Tech</span></span>
        </Link>
        <ul className="faq-nav-links">
          <li><Link href="/#cultivo">Cultivo Indoor</Link></li>
          <li><Link href="/#app">APP</Link></li>
          <li><Link href="/#legal">Legal</Link></li>
          <li><Link href="/login" className="faq-nav-login">Ingresar</Link></li>
        </ul>
      </nav>

      {/* HERO */}
      <div className="faq-hero">
        <div className="faq-hero-tag">Preguntas frecuentes</div>
        <h1>Todo lo que necesitas saber</h1>
        <p>Resolvemos las dudas más comunes sobre membresía, costos, marco legal, cultivo y dispensación en GreenTech.</p>
      </div>

      {/* PREGUNTAS */}
      <div className="faq-content">
        {FAQS.map((cat) => (
          <div key={cat.categoria} className="faq-categoria">
            <div className="faq-categoria-titulo">{cat.categoria}</div>
            {cat.items.map((item, idx) => {
              const key = `${cat.categoria}-${idx}`
              const abierto = !!abiertos[key]
              return (
                <div key={key} className={`faq-item${abierto ? ' open' : ''}`}>
                  <button
                    className="faq-pregunta"
                    onClick={() => toggle(key)}
                    aria-expanded={abierto}
                  >
                    <span className="faq-pregunta-texto">{item.pregunta}</span>
                    <span className="faq-icono" aria-hidden="true">+</span>
                  </button>
                  <div className="faq-respuesta">
                    {item.respuesta}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* CTA */}
        <div className="faq-cta">
          <h2>¿Tienes otra pregunta?</h2>
          <p>Escríbenos a contacto@asociaciongreentech.cl o inicia tu postulación directamente.</p>
          <div className="faq-cta-btns">
            <Link href="/inscripcion" className="btn-blanco">Iniciar postulación →</Link>
            <a href="mailto:contacto@asociaciongreentech.cl" className="btn-outline-blanco">Contactar al equipo</a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="faq-footer">
        <strong>GreenTech</strong> · Asociación de Cannabis Medicinal · RUT 65.271.661-K · Reg. 390054
      </footer>
    </>
  )
}
