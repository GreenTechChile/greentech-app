#!/bin/bash
# deploy.sh — sincroniza archivos generados por Claude y hace push a GitHub
# Uso: ./deploy.sh "mensaje del commit"

CLAUDE_DIR="$HOME/Documents/Claude/Projects/Mejora de APP GreenTech"
PROJECT_DIR="$HOME/greentech-app"
MENSAJE="${1:-"chore: actualización desde Claude"}"

echo "🔄 Sincronizando archivos..."

copiados=0

copy_if_exists() {
  local origen="$CLAUDE_DIR/$1"
  local destino="$PROJECT_DIR/$2"
  if [ -f "$origen" ]; then
    mkdir -p "$(dirname "$destino")"
    cp "$origen" "$destino" && echo "  ✅ $1 → $2" && copiados=$((copiados + 1))
  fi
}

# Mapeo de archivos: nombre_en_Claude_folder → ruta_en_repo
copy_if_exists "home-page.tsx"             "app/page.tsx"
copy_if_exists "SidebarSocio.tsx"          "app/components/socio/SidebarSocio.tsx"
copy_if_exists "login-page.tsx"            "app/login/page.tsx"
copy_if_exists "SidebarAdmin.tsx"          "components/admin/SidebarAdmin.tsx"
copy_if_exists "socio-dashboard.tsx"     "app/socio/page.tsx"
copy_if_exists "dashboard-admin.tsx"     "app/admin/page.tsx"
copy_if_exists "dispensacion-page.tsx"   "app/socio/dispensacion/page.tsx"
copy_if_exists "inscripcion-page.tsx"    "app/inscripcion/page.tsx"
copy_if_exists "pago-exitoso.tsx"        "app/inscripcion/pago-exitoso/page.tsx"
copy_if_exists "cepas-page.tsx"          "app/admin/cepas/page.tsx"
copy_if_exists "cultivo-page.tsx"        "app/admin/cultivo/page.tsx"
copy_if_exists "email-route.ts"          "app/api/email/route.ts"
copy_if_exists "email-helper.ts"         "lib/email.ts"
copy_if_exists "dispensacion-api-route.ts"  "app/api/dispensacion/route.ts"
copy_if_exists "inscripcion-api-route.ts"   "app/api/inscripcion/route.ts"
copy_if_exists "aprobar-socio-route.ts"     "app/api/aprobar-socio/route.ts"
copy_if_exists "socios-admin-page.tsx"     "app/admin/socios/page.tsx"
copy_if_exists "despachos-page.tsx"        "app/admin/despachos/page.tsx"
copy_if_exists "roles-page.tsx"            "app/admin/roles/page.tsx"
copy_if_exists "documentos-page.tsx"       "app/socio/documentos/page.tsx"
copy_if_exists "middleware.ts"             "middleware.ts"
copy_if_exists "trazabilidad-page.tsx"     "app/admin/trazabilidad/page.tsx"
copy_if_exists "reglamento-url-route.ts"   "app/api/reglamento-url/route.ts"
copy_if_exists "configuracion-page.tsx"    "app/admin/configuracion/page.tsx"
copy_if_exists "cumplimiento_page.tsx"     "app/admin/cumplimiento/page.tsx"
copy_if_exists "firmavirtual-route.ts"     "app/api/firmavirtual/route.ts"

if [ "$copiados" -eq 0 ]; then
  echo "  ℹ️  No hay archivos nuevos para sincronizar."
fi

# Git push
cd "$PROJECT_DIR" || exit 1
git add -A

if git diff --cached --quiet; then
  echo "ℹ️  Nada que commitear."
else
  git commit -m "$MENSAJE"
  git push
  echo "🚀 Push exitoso."
fi
