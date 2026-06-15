import Link from 'next/link'

export default function Home() {
  const tarjetasQuienes = [
    { icon: '🌱', title: 'Cultivo colectivo', desc: 'Administramos un cultivo medicinal para el tratamiento de nuestros socios-pacientes bajo supervisión médica.' },
    { icon: '📋', title: 'Solo con receta médica', desc: 'Dispensamos únicamente lo indicado en la prescripción médica vigente de cada socio.' },
    { icon: '🏠', title: 'Cultivos 100% indoor', desc: 'Todos nuestros cultivos se realizan en espacios interiores controlados, garantizando calidad y seguridad durante todo el año.' },
    { icon: '🤖', title: 'Control ambiental con IA', desc: 'Inteligencia artificial para el control automático de temperatura, humedad, CO₂ y luz, optimizando cada ciclo de cultivo.' },
    { icon: '⚖️', title: 'Marco legal', desc: 'Operamos bajo la Ley 20.000 art. 8°, Ley 21.575, y jurisprudencia de los tribunales de justicia.' },
    { icon: '❤️', title: 'Sin fines de lucro', desc: 'Los aportes de los socios financian exclusivamente la operación del cultivo colectivo.' },
  ]

  const productos = [
    { icon: '🌿', title: 'Flores secas', desc: 'Sumidades floridas para vaporización no pirolítica según receta.' },
  ]

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @media (max-width: 600px) {
          .home-section { padding: 32px 16px !important; }
          .home-hero { padding: 40px 16px 32px !important; }
          .home-footer { flex-direction: column !important; gap: 8px !important; }
          .home-footer-contact { margin-left: 0 !important; }
          .home-h1 { font-size: 22px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#EAF3DE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>GreenTech</span>
        </div>
      </nav>

      {/* HERO */}
      <div className="home-hero" style={{ textAlign: 'center', padding: '64px 24px 48px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>✓ Asociación sin fines de lucro</span>
          <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>🏠 Cultivos 100% indoor</span>
          <span style={{ background: '#EEEDFE', color: '#534AB7', fontSize: 11, padding: '4px 12px', borderRadius: 20 }}>🤖 Control ambiental automático con IA</span>
        </div>
        <h1 className="home-h1" style={{ fontSize: 28, fontWeight: 600, margin: '0 0 12px', lineHeight: 1.3 }}>
          Asociación de usuarios de<br />plantas medicinales GreenTech
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
          Proveemos tratamientos complementarios con cannabis medicinal a nuestros socios-pacientes, cumpliendo con la Ley 20.000 y la normativa vigente en Chile.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/inscripcion" style={{ padding: '10px 24px', background: '#3B6D11', borderRadius: 8, fontSize: 14, color: '#EAF3DE', fontWeight: 600, textDecoration: 'none' }}>
            Solicitar incorporación como socio ↗
          </Link>
          <Link href="/login" style={{ padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111', textDecoration: 'none' }}>
            Login
          </Link>
        </div>
      </div>

      {/* QUIÉNES SOMOS */}
      <div className="home-section" style={{ padding: '48px 32px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>¿Quiénes somos?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {tarjetasQuienes.map((c, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className="home-section" style={{ padding: '48px 32px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Productos medicinales disponibles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {productos.map((p, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="home-footer" style={{ padding: '16px 20px', background: '#f9fafb', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: '#9ca3af' }}>
        <span>Marco legal:</span>
        {['Ley 20.000', 'Ley 21.575', 'Ley 19.628', 'Ley 19.799'].map(l => (
          <span key={l} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '2px 10px' }}>{l}</span>
        ))}
        <span className="home-footer-contact" style={{ marginLeft: 'auto' }}>velopp@gmail.com · Monjitas 527 of. 1207, Santiago</span>
      </div>

    </main>
  )
}
