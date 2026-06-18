// app/api/reglamento-url/route.ts
// Devuelve la URL firmada del reglamento interno más reciente.
// Usa service role key para acceder a documentos-corporacion sin requerir auth.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: lista } = await supabaseAdmin.storage
      .from('documentos-corporacion')
      .list('institucional', { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } })

    const archivo = lista?.find(f => f.name.startsWith('reglamento_interno'))
    if (!archivo) return NextResponse.json({ url: null, ext: null })

    const { data: urlData } = await supabaseAdmin.storage
      .from('documentos-corporacion')
      .createSignedUrl(`institucional/${archivo.name}`, 3600)

    const ext = archivo.name.split('.').pop()?.toLowerCase() || ''
    return NextResponse.json({ url: urlData?.signedUrl || null, ext, name: archivo.name })
  } catch {
    return NextResponse.json({ url: null, ext: null })
  }
}
