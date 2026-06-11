-- ============================================
-- GREENTECH - Script SQL completo para Supabase
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. SOCIOS
create table if not exists socios (
  id uuid default gen_random_uuid() primary key,
  rut text unique not null,
  nombre text not null,
  email text unique not null,
  telefono text,
  direccion text,
  casa_depto text,
  comuna text,
  ciudad text,
  estado_civil text,
  profesion text,
  diagnostico text,
  diagnostico_secundario text,
  medico_nombre text,
  medico_rut text,
  medico_domicilio text,
  folio_receta text,
  cuota_mensual integer default 0,
  gramos_delegados integer default 0,
  vencimiento_receta date,
  estado text default 'pendiente' check (estado in ('pendiente','activo','rechazado','inactivo')),
  rol text default 'socio' check (rol in ('socio','admin','ambos')),
  notas_admin text,
  created_at timestamptz default now()
);

-- 2. DISPENSACIONES
create table if not exists dispensaciones (
  id uuid default gen_random_uuid() primary key,
  socio_id uuid references socios(id) on delete cascade,
  cepa text not null,
  gramos integer not null check (gramos > 0),
  monto integer not null check (monto > 0),
  orden_numero text unique,
  estado text default 'pendiente' check (estado in ('pendiente','pagado','preparando','despachado','entregado')),
  mes integer check (mes between 1 and 12),
  año integer,
  direccion_entrega text,
  casa_depto_entrega text,
  comuna_entrega text,
  ciudad_entrega text,
  instrucciones text,
  medio_pago text,
  numero_transaccion text,
  created_at timestamptz default now()
);

-- 3. CEPAS E INVENTARIO
create table if not exists cepas (
  id uuid default gen_random_uuid() primary key,
  nombre text unique not null,
  tipo text check (tipo in ('sativa','indica','hibrida','cbd')),
  ratio_thc_cbd text,
  thc_pct numeric(5,2) default 0,
  cbd_pct numeric(5,2) default 0,
  efecto text,
  horario text,
  tags text[],
  descripcion text,
  stock_gramos integer default 0,
  precio_3gr integer default 0,
  precio_7gr integer default 0,
  precio_10gr integer default 0,
  visible boolean default true,
  updated_at timestamptz default now()
);

-- 4. LOTES DE CULTIVO
create table if not exists lotes_cultivo (
  id uuid default gen_random_uuid() primary key,
  codigo text unique not null,
  cepa text not null,
  plantas integer not null check (plantas > 0),
  fecha_germinacion date,
  gramaje_humedo integer,
  gramaje_seco integer,
  gramaje_seco_estimado integer,
  estado text default 'crecimiento' check (estado in ('crecimiento','cosechado','secado','procesado')),
  responsable text,
  cosecha_estimada date,
  notas text,
  created_at timestamptz default now()
);

-- 5. MOVIMIENTOS DE INVENTARIO
create table if not exists movimientos_inventario (
  id uuid default gen_random_uuid() primary key,
  cepa text not null,
  tipo text check (tipo in ('ingreso','egreso','ajuste')),
  gramos integer not null,
  concepto text,
  lote_id uuid references lotes_cultivo(id),
  dispensacion_id uuid references dispensaciones(id),
  created_at timestamptz default now()
);

-- 6. FINANZAS - MOVIMIENTOS
create table if not exists movimientos_financieros (
  id uuid default gen_random_uuid() primary key,
  tipo text check (tipo in ('ingreso','egreso')),
  categoria text,
  concepto text not null,
  monto integer not null,
  socio_id uuid references socios(id),
  dispensacion_id uuid references dispensaciones(id),
  mes integer,
  año integer,
  created_at timestamptz default now()
);

-- 7. CONTRATOS
create table if not exists contratos (
  id uuid default gen_random_uuid() primary key,
  tipo text check (tipo in ('persona','empresa')),
  nombre text not null,
  rut text not null,
  rol_funcion text,
  monto_bruto integer not null,
  retencion_pct numeric(5,2) default 15.25,
  fecha_inicio date not null,
  fecha_termino date,
  estado text default 'activo' check (estado in ('activo','terminado')),
  notas text,
  created_at timestamptz default now()
);

-- 8. PAGOS DE CONTRATOS
create table if not exists pagos_contratos (
  id uuid default gen_random_uuid() primary key,
  contrato_id uuid references contratos(id) on delete cascade,
  mes integer not null,
  año integer not null,
  monto_bruto integer not null,
  monto_liquido integer not null,
  retencion integer not null,
  estado text default 'pendiente' check (estado in ('pendiente','pagado')),
  fecha_pago date,
  created_at timestamptz default now()
);

-- 9. LOG DE AUDITORÍA
create table if not exists log_auditoria (
  id uuid default gen_random_uuid() primary key,
  tipo text not null,
  evento text not null,
  usuario_id uuid,
  usuario_nombre text,
  detalle text,
  ip text,
  created_at timestamptz default now()
);

-- ============================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================

-- Cepas disponibles
insert into cepas (nombre, tipo, ratio_thc_cbd, thc_pct, cbd_pct, efecto, horario, tags, stock_gramos, precio_3gr, precio_7gr, precio_10gr, visible)
values
  ('OG Kush CBD', 'sativa', 'THC:CBD 1:1', 12, 12, 'Relajante', 'Post-laboral', array['Ansiolítico','Somnífero','Vaporización'], 48, 2400, 5250, 7000, true),
  ('Y Griega CBD', 'indica', 'THC:CBD 1:2', 8, 16, 'Sedante', 'Nocturno', array['Relajante','Anti-inflamatorio','Vaporización'], 35, 2400, 5250, 7000, true),
  ('Blue Dream CBD', 'hibrida', 'THC:CBD 2:1', 14, 7, 'Equilibrado', 'Diurno', array['Euforizante suave','Analgésico','Vaporización'], 29, 2700, 5950, 8500, true),
  ('Charlotte''s Web', 'cbd', 'THC:CBD 1:20', 0.5, 20, 'Calmante', 'Todo el día', array['Sin psicoactividad','Ansiolítico','Vaporización'], 30, 3000, 6650, 9000, true)
on conflict (nombre) do nothing;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table socios enable row level security;
alter table dispensaciones enable row level security;
alter table cepas enable row level security;
alter table lotes_cultivo enable row level security;
alter table movimientos_inventario enable row level security;
alter table movimientos_financieros enable row level security;
alter table contratos enable row level security;
alter table pagos_contratos enable row level security;
alter table log_auditoria enable row level security;

-- Política: cepas visibles para todos (catálogo público)
create policy "Cepas visibles para todos" on cepas
  for select using (visible = true);

-- Política: socios ven solo su propia info
create policy "Socios ven su info" on socios
  for select using (auth.uid()::text = id::text);

-- Política: socios ven sus dispensaciones
create policy "Socios ven sus dispensaciones" on dispensaciones
  for select using (socio_id::text = auth.uid()::text);
