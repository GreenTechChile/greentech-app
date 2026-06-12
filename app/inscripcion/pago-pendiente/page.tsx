'use client'
import Link from 'next/link'

export default function PagoPendiente() {
  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:40,maxWidth:480,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>⏳</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#633806',marginBottom:8}}>Pago en revisión</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24,lineHeight:1.7}}>
          Tu pago está siendo procesado. Esto puede tomar algunos minutos. Te notificaremos por correo cuando sea confirmado.
        </p>
        <div style={{background:'#FAEEDA',border:'1px solid #EF9F27',borderRadius:12,padding:16,marginBottom:28,textAlign:'left',fontSize:13,color:'#633806',lineHeight:1.8}}>
          <strong>¿Qué hacer?</strong><br/>
          • No realices otro pago mientras este está pendiente.<br/>
          • Revisa tu correo en los próximos minutos.<br/>
          • Si en 24 horas no recibes confirmación, contáctanos.
        </div>
        <Link href="/" style={{display:'inline-block',background:'#3B6D11',color:'#EAF3DE',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,textDecoration:'none'}}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
