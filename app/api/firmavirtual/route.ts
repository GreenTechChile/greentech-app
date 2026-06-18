import { NextRequest, NextResponse } from 'next/server'

// ─── Configuración ───────────────────────────────────────────────────────────
// Sandbox: https://test.firmavirtual.legal
// Producción: https://api.firmavirtual.legal
const FV_BASE_URL   = process.env.FV_BASE_URL   || 'https://test.firmavirtual.legal'
const FV_LOGIN      = process.env.FV_LOGIN      || 'demo@firmavirtual.com'
const FV_PASSWORD   = process.env.FV_PASSWORD   || 'FirmaVirtual1019'

// iContractTypeFeeID: consultar GET /api/v1/contract-type/MODAL/SIGNATURE_PROT_NOTARIAL
// para obtener el ID correcto según el plan contratado.
const FV_CONTRACT_TYPE_FEE_ID = parseInt(process.env.FV_CONTRACT_TYPE_FEE_ID || '109')

// iAgreementId: 0 sin convenio, o el ID del convenio mensual si aplica.
const FV_AGREEMENT_ID = parseInt(process.env.FV_AGREEMENT_ID || '0')

// URL del callback para recibir actualizaciones de estado del trámite.
const FV_CALLBACK_URL = process.env.FV_CALLBACK_URL || ''

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Obtiene JWT Bearer de FirmaVirtual. */
async function getFVToken(): Promise<string> {
  const res = await fetch(`${FV_BASE_URL}/logindata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: FV_LOGIN, password: FV_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`FirmaVirtual login error: ${JSON.stringify(data)}`)
  // El token viene en data.message según la documentación
  const token = data.message || data.token || data.jwt
  if (!token || typeof token !== 'string') {
    throw new Error(`FirmaVirtual: token no encontrado en respuesta: ${JSON.stringify(data)}`)
  }
  return token
}

/** Une dos PDFs en base64 usando la API de merge de FirmaVirtual. */
async function mergePDFs(
  token: string,
  pdfs: Array<{ base64: string; order: number }>
): Promise<string> {
  const res = await fetch('https://merge.firmavirtual.com/pdf/sort', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_sort: pdfs.map(p => ({ document: p.base64, order: p.order })),
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`FirmaVirtual merge error: ${JSON.stringify(data)}`)
  // La API retorna el PDF unificado en base64
  const merged = data.document || data.file || data.result || data.content_file
  if (!merged || typeof merged !== 'string') {
    throw new Error(`FirmaVirtual merge: PDF no encontrado en respuesta: ${JSON.stringify(data)}`)
  }
  return merged
}

/** Crea un trámite de Firma Electrónica Avanzada (FEA). */
async function createFEAContract(
  token: string,
  params: {
    nombre: string
    rut: string
    email: string
    telefono: string
    pdfBase64: string
    contractName: string
  }
) {
  // Normalizar teléfono al formato +569XXXXXXXX
  const telefono = params.telefono.startsWith('+')
    ? params.telefono
    : `+56${params.telefono.replace(/^0/, '')}`

  const body = {
    sOwnerType: 'LEGAL',          // La asociación GreenTech es entidad legal
    sPaymentStatus: 'PAIDOUT',    // Pago ya cubierto por convenio/incorporación
    iPaymentService: 0,           // 0 = Webpay (no se usará porque ya está pagado)
    iContractTypeFeeID: FV_CONTRACT_TYPE_FEE_ID,
    iSignedCount: 1,
    callback: FV_CALLBACK_URL,
    iAgreementId: FV_AGREEMENT_ID,
    sContractName: params.contractName,
    iPriceId: 0,
    provider: 'LEXGOSIGN',        // LEXGOSIGN = Firma Electrónica Avanzada (FEA)
    signers: [
      {
        full_name: params.nombre,
        email: params.email,
        rutId: params.rut,
        phone: telefono,
        rol: 0,
        order: 1,
        payment: '0.00',
        type: 'NATURAL',
        portion: '100',
      },
    ],
    document: {
      content_file: params.pdfBase64,
    },
  }

  const res = await fetch(`${FV_BASE_URL}/api/v1/contract/create-contract-express`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`FirmaVirtual crear contrato error: ${JSON.stringify(data)}`)
  return data
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { pdfContrato, pdfDeclaracion, socio } = await req.json() as {
      pdfContrato: string     // base64 del PDF del contrato
      pdfDeclaracion: string  // base64 del PDF de la declaración jurada
      socio: {
        nombre: string
        rut: string
        email: string
        telefono: string
      }
    }

    if (!pdfContrato || !pdfDeclaracion || !socio?.rut) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos requeridos: pdfContrato, pdfDeclaracion, socio' },
        { status: 400 }
      )
    }

    // 1. Obtener JWT
    const token = await getFVToken()

    // 2. Unir PDFs (contrato + declaración en un solo documento)
    let pdfFinal: string
    try {
      pdfFinal = await mergePDFs(token, [
        { base64: pdfContrato, order: 1 },
        { base64: pdfDeclaracion, order: 2 },
      ])
    } catch (mergeErr) {
      // Si el merge falla, usar solo el contrato como fallback
      console.warn('FirmaVirtual merge falló, usando solo contrato:', mergeErr)
      pdfFinal = pdfContrato
    }

    // 3. Crear trámite FEA
    const result = await createFEAContract(token, {
      nombre: socio.nombre,
      rut: socio.rut,
      email: socio.email,
      telefono: socio.telefono,
      pdfBase64: pdfFinal,
      contractName: `Incorporación GreenTech - ${socio.nombre}`,
    })

    return NextResponse.json({
      ok: true,
      contractId: result.sContractID,
      status: result.sStatus,
      data: result,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Error FirmaVirtual:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
