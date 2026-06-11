'use client'
import { useState, useEffect } from 'react'
import SidebarAdmin from '@/components/admin/SidebarAdmin'
import { supabase } from '@/lib/supabase'

interface Socio {
  nombre: string; telefono?: string; direccion?: string
  casa_depto?: string; comuna?: string; ciudad?: string
}

interface Despacho {
  id: string; orden_numero: string; cepa: string; gramos: number
  monto: number; estado: string; direccion_entrega: string
  medio_pago: string; mes: number; año: number; rut_socio: string
  created_at: string; socio_nombre?: string; socio_telefono?: string
  socio_direccion?: string; socio_casa_depto?: string
  socio_comuna?: string; socio_ciudad?: string
}

// Orden agrupada: múltiples ítems bajo el mismo número de orden base
interface OrdenAgrupada {
  ordenBase: string       // ej: GT-2026-88959
  items: Despacho[]       // todas las líneas de esa orden
  estado: string          // estado compartido (del primer ítem)
  montoTotal: number
  gramosTotal: number
  socio_nombre?: string; socio_telefono?: string; socio_rut?: string
  socio_direccion?: string; socio_casa_depto?: string
  socio_comuna?: string; socio_ciudad?: string
  mes: number; año: number; medio_pago: string; created_at: string
}

const estadoConfig: Record<string, {label:string, bg:string, color:string, next:string, nextLabel:string}> = {
  pagado:     { label:'💳 Pago confirmado', bg:'#EAF3DE', color:'#3B6D11', next:'preparando', nextLabel:'Iniciar preparación' },
  preparando: { label:'📦 Preparando',      bg:'#FAEEDA', color:'#633806', next:'despachado', nextLabel:'Marcar despachado' },
  despachado: { label:'🚚 En camino',       bg:'#E6F1FB', color:'#185FA5', next:'entregado',  nextLabel:'Confirmar entrega' },
  entregado:  { label:'✅ Entregado',       bg:'#f3f4f6', color:'#374151', next:'',           nextLabel:'' },
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Extrae la parte base del número de orden: GT-2026-88959-JAC → GT-2026-88959
const ordenBase = (orden: string) => {
  const partes = orden.split('-')
  return partes.length >= 3 ? partes.slice(0, 3).join('-') : orden
}

const imprimirEtiqueta = (o: OrdenAgrupada) => {
  const fecha = new Date(o.created_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Etiqueta ${o.ordenBase}</title>
    <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; padding: 20px; }
    .etiqueta { border: 2px solid #000; padding: 16px; max-width: 400px; margin: 0 auto; }
    .logo { font-size: 18px; font-weight: bold; color: #3B6D11; margin-bottom: 12px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
    .logo span { font-size: 12px; color: #666; font-weight: normal; display: block; }
    .orden { font-size: 22px; font-weight: bold; letter-spacing: 1px; margin: 10px 0; }
    .seccion { margin-top: 10px; } .seccion-titulo { font-size: 9px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 4px; }
    .seccion-valor { font-size: 13px; font-weight: 500; } .seccion-valor.grande { font-size: 15px; font-weight: bold; }
    .separador { border-top: 1px dashed #ccc; margin: 10px 0; }
    .pie { font-size: 9px; color: #999; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; }
    @media print { body { padding: 0; } }</style></head><body>
    <div class="etiqueta">
      <div class="logo">🌿 GreenTech<span>Asociación de Usuarios de Plantas Medicinales</span></div>
      <div class="orden">#${o.ordenBase}</div>
      <div style="font-size:11px; color:#666;">${fecha}</div>
      <div class="separador"></div>
      <div class="seccion"><div class="seccion-titulo">Destinatario</div>
        <div class="seccion-valor grande">${o.socio_nombre || '—'}</div>
        <div class="seccion-valor" style="font-size:11px; color:#555;">RUT: ${o.socio_rut || '—'}</div>
        ${o.socio_telefono && o.socio_telefono !== '—' ? `<div class="seccion-valor" style="font-size:11px;">Tel: ${o.socio_telefono}</div>` : ''}
      </div>
      <div class="separador"></div>
      <div class="seccion"><div class="seccion-titulo">Dirección de entrega</div>
        <div class="seccion-valor grande">${o.socio_direccion || '—'}${o.socio_casa_depto ? ', ' + o.socio_casa_depto : ''}</div>
        <div class="seccion-valor" style="font-size:12px;">${[o.socio_comuna, o.socio_ciudad].filter(Boolean).join(', ') || '—'}</div>
      </div>
      <div class="pie">Uso medicinal exclusivo · Solo para uso del titular · No transferible<br/>GreenTech · Reg. 390054 · ${fecha}</div>
    </div>
    <script>window.onload = () => { window.print(); }</script></body></html>`
  const v = window.open('', '_blank', 'width=500,height=600')
  if (v) { v.document.write(html); v.document.close() }
}

const imprimirReceta = async (o: OrdenAgrupada) => {
  if (!o.socio_rut) { alert('No se encontró el RUT del socio'); return }

  // Intentar múltiples variantes del RUT como nombre de carpeta/archivo
  const rut = o.socio_rut.trim()
  const rutSinPuntos = rut.replace(/\./g, '')
  const rutSinGuion = rut.replace(/-/g, '')
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '')

  const variantes = [
    rut + '/receta.pdf',
    rutSinPuntos + '/receta.pdf',
    rutLimpio + '/receta.pdf',
    rut + '/receta.PDF',
    rutSinPuntos + '/receta.PDF',
  ]

  for (const path of variantes) {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
      return
    }
  }

  // Si no se encontró como PDF, listar archivos en la carpeta del socio
  const carpetas = [rut, rutSinPuntos, rutLimpio]
  for (const carpeta of carpetas) {
    const { data: files } = await supabase.storage.from('documentos').list(carpeta)
    if (files && files.length > 0) {
      const receta = files.find(f => f.name.toLowerCase().includes('receta'))
      if (receta) {
        const { data } = await supabase.storage.from('documentos').createSignedUrl(carpeta + '/' + receta.name, 60)
        if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
      }
      // Mostrar archivos encontrados si no hay uno llamado "receta"
      alert(`Se encontraron archivos en la carpeta del socio (${carpeta}), pero ninguno con el nombre "receta":\n${files.map(f => f.name).join('\n')}\n\nVerifica el nombre del archivo en Supabase Storage.`)
      return
    }
  }

  alert(`No se encontró la receta médica del socio.\n\nCarpetas buscadas: ${carpetas.join(', ')}\n\nVerifica que el archivo esté en Supabase Storage > documentos > [RUT del socio] > receta.pdf`)
}

const imprimirComprobante = (o: OrdenAgrupada) => {
  const fecha = new Date(o.created_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
  const lineas = o.items.map(i => `<div class="fila"><span class="key">${i.cepa}</span><span class="val">${i.gramos} gr · $${i.monto.toLocaleString('es-CL')}</span></div>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comprobante ${o.ordenBase}</title>
    <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; padding: 20px; }
    .c { border: 2px solid #185FA5; padding: 20px; max-width: 500px; margin: 0 auto; }
    .logo { font-size: 18px; font-weight: bold; color: #185FA5; margin-bottom: 4px; }
    .logo span { font-size: 11px; color: #666; font-weight: normal; display: block; }
    .titulo { font-size: 16px; font-weight: bold; text-align: center; margin: 14px 0; padding: 8px; background: #E6F1FB; border-radius: 6px; color: #185FA5; }
    .orden { font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 2px; color: #185FA5; margin: 8px 0; }
    .monto { font-size: 28px; font-weight: bold; text-align: center; color: #185FA5; margin: 16px 0 4px; }
    .sep { border-top: 1px dashed #ccc; margin: 12px 0; }
    .fila { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
    .fila .key { color: #666; } .fila .val { font-weight: 600; }
    .st { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin: 12px 0 6px; }
    .pie { font-size: 9px; color: #999; text-align: center; margin-top: 16px; padding-top: 8px; border-top: 1px solid #eee; }
    @media print { body { padding: 0; } }</style></head><body>
    <div class="c">
      <div class="logo">🌿 GreenTech<span>Asociación de Usuarios de Plantas Medicinales</span></div>
      <div class="titulo">COMPROBANTE DE PAGO</div>
      <div class="orden">#${o.ordenBase}</div>
      <div style="text-align:center;margin-bottom:12px;"><span style="padding:4px 14px;background:#EAF3DE;border-radius:20px;font-size:12px;font-weight:600;color:#3B6D11;">✅ Pago confirmado</span></div>
      <div class="monto">$${o.montoTotal.toLocaleString('es-CL')}</div>
      <div style="font-size:11px;text-align:center;color:#666;margin-bottom:12px;">${o.medio_pago || 'Webpay Plus'} · ${fecha}</div>
      <div class="sep"></div>
      <div class="st">Socio</div>
      <div class="fila"><span class="key">Nombre</span><span class="val">${o.socio_nombre || '—'}</span></div>
      <div class="fila"><span class="key">RUT</span><span class="val">${o.socio_rut || '—'}</span></div>
      <div class="sep"></div>
      <div class="st">Productos dispensados</div>
      ${lineas}
      <div class="fila" style="font-weight:700;margin-top:4px;"><span class="key">Total</span><span class="val">$${o.montoTotal.toLocaleString('es-CL')}</span></div>
      <div class="pie">GreenTech · Asociación sin fines de lucro · Reg. 390054<br/>Este comprobante acredita el aporte ordinario del socio · ${fecha}</div>
    </div>
    <script>window.onload = () => { window.print(); }</script></body></html>`
  const v = window.open('', '_blank', 'width=600,height=750')
  if (v) { v.document.write(html); v.document.close() }
}

export default function Despachos() {
  const [despachos, setDespachos] = useState<Despacho[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [procesando, setProcesando] = useState<string|null>(null)
  const [mensaje, setMensaje] = useState('')
  const [expandido, setExpandido] = useState<string|null>(null)
  const [checklistState, setChecklistState] = useState<Record<string, boolean[]>>({})
  const [modalFotoEntrega, setModalFotoEntrega] = useState<OrdenAgrupada|null>(null)
  const [fotoEntrega, setFotoEntrega] = useState<File|null>(null)
  const [fotoPreview, setFotoPreview] = useState<string|null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [modalVerFoto, setModalVerFoto] = useState<{url:string, ordenBase:string}|null>(null)
  const [buscandoFoto, setBuscandoFoto] = useState<string|null>(null)

  const toggleCheck = (ordenId: string, idx: number, total: number) => {
    setChecklistState(prev => {
      const actual = prev[ordenId] || Array(total).fill(false)
      const anterior = idx === 0 || actual[idx - 1]
      if (!anterior && !actual[idx]) return prev
      const nuevo = [...actual]
      nuevo[idx] = !nuevo[idx]
      if (!nuevo[idx]) { for (let i = idx + 1; i < total; i++) nuevo[i] = false }
      return { ...prev, [ordenId]: nuevo }
    })
  }

  useEffect(() => { cargarDespachos() }, [])

  const cargarDespachos = async () => {
    setLoading(true)
    const { data: dispData } = await supabase.from('dispensaciones').select('*').order('created_at', { ascending: false })
    if (!dispData) { setLoading(false); return }

    const ruts = [...new Set(dispData.map((d: any) => d.rut_socio).filter(Boolean))]
    let sociosMap: Record<string, Socio> = {}
    if (ruts.length > 0) {
      const { data: sociosData } = await supabase.from('socios').select('rut, nombre, telefono, direccion, casa_depto, comuna, ciudad').in('rut', ruts)
      if (sociosData) {
        sociosData.forEach((s: any) => {
          sociosMap[s.rut] = { nombre: s.nombre, telefono: s.telefono, direccion: s.direccion, casa_depto: s.casa_depto, comuna: s.comuna, ciudad: s.ciudad }
        })
      }
    }

    const combined: Despacho[] = dispData.map((d: any) => ({
      ...d,
      socio_nombre:     sociosMap[d.rut_socio]?.nombre     || 'Socio desconocido',
      socio_telefono:   sociosMap[d.rut_socio]?.telefono   || '—',
      socio_direccion:  sociosMap[d.rut_socio]?.direccion  || d.direccion_entrega || 'No especificada',
      socio_casa_depto: sociosMap[d.rut_socio]?.casa_depto || '',
      socio_comuna:     sociosMap[d.rut_socio]?.comuna     || '',
      socio_ciudad:     sociosMap[d.rut_socio]?.ciudad     || '',
    }))

    setDespachos(combined)
    setLoading(false)
  }

  // Agrupar dispensaciones por orden base
  const ordenesAgrupadas: OrdenAgrupada[] = (() => {
    const mapa: Record<string, Despacho[]> = {}
    despachos.forEach(d => {
      const base = ordenBase(d.orden_numero)
      if (!mapa[base]) mapa[base] = []
      mapa[base].push(d)
    })
    return Object.entries(mapa).map(([base, items]) => {
      const ref = items[0]
      return {
        ordenBase: base,
        items,
        estado: ref.estado,
        montoTotal: items.reduce((a, i) => a + i.monto, 0),
        gramosTotal: items.reduce((a, i) => a + i.gramos, 0),
        socio_nombre:     ref.socio_nombre,
        socio_telefono:   ref.socio_telefono,
        socio_rut:        ref.rut_socio,
        socio_direccion:  ref.socio_direccion,
        socio_casa_depto: ref.socio_casa_depto,
        socio_comuna:     ref.socio_comuna,
        socio_ciudad:     ref.socio_ciudad,
        mes: ref.mes, año: ref.año,
        medio_pago: ref.medio_pago,
        created_at: ref.created_at,
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  })()

  const avanzarEstado = async (orden: OrdenAgrupada) => {
    const cfg = estadoConfig[orden.estado]
    if (!cfg?.next) return
    // Si va a confirmar entrega, abrir modal de foto primero
    if (orden.estado === 'despachado') {
      setModalFotoEntrega(orden)
      setFotoEntrega(null)
      setFotoPreview(null)
      return
    }
    setProcesando(orden.ordenBase)
    for (const item of orden.items) {
      await supabase.from('dispensaciones').update({ estado: cfg.next }).eq('id', item.id)
    }
    setDespachos(prev => prev.map(d => ordenBase(d.orden_numero) === orden.ordenBase ? { ...d, estado: cfg.next } : d))
    setMensaje(`✅ Orden ${orden.ordenBase} → "${estadoConfig[cfg.next]?.label}"`)
    setTimeout(() => setMensaje(''), 3000)
    setProcesando(null)
  }

  const confirmarEntregaConFoto = async () => {
    if (!modalFotoEntrega) return
    setSubiendoFoto(true)
    const orden = modalFotoEntrega

    // Subir foto si hay una seleccionada
    if (fotoEntrega) {
      const ext = fotoEntrega.name.split('.').pop() || 'jpg'
      const path = `entregas/${orden.ordenBase}_${Date.now()}.${ext}`
      await supabase.storage.from('documentos').upload(path, fotoEntrega, { upsert: true })
    }

    // Avanzar estado a entregado
    for (const item of orden.items) {
      await supabase.from('dispensaciones').update({ estado: 'entregado' }).eq('id', item.id)
    }
    setDespachos(prev => prev.map(d => ordenBase(d.orden_numero) === orden.ordenBase ? { ...d, estado: 'entregado' } : d))
    setMensaje(`✅ Orden ${orden.ordenBase} confirmada como entregada`)
    setTimeout(() => setMensaje(''), 3000)

    setSubiendoFoto(false)
    setModalFotoEntrega(null)
    setFotoEntrega(null)
    setFotoPreview(null)
  }

  const verFotoEntrega = async (orden: OrdenAgrupada) => {
    setBuscandoFoto(orden.ordenBase)
    const { data: files } = await supabase.storage.from('documentos').list('entregas')
    if (files) {
      const foto = files.find(f => f.name.startsWith(orden.ordenBase))
      if (foto) {
        const { data } = await supabase.storage.from('documentos').createSignedUrl('entregas/' + foto.name, 300)
        if (data?.signedUrl) {
          setModalVerFoto({ url: data.signedUrl, ordenBase: orden.ordenBase })
          setBuscandoFoto(null)
          return
        }
      }
    }
    setBuscandoFoto(null)
    alert('No se encontró foto de respaldo para esta entrega.')
  }

  const ordenesFiltradas = ordenesAgrupadas.filter(o => {
    if (filtroEstado === 'todos') return true
    if (filtroEstado === 'activos') return o.estado !== 'entregado'
    return o.estado === filtroEstado
  })

  // Conteos por orden única (no por línea)
  const conteo = {
    pagado:     ordenesAgrupadas.filter(o => o.estado === 'pagado').length,
    preparando: ordenesAgrupadas.filter(o => o.estado === 'preparando').length,
    despachado: ordenesAgrupadas.filter(o => o.estado === 'despachado').length,
    entregado:  ordenesAgrupadas.filter(o => o.estado === 'entregado').length,
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SidebarAdmin />
      <main style={{ flex:1, padding:24, overflowY:'auto', background:'#fff' }}>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:18, fontWeight:600, marginBottom:3 }}>Gestión de despachos</h1>
          <p style={{ fontSize:13, color:'#6b7280' }}>Prepara, despacha y confirma entrega de los pedidos</p>
        </div>

        {mensaje && (
          <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#3B6D11', marginBottom:16 }}>{mensaje}</div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Pagos por preparar', value:conteo.pagado,    color:'#3B6D11', icon:'💳' },
            { label:'En preparación',     value:conteo.preparando, color:'#633806', icon:'📦' },
            { label:'En camino',          value:conteo.despachado, color:'#185FA5', icon:'🚚' },
            { label:'Entregados',         value:conteo.entregado,  color:'#9ca3af', icon:'✅' },
          ].map((m,i) => (
            <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize:26, fontWeight:700, color:m.value>0?m.color:'#9ca3af' }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' as const }}>
          {[
            { key:'todos', label:'Todos' }, { key:'activos', label:'🔔 Activos' },
            { key:'pagado', label:'💳 Por preparar' }, { key:'preparando', label:'📦 Preparando' },
            { key:'despachado', label:'🚚 En camino' }, { key:'entregado', label:'✅ Entregados' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              style={{ padding:'6px 14px', border:`1px solid ${filtroEstado===f.key?'#185FA5':'#e5e7eb'}`, borderRadius:20, fontSize:12, background:filtroEstado===f.key?'#E6F1FB':'#fff', color:filtroEstado===f.key?'#185FA5':'#6b7280', cursor:'pointer', fontWeight:filtroEstado===f.key?600:400 }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center' }}>Cargando despachos...</div>
        ) : ordenesFiltradas.length === 0 ? (
          <div style={{ fontSize:13, color:'#9ca3af', padding:40, textAlign:'center', border:'1px dashed #e5e7eb', borderRadius:12 }}>No hay despachos en esta categoría</div>
        ) : (
          ordenesFiltradas.map(o => {
            const cfg = estadoConfig[o.estado] || estadoConfig.pagado
            const abierto = expandido === o.ordenBase
            const borderColor = o.estado==='pagado'?'#97C459':o.estado==='preparando'?'#EF9F27':o.estado==='despachado'?'#A8CBF0':'#e5e7eb'
            return (
              <div key={o.ordenBase} style={{ border:`1px solid ${borderColor}`, borderRadius:12, marginBottom:10, overflow:'hidden' }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:o.estado==='entregado'?'#f9fafb':'#fff', cursor:'pointer' }}
                  onClick={() => setExpandido(abierto ? null : o.ordenBase)}>
                  <div style={{ width:38, height:38, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🌿</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>#{o.ordenBase}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>
                      {o.items.map(i => `${i.cepa} ${i.gramos}gr`).join(' · ')} · {MESES[(o.mes||1)-1]} {o.año} · {o.medio_pago||'—'}
                    </div>
                    {o.socio_nombre && (
                      <div style={{ fontSize:11, color:'#374151', fontWeight:500, marginTop:2 }}>
                        👤 {o.socio_nombre}{o.socio_rut ? ` · ${o.socio_rut}` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#3B6D11' }}>${o.montoTotal.toLocaleString('es-CL')}</span>
                    <span style={{ fontSize:10, padding:'3px 9px', borderRadius:20, background:cfg.bg, color:cfg.color, fontWeight:500 }}>{cfg.label}</span>
                    <span style={{ fontSize:12, color:'#9ca3af' }}>{abierto?'▲':'▼'}</span>
                  </div>
                </div>

                {abierto && (
                  <div style={{ borderTop:'1px solid #f3f4f6' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>

                      {/* Col 1: productos */}
                      <div style={{ padding:'14px 16px', borderRight:'1px solid #f3f4f6' }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Productos del pedido</div>
                        {o.items.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderBottom:'1px solid #f9fafb' }}>
                            <span style={{ color:'#374151', fontWeight:500 }}>{item.cepa}</span>
                            <span style={{ color:'#6b7280' }}>{item.gramos} gr · ${item.monto.toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, paddingTop:8, marginTop:4, borderTop:'1px solid #e5e7eb' }}>
                          <span>Total</span>
                          <span style={{ color:'#3B6D11' }}>{o.gramosTotal} gr · ${o.montoTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#9ca3af', marginTop:8 }}>
                          {new Date(o.created_at).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})} · {o.medio_pago||'—'}
                        </div>
                      </div>

                      {/* Col 2: socio + dirección + checklist */}
                      <div style={{ padding:'14px 16px' }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Despacho a domicilio</div>

                        <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:12 }}>
                          <div style={{ fontWeight:600, marginBottom:6, color:'#374151' }}>👤 Datos del socio</div>
                          {[
                            { k:'Nombre', v:o.socio_nombre||'—' },
                            { k:'RUT',    v:o.socio_rut||'—' },
                            { k:'Fono',   v:o.socio_telefono||'—' },
                          ].map((r,i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #f0f0f0' }}>
                              <span style={{ color:'#6b7280' }}>{r.k}</span>
                              <span style={{ fontWeight:500 }}>{r.v}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12 }}>
                          <div style={{ fontWeight:600, marginBottom:4, color:'#374151' }}>📍 Dirección de entrega</div>
                          <div style={{ color:'#374151', lineHeight:1.6 }}>
                            <div>{o.socio_direccion||'No especificada'}{o.socio_casa_depto ? `, ${o.socio_casa_depto}` : ''}</div>
                            {(o.socio_comuna || o.socio_ciudad) && <div style={{ color:'#6b7280' }}>{[o.socio_comuna, o.socio_ciudad].filter(Boolean).join(', ')}</div>}
                          </div>
                        </div>

                        {o.estado === 'preparando' && (() => {
                          const checkItems = [
                            'Verificar calidad y humedad del producto',
                            `Pesar y separar ${o.items.map(i => `${i.gramos}gr de ${i.cepa}`).join(', ')}`,
                            'Empacar en bolsa(s) hermética(s)',
                            'Etiquetar con número de orden',
                            'Adjuntar receta médica del socio',
                            'Adjuntar comprobante de pago',
                          ]
                          const checks = checklistState[o.ordenBase] || Array(checkItems.length).fill(false)
                          return (
                            <div>
                              <div style={{ fontSize:11, fontWeight:600, color:'#633806', marginBottom:8 }}>Lista de preparación</div>
                              {checkItems.map((item, i) => {
                                const marcado = checks[i]
                                const habilitado = i === 0 || checks[i - 1]
                                return (
                                  <div key={i} onClick={() => habilitado && toggleCheck(o.ordenBase, i, checkItems.length)}
                                    style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', fontSize:12, borderBottom:'1px solid #fdf6ed', borderRadius:6, marginBottom:2, cursor:habilitado?'pointer':'not-allowed', background:marcado?'#FDF5E6':habilitado?'#fff':'#f9fafb', opacity:habilitado?1:0.4 }}>
                                    <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${marcado?'#633806':'#d1d5db'}`, background:marcado?'#633806':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                      {marcado && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                                    </div>
                                    <span style={{ color:marcado?'#633806':habilitado?'#374151':'#9ca3af', textDecoration:marcado?'line-through':'none' }}>{item}</span>
                                  </div>
                                )
                              })}
                              {!checks.every(Boolean) && <div style={{ fontSize:11, color:'#9ca3af', marginTop:8, fontStyle:'italic' }}>⚠️ Completa todos los pasos en orden antes de marcar como despachado</div>}
                            </div>
                          )
                        })()}

                        {o.estado === 'despachado' && (
                          <div style={{ background:'#E6F1FB', border:'1px solid #A8CBF0', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#185FA5' }}>
                            🚚 Pedido en camino. Confirma la entrega cuando llegue al domicilio.
                          </div>
                        )}
                        {o.estado === 'entregado' && (
                          <div>
                            <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#3B6D11', marginBottom:10 }}>
                              ✅ Entregado correctamente. Registro completo.
                            </div>
                            <button onClick={() => verFotoEntrega(o)} disabled={buscandoFoto === o.ordenBase}
                              style={{ width:'100%', padding:'9px 14px', border:'1px solid #97C459', borderRadius:8, background:'#fff', color:'#3B6D11', fontSize:12, fontWeight:600, cursor: buscandoFoto === o.ordenBase ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                              {buscandoFoto === o.ordenBase ? '🔍 Buscando...' : '📷 Ver foto de entrega'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding:'12px 16px', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafafa' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => imprimirEtiqueta(o)}
                          style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          🖨️ Etiqueta
                        </button>
                        <button onClick={() => imprimirReceta(o)}
                          style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          📋 Receta médica
                        </button>
                        <button onClick={() => imprimirComprobante(o)}
                          style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          💳 Comprobante
                        </button>
                      </div>
                      {o.estado !== 'entregado' && (() => {
                        const total = 6
                        const checks = checklistState[o.ordenBase] || []
                        const checklistCompleto = o.estado !== 'preparando' || (checks.length === total && checks.every(Boolean))
                        return (
                          <button onClick={() => checklistCompleto && avanzarEstado(o)} disabled={procesando===o.ordenBase || !checklistCompleto}
                            style={{ padding:'8px 20px', border:'none', borderRadius:8, background:procesando===o.ordenBase||!checklistCompleto?'#9ca3af':cfg.color, color:'#fff', fontSize:13, fontWeight:600, cursor:procesando===o.ordenBase||!checklistCompleto?'not-allowed':'pointer' }}>
                            {procesando===o.ordenBase ? 'Procesando...' : `${cfg.nextLabel} →`}
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
      {/* Modal ver foto de entrega */}
      {modalVerFoto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setModalVerFoto(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, maxWidth:560, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#374151' }}>📷 Foto de entrega</div>
                <div style={{ fontSize:12, color:'#9ca3af' }}>Orden #{modalVerFoto.ordenBase}</div>
              </div>
              <button onClick={() => setModalVerFoto(null)}
                style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', color:'#374151', fontSize:13, cursor:'pointer' }}>
                ✕ Cerrar
              </button>
            </div>
            <img src={modalVerFoto.url} alt="Foto de entrega"
              style={{ width:'100%', borderRadius:10, objectFit:'contain', maxHeight:420, background:'#f9fafb' }} />
            <a href={modalVerFoto.url} target="_blank" rel="noreferrer"
              style={{ display:'block', marginTop:12, padding:'9px', border:'1px solid #d1d5db', borderRadius:8, background:'#f9fafb', color:'#374151', fontSize:12, textAlign:'center', textDecoration:'none', fontWeight:600 }}>
              🔗 Abrir en pantalla completa
            </a>
          </div>
        </div>
      )}

      {/* Modal confirmación entrega con foto */}
      {modalFotoEntrega && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:480, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#185FA5', marginBottom:4 }}>✅ Confirmar entrega</div>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Orden #{modalFotoEntrega.ordenBase} · {modalFotoEntrega.socio_nombre}</div>

            <div style={{ background:'#f9fafb', border:'2px dashed #d1d5db', borderRadius:12, padding:20, textAlign:'center', marginBottom:16, cursor:'pointer' }}
              onClick={() => document.getElementById('input-foto-entrega')?.click()}>
              {fotoPreview ? (
                <img src={fotoPreview} alt="preview" style={{ maxHeight:200, maxWidth:'100%', borderRadius:8, objectFit:'contain' }} />
              ) : (
                <>
                  <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                  <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}>Agregar foto como respaldo</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Toca para seleccionar o capturar foto (opcional)</div>
                </>
              )}
            </div>
            <input id="input-foto-entrega" type="file" accept="image/*" capture="environment" style={{ display:'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setFotoEntrega(file)
                  const reader = new FileReader()
                  reader.onload = ev => setFotoPreview(ev.target?.result as string)
                  reader.readAsDataURL(file)
                }
              }} />

            {fotoPreview && (
              <button onClick={() => { setFotoEntrega(null); setFotoPreview(null) }}
                style={{ width:'100%', padding:'7px', border:'1px solid #fca5a5', borderRadius:8, background:'#fff', color:'#dc2626', fontSize:12, cursor:'pointer', marginBottom:12 }}>
                🗑️ Quitar foto
              </button>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setModalFotoEntrega(null); setFotoEntrega(null); setFotoPreview(null) }}
                style={{ flex:1, padding:'10px', border:'1px solid #d1d5db', borderRadius:10, background:'#fff', color:'#374151', fontSize:13, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarEntregaConFoto} disabled={subiendoFoto}
                style={{ flex:2, padding:'10px', border:'none', borderRadius:10, background: subiendoFoto ? '#9ca3af' : '#185FA5', color:'#fff', fontSize:13, fontWeight:700, cursor: subiendoFoto ? 'not-allowed' : 'pointer' }}>
                {subiendoFoto ? 'Guardando...' : fotoEntrega ? '✅ Confirmar entrega con foto' : '✅ Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
