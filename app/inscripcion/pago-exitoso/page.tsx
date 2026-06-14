'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function PagoExitosoContent() {
  const params = useSearchParams()
  const [registrado, setRegistrado] = useState(false)

  useEffect(() => {
    const paymentId = params.get('payment_id')
    const externalRef = params.get('external_reference')
    const status = params.get('status')

    if (paymentId && externalRef && status === 'approved') {
      supabase.from('pagos_incorporacion').upsert({
        rut: externalRef,
        mp_payment_id: paymentId,
        monto: 25000,
        estado: 'aprobado',
        fecha: new Date().toISOString(),
      }).then(() => setRegistrado(true))
    } else {
      setRegistrado(true)
    }
  }, [params])

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:40,maxWidth:480,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#3B6D11',marginBottom:8}}>¡Pago aprobado!</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24,lineHeight:1.7}}>
          Tu pago de incorporación fue procesado correctamente. La directiva revisará tu solicitud en un plazo máximo de <strong>5 días hábiles</strong>.
        </p>
        <div style={{background:'#EAF3DE',border:'1px solid #97C459',borderRadius:12,padding:16,marginBottom:28,textAlign:'left',fontSize:13,color:'#3B6D11',lineHeight:1.8}}>
          <strong>¿Qué sigue?</strong><br/>
          1. La directiva revisará tus documentos.<br/>
          2. Si es aprobada, recibirás tus credenciales por correo.<br/>
          3. Podrás ingresar con tu RUT y contraseña asignada.<br/>
          4. Se generarán tus documentos para firma electrónica.
        </div>
        <Link href="/" style={{display:'inline-block',background:'#3B6D11',color:'#EAF3DE',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,textDecoration:'none'}}>
          Volver al inicio →
        </Link>
      </div>
    </div>
  )
}

export default function PagoExitoso() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#9ca3af'}}>Cargando...</div>}>
      <PagoExitosoContent />
    </Suspense>
  )
}
