# GreenTech App — Instrucciones de instalación

## Pasos para instalar

### 1. Copiar archivos al proyecto
Copia el contenido de esta carpeta dentro de tu proyecto `greentech-app`.
Los archivos reemplazan los existentes, los nuevos se agregan.

### 2. Instalar dependencias
```bash
cd ~/greentech-app
npm install @supabase/supabase-js
```

### 3. Configurar variables de entorno
Abre el archivo `.env.local` y reemplaza con tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Crear la base de datos
1. Ve a supabase.com → tu proyecto → SQL Editor
2. Copia todo el contenido de `database.sql`
3. Pégalo en el editor y haz clic en "Run"

### 5. Levantar la app
```bash
npm run dev
```

Abre http://localhost:3000

## Páginas disponibles

| URL | Página |
|-----|--------|
| / | Inicio público |
| /login | Login |
| /inscripcion | Formulario de incorporación |
| /socio | Dashboard del socio |
| /socio/dispensacion | Dispensar |
| /socio/historial | Historial |
| /socio/documentos | Mis documentos |
| /socio/aportes | Mis aportes |
| /socio/perfil | Mi perfil |
| /admin | Panel administrador |
| /admin/socios | Aprobación de socios |
| /admin/despachos | Gestión de despachos |
| /admin/cultivo | Módulo de cultivo |
| /admin/inventario | Inventario |
| /admin/finanzas | Finanzas |
| /admin/contratos | Contratos |
| /admin/trazabilidad | Trazabilidad |
| /admin/configuracion | Configuración |
