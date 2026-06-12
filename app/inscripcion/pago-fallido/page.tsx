'use client'
import Link from 'next/link'

export default function PagoFallido() {
  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:40,maxWidth:480,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>❌</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#A32D2D',marginBottom:8}}>El pago no fue procesado</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24,lineHeight:1.7}}>
          Tu pago fue rechazado o cancelado. No se realizó ningún cobro. Puedes intentarlo nuevamente con otro medio de pago.
        </p>
        <div style={{background:'#FCEBEB',border:'1px solid #F5C5C5',borderRadius:12,padding:16,marginBottom:28,textAlign:'left',fontSize:13,color:'#A32D2D',lineHeight:1.8}}>
          <strong>Posibles causas:</strong><br/>
          • Fondos insuficientes en la tarjeta.<br/>
          • Datos de la tarjeta incorrectos.<br/>
          • Pago cancelado por el usuario.<br/>
          • Límite de transacciones alcanzado.
        </div>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/inscripcion" style={{display:'inline-block',background:'#3B6D11',color:'#EAF3DE',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,textDecoration:'none'}}>
            ← Volver e intentar de nuevo
          </Link>
          <Link href="/" style={{display:'inline-block',background:'transparent',color:'#6b7280',border:'1px solid #d1d5db',borderRadius:8,padding:'10px 24px',fontSize:14,textDecoration:'none'}}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
