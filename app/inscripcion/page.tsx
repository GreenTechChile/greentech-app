'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Convierte YYYY-MM-DD → DD-MM-YYYY para mostrar en documentos
function formatFecha(d: string): string {
  if (!d) return ''
  const p = d.split('-')
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`
  return d
}

interface FormData {
  nombre: string; rut: string; fecha_nacimiento: string; estado_civil: string
  profesion: string; telefono: string; email: string; direccion: string
  casa_depto: string; comuna: string; ciudad: string; diagnostico: string
  diagnostico_secundario: string; medico_nombre: string; medico_rut: string
  folio_receta: string; cuota_mensual: string; gramos_delegados: string
  vencimiento_receta: string; observaciones: string
}

const initialForm: FormData = {
  nombre:'',rut:'',fecha_nacimiento:'',estado_civil:'',profesion:'',telefono:'+56',
  email:'',direccion:'',casa_depto:'',comuna:'',ciudad:'',diagnostico:'',
  diagnostico_secundario:'',medico_nombre:'',medico_rut:'',folio_receta:'',
  cuota_mensual:'',gramos_delegados:'',vencimiento_receta:'',observaciones:'',
}

// Validación RUT chileno
const validarRut = (rut: string): boolean => {
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (rutLimpio.length < 2) return false
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = suma % 11
  const dvEsperado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto)
  return dv === dvEsperado
}

// Validar email
const validarEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Formatear RUT automáticamente
const formatearRut = (valor: string): string => {
  const limpio = valor.replace(/\./g, '').replace(/-/g, '').replace(/[^0-9kK]/g, '')
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1).toUpperCase()
  return `${cuerpo}-${dv}`
}

export default function Inscripcion() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState<FormData>(initialForm)
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([])
  const [comunasDisponibles, setComunasDisponibles] = useState<string[]>([])
  const [reglamentoLeido, setReglamentoLeido] = useState(false)
  const [reglamentoAceptado, setReglamentoAceptado] = useState(false)
  const [reglamentoHtml, setReglamentoHtml] = useState<string|null>(null)
  const [reglamentoPdfUrl, setReglamentoPdfUrl] = useState<string|null>(null)
  const [cargandoReglamento, setCargandoReglamento] = useState(false)
  const [contratoLeido, setContratoLeido] = useState(false)
  const [contratoAceptado, setContratoAceptado] = useState(false)
  const [declaracionLeida, setDeclaracionLeida] = useState(false)
  const [declaracionAceptada, setDeclaracionAceptada] = useState(false)
  const [archivos, setArchivos] = useState<{cedula_anverso:File|null,cedula_reverso:File|null,receta:File|null,antecedentes:File|null}>({cedula_anverso:null,cedula_reverso:null,receta:null,antecedentes:null})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mpLoading, setMpLoading] = useState(false)
  const [montoIncorporacion, setMontoIncorporacion] = useState(25000)
  const [retomandoInscripcion, setRetomandoInscripcion] = useState(false)
  const [coberturaCompleta, setCoberturaCompleta] = useState<Record<string,string[]>>({})
  const [ciudadExpandida, setCiudadExpandida] = useState<string|null>(null)

  // Cargar monto de incorporación desde configuración
  useEffect(() => {
    supabase.from('configuracion').select('datos').eq('id', 'pago_incorporacion').single()
      .then(({ data }) => { if (data?.datos != null && data.datos.monto !== undefined) setMontoIncorporacion(data.datos.monto) })
  }, [])

  // Detectar link de retorno enviado por administrador (?retomar=UUID&nombre=...&rut=...&email=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenRetorno = params.get('retomar')
    if (!tokenRetorno) return

    const nombre = decodeURIComponent(params.get('nombre') || '')
    const rut    = decodeURIComponent(params.get('rut')    || '')
    const email  = decodeURIComponent(params.get('email')  || '')

    if (nombre || rut || email) {
      // Datos vienen en la URL — no necesitamos consultar Supabase (evita bloqueo por RLS anon)
      setForm(prev => ({
        ...prev,
        nombre: nombre || prev.nombre,
        rut:    rut    || prev.rut,
        email:  email  || prev.email,
      }))
      setRetomandoInscripcion(true)
      setPaso(2)
      window.history.replaceState({}, '', '/inscripcion')
    } else {
      // Fallback: link antiguo sin params → intentar query (puede fallar por RLS)
      supabase.from('pagos_incorporacion').select('*').eq('id', tokenRetorno).single()
        .then(({ data }) => {
          if (!data) return
          setForm(prev => ({
            ...prev,
            nombre: data.nombre || prev.nombre,
            rut:    data.rut    || prev.rut,
            email:  data.email  || prev.email,
          }))
          setRetomandoInscripcion(true)
          setPaso(2)
          window.history.replaceState({}, '', '/inscripcion')
        })
    }
  }, [])

  // Cambiar a true para simular pago sin MP (solo para desarrollo)
  const BYPASS_PAGO = false

  const handlePagoMP = async () => {
    // Validar datos básicos antes de pagar
    if (!form.nombre.trim()) { setError('Ingresa tu nombre completo para continuar.'); return }
    if (!form.rut.trim() || !validarRut(form.rut)) { setError('Ingresa un RUT válido para continuar.'); return }
    if (!form.email.trim() || !validarEmail(form.email)) { setError('Ingresa un email válido para continuar.'); return }

    if (BYPASS_PAGO || montoIncorporacion === 0) {
      // ── MODO BYPASS o incorporación sin costo: registrar vía API server-side ──
      setMpLoading(true)
      try {
        const res = await fetch('/api/registrar-pago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rut: form.rut,
            nombre: form.nombre.trim(),
            email: form.email.trim().toLowerCase(),
            monto: montoIncorporacion,
            mp_payment_id: montoIncorporacion === 0 ? 'GRATUITO-' + Date.now() : 'BYPASS-' + Date.now(),
            estado: 'aprobado',
          }),
        })
        if (!res.ok) throw new Error('Error al registrar el pago')
        setPaso(2)
      } catch {
        setError('Error al registrar la solicitud.')
      } finally {
        setMpLoading(false)
      }
      return
    }

    // ── MODO PRODUCCIÓN: flujo real MercadoPago ──
    // Guardar pre-registro server-side antes de redirigir a MP (evita fallo por RLS)
    setMpLoading(true)
    const preRes = await fetch('/api/registrar-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rut: form.rut,
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        monto: montoIncorporacion,
        mp_payment_id: 'PENDING-' + Date.now(),
        estado: 'pendiente',
      }),
    })
    if (!preRes.ok) {
      setError('Error al registrar el pago. Intenta nuevamente.')
      setMpLoading(false)
      return
    }
    setError('')
    try {
      const res = await fetch('/api/mercadopago/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: 'incorporacion-greentech',
            title: 'Incorporación como socio GreenTech',
            quantity: 1,
            unit_price: montoIncorporacion,
            currency_id: 'CLP',
          }],
          pagador: { name: form.nombre, email: form.email },
          external_reference: form.rut,
          back_urls: {
            success: `${window.location.origin}/inscripcion/pago-exitoso`,
            failure: `${window.location.origin}/inscripcion/pago-fallido`,
            pending: `${window.location.origin}/inscripcion/pago-pendiente`,
          },
        }),
      })
      const data = await res.json()
      const url = data.init_point
      if (url) {
        window.location.href = url
      } else {
        const mpErr = data.mp_error ? JSON.stringify(data.mp_error) : (data.error || 'Sin detalle')
        setError('No se pudo iniciar el pago: ' + mpErr)
      }
    } catch {
      setError('Error al conectar con Mercado Pago.')
    } finally {
      setMpLoading(false)
    }
  }

  const [rutValido, setRutValido] = useState<boolean|null>(null)
  const [rutMedicoValido, setRutMedicoValido] = useState<boolean|null>(null)
  const update = (field: keyof FormData, value: string) => setForm(prev => ({...prev,[field]:value}))
  const pasos = ['Pago','Datos personales','Domicilio','Info médica','Documentos','Reglamento','Contrato','Declaración','Envío']

  // Cargar ciudades con cobertura activa
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('cobertura').select('ciudad,comuna').eq('activa', true).order('ciudad').order('comuna')
      if (data) {
        const ciudades = [...new Set(data.map((c: {ciudad:string}) => c.ciudad))]
        setCiudadesDisponibles(ciudades)
        // Agrupar comunas por ciudad para el panel de cobertura informativo
        const agrupado: Record<string,string[]> = {}
        data.forEach((c: {ciudad:string,comuna:string}) => {
          if (!agrupado[c.ciudad]) agrupado[c.ciudad] = []
          agrupado[c.ciudad].push(c.comuna)
        })
        setCoberturaCompleta(agrupado)
      }
    }
    cargar()
  }, [])

  // Cargar reglamento al llegar al paso 6 (via API route con service role key)
  useEffect(() => {
    if (paso !== 6 || reglamentoHtml || reglamentoPdfUrl) return
    const cargarReglamento = async () => {
      setCargandoReglamento(true)
      try {
        const res = await fetch('/api/reglamento-url')
        const { url, ext } = await res.json()
        if (!url) { setCargandoReglamento(false); return }

        if (ext === 'pdf') {
          setReglamentoPdfUrl(url)
        } else if (ext === 'docx' || ext === 'doc') {
          // Cargar mammoth.js desde CDN
          if (!(window as any).mammoth) {
            await new Promise<void>((resolve, reject) => {
              const s = document.createElement('script')
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
              s.onload = () => resolve()
              s.onerror = () => reject(new Error('No se pudo cargar mammoth'))
              document.head.appendChild(s)
            })
          }
          const mammoth = (window as any).mammoth
          const resp = await fetch(url)
          const buffer = await resp.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
          setReglamentoHtml(result.value)
        }
      } catch (e) {
        console.error('Error cargando reglamento:', e)
      } finally {
        setCargandoReglamento(false)
      }
    }
    cargarReglamento()
  }, [paso])

  // Cargar comunas al cambiar ciudad
  const cargarComunas = async (ciudad: string) => {
    const { data } = await supabase.from('cobertura').select('comuna').eq('ciudad', ciudad).eq('activa', true).order('comuna')
    if (data) setComunasDisponibles(data.map((c:{comuna:string}) => c.comuna))
  }

  const gramosEnDomicilio = form.cuota_mensual && form.gramos_delegados
    ? Math.max(0, parseFloat(form.cuota_mensual) - parseFloat(form.gramos_delegados)) : 0

  const handleSubmit = async () => {
    if (!reglamentoAceptado) { setError('Debes aceptar el reglamento interno.'); return }
    setLoading(true); setError('')
    try {
      const rut = form.rut.trim()

      // 1. Insertar socio + generar PDFs via API route (server-side con service_role)
      const insertRes = await fetch('/api/inscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut, nombre: form.nombre.trim(), email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim(), direccion: form.direccion.trim(), casa_depto: form.casa_depto.trim(),
          comuna: form.comuna.trim(), ciudad: form.ciudad.trim(), estado_civil: form.estado_civil,
          profesion: form.profesion.trim(), diagnostico: form.diagnostico.trim(),
          diagnostico_secundario: form.diagnostico_secundario.trim(), medico_nombre: form.medico_nombre.trim(),
          medico_rut: form.medico_rut.trim(), folio_receta: form.folio_receta.trim(),
          cuota_mensual: form.cuota_mensual, gramos_delegados: form.gramos_delegados,
          vencimiento_receta: form.vencimiento_receta, observaciones: form.observaciones,
          fecha_nacimiento: form.fecha_nacimiento,
        }),
      })
      const insertData = await insertRes.json()
      if (!insertRes.ok) throw new Error(insertData.error || 'Error al registrar socio')

      // 2. Subir documentos físicos a Supabase Storage
      const uploads = [
        { file: archivos.cedula_anverso, nombre: 'cedula_anverso' },
        { file: archivos.cedula_reverso, nombre: 'cedula_reverso' },
        { file: archivos.receta, nombre: 'receta' },
        { file: archivos.antecedentes, nombre: 'antecedentes' },
      ]
      for (const { file, nombre } of uploads) {
        if (!file) continue
        const ext = file.name.split('.').pop()
        const path = `${rut}/${nombre}.${ext}`
        await supabase.storage.from('documentos').upload(path, file, { upsert: true })
      }

      // 3. PDFs generados server-side en /api/inscripcion (con supabaseAdmin, bypasea RLS)

      setPaso(10)
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : (typeof e === 'object' && e !== null && 'message' in e)
          ? String((e as {message: unknown}).message)
          : JSON.stringify(e)
      setError('Error al enviar: ' + msg)
    } finally { setLoading(false) }
  }

  const s = {
    input: {width:'100%',padding:'9px 11px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box' as const},
    label: {fontSize:12,color:'#6b7280',display:'block',marginBottom:4},
    req: {color:'#A32D2D'},
    field: {display:'flex',flexDirection:'column' as const,gap:4},
    hint: {fontSize:11,color:'#9ca3af',marginTop:2},
    grid2: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
    btnPrimary: {background:'#0369a1',color:'#e0f2fe',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:'pointer'},
    btnOutline: {background:'transparent',color:'#111',border:'1px solid #d1d5db',borderRadius:8,padding:'9px 20px',fontSize:13,cursor:'pointer'},
  }

  return (
    <div style={{fontFamily:'system-ui, sans-serif',minHeight:'100vh',background:'#f9fafb'}}>
      <style>{`
        @media (max-width: 767px) {
          .gt-grid2 { grid-template-columns: 1fr !important; }
          .gt-nav { padding: 12px 16px !important; }
          .gt-container { padding: 0 16px !important; margin: 20px auto !important; }
        }
      `}</style>
      <nav className="gt-nav" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 32px',borderBottom:'1px solid #e5e7eb',background:'#fff'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'#111'}}>
          <span style={{fontSize:24,fontWeight:700}}><span style={{color:'#0c2d48'}}>Green</span><span style={{color:'#0ea5e9'}}>Tech</span></span>
        </Link>
        <Link href="/" style={{fontSize:13,color:'#6b7280',textDecoration:'none'}}>← Volver al inicio</Link>
      </nav>

      <div className="gt-container" style={{maxWidth:700,margin:'32px auto',padding:'0 24px'}}>
        <h1 style={{fontSize:22,fontWeight:600,marginBottom:6}}>Solicitud de incorporación como socio</h1>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:28}}>Completa el formulario. La directiva revisará tu solicitud en un plazo máximo de 5 días hábiles.</p>

        {paso >= 1 && paso <= 9 && (
          <div style={{display:'flex',marginBottom:28}}>
            {pasos.map((p,i) => {
              const n=i+1; const done=paso>n; const active=paso===n
              return <div key={p} style={{flex:1,textAlign:'center',padding:'7px 4px',fontSize:11,borderBottom:`2px solid ${done?'#639922':active?'#0369a1':'#e5e7eb'}`,color:done?'#639922':active?'#0369a1':'#9ca3af',fontWeight:active?600:400}}>{done?'✓ ':''}{p}</div>
            })}
          </div>
        )}

        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:28}}>

          {/* PANTALLA DE CARGA — visible mientras se envía */}
          {loading && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:48,marginBottom:16,animation:'spin 1.5s linear infinite',display:'inline-block'}}>⏳</div>
              <h2 style={{fontSize:18,fontWeight:700,color:'#0369a1',marginBottom:8}}>Enviando tu solicitud...</h2>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:32}}>Por favor no cierres ni recargues esta página.</p>
              <div style={{maxWidth:360,margin:'0 auto',display:'flex',flexDirection:'column',gap:10,textAlign:'left'}}>
                {[
                  '📤 Subiendo documentos adjuntos',
                  '💾 Guardando datos en el sistema',
                  '📄 Generando contrato y declaración',
                  '📧 Enviando correo de confirmación',
                ].map((paso,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#f9fafb',borderRadius:8,border:'1px solid #e5e7eb',fontSize:12,color:'#374151'}}>
                    <span style={{width:18,height:18,borderRadius:'50%',border:'2px solid #7dd3fc',borderTopColor:'#0369a1',display:'inline-block',flexShrink:0,animation:`spin ${1+i*0.3}s linear infinite`}}/>
                    {paso}
                  </div>
                ))}
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* PASO 0 — Bienvenida y requisitos */}
          {paso===0 && (
            <div>
              {/* Encabezado */}
              <div style={{textAlign:'center',marginBottom:28}}>
                <div style={{fontSize:48,marginBottom:12}}>🌿</div>
                <h2 style={{fontSize:18,fontWeight:700,color:'#0369a1',marginBottom:6}}>Bienvenido/a al proceso de incorporación</h2>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7,maxWidth:480,margin:'0 auto'}}>
                  Antes de comenzar, revisa el resumen del trámite, lo que necesitas tener a mano y los documentos que deberás aceptar.
                </p>
              </div>

              {/* Resumen del proceso */}
              <div style={{border:'1px solid #7dd3fc',borderRadius:12,padding:16,background:'#e0f2fe',marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0369a1',marginBottom:10}}>📋 Resumen del proceso</div>
                <div style={{fontSize:12,color:'#374151',lineHeight:1.9}}>
                  {montoIncorporacion > 0 && (
                    <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}><span>1.</span><span>Realizas el pago de incorporación de <strong>${montoIncorporacion.toLocaleString('es-CL')}</strong>.</span></div>
                  )}
                  <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}><span>{montoIncorporacion > 0 ? '2' : '1'}.</span><span>Completas el formulario con tus datos personales, domicilio e información médica.</span></div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}><span>{montoIncorporacion > 0 ? '3' : '2'}.</span><span>Subes los documentos requeridos y aceptas el Reglamento Interno.</span></div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}><span>{montoIncorporacion > 0 ? '4' : '3'}.</span><span>Lees y aceptas el Contrato de Previsión y la Declaración Jurada de Ingreso.</span></div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:8}}><span>{montoIncorporacion > 0 ? '5' : '4'}.</span><span>La directiva revisa tu solicitud en un plazo máximo de <strong>5 días hábiles</strong> y te notifica por correo.</span></div>
                </div>
              </div>

              {/* Costo — solo si hay monto */}
              {montoIncorporacion > 0 ? (
                <div style={{border:'1px solid #7dd3fc',borderRadius:12,padding:16,background:'#f0f9ff',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:32}}>💳</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#0369a1',marginBottom:2}}>Costo del proceso de incorporación</div>
                    <div style={{fontSize:22,fontWeight:700,color:'#0369a1'}}>${montoIncorporacion.toLocaleString('es-CL')} CLP</div>
                    <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>Pago único · Mercado Pago</div>
                  </div>
                </div>
              ) : (
                <div style={{border:'1px solid #7dd3fc',borderRadius:12,padding:16,background:'#e0f2fe',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:32}}>🎉</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#0369a1',marginBottom:2}}>Incorporación sin costo</div>
                    <div style={{fontSize:12,color:'#374151'}}>El proceso de incorporación es actualmente gratuito.</div>
                  </div>
                </div>
              )}

              {/* Documentos a tener a mano */}
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:12}}>📂 Documentos que necesitas tener a mano</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {icon:'🪪',titulo:'Cédula de identidad vigente',desc:'Se solicitará foto del anverso (frente) y reverso (dorso). Formato JPG, PNG o PDF.'},
                    {icon:'🩺',titulo:'Receta médica vigente',desc:'Debe incluir diagnóstico, folio, nombre y RUT del médico, cantidad de gramos autorizados y fecha de vencimiento.'},
                    {icon:'📋',titulo:'Certificado de antecedentes penales',desc:'Puedes obtenerlo en www.registrocivil.cl. Debe ser de emisión menor a 30 días.'},
                  ].map((d,i)=>(
                    <div key={i} style={{display:'flex',gap:12,padding:'10px 12px',background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                      <span style={{fontSize:20,flexShrink:0}}>{d.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#111',marginBottom:2}}>{d.titulo}</div>
                        <div style={{fontSize:11,color:'#6b7280',lineHeight:1.6}}>{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentos a firmar */}
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:4}}>✍️ Documentos que deberás leer y aceptar</div>
                <p style={{fontSize:11,color:'#6b7280',marginBottom:12}}>Estos documentos se presentan dentro del formulario con tus datos pre-completados. La firma electrónica avanzada (Ley 19.799) se gestionará posteriormente.</p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {icon:'📖',titulo:'Reglamento Interno de la Asociación GreenTech',desc:'Derechos y deberes de los socios. Incluye obligación de no comercializar los productos recibidos.'},
                    {icon:'📄',titulo:'Contrato de Previsión y Delegación de Cultivo',desc:'Autoriza a GreenTech a cultivar, cosechar y transportar cannabis medicinal en tu nombre.'},
                    {icon:'📄',titulo:'Declaración Jurada Especial de Ingreso',desc:'Declaras ser usuario medicinal de cannabis con receta vigente y manifiestas tu voluntad de incorporarte a la asociación.'},
                  ].map((d,i)=>(
                    <div key={i} style={{display:'flex',gap:12,padding:'10px 12px',background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                      <span style={{fontSize:20,flexShrink:0}}>{d.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#111',marginBottom:2}}>{d.titulo}</div>
                        <div style={{fontSize:11,color:'#6b7280',lineHeight:1.6}}>{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cobertura de despacho */}
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:4}}>📍 Revisa la cobertura de despacho</div>
                <p style={{fontSize:11,color:'#6b7280',marginBottom:12,lineHeight:1.6}}>GreenTech solo puede despachar a las comunas habilitadas. Verifica que tu domicilio esté dentro de la cobertura antes de iniciar el proceso.</p>
                {Object.keys(coberturaCompleta).length === 0 ? (
                  <div style={{fontSize:12,color:'#9ca3af'}}>Cargando comunas disponibles...</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {Object.keys(coberturaCompleta).sort().map(ciudad => (
                      <div key={ciudad} style={{border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
                        <button
                          onClick={()=>setCiudadExpandida(ciudadExpandida===ciudad?null:ciudad)}
                          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f9fafb',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',textAlign:'left'}}
                        >
                          <span>🏙️ {ciudad} <span style={{fontWeight:400,color:'#9ca3af'}}>({coberturaCompleta[ciudad].length} comuna{coberturaCompleta[ciudad].length!==1?'s':''})</span></span>
                          <span style={{fontSize:10,color:'#9ca3af'}}>{ciudadExpandida===ciudad?'▲':'▼'}</span>
                        </button>
                        {ciudadExpandida===ciudad && (
                          <div style={{padding:'10px 14px',background:'#fff',display:'flex',flexWrap:'wrap',gap:6}}>
                            {coberturaCompleta[ciudad].map(comuna => (
                              <span key={comuna} style={{fontSize:11,padding:'3px 10px',background:'#e0f2fe',color:'#0369a1',borderRadius:20,border:'1px solid #7dd3fc'}}>{comuna}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p style={{fontSize:11,color:'#6b7280',marginTop:10}}>¿Tu comuna no aparece? Contáctanos a <a href="mailto:contacto@asociaciongreentech.cl" style={{color:'#0369a1'}}>contacto@asociaciongreentech.cl</a> antes de continuar.</p>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button style={{...s.btnPrimary,padding:'11px 28px',fontSize:14}} onClick={()=>setPaso(1)}>Comenzar solicitud →</button>
              </div>
            </div>
          )}

          {/* PASO 1 — Pago de incorporación (o identificación si monto=0) */}
          {paso===1 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:6}}>
                {montoIncorporacion > 0 ? '💳 Pago de incorporación' : '👤 Identificación'}
              </h2>
              <p style={{fontSize:12,color:'#6b7280',marginBottom:20}}>
                {montoIncorporacion > 0
                  ? 'Para continuar con el proceso de incorporación, realiza primero el pago.'
                  : 'Ingresa tus datos para comenzar el proceso de incorporación.'}
              </p>

              {/* Identificación previa al pago */}
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:20,background:'#f9fafb'}}>
                <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:12}}>👤 Tus datos de identificación</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Nombre completo *</label>
                    <input value={form.nombre} onChange={e=>update('nombre',e.target.value)}
                      placeholder="Ej: Juan Pérez González"
                      style={{width:'100%',padding:'9px 11px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>RUT *</label>
                    <input value={form.rut}
                      onChange={e=>{
                        const v=formatearRut(e.target.value)
                        update('rut',v)
                        setRutValido(v.length>3?validarRut(v):null)
                      }}
                      placeholder="Ej: 12345678-9"
                      style={{width:'100%',padding:'9px 11px',border:`1px solid ${rutValido===false?'#f87171':rutValido===true?'#4ade80':'#d1d5db'}`,borderRadius:8,fontSize:13,boxSizing:'border-box'}}/>
                    {rutValido===false && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>RUT no válido</div>}
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Email *</label>
                    <input value={form.email} onChange={e=>update('email',e.target.value)}
                      type="email" placeholder="Ej: juan@email.com"
                      style={{width:'100%',padding:'9px 11px',border:'1px solid #d1d5db',borderRadius:8,fontSize:13,boxSizing:'border-box'}}/>
                  </div>
                </div>
              </div>
              {montoIncorporacion > 0 ? (
                <>
                  <div style={{background:'#f0f9ff',border:'1px solid #7dd3fc',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#0369a1',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
                    🔵 <span><strong>Pago seguro con Mercado Pago</strong> — Acepta tarjetas de débito, crédito y transferencia bancaria.</span>
                  </div>
                  <div style={{border:'1px solid #e5e7eb',borderRadius:12,overflow:'hidden',marginBottom:20}}>
                    <div style={{background:'#f9fafb',padding:'12px 16px',borderBottom:'1px solid #e5e7eb'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>Detalle del cobro</div>
                    </div>
                    <div style={{padding:'14px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'7px 0',borderBottom:'1px solid #f3f4f6'}}>
                        <span style={{color:'#374151'}}>Proceso de incorporación como socio GreenTech</span>
                        <span style={{fontWeight:500}}>${montoIncorporacion.toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,padding:'10px 0 4px',marginTop:4,borderTop:'2px solid #e5e7eb'}}>
                        <span>Total a pagar</span>
                        <span style={{color:'#0369a1'}}>${montoIncorporacion.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:10,padding:'12px 14px',fontSize:12,color:'#0369a1',marginBottom:24,lineHeight:1.7}}>
                    <strong>¿Qué incluye este pago?</strong><br/>
                    ✓ Revisión de tu solicitud por la directiva<br/>
                    ✓ Generación de contratos personalizados con tus datos<br/>
                    ✓ Firma electrónica avanzada de contrato y declaración jurada<br/>
                    ✓ Alta en el sistema GreenTech
                  </div>
                </>
              ) : (
                <div style={{background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:10,padding:'12px 14px',fontSize:12,color:'#0369a1',marginBottom:24,lineHeight:1.7}}>
                  🎉 <strong>Incorporación gratuita</strong> — No se requiere pago. Completa tus datos para continuar con el proceso.
                </div>
              )}
              {error && <div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginBottom:14}}>⚠️ {error}</div>}
              <button onClick={handlePagoMP} disabled={mpLoading}
                style={{width:'100%',padding:'14px',border:'none',borderRadius:12,background:mpLoading?'#9ca3af':montoIncorporacion>0?'#009ee3':'#0369a1',color:'#fff',fontSize:15,fontWeight:700,cursor:mpLoading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:10}}>
                {mpLoading
                  ? '⏳ Procesando...'
                  : montoIncorporacion > 0
                    ? `💳 Pagar $${montoIncorporacion.toLocaleString('es-CL')} con Mercado Pago →`
                    : 'Continuar →'}
              </button>
              {montoIncorporacion > 0 && (
                <div style={{textAlign:'center',fontSize:11,color:'#9ca3af',marginBottom:16}}>
                  🔒 Pago seguro · Mercado Pago · SSL
                </div>
              )}
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <button style={s.btnOutline} onClick={()=>setPaso(0)}>← Anterior</button>
              </div>
            </div>
          )}

          {/* PASO 2 — Datos personales */}
          {paso===2 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:12}}>👤 Datos personales</h2>
              {retomandoInscripcion && (
                <div style={{background:'#E6F1FB',border:'1px solid #A8CBF0',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#185FA5',marginBottom:16}}>
                  🔒 <strong>Nombre, RUT y correo</strong> fueron registrados al momento del pago y no pueden modificarse. Si hay un error, contacta a la directiva.
                </div>
              )}
              <div className="gt-grid2" style={{...s.grid2,marginBottom:12}}>
                <div style={s.field}>
                  <label style={s.label}>Nombre completo <span style={s.req}>*</span></label>
                  <input style={{...s.input, ...(retomandoInscripcion ? {background:'#f3f4f6',color:'#6b7280',cursor:'not-allowed'} : {})}} value={form.nombre} onChange={e=>!retomandoInscripcion&&update('nombre',e.target.value)} readOnly={retomandoInscripcion} placeholder="Nombre completo"/>
                </div>
                <div style={s.field}>
                  <label style={s.label}>RUT (sin puntos, con guión) <span style={s.req}>*</span></label>
                  <input style={{...s.input, borderColor: retomandoInscripcion ? '#d1d5db' : rutValido === false ? '#A32D2D' : rutValido === true ? '#0369a1' : '#d1d5db', ...(retomandoInscripcion ? {background:'#f3f4f6',color:'#6b7280',cursor:'not-allowed'} : {})}}
                    value={form.rut}
                    onChange={e => {
                      if (retomandoInscripcion) return
                      const formateado = formatearRut(e.target.value)
                      update('rut', formateado)
                      if (formateado.includes('-') && formateado.length >= 3) {
                        setRutValido(validarRut(formateado))
                      } else {
                        setRutValido(null)
                      }
                    }}
                    readOnly={retomandoInscripcion}
                    placeholder="12345678-9"/>
                  {!retomandoInscripcion && rutValido === false && <span style={{fontSize:11, color:'#A32D2D'}}>⚠️ RUT inválido — verifica el dígito verificador</span>}
                  {!retomandoInscripcion && rutValido === true && <span style={{fontSize:11, color:'#0369a1'}}>✓ RUT válido</span>}
                </div>
                <div style={s.field}><label style={s.label}>Fecha de nacimiento <span style={s.req}>*</span></label><input style={s.input} type="date" value={form.fecha_nacimiento} max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0] })()} onChange={e=>update('fecha_nacimiento',e.target.value)}/></div>
                <div style={s.field}><label style={s.label}>Estado civil <span style={s.req}>*</span></label>
                  <select style={s.input} value={form.estado_civil} onChange={e=>update('estado_civil',e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {['Soltero/a','Casado/a','Divorciado/a','Viudo/a','Conviviente civil'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={s.field}><label style={s.label}>Profesión u oficio <span style={s.req}>*</span></label><input style={s.input} value={form.profesion} onChange={e=>update('profesion',e.target.value)} placeholder="Profesión u oficio"/></div>
                <div style={s.field}><label style={s.label}>Teléfono móvil <span style={s.req}>*</span></label><input style={s.input} value={form.telefono} onChange={e=>{const v=e.target.value;if(!v.startsWith('+56'))return;update('telefono',v)}} placeholder="+569XXXXXXXX"/></div>
                <div style={{...s.field,gridColumn:'1/-1'}}>
                  <label style={s.label}>Correo electrónico <span style={s.req}>*</span></label>
                  <input style={{...s.input, ...(retomandoInscripcion ? {background:'#f3f4f6',color:'#6b7280',cursor:'not-allowed'} : {})}} type="email" value={form.email} onChange={e=>!retomandoInscripcion&&update('email',e.target.value)} readOnly={retomandoInscripcion} placeholder="correo@ejemplo.com"/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <span />
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.nombre||!form.rut||!form.fecha_nacimiento||!form.estado_civil||!form.profesion||!form.telefono||!form.email){setError('Completa todos los campos obligatorios.');return}
                  if(!validarRut(form.rut)){setError('El RUT ingresado no es válido. Verifica el dígito verificador.');return}
                  if(!validarEmail(form.email)){setError('El correo electrónico no tiene un formato válido. Debe ser tipo correo@dominio.com');return}
                  if(!/^\+56[0-9]{9}$/.test(form.telefono)){setError('El teléfono debe tener formato +56 seguido de 9 dígitos. Ej: +56912345678');return}
                  const hoy = new Date(); const nac = new Date(form.fecha_nacimiento); const edad = hoy.getFullYear()-nac.getFullYear()-(hoy<new Date(hoy.getFullYear(),nac.getMonth(),nac.getDate())?1:0)
                  if(edad<18){setError('Debes tener al menos 18 años para solicitar incorporación.');return}
                  setError('');setPaso(3)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 3 — Domicilio */}
          {paso===3 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:16}}>📍 Domicilio</h2>
              <div style={{background:'#E6F1FB',border:'1px solid #A8CBF0',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#185FA5',marginBottom:16}}>
                ℹ️ <strong>Cobertura de despacho:</strong> Solo se pueden registrar ciudades y comunas donde GreenTech tiene cobertura activa. Si tu ciudad no aparece en el listado, comunícate con la directiva.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={s.field}>
                  <label style={s.label}>Calle y número <span style={s.req}>*</span></label>
                  <input style={s.input} value={form.direccion} onChange={e=>update('direccion',e.target.value)} placeholder="Calle y número"/>
                  <span style={s.hint}>Solo la calle y número, sin casa ni departamento</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Casa / Departamento</label>
                  <input style={s.input} value={form.casa_depto} onChange={e=>update('casa_depto',e.target.value)} placeholder="Casa 55 o Dpto 302"/>
                  <span style={s.hint}>Opcional si aplica</span>
                </div>
                <div className="gt-grid2" style={s.grid2}>
                  <div style={s.field}>
                    <label style={s.label}>Ciudad <span style={s.req}>*</span></label>
                    <select style={s.input} value={form.ciudad} onChange={e=>{
                      update('ciudad',e.target.value)
                      update('comuna','')
                      if(e.target.value) cargarComunas(e.target.value)
                    }}>
                      <option value="">Seleccionar ciudad...</option>
                      {ciudadesDisponibles.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    {ciudadesDisponibles.length===0 && <span style={s.hint}>Cargando ciudades...</span>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Comuna <span style={s.req}>*</span></label>
                    <select style={{...s.input,opacity:form.ciudad?1:0.5}} value={form.comuna} onChange={e=>update('comuna',e.target.value)} disabled={!form.ciudad}>
                      <option value="">{form.ciudad?'Seleccionar comuna...':'Primero selecciona la ciudad'}</option>
                      {comunasDisponibles.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    {!form.ciudad&&<span style={s.hint}>Selecciona primero la ciudad</span>}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(2)}>← Anterior</button>
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.direccion||!form.comuna||!form.ciudad){setError('Completa todos los campos obligatorios.');return}
                  setError('');setPaso(4)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 4 — Info médica */}
          {paso===4 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>🩺 Información médica y delegación al cultivo</h2>
              <div className="gt-grid2" style={{...s.grid2,marginBottom:12}}>
                <div style={s.field}><label style={s.label}>Diagnóstico principal (CIE-11) <span style={s.req}>*</span></label><input style={s.input} value={form.diagnostico} onChange={e=>update('diagnostico',e.target.value)} placeholder="Diagnóstico principal"/></div>
                <div style={s.field}><label style={s.label}>Diagnóstico secundario</label><input style={s.input} value={form.diagnostico_secundario} onChange={e=>update('diagnostico_secundario',e.target.value)} placeholder="Diagnóstico secundario (opcional)"/></div>
                <div style={s.field}><label style={s.label}>Nombre del médico tratante <span style={s.req}>*</span></label><input style={s.input} value={form.medico_nombre} onChange={e=>update('medico_nombre',e.target.value)} placeholder="Nombre del médico tratante"/></div>
                <div style={s.field}>
                  <label style={s.label}>RUT del médico <span style={s.req}>*</span></label>
                  <input style={{...s.input, borderColor: rutMedicoValido === false ? '#A32D2D' : rutMedicoValido === true ? '#0369a1' : '#d1d5db'}}
                    value={form.medico_rut}
                    onChange={e => {
                      const formateado = formatearRut(e.target.value)
                      update('medico_rut', formateado)
                      if (formateado.includes('-') && formateado.length >= 3) {
                        setRutMedicoValido(validarRut(formateado))
                      } else {
                        setRutMedicoValido(null)
                      }
                    }}
                    placeholder="12345678-9"/>
                  {rutMedicoValido === false && <span style={{fontSize:11, color:'#A32D2D'}}>⚠️ RUT inválido</span>}
                  {rutMedicoValido === true && <span style={{fontSize:11, color:'#0369a1'}}>✓ RUT válido</span>}
                </div>
                <div style={s.field}><label style={s.label}>Folio receta médica <span style={s.req}>*</span></label><input style={s.input} value={form.folio_receta} onChange={e=>update('folio_receta',e.target.value)} placeholder="Número de folio"/></div>
                <div style={s.field}><label style={s.label}>Vencimiento de la receta <span style={s.req}>*</span></label><input style={s.input} type="date" value={form.vencimiento_receta} min={new Date().toISOString().split('T')[0]} onChange={e=>update('vencimiento_receta',e.target.value)}/></div>
              </div>
              <div style={{border:'1px solid #7dd3fc',borderRadius:12,padding:16,background:'#e0f2fe',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0369a1',marginBottom:12}}>🌱 Delegación al cultivo colectivo — límite mensual de dispensación</div>
                <div className="gt-grid2" style={s.grid2}>
                  <div style={s.field}>
                    <label style={{...s.label,color:'#0369a1'}}>Gramos autorizados en receta (máximo) <span style={s.req}>*</span></label>
                    <input style={{...s.input,borderColor:'#7dd3fc'}} type="number" min="0.5" step="0.5" value={form.cuota_mensual} onChange={e=>update('cuota_mensual',e.target.value)} placeholder="Ej: 30"/>
                    <span style={{...s.hint,color:'#0369a1'}}>Cantidad máxima indicada por tu médico</span>
                  </div>
                  <div style={s.field}>
                    <label style={{...s.label,color:'#0369a1'}}>Gramos que delegas a GreenTech (mensual) <span style={s.req}>*</span></label>
                    <input style={{...s.input,borderColor:'#7dd3fc'}} type="number" min="0.5" step="0.5" max={parseFloat(form.cuota_mensual)||999} value={form.gramos_delegados} onChange={e=>update('gramos_delegados',e.target.value)} placeholder="Ej: 30"/>
                    <span style={{...s.hint,color:'#0369a1'}}>Este será tu límite máximo de dispensación mensual</span>
                  </div>
                </div>
                {gramosEnDomicilio>0&&<div style={{marginTop:10,fontSize:12,color:'#0369a1',background:'#fff',borderRadius:8,padding:'8px 12px'}}>ℹ️ Cultivarás <strong>{gramosEnDomicilio} gr</strong> en domicilio</div>}
                <div style={{marginTop:10,background:'#FAEEDA',border:'1px solid #EF9F27',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#633806'}}>⚠️ El sistema bloqueará automáticamente cualquier dispensación que supere los gramos delegados.</div>
              </div>
              <div style={s.field}><label style={s.label}>Observaciones médicas</label><textarea style={{...s.input,height:70,resize:'none'}} value={form.observaciones} onChange={e=>update('observaciones',e.target.value)} placeholder="Observaciones relevantes (opcional)"/></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(3)}>← Anterior</button>
                <button style={s.btnPrimary} onClick={()=>{
                  if(!form.diagnostico||!form.medico_nombre||!form.medico_rut||!form.folio_receta||!form.cuota_mensual||!form.gramos_delegados||!form.vencimiento_receta){setError('Completa todos los campos obligatorios.');return}
                  if(form.vencimiento_receta < new Date().toISOString().split('T')[0]){setError('La fecha de vencimiento de la receta debe ser una fecha futura.');return}
                  if(parseFloat(form.gramos_delegados)>parseFloat(form.cuota_mensual)){setError('Los gramos delegados no pueden superar los autorizados en receta.');return}
                  setError('');setPaso(5)
                }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 5 — Documentos */}
          {paso===5 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>📎 Documentos requeridos</h2>
              {[
                {key:'cedula_anverso',label:'Cédula de identidad — Anverso (frente)',req:true},
                {key:'cedula_reverso',label:'Cédula de identidad — Reverso (dorso)',req:true},
                {key:'receta',label:'Receta médica vigente',req:true},
                {key:'antecedentes',label:'Certificado de antecedentes penales',req:true},
              ].map(doc=>(
                <div key={doc.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:archivos[doc.key as keyof typeof archivos]?'#e0f2fe':'#fff',border:`1px solid ${archivos[doc.key as keyof typeof archivos]?'#7dd3fc':'#e5e7eb'}`,borderRadius:10,marginBottom:8}}>
                  <span style={{fontSize:16}}>{archivos[doc.key as keyof typeof archivos]?'✅':'📄'}</span>
                  <span style={{flex:1,fontSize:13}}>{doc.label}</span>
                  <label style={{fontSize:11,padding:'4px 10px',border:'1px solid #0369a1',borderRadius:8,color:'#0369a1',cursor:'pointer'}}>
                    {archivos[doc.key as keyof typeof archivos]?'Cambiar':'Seleccionar'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])setArchivos(prev=>({...prev,[doc.key]:e.target.files![0]}))}}/>
                  </label>
                  {doc.req&&!archivos[doc.key as keyof typeof archivos]&&<span style={{fontSize:10,background:'#FCEBEB',color:'#A32D2D',padding:'2px 7px',borderRadius:20}}>Requerido</span>}
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(4)}>← Anterior</button>
                <button
                  style={{...s.btnPrimary,opacity:(archivos.cedula_anverso&&archivos.cedula_reverso&&archivos.receta&&archivos.antecedentes)?1:0.4,cursor:(archivos.cedula_anverso&&archivos.cedula_reverso&&archivos.receta&&archivos.antecedentes)?'pointer':'not-allowed'}}
                  onClick={()=>{
                    if(!archivos.cedula_anverso||!archivos.cedula_reverso||!archivos.receta||!archivos.antecedentes){setError('Debes subir todos los documentos requeridos para continuar.');return}
                    setError('');setPaso(6)
                  }}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* PASO 6 — Reglamento */}
          {paso===6 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:6}}>📖 Reglamento Interno — Asociación GreenTech</h2>
              <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Debes leer y aceptar el reglamento antes de enviar tu solicitud.</p>
              {cargandoReglamento && (
                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:300,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,color:'#9ca3af',fontSize:13}}>
                  ⏳ Cargando reglamento...
                </div>
              )}

              {/* PDF: mostrar en iframe */}
              {!cargandoReglamento && reglamentoPdfUrl && (
                <div style={{marginBottom:14}}>
                  <iframe
                    src={reglamentoPdfUrl}
                    style={{width:'100%',height:420,border:'1px solid #e5e7eb',borderRadius:10}}
                    onLoad={() => {
                      // No podemos detectar scroll dentro del iframe, se activa tras 3 segundos
                      setTimeout(() => setReglamentoLeido(true), 3000)
                    }}
                  />
                  {!reglamentoLeido && (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
                      <span style={{fontSize:11,color:'#9ca3af'}}>Lee el documento y haz clic en el botón cuando llegues al final</span>
                      <button onClick={() => setReglamentoLeido(true)}
                        style={{fontSize:11,padding:'4px 12px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,cursor:'pointer',color:'#374151',whiteSpace:'nowrap'}}>
                        Ya llegué al final ↓
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* DOCX convertido a HTML */}
              {!cargandoReglamento && reglamentoHtml && (
                <div
                  style={{border:'1px solid #e5e7eb',borderRadius:10,height:420,overflowY:'auto',padding:'16px 20px',fontSize:12.5,lineHeight:1.8,color:'#374151',marginBottom:14}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-20)setReglamentoLeido(true)}}
                  dangerouslySetInnerHTML={{__html: reglamentoHtml}}
                />
              )}

              {/* Fallback: texto estático si no cargó nada */}
              {!cargandoReglamento && !reglamentoHtml && !reglamentoPdfUrl && (
                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:300,overflowY:'auto',padding:14,fontSize:12,lineHeight:1.7,color:'#374151',marginBottom:14}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setReglamentoLeido(true)}}>
                  <strong>1. INTRODUCCIÓN — Marco legal</strong>
                  <p style={{marginTop:6}}>El presente reglamento es el instrumento elaborado por la Corporación con objeto de establecer los derechos y deberes de los asociados. La corporación "Asociación de usuarios de plantas medicinales GreenTech" es una asociación de derecho privado sin fines de lucro que busca proveer de información, desarrollar la investigación y ejecución de tratamientos complementarios orientados a aliviar el sufrimiento humano.</p>
                  <strong style={{display:'block',marginTop:12}}>4. DERECHOS Y DEBERES</strong>
                  <ul style={{marginTop:4,paddingLeft:20}}>
                    <li>Pagar las cuotas y aportaciones correspondientes.</li>
                    <li>Participar en las Asambleas Generales.</li>
                    <li style={{fontWeight:600}}>No vender, transferir ni ceder los productos recibidos. El incumplimiento es causal de expulsión inmediata.</li>
                  </ul>
                  <p style={{marginTop:10,color:'#9ca3af',fontStyle:'italic'}}>— Fin del reglamento —</p>
                </div>
              )}

              {!reglamentoLeido && !cargandoReglamento && (reglamentoHtml || !reglamentoPdfUrl) && (
                <div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>
              )}
              <button onClick={async () => {
                const { createClient } = await import('@supabase/supabase-js')
                const sb = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )
                // Buscar la versión más reciente del reglamento en documentos-corporacion
                const { data: archivos } = await sb.storage
                  .from('documentos-corporacion')
                  .list('institucional', { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } })
                const ultimo = archivos?.find(f => f.name.startsWith('reglamento_interno'))
                if (ultimo) {
                  const { data: urlData } = await sb.storage
                    .from('documentos-corporacion')
                    .createSignedUrl(`institucional/${ultimo.name}`, 300)
                  if (urlData?.signedUrl) {
                    window.open(urlData.signedUrl, '_blank')
                    return
                  }
                }
                // Fallback al archivo legacy
                const { data } = await sb.storage.from('documentos').createSignedUrl('corporacion/reglamento.pdf', 120)
                if (data?.signedUrl) {
                  window.open(data.signedUrl, '_blank')
                }
              }} style={{display:'flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid #0369a1',borderRadius:8,padding:'7px 14px',fontSize:12,color:'#0369a1',cursor:'pointer',marginBottom:14}}>
                📥 Descargar Reglamento Interno completo
              </button>
              <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:reglamentoLeido?1:0.4}}>
                <input type="checkbox" id="acepta" checked={reglamentoAceptado} onChange={e=>reglamentoLeido&&setReglamentoAceptado(e.target.checked)} disabled={!reglamentoLeido} style={{width:16,height:16,marginTop:2,accentColor:'#0369a1'}}/>
                <label htmlFor="acepta" style={{fontSize:12,lineHeight:1.6,cursor:reglamentoLeido?'pointer':'not-allowed'}}>
                  He leído y entendido en su totalidad el <strong>Reglamento Interno de la Asociación GreenTech</strong>. Me comprometo a cumplirlo desde el momento de mi incorporación. Entiendo que el incumplimiento puede derivar en <strong>suspensión o expulsión</strong>.
                </label>
              </div>
              {reglamentoAceptado&&<div style={{marginTop:8,background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#0369a1'}}>✓ Aceptación registrada con fecha, hora e IP en tu expediente.</div>}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
                <button style={s.btnOutline} onClick={()=>setPaso(5)}>← Anterior</button>
                <button style={{...s.btnPrimary,opacity:reglamentoAceptado?1:0.5,cursor:reglamentoAceptado?'pointer':'not-allowed'}} onClick={()=>reglamentoAceptado&&(setError(''),setPaso(7))}>Siguiente →</button>
              </div>
            </div>
          )}


          {/* PASO 7 — Contrato de Previsión y Delegación de Cultivo */}
          {paso===7 && (() => {
            const fecha = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})
            const domicilio = [form.direccion, form.casa_depto, form.comuna, form.ciudad].filter(Boolean).join(', ')
            return (
              <div>
                <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>📄 Contrato de Previsión y Delegación de Cultivo</h2>
                <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Lee el contrato con tus datos pre-completados y acéptalo al final.</p>

                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:340,overflowY:'auto',padding:16,fontSize:12,lineHeight:1.8,color:'#374151',marginBottom:14,background:'#fafafa'}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setContratoLeido(true)}}>
                  <div style={{textAlign:'center',marginBottom:16}}>
                    <strong style={{fontSize:13}}>Contrato de Previsión y Delegación de Cultivo</strong><br/>
                    <span style={{color:'#6b7280'}}>Asociación de usuarios de plantas medicinales GreenTech.</span>
                  </div>
                  <p>Don/Doña <strong>{form.nombre||'_______________'}</strong>, RUT: <strong>{form.rut||'_______________'}</strong>, miembro asociado de la Corporación (Asociación de Usuarios de Plantas Medicinales) para su investigación, desarrollo y tratamiento "GREENTECH".</p>
                  <p style={{marginTop:10}}>Por la presente declara:</p>
                  <ul style={{marginTop:8,paddingLeft:20,display:'flex',flexDirection:'column',gap:8}}>
                    <li>Ser Usuario/a de cannabis o haber sido diagnosticado/a de alguna enfermedad para la cual la eficacia del uso terapéutico o paliativo del cannabis es prescrita por un médico bajo los parámetros del artículo 8° inciso 2° de la ley 20.000.</li>
                    <li>Haber leído los derechos y deberes del paciente medicinal de cannabis (ley 20.584).</li>
                    <li>La obligación excluyente de no vender el cannabis que la corporación le proporcione, total o parcialmente, bajo el resultado de expulsión de la corporación.</li>
                    <li>Su compromiso de cumplir los estatutos, reglamento de régimen interno, a observar sus fines sociales y a respetar las decisiones de sus órganos internos.</li>
                    <li>Estar en conocimiento de pertenecer a un tratamiento médico el cual sigue la recomendación de un profesional de la salud calificado.</li>
                    <li>Delegar la entrega de <strong>{form.gramos_delegados||'___'} gr.</strong> de Cannabis mensualmente según recomendación médica a la corporación GREENTECH.</li>
                  </ul>
                  <p style={{marginTop:14,color:'#6b7280'}}>FECHA: {fecha}</p>
                  <div style={{marginTop:16,borderTop:'1px dashed #d1d5db',paddingTop:12,color:'#9ca3af',fontStyle:'italic',textAlign:'center'}}>
                    Firma electrónica avanzada de: {form.nombre||'_______________'} · RUT {form.rut||'_______________'}
                  </div>
                </div>

                {!contratoLeido && <div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:contratoLeido?1:0.4,marginBottom:8}}>
                  <input type="checkbox" id="acepta-contrato" checked={contratoAceptado} onChange={e=>contratoLeido&&setContratoAceptado(e.target.checked)} disabled={!contratoLeido} style={{width:16,height:16,marginTop:2,accentColor:'#0369a1'}}/>
                  <label htmlFor="acepta-contrato" style={{fontSize:12,lineHeight:1.6,cursor:contratoLeido?'pointer':'not-allowed'}}>
                    He leído y acepto el <strong>Contrato de Previsión y Delegación de Cultivo</strong>. Entiendo que al completar el proceso recibiré este documento para firma electrónica avanzada.
                  </label>
                </div>
                {contratoAceptado && <div style={{marginTop:4,background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#0369a1',marginBottom:8}}>✓ Aceptación registrada.</div>}

                <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                  <button style={s.btnOutline} onClick={()=>setPaso(6)}>← Anterior</button>
                  <button style={{...s.btnPrimary,opacity:contratoAceptado?1:0.5,cursor:contratoAceptado?'pointer':'not-allowed'}} onClick={()=>contratoAceptado&&(setError(''),setPaso(8))}>Siguiente →</button>
                </div>
              </div>
            )
          })()}

          {/* PASO 8 — Declaración Jurada Especial de Ingreso */}
          {paso===8 && (() => {
            const ciudad = form.ciudad || '_______________'
            const fecha = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})
            const domicilio = [form.direccion, form.casa_depto].filter(Boolean).join(', ')
            return (
              <div>
                <h2 style={{fontSize:15,fontWeight:600,marginBottom:4}}>📄 Declaración Jurada Especial de Ingreso</h2>
                <p style={{fontSize:12,color:'#6b7280',marginBottom:14}}>Lee la declaración con tus datos pre-completados y acéptala al final.</p>

                <div style={{border:'1px solid #e5e7eb',borderRadius:10,height:340,overflowY:'auto',padding:16,fontSize:11.5,lineHeight:1.8,color:'#374151',marginBottom:14,background:'#fafafa'}}
                  onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-10)setDeclaracionLeida(true)}}>
                  <div style={{textAlign:'center',marginBottom:16}}>
                    <strong style={{fontSize:13}}>DECLARACIÓN JURADA ESPECIAL DE INGRESO</strong><br/>
                    <span style={{color:'#6b7280'}}>ASOCIACIÓN GREENTECH</span>
                  </div>
                  <p>Yo, <strong>{form.nombre||'_______________'}</strong>, cédula nacional de identidad <strong>{form.rut||'_______________'}</strong>, fecha de nacimiento <strong>{form.fecha_nacimiento?formatFecha(form.fecha_nacimiento):'_______________'}</strong>, estado civil <strong>{form.estado_civil||'_______________'}</strong>, de profesión u oficio <strong>{form.profesion||'_______________'}</strong>, con domicilio en <strong>{domicilio||'_______________'}</strong>, comuna de <strong>{form.comuna||'_______________'}</strong>, ciudad de <strong>{form.ciudad||'_______________'}</strong>, correo electrónico <strong>{form.email||'_______________'}</strong>, teléfono móvil <strong>{form.telefono||'_______________'}</strong>,</p>
                  <p style={{marginTop:8}}>diagnosticado/a con <strong>{form.diagnostico||'_______________'}</strong>, por este acto y por el presente instrumento, <strong>VENGO EN DECLARAR QUE:</strong></p>

                  <p style={{marginTop:10}}><strong>PRIMERO:</strong> Debido a mi patología, y con el afán de mejorar mi calidad de vida, <strong>declaro ser usuario Medicinal de Cannabis</strong>. Además, señalo que cuento con receta médica, determinada con el número <strong>{form.folio_receta||'_______________'}</strong>, que justifica mi uso de tipo medicinal hasta la cantidad de <strong>{form.cuota_mensual||'___'} gramos mensuales</strong>, según lo prescrito en la receta médica que justifica el tratamiento. La presente receta se encuentra vigente hasta la fecha de <strong>{form.vencimiento_receta?formatFecha(form.vencimiento_receta):'_______________'}</strong>, la cual ha sido extendida por el(la) doctor(a) <strong>{form.medico_nombre||'_______________'}</strong>, documento de identidad número <strong>{form.medico_rut||'_______________'}</strong>.</p>

                  <p style={{marginTop:10}}><strong>SEGUNDO:</strong> TENIENDO PLENO CONOCIMIENTO del fallo Rol de Ingreso N° 4949-2015 pronunciado con fecha 04 de junio del año 2015 por nuestra Excelentísima Corte Suprema de Justicia y, sobre todo lo relativo a la modificación del artículo 8° de la ley 20.000, <strong>VENGO EN MANIFESTAR MI VOLUNTAD DE SER MIEMBRO ACTIVO DE LA ASOCIACIÓN DE USUARIOS DE PLANTAS MEDICINALES GREENTECH</strong>, con domicilio Monjitas 527 oficina 1207 comuna de Santiago, representada legalmente por PATRICIO OSVALDO VELOSO ALCOTA, cédula nacional de identidad N° 10836787-3.</p>

                  <p style={{marginTop:10}}><strong>TERCERO:</strong> Vengo en hacer presente que, por motivos de seguridad, el acceso a nuestro Cultivo Colectivo Privado de Cannabis Medicinal se encuentra restringido solo a los miembros que el Directorio determine, razón por la cual <strong>AUTORIZO</strong> al Directorio de MI ASOCIACIÓN para que en mi nombre y representación, <strong>SIEMBRE, CULTIVE, COSECHE, GUARDE, CONSERVE, ANALICE, TRANSPORTE</strong> el Cannabis que está destinado para mi tratamiento médico.</p>

                  <p style={{marginTop:10}}><strong>CUARTO:</strong> De acuerdo a la facultad entregada por la ley 20.000 en su artículo 8vo inciso 2do, pacto con esta asociación mi cuota sobre la Provisión para uso de cannabis medicinal mensual por la cantidad de <strong>{form.gramos_delegados||'___'} gramos mensuales</strong>.</p>

                  <p style={{marginTop:10}}><strong>QUINTO:</strong> Vengo en hacer presente que, además, <strong>AUTORIZO</strong> al Directorio de MI ASOCIACIÓN para que, de ser necesario, pueda utilizar los residuos de mi Cannabis Medicinal y pueda realizar todo tipo de productos y subproductos de carácter medicinal. EN NINGÚN CASO SE AUTORIZA LA COMERCIALIZACIÓN DE LA SUSTANCIA.</p>

                  <p style={{marginTop:10}}><strong>SEXTO:</strong> <strong>FACULTO</strong> expresamente al Directorio de LA ASOCIACIÓN para que, en caso de ser necesario, ejerza todas las acciones legales que sean pertinentes en beneficio de nuestra comunidad y que me notifiquen cualquier resolución o información al correo electrónico <strong>{form.email||'_______________'}</strong>.</p>

                  <p style={{marginTop:10}}><strong>SÉPTIMO:</strong> En <strong>{ciudad}</strong>, a <strong>{fecha}</strong>.</p>

                  <p style={{marginTop:10}}><strong>OCTAVO:</strong> <strong>DECLARO</strong> que la receta médica con folio número <strong>{form.folio_receta||'_______________'}</strong>, extendida por el/la Dr./Dra. <strong>{form.medico_nombre||'_______________'}</strong>, RUT <strong>{form.medico_rut||'_______________'}</strong>, con vigencia hasta el <strong>{form.vencimiento_receta||'_______________'}</strong>, ha sido entregada en custodia a la Asociación GreenTech como único dispensador autorizado de mi tratamiento bajo dicha prescripción. En consecuencia, <strong>ME OBLIGO</strong> a no presentar ni utilizar la referida receta, ni copia de ella, en ningún otro establecimiento, farmacia, asociación o recinto de dispensación durante el período de vigencia del presente contrato. El incumplimiento de esta obligación constituirá una infracción grave a los estatutos de LA ASOCIACIÓN, causal de expulsión inmediata, y podrá configurar el delito de uso malicioso de instrumento privado contemplado en el artículo 197 del Código Penal de la República de Chile.</p>

                  <div style={{marginTop:16,borderTop:'1px dashed #d1d5db',paddingTop:12,color:'#9ca3af',fontStyle:'italic',textAlign:'center'}}>
                    Firma electrónica avanzada de: {form.nombre||'_______________'} · RUT {form.rut||'_______________'}
                  </div>
                </div>

                {!declaracionLeida && <div style={{fontSize:11,color:'#9ca3af',marginBottom:10,textAlign:'center'}}>↓ Desplázate hasta el final para activar la casilla</div>}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,background:'#f9fafb',borderRadius:10,padding:14,opacity:declaracionLeida?1:0.4,marginBottom:8}}>
                  <input type="checkbox" id="acepta-declaracion" checked={declaracionAceptada} onChange={e=>declaracionLeida&&setDeclaracionAceptada(e.target.checked)} disabled={!declaracionLeida} style={{width:16,height:16,marginTop:2,accentColor:'#0369a1'}}/>
                  <label htmlFor="acepta-declaracion" style={{fontSize:12,lineHeight:1.6,cursor:declaracionLeida?'pointer':'not-allowed'}}>
                    He leído y acepto la <strong>Declaración Jurada Especial de Ingreso</strong>. Entiendo que al completar el proceso recibiré este documento para firma electrónica avanzada.
                  </label>
                </div>
                {declaracionAceptada && <div style={{marginTop:4,background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#0369a1',marginBottom:8}}>✓ Aceptación registrada.</div>}

                <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                  <button style={s.btnOutline} onClick={()=>setPaso(7)}>← Anterior</button>
                  <button style={{...s.btnPrimary,opacity:declaracionAceptada?1:0.5,cursor:declaracionAceptada?'pointer':'not-allowed'}} onClick={()=>declaracionAceptada&&(setError(''),setPaso(9))}>Siguiente →</button>
                </div>
              </div>
            )
          })()}

          {/* PASO 9 — Resumen y envío */}
          {paso===9 && !loading && (
            <div>
              <h2 style={{fontSize:15,fontWeight:600,marginBottom:20}}>✅ Resumen y envío</h2>
              <div style={{background:'#f9fafb',borderRadius:10,padding:16,marginBottom:20}}>
                {[
                  {label:'Nombre',value:form.nombre},{label:'RUT',value:form.rut},
                  {label:'Email',value:form.email},{label:'Teléfono',value:form.telefono},
                  {label:'Domicilio',value:`${form.direccion}${form.casa_depto?', '+form.casa_depto:''}, ${form.comuna}, ${form.ciudad}`},
                  {label:'Diagnóstico',value:form.diagnostico},{label:'Médico',value:form.medico_nombre},
                  {label:'Folio receta',value:form.folio_receta},
                  {label:'Cuota mensual',value:`${form.cuota_mensual} gr (receta) · ${form.gramos_delegados} gr (delegados)`},
                  {label:'Vencimiento receta',value:form.vencimiento_receta},
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid #e5e7eb'}}>
                    <span style={{color:'#6b7280'}}>{r.label}</span>
                    <span style={{fontWeight:500,maxWidth:'60%',textAlign:'right'}}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:10,padding:14,fontSize:12,color:'#0369a1',marginBottom:14,display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>💳 <span><strong>Pago de incorporación ${montoIncorporacion.toLocaleString('es-CL')}</strong> — Confirmado ✓</span></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>📄 <span><strong>Contrato de Previsión y Delegación de Cultivo</strong> — Aceptado ✓</span></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>📄 <span><strong>Declaración Jurada Especial de Ingreso</strong> — Aceptada ✓</span></div>
              </div>
              <div style={{background:'#f9fafb',borderRadius:10,padding:14,fontSize:12,color:'#374151',marginBottom:20,lineHeight:1.6}}>
                <strong>Declaración:</strong> Declaro que toda la información es verídica. Entiendo que queda estrictamente prohibida la venta o transferencia de los productos recibidos (causal de expulsión). Al enviar acepto los estatutos y el reglamento interno de GreenTech.
              </div>
              {error&&<div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginBottom:14}}>⚠️ {error}</div>}
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <button style={s.btnOutline} onClick={()=>setPaso(8)}>← Anterior</button>
                <button style={{...s.btnPrimary,opacity:loading?0.7:1}} onClick={handleSubmit} disabled={loading}>{loading?'Enviando...':'Enviar solicitud →'}</button>
              </div>
            </div>
          )}

          {/* PASO 10: ÉXITO */}
          {paso===10 && (
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{fontSize:56,marginBottom:16}}>🎉</div>
              <h2 style={{fontSize:20,fontWeight:600,marginBottom:8,color:'#0369a1'}}>¡Solicitud enviada correctamente!</h2>
              <p style={{fontSize:14,color:'#6b7280',marginBottom:6,lineHeight:1.7}}>Tu solicitud fue recibida. La directiva la revisará en un plazo máximo de <strong>5 días hábiles</strong>.</p>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:28}}>Recibirás un correo en <strong>{form.email}</strong> con el resultado.</p>
              <div style={{background:'#e0f2fe',border:'1px solid #7dd3fc',borderRadius:12,padding:16,marginBottom:12,textAlign:'left',fontSize:12,color:'#0369a1',lineHeight:1.7}}>
                <strong>¿Qué sigue?</strong><br/>
                1. La directiva revisará tus documentos y antecedentes.<br/>
                2. Si es aprobada, recibirás tus credenciales de acceso por correo.<br/>
                3. Podrás ingresar con tu RUT y la contraseña asignada.
              </div>
              <Link href="/" style={{...s.btnPrimary,textDecoration:'none',display:'inline-block'}}>Volver al inicio</Link>
            </div>
          )}

          {error&&paso<9&&<div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#A32D2D',marginTop:14}}>⚠️ {error}</div>}
        </div>
      </div>
    </div>
  )
}
