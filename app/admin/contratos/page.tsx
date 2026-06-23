'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Contrato {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  rut: string
  rol_funcion: string
  monto_bruto: number
  retencion_pct: number
  fecha_inicio: string
  fecha_termino: string | null
  estado: 'activo' | 'terminado'
  notas: string | null
  created_at: string
}

interface Pago {
  id: string
  contrato_id: string
  mes: number
  año: number
  monto_bruto: number
  monto_liquido: number
  retencion: number
  estado: 'pendiente' | 'pagado'
  fecha_pago: string | null
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Contratos() {
  const [tab, setTab] = useState<'personas'|'empresas'|'pendientes'|'terminados'>('personas')
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [expandido, setExpandido] = useState<string|null>(null)
  const [confirmEliminarContrato, setConfirmEliminarContrato] = useState<string|null>(null)
  const [pagoConComprobante, setPagoConComprobante] = useState<string|null>(null)
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [archivoContrato, setArchivoContrato] = useState<File|null>(null)

  // Form nuevo contrato
  const [ncTipo, setNcTipo] = useState<'persona'|'empresa'>('persona')
  const [ncNombre, setNcNombre] = useState('')
  const [ncRut, setNcRut] = useState('')
  const [ncRol, setNcRol] = useState('')
  const [ncMonto, setNcMonto] = useState('')
  const [ncRetencion, setNcRetencion] = useState('15.25')
  const [ncFechaInicio, setNcFechaInicio] = useState('')
  const [ncFechaTermino, setNcFechaTermino] = useState('')
  const [ncNotas, setNcNotas] = useState('')
  const [ncRutError, setNcRutError] = useState('')
  const [ncPeriodo, setNcPeriodo] = useState<'mensual'|'semanal'|'quincenal'|'bimestral'|'trimestral'|'semestral'|'anual'>('mensual')

  const validarRut = (rut: string): boolean => {
    if (!rut || rut.trim() === '') return true
    const clean = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase()
    if (clean.length < 2) return false
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    if (!/^\d+$/.test(body)) return false
    let sum = 0, mul = 2
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * mul
      mul = mul === 7 ? 2 : mul + 1
    }
    const expected = 11 - (sum % 11)
    const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
    return dv === dvCalc
  }

  const formatearRut = (raw: string): string => {
    const clean = raw.replace(/[^0-9kK]/g, '')
    if (clean.length < 2) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1).toUpperCase()
    return body + '-' + dv
  }

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contratos').select('*').order('created_at', { ascending: false }),
      supabase.from('pagos_contratos').select('*').order('año').order('mes'),
    ])
    if (c) setContratos(c)
    if (p) setPagos(p)
    setLoading(false)
  }

  const crearContrato = async () => {
    if (!ncNombre || !ncRut || !ncMonto || !ncFechaInicio) { setMensaje('❌ Completa los campos obligatorios'); return }
    if (!validarRut(ncRut)) { setNcRutError('RUT inválido. Verifica el dígito verificador.'); return }
    setGuardando(true)
    const { data, error } = await supabase.from('contratos').insert({
      tipo: ncTipo, nombre: ncNombre, rut: ncRut, rol_funcion: ncRol, periodo_pago: ncPeriodo,
      monto_bruto: parseInt(ncMonto),
      retencion_pct: parseFloat(ncRetencion),
      fecha_inicio: ncFechaInicio,
      fecha_termino: ncFechaTermino || null,
      estado: 'activo', notas: ncNotas || null,
    }).select().single()
    if (error) setMensaje('❌ Error: ' + error.message)
    else {
      // Generar pagos según período
      const bruto = parseInt(ncMonto)
      const ret = parseFloat(ncRetencion)
      const retencion = ncTipo === 'persona' ? Math.round(bruto * ret / 100) : 0
      // Para empresas el monto a pagar es el total con IVA (neto + 19%)
      const liquido = ncTipo === 'empresa' ? Math.round(bruto * 1.19) : bruto - retencion

      // Meses de salto según período
      const saltoPorPeriodo: Record<string, number> = {
        semanal: 0,      // pagos semanales: generar 4 pagos (uno por semana del mes actual)
        quincenal: 0,    // pagos quincenales: generar 2 pagos del mes actual
        mensual: 1,
        bimestral: 2,
        trimestral: 3,
        semestral: 6,
        anual: 12,
      }
      const salto = saltoPorPeriodo[ncPeriodo] ?? 1

      const fechaInicio = new Date(ncFechaInicio)
      const mesBase = fechaInicio.getMonth() + 1
      const añoBase = fechaInicio.getFullYear()

      if (ncPeriodo === 'semanal') {
        // 4 pagos semanales numerados dentro del mes de inicio
        for (let semana = 1; semana <= 4; semana++) {
          await supabase.from('pagos_contratos').insert({
            contrato_id: data.id, mes: mesBase, año: añoBase,
            monto_bruto: bruto, monto_liquido: liquido, retencion,
            estado: 'pendiente', descripcion: `Semana ${semana}`,
          })
        }
      } else if (ncPeriodo === 'quincenal') {
        // 2 pagos quincenales del mes de inicio
        for (let quincena = 1; quincena <= 2; quincena++) {
          await supabase.from('pagos_contratos').insert({
            contrato_id: data.id, mes: mesBase, año: añoBase,
            monto_bruto: bruto, monto_liquido: liquido, retencion,
            estado: 'pendiente', descripcion: `Quincena ${quincena}`,
          })
        }
      } else {
        // Para mensual: 3 pagos futuros. Para el resto: 1 pago por vencimiento
        const cantidadPagos = ncPeriodo === 'mensual' ? 3 : 1
        for (let i = 0; i < cantidadPagos; i++) {
          const mesTotalOffset = (mesBase - 1) + (i * salto)
          const m = (mesTotalOffset % 12) + 1
          const a = añoBase + Math.floor(mesTotalOffset / 12)
          await supabase.from('pagos_contratos').insert({
            contrato_id: data.id, mes: m, año: a,
            monto_bruto: bruto, monto_liquido: liquido, retencion,
            estado: 'pendiente',
          })
        }
      }
      // Subir archivo del contrato si se adjuntó
      if (archivoContrato && data?.id) {
        const ext = archivoContrato.name.split('.').pop()
        await supabase.storage.from('contratos').upload(`${ncRut}/contrato.${ext}`, archivoContrato, { upsert:true })
      }
      setMensaje(`✅ Contrato de ${ncNombre} creado con pagos generados`)
      setMostrarForm(false)
      setNcNombre(''); setNcRut(''); setNcRol(''); setNcMonto(''); setNcFechaInicio(''); setNcFechaTermino(''); setNcNotas(''); setArchivoContrato(null); setNcRutError(''); setNcPeriodo('mensual')
      cargarDatos()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 5000)
  }

  const marcarPagado = async (pagoId: string, archivo?: File) => {
    setSubiendoComprobante(true)
    await supabase.from('pagos_contratos').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', pagoId)
    if (archivo) {
      const ext = archivo.name.split('.').pop()
      await supabase.storage.from('contratos').upload(`comprobantes/${pagoId}.${ext}`, archivo, { upsert:true })
    }
    setPagos(prev => prev.map(p => p.id === pagoId ? {...p, estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0]} : p))
    setPagoConComprobante(null)
    setSubiendoComprobante(false)
    setMensaje('✅ Pago registrado correctamente')
    setTimeout(() => setMensaje(''), 3000)
  }

  const generarFiniquito = async (contrato: Contrato) => {
    await supabase.from('contratos').update({ estado:'terminado', fecha_termino: new Date().toISOString().split('T')[0] }).eq('id', contrato.id)
    setContratos(prev => prev.map(c => c.id === contrato.id ? {...c, estado:'terminado'} : c))
    setMensaje(`✅ Finiquito generado para ${contrato.nombre}`)
    setTimeout(() => setMensaje(''), 3000)
  }

  const eliminarContrato = async (contrato: Contrato) => {
    await supabase.from('pagos_contratos').delete().eq('contrato_id', contrato.id)
    await supabase.from('contratos').delete().eq('id', contrato.id)
    setContratos(prev => prev.filter(c => c.id !== contrato.id))
    setPagos(prev => prev.filter(p => p.contrato_id !== contrato.id))
    setMensaje(`✅ Contrato de ${contrato.nombre} eliminado`)
    setTimeout(() => setMensaje(''), 3000)
  }

  const montoLiquido = (bruto: number, ret: number, tipo: string) => tipo === 'persona' ? bruto - Math.round(bruto * ret / 100) : bruto
  const retencionMonto = (bruto: number, ret: number) => Math.round(bruto * ret / 100)

  const contratosFiltrados = contratos.filter(c => {
    if (tab === 'personas') return c.tipo === 'persona' && c.estado === 'activo'
    if (tab === 'empresas') return c.tipo === 'empresa' && c.estado === 'activo'
    if (tab === 'terminados') return c.estado === 'terminado'
    return false
  })

  const pagosPendientes = pagos.filter(p => p.estado === 'pendiente')

  const s = {
    input: { width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const },
    label: { fontSize:11, color:'#6b7280', display:'block', marginBottom:4 },
    field: { display:'flex', flexDirection:'column' as const, gap:4 },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
    grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  }

  const ContratoCard = ({ c }: { c: Contrato }) => {
    const pagosCont = pagos.filter(p => p.contrato_id === c.id)
    const pagoPendiente = pagosCont.find(p => p.estado === 'pendiente')
    const totalPagado = pagosCont.filter(p => p.estado === 'pagado').reduce((a, p) => a + p.monto_liquido, 0)
    const totalRetenido = pagosCont.filter(p => p.estado === 'pagado').reduce((a, p) => a + p.retencion, 0)
    const abierto = expandido === c.id

    // Calcular días hasta próximo pago pendiente
    const hoy = new Date()
    const proximoPago = pagoPendiente
      ? new Date(pagoPendiente.año, pagoPendiente.mes - 1, 1)
      : null
    const diasHastaVencimiento = proximoPago
      ? Math.ceil((proximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const pagoProximoAlerta = diasHastaVencimiento !== null && diasHastaVencimiento <= 30
    const pagoVencido = diasHastaVencimiento !== null && diasHastaVencimiento < 0

    return (
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#f9fafb', borderBottom: abierto ? '1px solid #e5e7eb' : 'none', cursor:'pointer' }}
          onClick={() => setExpandido(abierto ? null : c.id)}>
          <div style={{ width:38, height:38, borderRadius:'50%', background: c.tipo==='persona'?'#EAF3DE':'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:c.tipo==='persona'?'#3B6D11':'#185FA5', flexShrink:0 }}>
            {c.tipo === 'persona' ? c.nombre.split(' ').map(n=>n[0]).join('').slice(0,2) : '🏢'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{c.nombre}</div>
            <div style={{ fontSize:11, color:'#6b7280' }}>RUT {c.rut} · {c.rol_funcion} · Desde {c.fecha_inicio}</div>
          </div>
          <div style={{ textAlign:'right', display:'flex', alignItems:'center', gap:10 }}>
            {pagoPendiente && (
              <span style={{ fontSize:10, background: pagoVencido ? '#FCEBEB' : pagoProximoAlerta ? '#FAEEDA' : '#FAEEDA', color: pagoVencido ? '#A32D2D' : '#633806', padding:'2px 8px', borderRadius:20 }}>
                {pagoVencido ? '🔴 Pago vencido' : pagoProximoAlerta ? '⚠️ Pago próximo' : 'Pago pendiente'}
              </span>
            )}
            <span style={{ fontSize:10, background:c.estado==='activo'?'#EAF3DE':'#f3f4f6', color:c.estado==='activo'?'#3B6D11':'#6b7280', padding:'2px 8px', borderRadius:20 }}>
              {c.estado === 'activo' ? 'Activo' : 'Terminado'}
            </span>
            <span style={{ fontSize:14, color:'#9ca3af' }}>{abierto ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Detalle expandido */}
        {abierto && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid #e5e7eb' }}>
            {/* Col 1: Condiciones */}
            <div style={{ padding:'14px 16px', borderRight:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Condiciones</div>
              {[
                { k:'Tipo', v:c.tipo==='persona'?'Honorarios':'Contrato empresa' },
                { k:'Período', v:(c as any).periodo_pago ? ((c as any).periodo_pago.charAt(0).toUpperCase()+(c as any).periodo_pago.slice(1)) : 'Mensual' },
                { k:'Monto neto', v:`$${c.monto_bruto.toLocaleString('es-CL')}` },
                ...(c.tipo==='persona' ? [
                  { k:`Retención ${c.retencion_pct}%`, v:`$${retencionMonto(c.monto_bruto,c.retencion_pct).toLocaleString('es-CL')}` },
                  { k:'Monto líquido', v:`$${montoLiquido(c.monto_bruto,c.retencion_pct,c.tipo).toLocaleString('es-CL')}`, color:'#3B6D11' },
                ] : [
                  { k:'IVA (19%)', v:`$${Math.round(c.monto_bruto*0.19).toLocaleString('es-CL')}` },
                  { k:'Total con IVA', v:`$${Math.round(c.monto_bruto*1.19).toLocaleString('es-CL')}`, color:'#185FA5' },
                ]),
                { k:'Inicio', v:c.fecha_inicio },
                { k:'Término', v:c.fecha_termino||'Indefinido' },
              ].map((r,i) => (
                <div key={i} style={{ marginBottom:7 }}>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{r.k}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:r.color||'#111' }}>{r.v}</div>
                </div>
              ))}
              {c.tipo === 'persona' && (
                <div style={{ fontSize:10, background:'#E6F1FB', color:'#0C447C', padding:'4px 8px', borderRadius:6, lineHeight:1.5 }}>
                  Retención 2026: {c.retencion_pct}% · Ley 21.133 · Sube a 16% en 2027
                </div>
              )}
            </div>

            {/* Col 2: Pagos */}
            <div style={{ padding:'14px 16px', borderRight:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Pagos</div>

              {/* Alerta próximo pago */}
              {pagoPendiente && (pagoProximoAlerta || pagoVencido) && (
                <div style={{ background: pagoVencido ? '#FCEBEB' : '#FAEEDA', border: `1px solid ${pagoVencido ? '#F5C5C5' : '#FAC775'}`, borderRadius:8, padding:'7px 10px', marginBottom:10, fontSize:11 }}>
                  <div style={{ fontWeight:600, color: pagoVencido ? '#A32D2D' : '#633806' }}>
                    {pagoVencido ? '🔴 Pago vencido' : '⚠️ Pago próximo a vencer'}
                  </div>
                  <div style={{ color: pagoVencido ? '#A32D2D' : '#633806', marginTop:2 }}>
                    {MESES[pagoPendiente.mes-1]} {pagoPendiente.año} · ${pagoPendiente.monto_liquido.toLocaleString('es-CL')}
                    {pagoVencido
                      ? ` · Venció hace ${Math.abs(diasHastaVencimiento!)} días`
                      : ` · Vence en ${diasHastaVencimiento} días`}
                  </div>
                </div>
              )}

              {pagosCont.length === 0 ? (
                <div style={{ fontSize:12, color:'#9ca3af' }}>Sin pagos registrados</div>
              ) : pagosCont.map(p => (
                <div key={p.id}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f3f4f6', fontSize:12 }}>
                    <span style={{ color:'#6b7280' }}>{MESES[p.mes-1]} {p.año}{(p as any).descripcion ? ` · ${(p as any).descripcion}` : ''}</span>
                    <span style={{ fontWeight:500 }}>${p.monto_liquido.toLocaleString('es-CL')}</span>
                    {p.estado === 'pagado'
                      ? <span style={{ fontSize:10, background:'#EAF3DE', color:'#3B6D11', padding:'1px 6px', borderRadius:20 }}>✓ Pagado</span>
                      : <button onClick={() => setPagoConComprobante(p.id)} style={{ fontSize:10, padding:'2px 8px', border:'none', borderRadius:6, background:'#3B6D11', color:'#EAF3DE', cursor:'pointer' }}>Pagar</button>
                    }
                  </div>
                  {/* Mini modal comprobante */}
                  {pagoConComprobante === p.id && (
                    <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', marginTop:6 }}>
                      <div style={{ fontSize:11, fontWeight:600, marginBottom:6 }}>Registrar pago · ${p.monto_liquido.toLocaleString('es-CL')}</div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        id={`comp-${p.id}`}
                        style={{ display:'none' }}
                        onChange={async e => {
                          const f = e.target.files?.[0]
                          await marcarPagado(p.id, f || undefined)
                          e.target.value = ''
                        }}
                      />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => marcarPagado(p.id)}
                          disabled={subiendoComprobante}
                          style={{ flex:1, padding:'5px 0', border:'1px solid #3B6D11', borderRadius:6, background:'transparent', color:'#3B6D11', fontSize:11, cursor:'pointer' }}>
                          Sin comprobante
                        </button>
                        <label htmlFor={`comp-${p.id}`}
                          style={{ flex:1, padding:'5px 0', border:'none', borderRadius:6, background:'#3B6D11', color:'#EAF3DE', fontSize:11, cursor:'pointer', textAlign:'center' as const }}>
                          {subiendoComprobante ? 'Subiendo...' : '⬆ Con comprobante'}
                        </label>
                        <button onClick={() => setPagoConComprobante(null)}
                          style={{ padding:'5px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'#fff', color:'#9ca3af', fontSize:11, cursor:'pointer' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize:11, color:'#6b7280', marginTop:8 }}>
                Pagado: ${totalPagado.toLocaleString('es-CL')}{c.tipo === 'persona' ? ` · Retenido SII: $${totalRetenido.toLocaleString('es-CL')}` : ''}
              </div>
            </div>

            {/* Col 3: Documentos */}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Documentos</div>
              {[
                { label:'Contrato firmado', key:`${c.rut}/contrato` },
                { label: c.tipo==='persona' ? 'Última liquidación' : 'Última factura', key:`${c.rut}/liquidacion` },
                ...( pagosCont.some(p => p.estado === 'pagado') ? [{ label:'Último comprobante de pago', key:`comprobantes/${pagosCont.filter(p=>p.estado==='pagado').slice(-1)[0]?.id}` }] : [] ),
              ].map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 8px', background:'#f9fafb', borderRadius:6, marginBottom:6, fontSize:12 }}>
                  <span>{c.tipo==='persona'?'📄':'🧾'}</span>
                  <span style={{ flex:1 }}>{d.label}</span>
                  <button onClick={async () => {
                    for (const ext of ['pdf','jpg','jpeg','png']) {
                      const { data } = await supabase.storage.from('contratos').createSignedUrl(`${d.key}.${ext}`, 120)
                      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
                    }
                    alert('Documento no encontrado. Súbelo primero.')
                  }} style={{ fontSize:10, padding:'2px 7px', border:'1px solid #185FA5', borderRadius:5, background:'transparent', color:'#185FA5', cursor:'pointer' }}>Ver</button>
                  <button onClick={async () => {
                    for (const ext of ['pdf','jpg','jpeg','png']) {
                      const { data } = await supabase.storage.from('contratos').createSignedUrl(`${d.key}.${ext}`, 120)
                      if (data?.signedUrl) { const a=document.createElement('a'); a.href=data.signedUrl; a.download=`${d.label}.${ext}`; a.click(); return }
                    }
                    alert('Documento no encontrado.')
                  }} style={{ fontSize:10, padding:'2px 7px', border:'1px solid #e5e7eb', borderRadius:5, background:'transparent', color:'#6b7280', cursor:'pointer' }}>📥</button>
                  <label style={{ fontSize:10, padding:'2px 7px', border:'1px solid #3B6D11', borderRadius:5, color:'#3B6D11', cursor:'pointer' }}>
                    ↑ Subir
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const ext = file.name.split('.').pop()
                        const { error } = await supabase.storage.from('contratos').upload(`${d.key}.${ext}`, file, { upsert:true })
                        if (error) alert('Error al subir: ' + error.message)
                        else alert(`✅ ${d.label} subido correctamente`)
                      }}/>
                  </label>
                </div>
              ))}
              {c.tipo === 'persona' && (
                <button style={{ marginTop:8, width:'100%', padding:'6px', border:'1px solid #185FA5', borderRadius:8, background:'transparent', color:'#185FA5', fontSize:11, cursor:'pointer' }}>
                  📄 Generar liquidación
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {abierto && c.estado === 'activo' && (
          <div style={{ padding:'10px 16px', display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center', background:'#fff' }}>
            <button style={{ padding:'6px 14px', border:'1px solid #e5e7eb', borderRadius:8, background:'transparent', fontSize:12, cursor:'pointer', color:'#6b7280' }}>
              ✏️ Editar contrato
            </button>
            <button onClick={() => generarFiniquito(c)}
              style={{ padding:'6px 14px', border:'1px solid #A32D2D', borderRadius:8, background:'transparent', fontSize:12, cursor:'pointer', color:'#A32D2D', fontWeight:500 }}>
              📄 Generar finiquito
            </button>
            {confirmEliminarContrato === c.id ? (
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#FCEBEB', border:'1px solid #F5C5C5', borderRadius:8, padding:'4px 10px' }}>
                <span style={{ fontSize:11, color:'#A32D2D' }}>¿Eliminar?</span>
                <button onClick={() => { eliminarContrato(c); setConfirmEliminarContrato(null) }}
                  style={{ fontSize:11, padding:'2px 8px', border:'none', borderRadius:4, background:'#A32D2D', color:'#fff', cursor:'pointer' }}>Sí</button>
                <button onClick={() => setConfirmEliminarContrato(null)}
                  style={{ fontSize:11, padding:'2px 8px', border:'1px solid #e5e7eb', borderRadius:4, background:'#fff', cursor:'pointer' }}>No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmEliminarContrato(c.id)}
                style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'transparent', color:'#9ca3af', fontSize:12, cursor:'pointer' }}>
                🗑 Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', overflowX:'hidden' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', minWidth:0, background:'#fff' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Contratos</h1>
            <p style={{ fontSize:13, color:'#6b7280' }}>Honorarios de personas, contratos con empresas, pagos y finiquitos</p>
          </div>
          <button onClick={() => setMostrarForm(!mostrarForm)}
            style={{ padding:'8px 16px', border:'none', borderRadius:8, background:'#3B6D11', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            + Nuevo contrato
          </button>
        </div>

        {mensaje && (
          <div style={{ background:mensaje.startsWith('✅')?'#EAF3DE':'#FCEBEB', border:`1px solid ${mensaje.startsWith('✅')?'#97C459':'#F5C5C5'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color:mensaje.startsWith('✅')?'#3B6D11':'#A32D2D', marginBottom:16 }}>
            {mensaje}
          </div>
        )}

        {/* Form nuevo contrato */}
        {mostrarForm && (
          <div style={{ border:'1px solid #97C459', borderRadius:12, padding:18, marginBottom:20, background:'#FAFFF5' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'#3B6D11' }}>📋 Nuevo contrato</div>

            {/* Tipo */}
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[{v:'persona',l:'👤 Persona (honorarios)'},{v:'empresa',l:'🏢 Empresa'}].map(t => (
                <button key={t.v} onClick={() => setNcTipo(t.v as typeof ncTipo)}
                  style={{ padding:'7px 16px', border:`1.5px solid ${ncTipo===t.v?'#3B6D11':'#e5e7eb'}`, borderRadius:8, background:ncTipo===t.v?'#EAF3DE':'#fff', color:ncTipo===t.v?'#3B6D11':'#6b7280', fontSize:12, cursor:'pointer', fontWeight:ncTipo===t.v?600:400 }}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{ ...s.grid3, marginBottom:12 }}>
              <div style={s.field}><label style={s.label}>Nombre / Razón social *</label><input style={s.input} value={ncNombre} onChange={e=>setNcNombre(e.target.value)} placeholder="Nombre completo"/></div>
              <div style={s.field}>
                <label style={s.label}>RUT *</label>
                <input
                  style={{ ...s.input, borderColor: ncRutError ? '#E24B4A' : ncRut && validarRut(ncRut) ? '#97C459' : '#d1d5db' }}
                  value={ncRut}
                  placeholder="Ej: 12345678-9"
                  onChange={e => {
                    const val = formatearRut(e.target.value)
                    setNcRut(val)
                    if (val && !validarRut(val)) setNcRutError('RUT inválido')
                    else setNcRutError('')
                  }}
                  onBlur={() => setNcRutError(ncRut && !validarRut(ncRut) ? 'RUT inválido. Verifica el dígito verificador.' : '')}
                />
                {ncRutError && <span style={{ fontSize:11, color:'#E24B4A', marginTop:2 }}>{ncRutError}</span>}
                {!ncRutError && ncRut && validarRut(ncRut) && <span style={{ fontSize:11, color:'#3B6D11', marginTop:2 }}>✓ RUT válido</span>}
              </div>
              <div style={s.field}><label style={s.label}>Rol / Función</label><input style={s.input} value={ncRol} onChange={e=>setNcRol(e.target.value)} placeholder="Ej: Cultivador"/></div>
              <div style={s.field}>
                <label style={s.label}>Período de pago *</label>
                <div style={{ display:'flex', flexWrap:'wrap' as const, gap:6 }}>
                  {([
                    {v:'semanal', l:'Semanal'},
                    {v:'quincenal', l:'Quincenal'},
                    {v:'mensual', l:'Mensual'},
                    {v:'bimestral', l:'Bimestral'},
                    {v:'trimestral', l:'Trimestral'},
                    {v:'semestral', l:'Semestral'},
                    {v:'anual', l:'Anual'},
                  ] as const).map(p => (
                    <button key={p.v} type="button" onClick={() => setNcPeriodo(p.v)}
                      style={{ padding:'5px 12px', border:`1.5px solid ${ncPeriodo===p.v?'#185FA5':'#e5e7eb'}`, borderRadius:20, background:ncPeriodo===p.v?'#E6F1FB':'#fff', color:ncPeriodo===p.v?'#185FA5':'#6b7280', fontSize:11, cursor:'pointer', fontWeight:ncPeriodo===p.v?600:400 }}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Monto neto por período ($) *</label>
                <input style={s.input} type="number" value={ncMonto} onChange={e=>setNcMonto(e.target.value)} placeholder="0"/>
                {ncTipo === 'empresa' && <span style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>Ingresa el monto neto (sin IVA)</span>}
              </div>
              {ncTipo === 'persona' && (
                <div style={s.field}>
                  <label style={s.label}>Retención % (Ley 21.133 · 2026)</label>
                  <input style={{ ...s.input, background:'#f9fafb' }} value={ncRetencion} onChange={e=>setNcRetencion(e.target.value)} />
                  <span style={{ fontSize:10, color:'#185FA5' }}>Vigente 2026: 15.25% · Sube a 16% en 2027</span>
                </div>
              )}
              {ncTipo === 'persona' && ncMonto && (
                <div style={{ ...s.field, justifyContent:'flex-end' }}>
                  <div style={{ background:'#EAF3DE', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#3B6D11' }}>
                    <div>Bruto: ${parseInt(ncMonto||'0').toLocaleString('es-CL')}</div>
                    <div>Retención: ${retencionMonto(parseInt(ncMonto||'0'),parseFloat(ncRetencion||'0')).toLocaleString('es-CL')}</div>
                    <div style={{ fontWeight:700 }}>Líquido: ${montoLiquido(parseInt(ncMonto||'0'),parseFloat(ncRetencion||'0'),'persona').toLocaleString('es-CL')}</div>
                  </div>
                </div>
              )}
              {ncTipo === 'empresa' && ncMonto && (
                <div style={{ ...s.field, justifyContent:'flex-end' }}>
                  <div style={{ background:'#E6F1FB', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#185FA5' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:4 }}>
                      <span>Neto:</span>
                      <span>${parseInt(ncMonto||'0').toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:4 }}>
                      <span>IVA (19%):</span>
                      <span>${Math.round(parseInt(ncMonto||'0') * 0.19).toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:16, borderTop:'1px solid #A8CBF0', paddingTop:4, fontWeight:700 }}>
                      <span>Total con IVA:</span>
                      <span>${Math.round(parseInt(ncMonto||'0') * 1.19).toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>
              )}
              <div style={s.field}><label style={s.label}>Fecha inicio *</label><input style={s.input} type="date" value={ncFechaInicio} onChange={e=>setNcFechaInicio(e.target.value)}/></div>
              <div style={s.field}><label style={s.label}>Fecha término (dejar vacío si indefinido)</label><input style={s.input} type="date" value={ncFechaTermino} onChange={e=>setNcFechaTermino(e.target.value)}/></div>
            </div>
            <div style={{ ...s.field, marginBottom:14 }}>
              <label style={s.label}>Notas</label>
              <textarea style={{ ...s.input, height:50, resize:'none' }} value={ncNotas} onChange={e=>setNcNotas(e.target.value)} placeholder="Observaciones del contrato..."/>
            </div>
            {/* Subir contrato firmado */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 14px', marginBottom:12, background:'#f9fafb', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>📄</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>Contrato firmado (opcional)</div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>{archivoContrato ? `✓ ${archivoContrato.name}` : 'Puedes subirlo ahora o después desde la tarjeta del contrato'}</div>
              </div>
              <label style={{ fontSize:12, padding:'5px 12px', border:'1px solid #3B6D11', borderRadius:8, color:'#3B6D11', cursor:'pointer' }}>
                {archivoContrato ? 'Cambiar' : '↑ Subir PDF'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && setArchivoContrato(e.target.files[0])} />
              </label>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setMostrarForm(false)} style={{ padding:'7px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={crearContrato} disabled={guardando} style={{ padding:'7px 16px', border:'none', borderRadius:8, background:'#3B6D11', color:'#EAF3DE', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {guardando ? 'Guardando...' : 'Crear contrato'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:20 }}>
          {[
            {key:'personas', label:'👤 Personas', count:contratos.filter(c=>c.tipo==='persona'&&c.estado==='activo').length},
            {key:'empresas', label:'🏢 Empresas', count:contratos.filter(c=>c.tipo==='empresa'&&c.estado==='activo').length},
            {key:'pendientes', label:'⏳ Pagos pendientes', count:pagosPendientes.length, warn:true},
            {key:'terminados', label:'📁 Terminados', count:contratos.filter(c=>c.estado==='terminado').length},
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              style={{ padding:'8px 16px', fontSize:13, background:'none', border:'none', cursor:'pointer', borderBottom:tab===t.key?'2px solid #185FA5':'2px solid transparent', color:tab===t.key?'#185FA5':'#6b7280', fontWeight:tab===t.key?600:400, marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              {t.count > 0 && <span style={{ fontSize:10, background:t.warn&&t.count>0?'#FAEEDA':'#f3f4f6', color:t.warn&&t.count>0?'#633806':'#6b7280', padding:'1px 6px', borderRadius:20 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando contratos...</div>
        ) : tab === 'pendientes' ? (
          pagosPendientes.length === 0 ? (
            <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>✅ No hay pagos pendientes</div>
          ) : pagosPendientes.map(p => {
            const c = contratos.find(c => c.id === p.contrato_id)
            if (!c) return null
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, border:'1px solid #FAEEDA', borderRadius:10, padding:'12px 16px', marginBottom:8, background:'#FFFBF5' }}>
                <span style={{ fontSize:16 }}>⏳</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{c.nombre} · {MESES[p.mes-1]} {p.año}</div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{c.rol_funcion} · Bruto ${p.monto_bruto.toLocaleString('es-CL')} · Retención ${p.retencion.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:'#3B6D11' }}>${p.monto_liquido.toLocaleString('es-CL')}</div>
                <button onClick={() => marcarPagado(p.id)} style={{ padding:'6px 14px', border:'none', borderRadius:8, background:'#3B6D11', color:'#EAF3DE', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  ✓ Registrar pago
                </button>
              </div>
            )
          })
        ) : contratosFiltrados.length === 0 ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>
            No hay contratos en esta categoría. Crea el primero con "+ Nuevo contrato".
          </div>
        ) : contratosFiltrados.map(c => <ContratoCard key={c.id} c={c} />)
        }
      </main>
    </div>
  )
}
