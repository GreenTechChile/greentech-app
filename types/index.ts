export type Rol = 'socio' | 'admin' | 'ambos'
export type EstadoSocio = 'pendiente' | 'activo' | 'rechazado' | 'inactivo'
export type EstadoDispensacion = 'pendiente' | 'pagado' | 'preparando' | 'despachado' | 'entregado'
export type EstadoLote = 'crecimiento' | 'cosechado' | 'secado' | 'procesado'

export interface Socio {
  id: string
  rut: string
  nombre: string
  email: string
  telefono: string
  direccion: string
  casa_depto?: string
  comuna: string
  ciudad: string
  estado_civil: string
  profesion: string
  diagnostico: string
  diagnostico_secundario?: string
  medico_nombre: string
  medico_rut: string
  folio_receta: string
  cuota_mensual: number
  gramos_delegados: number
  vencimiento_receta: string
  estado: EstadoSocio
  rol: Rol
  created_at: string
}

export interface Dispensacion {
  id: string
  socio_id: string
  socio?: Socio
  cepa: string
  gramos: number
  monto: number
  orden_numero: string
  estado: EstadoDispensacion
  mes: number
  año: number
  direccion_entrega: string
  instrucciones?: string
  created_at: string
}

export interface Cepa {
  id: string
  nombre: string
  tipo: 'sativa' | 'indica' | 'hibrida' | 'cbd'
  ratio_thc_cbd: string
  thc_pct: number
  cbd_pct: number
  efecto: string
  horario: string
  tags: string[]
  stock_gramos: number
  precio_3gr: number
  precio_7gr: number
  precio_10gr: number
  visible: boolean
}

export interface LoteCultivo {
  id: string
  codigo: string
  cepa: string
  plantas: number
  fecha_germinacion: string
  gramaje_humedo?: number
  gramaje_seco?: number
  estado: EstadoLote
  responsable: string
  cosecha_estimada?: string
  created_at: string
}

export interface Contrato {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  rut: string
  rol: string
  monto_bruto: number
  estado: 'activo' | 'terminado'
  fecha_inicio: string
  fecha_termino?: string
  created_at: string
}
