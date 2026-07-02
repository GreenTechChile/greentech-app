import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GreenTech — Asociación de Cannabis Medicinal',
  description: 'Cultivo indoor 100% controlado con trazabilidad digital total. Cannabis medicinal seguro, legal y transparente en Chile.',
}

export default function LandingPage() {
  return (
    <>
      <style>{`

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --tierra-oscuro:  #0c2d48;
    --tierra-medio:   #0a2236;
    --tierra-calido:  #1a4d6e;
    --oliva-oscuro:   #0b5780;
    --oliva-medio:    #0284c7;
    --oliva-vivo:     #0ea5e9;
    --oliva-claro:    #7dd3fc;
    --dorado-fuerte:  #0ea5e9;
    --dorado-medio:   #38bdf8;
    --dorado-claro:   #7dd3fc;
    --crema:          #f0f9ff;
    --crema-medio:    #dbeafe;
    --crema-oscuro:   #bae6fd;
    --blanco:         #ffffff;
    --texto-oscuro:   #0c2d48;
    --texto-medio:    #0369a1;
    --texto-suave:    #4a90b8;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: var(--texto-oscuro);
    line-height: 1.6;
    overflow-x: hidden;
    background: var(--crema);
  }

  /* NAV */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(10px);
    padding: 0 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 62px;
    border-bottom: 1px solid #bae6fd;
  }

  .nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .logo-icon {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, var(--dorado-fuerte), var(--dorado-claro));
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
  }

  .logo-text {
    font-size: 26px;
    font-weight: 700;
    color: var(--texto-oscuro);
    font-family: 'Georgia', serif;
    letter-spacing: 0.3px;
  }

  .logo-text span { color: var(--dorado-fuerte); }

  .nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
  }

  .nav-links a {
    color: rgba(12,45,72,0.65);
    text-decoration: none;
    font-size: 14px;
    font-family: 'Segoe UI', sans-serif;
    transition: color 0.2s;
  }

  .nav-links a:hover { color: var(--dorado-fuerte); }

  .nav-login {
    background: var(--dorado-fuerte) !important;
    color: var(--blanco) !important;
    padding: 8px 22px;
    border-radius: 7px;
    font-weight: 600 !important;
    box-shadow: 0 2px 10px rgba(14,165,233,0.35);
  }

  .nav-login:hover { background: var(--dorado-medio) !important; color: var(--blanco) !important; box-shadow: 0 4px 14px rgba(14,165,233,0.4); }

  /* HERO */
  .hero {
    min-height: 100vh;
    background: linear-gradient(160deg, #0ea5e9 0%, #0c2d48 100%);
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    padding: 100px 2.5rem 70px;
  }

  .hero::before {
    content: '';
    position: absolute;
    top: -150px; right: -150px;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%);
    pointer-events: none;
  }

  .hero::after {
    content: '';
    position: absolute;
    bottom: -100px; left: 30%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%);
    pointer-events: none;
  }

  .hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(14,165,233,0.12);
    border: 1px solid rgba(14,165,233,0.3);
    color: var(--dorado-claro);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 100px;
    margin-bottom: 1.5rem;
    font-family: 'Segoe UI', sans-serif;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.15;
    color: var(--crema);
    letter-spacing: -0.5px;
    margin-bottom: 1.4rem;
  }

  .hero h1 em {
    font-style: italic;
    color: var(--dorado-claro);
  }

  .hero-desc {
    font-size: 1rem;
    color: rgba(186,230,253,0.6);
    line-height: 1.8;
    margin-bottom: 2.5rem;
    font-family: 'Segoe UI', sans-serif;
    max-width: 460px;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn-dorado {
    background: var(--dorado-fuerte);
    color: var(--blanco);
    border: none;
    padding: 13px 26px;
    border-radius: 7px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    transition: background 0.2s, transform 0.1s;
  }

  .btn-dorado:hover { background: var(--dorado-medio); transform: translateY(-1px); }

  .btn-outline-crema {
    background: transparent;
    color: rgba(125,211,252,0.8);
    border: 1px solid rgba(14,165,233,0.35);
    padding: 13px 26px;
    border-radius: 7px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    transition: all 0.2s;
  }

  .btn-outline-crema:hover { border-color: var(--dorado-claro); color: var(--dorado-claro); }

  .hero-stats {
    display: flex;
    gap: 2.5rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(14,165,233,0.15);
  }

  .hero-stat-num {
    font-size: 1.7rem;
    font-weight: 700;
    color: var(--dorado-claro);
    font-family: 'Georgia', serif;
  }

  .hero-stat-label {
    font-size: 11px;
    color: rgba(125,211,252,0.45);
    margin-top: 2px;
    font-family: 'Segoe UI', sans-serif;
    letter-spacing: 0.3px;
  }

  /* HERO VISUAL */
  .hero-visual {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .app-mockup {
    background: rgba(224,242,254,0.04);
    border: 1px solid rgba(14,165,233,0.15);
    border-radius: 14px;
    overflow: hidden;
  }

  .app-mockup-header {
    background: rgba(12,45,72,0.6);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 7px;
    border-bottom: 1px solid rgba(14,165,233,0.1);
  }

  .app-mockup-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.15); }

  .app-mockup-title {
    font-size: 11px;
    color: rgba(125,211,252,0.45);
    font-weight: 500;
    margin-left: 4px;
    font-family: 'Segoe UI', sans-serif;
  }

  .app-mockup-body { padding: 18px; }

  .trace-timeline { display: flex; flex-direction: column; gap: 0; }

  .trace-item {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 9px 0;
    position: relative;
  }

  .trace-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 13px; top: 30px;
    width: 1px; height: calc(100% - 8px);
    background: rgba(14,165,233,0.2);
  }

  .trace-dot {
    width: 27px; height: 27px;
    border-radius: 50%;
    background: rgba(14,165,233,0.1);
    border: 1.5px solid var(--dorado-fuerte);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
    flex-shrink: 0;
    position: relative; z-index: 1;
    color: var(--dorado-fuerte);
  }

  .trace-dot.active { background: var(--dorado-fuerte); color: var(--blanco); border-color: var(--dorado-fuerte); }

  .trace-info { flex: 1; padding-top: 3px; }
  .trace-label { font-size: 12px; font-weight: 600; color: rgba(186,230,253,0.85); font-family: 'Segoe UI', sans-serif; }
  .trace-meta { font-size: 10px; color: rgba(125,211,252,0.35); margin-top: 1px; font-family: 'Segoe UI', sans-serif; }

  .trace-badge {
    font-size: 9px; padding: 2px 7px;
    border-radius: 100px;
    background: rgba(14,165,233,0.15);
    color: var(--dorado-claro);
    font-weight: 600;
    align-self: center;
    font-family: 'Segoe UI', sans-serif;
  }

  .env-card {
    background: rgba(224,242,254,0.04);
    border: 1px solid rgba(14,165,233,0.12);
    border-radius: 12px;
    padding: 14px;
  }

  .env-card-title {
    font-size: 10px;
    font-weight: 600;
    color: rgba(125,211,252,0.35);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
    font-family: 'Segoe UI', sans-serif;
  }

  .env-sensors { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }

  .sensor {
    background: rgba(255,255,255,0.04);
    border-radius: 8px; padding: 9px; text-align: center;
  }

  .sensor-val { font-size: 17px; font-weight: 700; color: var(--dorado-claro); line-height: 1; font-family: 'Georgia', serif; }
  .sensor-unit { font-size: 8px; color: var(--dorado-claro); }
  .sensor-name { font-size: 9px; color: rgba(125,211,252,0.35); margin-top: 3px; font-family: 'Segoe UI', sans-serif; }

  /* SECCIONES */
  section { padding: 90px 2.5rem; }
  .section-inner { max-width: 1100px; margin: 0 auto; }

  .section-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--dorado-fuerte);
    background: rgba(14,165,233,0.1);
    border: 1px solid rgba(14,165,233,0.25);
    padding: 5px 12px;
    border-radius: 100px;
    margin-bottom: 1rem;
    font-family: 'Segoe UI', sans-serif;
  }

  .section-title {
    font-size: 2.3rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--texto-oscuro);
    letter-spacing: -0.3px;
    margin-bottom: 1rem;
    font-family: 'Georgia', serif;
  }

  .section-desc {
    font-size: 1rem;
    color: var(--texto-suave);
    max-width: 540px;
    line-height: 1.75;
    font-family: 'Segoe UI', sans-serif;
  }

  /* VALOR */
  .valor-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 1.2rem;
    margin-top: 2.5rem;
  }

  .valor-card {
    background: var(--blanco);
    border: 1px solid var(--crema-oscuro);
    border-radius: 14px;
    padding: 24px;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .valor-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(12,45,72,0.1);
  }

  .valor-icon { font-size: 24px; margin-bottom: 10px; display: block; }
  .valor-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 7px; color: var(--texto-oscuro); font-family: 'Georgia', serif; }
  .valor-card p { font-size: 13px; color: var(--texto-suave); line-height: 1.6; font-family: 'Segoe UI', sans-serif; }

  /* CULTIVO */
  .cultivo-section { background: var(--tierra-oscuro); color: var(--crema); }
  .cultivo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
  .cultivo-section .section-tag { background: rgba(14,165,233,0.12); color: var(--dorado-claro); border-color: rgba(14,165,233,0.2); }
  .cultivo-section .section-title { color: var(--crema); }
  .cultivo-section .section-desc { color: rgba(186,230,253,0.55); }

  .features-list { list-style: none; margin-top: 1.8rem; display: flex; flex-direction: column; gap: 14px; }
  .features-list li { display: flex; gap: 11px; align-items: flex-start; }

  .feature-check {
    width: 20px; height: 20px;
    background: rgba(14,165,233,0.15);
    border: 1px solid rgba(14,165,233,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; flex-shrink: 0; margin-top: 2px;
    color: var(--dorado-claro);
  }

  .feature-text strong { display: block; font-size: 14px; font-weight: 600; color: var(--crema); margin-bottom: 1px; font-family: 'Georgia', serif; }
  .feature-text span { font-size: 12px; color: rgba(125,211,252,0.45); font-family: 'Segoe UI', sans-serif; }

  .automation-display {
    background: rgba(224,242,254,0.04);
    border: 1px solid rgba(14,165,233,0.15);
    border-radius: 16px;
    padding: 24px;
  }

  .automation-title {
    font-size: 10px; font-weight: 600;
    color: rgba(125,211,252,0.35);
    letter-spacing: 0.5px; text-transform: uppercase;
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 7px;
    font-family: 'Segoe UI', sans-serif;
  }

  .live-dot {
    width: 6px; height: 6px;
    background: var(--oliva-claro);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .auto-systems { display: flex; flex-direction: column; gap: 10px; }

  .auto-system {
    background: rgba(224,242,254,0.04);
    border-radius: 9px; padding: 12px 14px;
    display: flex; align-items: center; gap: 11px;
    border: 1px solid rgba(14,165,233,0.07);
  }

  .auto-system-icon {
    font-size: 18px; width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(14,165,233,0.1); border-radius: 8px; flex-shrink: 0;
  }

  .auto-system-info { flex: 1; }
  .auto-system-name { font-size: 12px; font-weight: 600; color: rgba(186,230,253,0.8); font-family: 'Segoe UI', sans-serif; }
  .auto-system-status { font-size: 10px; color: rgba(125,211,252,0.35); margin-top: 1px; font-family: 'Segoe UI', sans-serif; }
  .auto-system-value { font-size: 12px; font-weight: 700; color: var(--dorado-claro); font-family: 'Georgia', serif; }

  /* APP */
  .app-section { background: var(--crema); }

  .app-grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 5rem;
    align-items: center;
    margin-top: 3rem;
  }

  .steps-list { display: flex; flex-direction: column; gap: 0; position: relative; }

  .steps-list::before {
    content: '';
    position: absolute;
    left: 18px; top: 22px; bottom: 22px;
    width: 1px;
    background: linear-gradient(to bottom, var(--dorado-fuerte), var(--crema-oscuro));
  }

  .step-item { display: flex; gap: 14px; padding: 12px 0; position: relative; z-index: 1; }

  .step-num {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--tierra-calido);
    color: var(--crema);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; flex-shrink: 0;
    font-family: 'Georgia', serif;
  }

  .step-num.active {
    background: var(--dorado-fuerte);
    color: var(--blanco);
    box-shadow: 0 0 0 4px rgba(14,165,233,0.18);
  }

  .step-info { padding-top: 7px; }
  .step-label { font-size: 14px; font-weight: 700; color: var(--texto-oscuro); font-family: 'Georgia', serif; }
  .step-desc { font-size: 12px; color: var(--texto-suave); margin-top: 3px; font-family: 'Segoe UI', sans-serif; }

  .phone-frame {
    background: var(--tierra-oscuro);
    border: 1.5px solid rgba(14,165,233,0.2);
    border-radius: 26px;
    padding: 18px 14px;
    box-shadow: 0 18px 50px rgba(12,45,72,0.25);
  }

  .phone-notch {
    width: 70px; height: 4px;
    background: rgba(14,165,233,0.15);
    border-radius: 10px; margin: 0 auto 14px;
  }

  .phone-screen-title { font-size: 13px; font-weight: 700; color: var(--crema); text-align: center; margin-bottom: 14px; font-family: 'Georgia', serif; }

  .dispensation-card {
    background: rgba(224,242,254,0.05);
    border: 1px solid rgba(14,165,233,0.12);
    border-radius: 9px; padding: 12px; margin-bottom: 8px;
  }

  .disp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .disp-id { font-size: 10px; font-weight: 700; color: var(--dorado-claro); font-family: 'Segoe UI', sans-serif; }
  .disp-date { font-size: 9px; color: rgba(125,211,252,0.3); font-family: 'Segoe UI', sans-serif; }
  .disp-name { font-size: 12px; font-weight: 600; color: rgba(186,230,253,0.8); font-family: 'Segoe UI', sans-serif; }
  .disp-detail { font-size: 10px; color: rgba(125,211,252,0.35); margin-top: 3px; font-family: 'Segoe UI', sans-serif; }
  .disp-row { display: flex; justify-content: space-between; align-items: center; margin-top: 7px; }
  .disp-badge-ok { font-size: 9px; padding: 2px 7px; border-radius: 100px; background: rgba(14,165,233,0.15); color: var(--dorado-claro); font-weight: 600; font-family: 'Segoe UI', sans-serif; }
  .disp-gramaje { font-size: 12px; font-weight: 700; color: var(--crema); font-family: 'Georgia', serif; }

  /* LEGAL */
  .legal-section { background: var(--blanco); }
  .legal-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 5rem; align-items: center; margin-top: 2.5rem; }

  .trust-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .trust-card {
    background: var(--crema);
    border: 1px solid var(--crema-oscuro);
    border-radius: 13px; padding: 20px;
  }

  .trust-card.gold { background: #e0f2fe; border-color: #7dd3fc; }
  .trust-icon { font-size: 26px; margin-bottom: 8px; display: block; }
  .trust-card h4 { font-size: 13px; font-weight: 700; color: var(--texto-oscuro); margin-bottom: 5px; font-family: 'Georgia', serif; }
  .trust-card p { font-size: 11px; color: var(--texto-suave); line-height: 1.55; font-family: 'Segoe UI', sans-serif; }

  /* VISIÓN Y MISIÓN */
  .vm-section { background: var(--tierra-oscuro); }
  .vm-section .section-tag { background: rgba(14,165,233,0.12); color: var(--dorado-claro); border-color: rgba(14,165,233,0.2); }
  .vm-section .section-title { color: var(--crema); text-align: center; }
  .vm-section .section-desc { color: rgba(125,211,252,0.45); text-align: center; margin: 0.5rem auto 0; }

  .vm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2.5rem; }

  .vm-card {
    background: rgba(224,242,254,0.04);
    border: 1px solid rgba(14,165,233,0.12);
    border-radius: 18px; padding: 34px;
    position: relative; overflow: hidden;
  }

  .vm-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
  }

  .vm-card.vision::before { background: linear-gradient(90deg, var(--oliva-vivo), var(--oliva-claro)); }
  .vm-card.mision::before { background: linear-gradient(90deg, var(--dorado-fuerte), var(--dorado-claro)); }

  .vm-type { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-family: 'Segoe UI', sans-serif; }
  .vision .vm-type { color: var(--oliva-claro); }
  .mision .vm-type { color: var(--dorado-claro); }

  .vm-card h3 { font-size: 20px; font-weight: 700; color: var(--crema); margin-bottom: 14px; line-height: 1.3; font-family: 'Georgia', serif; }
  .vm-card p { font-size: 14px; color: rgba(186,230,253,0.6); line-height: 1.8; font-family: 'Segoe UI', sans-serif; }

  .vm-pillars { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 8px; }

  .vm-pillar {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: rgba(186,230,253,0.55);
    font-family: 'Segoe UI', sans-serif;
  }

  .vm-pillar::before { content: ''; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .vision .vm-pillar::before { background: var(--oliva-claro); }
  .mision .vm-pillar::before { background: var(--dorado-claro); }

  /* CTA */
  .cta-section { background: var(--crema-medio); text-align: center; padding: 100px 2.5rem; }
  .cta-inner { max-width: 680px; margin: 0 auto; }
  .cta-section .section-title { font-size: 2.5rem; }
  .cta-section .section-desc { margin: 1rem auto 2.5rem; text-align: center; }

  .cta-actions { display: flex; gap: 1rem; justify-content: center; }

  .btn-tierra {
    background: var(--tierra-oscuro); color: var(--crema);
    border: none; padding: 15px 30px; border-radius: 8px;
    font-size: 15px; font-weight: 600; cursor: pointer;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    transition: background 0.2s;
  }

  .btn-tierra:hover { background: var(--tierra-calido); }

  .btn-outline-tierra {
    background: transparent; color: var(--tierra-oscuro);
    border: 2px solid var(--tierra-calido); padding: 15px 28px; border-radius: 8px;
    font-size: 15px; font-weight: 600; cursor: pointer;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    transition: all 0.2s;
  }

  .btn-outline-tierra:hover { background: var(--tierra-oscuro); color: var(--crema); }

  /* FOOTER */
  footer {
    background: var(--tierra-oscuro);
    color: rgba(125,211,252,0.35);
    padding: 2rem;
    text-align: center;
    font-size: 12px;
    border-top: 1px solid rgba(14,165,233,0.1);
    font-family: 'Segoe UI', sans-serif;
  }

  footer strong { color: rgba(186,230,253,0.65); }

  /* Separador ornamental */
  .ornament {
    text-align: center;
    color: var(--dorado-fuerte);
    font-size: 18px;
    letter-spacing: 8px;
    margin: 0 auto 1.5rem;
    opacity: 0.5;
  }

      `}</style>


{/* NAVEGACIÓN */}
<nav>
  <a href="#" className="nav-logo">
    <span className="logo-text">Green<span>Tech</span></span>
  </a>
  <ul className="nav-links">
    <li><a href="#cultivo">Cultivo Indoor</a></li>
    <li><a href="#app">APP</a></li>
    <li><a href="#legal">Seguridad Legal</a></li>
    <li><a href="#nosotros">Nosotros</a></li>
    <li><a href="/login" className="nav-login">Ingresar</a></li>
  </ul>
</nav>

{/* HERO */}
<section className="hero">
  <div className="hero-inner">
    <div className="hero-content">
      <div className="hero-badge">🌿 Asociación de Cannabis Medicinal</div>
      <h1>Cannabis medicinal con <em>cuidado experto</em> y control de precisión</h1>
      <p className="hero-desc">
        Cultivo 100% indoor con control ambiental inteligente y revisión personalizada de cada planta. Trazabilidad completa desde la semilla hasta tu dispensación. Cumplimiento legal que te protege en cada paso.
      </p>
      <div className="hero-actions">
        <a href="#unirse" className="btn-dorado">Quiero ser socio →</a>
        <a href="#app" className="btn-outline-crema">Ver cómo funciona</a>
      </div>
      <div className="hero-stats">
        <div>
          <div className="hero-stat-num">100%</div>
          <div className="hero-stat-label">Indoor controlado</div>
        </div>
        <div>
          <div className="hero-stat-num">24/7</div>
          <div className="hero-stat-label">Monitoreo ambiental</div>
        </div>
        <div>
          <div className="hero-stat-num">Legal</div>
          <div className="hero-stat-label">Cumplimiento total</div>
        </div>
      </div>
    </div>

    <div className="hero-visual">
      <div className="app-mockup">
        <div className="app-mockup-header">
          <div className="app-mockup-dot"></div><div className="app-mockup-dot"></div><div className="app-mockup-dot"></div>
          <span className="app-mockup-title">GreenTech APP — Trazabilidad</span>
        </div>
        <div className="app-mockup-body">
          <div className="trace-timeline">
            <div className="trace-item">
              <div className="trace-dot active">✓</div>
              <div className="trace-info">
                <div className="trace-label">Siembra</div>
                <div className="trace-meta">Cepa registrada · Sala A · Lote 2024-03</div>
              </div>
              <div className="trace-badge">Completo</div>
            </div>
            <div className="trace-item">
              <div className="trace-dot active">✓</div>
              <div className="trace-info">
                <div className="trace-label">Cultivo y cosecha</div>
                <div className="trace-meta">Revisión experta diaria · 89 días</div>
              </div>
              <div className="trace-badge">Completo</div>
            </div>
            <div className="trace-item">
              <div className="trace-dot active">✓</div>
              <div className="trace-info">
                <div className="trace-label">Procesado y stock</div>
                <div className="trace-meta">42.5 g disponibles</div>
              </div>
              <div className="trace-badge">En stock</div>
            </div>
            <div className="trace-item">
              <div className="trace-dot">→</div>
              <div className="trace-info">
                <div className="trace-label">Dispensación</div>
                <div className="trace-meta">Pendiente · Receta médica vigente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="env-card">
        <div className="env-card-title">🌡️ Sala de cultivo — sensores en tiempo real</div>
        <div className="env-sensors">
          <div className="sensor"><div className="sensor-val">24.2<span className="sensor-unit">°C</span></div><div className="sensor-name">Temperatura</div></div>
          <div className="sensor"><div className="sensor-val">58<span className="sensor-unit">%</span></div><div className="sensor-name">Humedad</div></div>
          <div className="sensor"><div className="sensor-val">1150<span className="sensor-unit">ppm</span></div><div className="sensor-name">CO₂</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* PROPUESTA DE VALOR */}
<section style={{background: "var(--blanco)", padding: "70px 2.5rem"}}>
  <div className="section-inner">
    <div style={{textAlign: "center", marginBottom: "2.5rem"}}>
      <div className="ornament">— ✦ —</div>
      <span className="section-tag">¿Por qué GreenTech?</span>
      <h2 className="section-title" style={{textAlign: "center"}}>Estándares que marcan la diferencia</h2>
    </div>
    <div className="valor-grid">
      <div className="valor-card">
        <span className="valor-icon">🏡</span>
        <h3>Cultivo 100% indoor</h3>
        <p>Ambiente controlado, sin exposición a contaminantes externos, pesticidas ni variaciones climáticas. Calidad consistente en cada cosecha.</p>
      </div>
      <div className="valor-card">
        <span className="valor-icon">📱</span>
        <h3>Trazabilidad digital total</h3>
        <p>Nuestra APP registra cada etapa: siembra, cultivo, cosecha, secado, procesado y dispensación. Conoces el origen de cada gramo.</p>
      </div>
      <div className="valor-card">
        <span className="valor-icon">⚖️</span>
        <h3>Cumplimiento legal riguroso</h3>
        <p>Expedientes digitales completos, contratos y recetas médicas gestionados con total apego a la normativa chilena vigente.</p>
      </div>
      <div className="valor-card">
        <span className="valor-icon">👨‍🌾</span>
        <h3>Revisión personalizada</h3>
        <p>Cada cultivo delegado es revisado diariamente por nuestro equipo. Atención individual que garantiza el mejor resultado para tu cepa.</p>
      </div>
      <div className="valor-card">
        <span className="valor-icon">🔒</span>
        <h3>Información protegida</h3>
        <p>Datos médicos y personales almacenados con cifrado y acceso restringido. Tu privacidad es parte fundamental de nuestro compromiso.</p>
      </div>
      <div className="valor-card">
        <span className="valor-icon">🌡️</span>
        <h3>Control ambiental inteligente</h3>
        <p>Temperatura, humedad, iluminación y CO₂ monitoreados con sensores en tiempo real para mantener las condiciones óptimas de cultivo.</p>
      </div>
    </div>
  </div>
</section>

{/* CULTIVO INDOOR */}
<section className="cultivo-section" id="cultivo">
  <div className="section-inner">
    <div className="cultivo-grid">
      <div>
        <span className="section-tag">Cultivo de excelencia</span>
        <h2 className="section-title">Indoor inteligente, cuidado artesanal</h2>
        <p className="section-desc">
          Ambiente completamente controlado con sensores inteligentes para temperatura, humedad, luz y CO₂. El riego y la revisión de cada cultivo son realizados manualmente por nuestro equipo experto — atención personalizada que ninguna máquina reemplaza.
        </p>
        <ul className="features-list">
          <li>
            <div className="feature-check">✓</div>
            <div className="feature-text">
              <strong>Control ambiental IoT 24/7</strong>
              <span>Temperatura, humedad relativa, CO₂ e iluminación monitoreados con sensores y alertas en tiempo real</span>
            </div>
          </li>
          <li>
            <div className="feature-check">✓</div>
            <div className="feature-text">
              <strong>Riego y nutrición con supervisión experta</strong>
              <span>Cada ciclo de riego y aporte de nutrientes es revisado y ajustado manualmente por nuestro equipo según la etapa del cultivo</span>
            </div>
          </li>
          <li>
            <div className="feature-check">✓</div>
            <div className="feature-text">
              <strong>Iluminación LED de espectro completo</strong>
              <span>Fotoperíodos programados que replican condiciones óptimas de crecimiento y floración</span>
            </div>
          </li>
          <li>
            <div className="feature-check">✓</div>
            <div className="feature-text">
              <strong>Sin contaminantes externos</strong>
              <span>Sin pesticidas, sin hongos externos, sin variaciones climáticas. Resultado limpio y reproducible</span>
            </div>
          </li>
          <li>
            <div className="feature-check">✓</div>
            <div className="feature-text">
              <strong>Revisión agronómica diaria y personalizada</strong>
              <span>Nuestro equipo inspecciona cada cultivo: salud de la planta, desarrollo y respuesta a nutrición, con reporte individual por socio</span>
            </div>
          </li>
        </ul>
      </div>

      <div className="automation-display">
        <div className="automation-title">
          <div className="live-dot"></div>
          Sala principal — estado actual
        </div>
        <div className="auto-systems">
          <div className="auto-system">
            <div className="auto-system-icon">🌡️</div>
            <div className="auto-system-info">
              <div className="auto-system-name">Control de temperatura</div>
              <div className="auto-system-status">Setpoint: 24°C · Variación ± 0.3°C</div>
            </div>
            <div className="auto-system-value">24.2°C</div>
          </div>
          <div className="auto-system">
            <div className="auto-system-icon">💧</div>
            <div className="auto-system-info">
              <div className="auto-system-name">Riego supervisado por experto</div>
              <div className="auto-system-status">Frecuencia y nutrición ajustadas manualmente · por etapa del cultivo</div>
            </div>
            <div className="auto-system-value">Manual</div>
          </div>
          <div className="auto-system">
            <div className="auto-system-icon">💡</div>
            <div className="auto-system-info">
              <div className="auto-system-name">Fotoperíodo LED</div>
              <div className="auto-system-status">Fase floración · 12h luz / 12h oscuridad</div>
            </div>
            <div className="auto-system-value">ON</div>
          </div>
          <div className="auto-system">
            <div className="auto-system-icon">🌫️</div>
            <div className="auto-system-info">
              <div className="auto-system-name">CO₂ y ventilación</div>
              <div className="auto-system-status">Inyección activa · Filtrado HEPA</div>
            </div>
            <div className="auto-system-value">1150 ppm</div>
          </div>
          <div className="auto-system">
            <div className="auto-system-icon">👨‍🌾</div>
            <div className="auto-system-info">
              <div className="auto-system-name">Revisión agronómica diaria</div>
              <div className="auto-system-status">Inspección manual · salud, desarrollo y nutrición por planta</div>
            </div>
            <div className="auto-system-value">Activa</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* APP TRAZABILIDAD */}
<section className="app-section" id="app">
  <div className="section-inner">
    <div style={{textAlign: "center", marginBottom: "0.5rem"}}>
      <div className="ornament">— ✦ —</div>
      <span className="section-tag">Tecnología en tus manos</span>
      <h2 className="section-title" style={{textAlign: "center"}}>Trazabilidad total en tu smartphone</h2>
      <p className="section-desc" style={{margin: "0.5rem auto 0", textAlign: "center"}}>
        Nuestra APP registra el ciclo completo de tu cannabis medicinal. Sabes exactamente qué cultivamos, cuándo, cómo y cuánto dispones.
      </p>
    </div>
    <div className="app-grid">
      <div className="steps-list">
        <div className="step-item">
          <div className="step-num">1</div>
          <div className="step-info">
            <div className="step-label">Registro e ingreso</div>
            <div className="step-desc">Validación de identidad, receta médica vigente y contrato de delegación. Todo digital, todo trazado.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-num active">2</div>
          <div className="step-info">
            <div className="step-label">Cultivo y seguimiento</div>
            <div className="step-desc">La APP registra cada etapa del cultivo: siembra, crecimiento, cosecha y secado con revisión experta diaria.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-num">3</div>
          <div className="step-info">
            <div className="step-label">Stock disponible en tiempo real</div>
            <div className="step-desc">Ves tu gramaje disponible actualizado con cada procesado. Total transparencia, sin sorpresas.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-num">4</div>
          <div className="step-info">
            <div className="step-label">Dispensación registrada</div>
            <div className="step-desc">Cada dispensación queda registrada: fecha, gramaje, receta asociada. Expediente completo y auditable.</div>
          </div>
        </div>
        <div className="step-item">
          <div className="step-num">5</div>
          <div className="step-info">
            <div className="step-label">Historial y exportación</div>
            <div className="step-desc">Accede a tu historial completo. Administración puede exportar expedientes para fiscalización en segundos.</div>
          </div>
        </div>
      </div>

      <div className="phone-frame">
        <div className="phone-notch"></div>
        <div className="phone-screen-title">Mis dispensaciones</div>
        <div className="dispensation-card">
          <div className="disp-header">
            <span className="disp-id">#DISP-2026-089</span>
            <span className="disp-date">28 jun 2026</span>
          </div>
          <div className="disp-name">Flor sativa — Lote L2024-03A</div>
          <div className="disp-detail">Cosecha sala A · Procesado 20 jun · Receta Dr. Martínez</div>
          <div className="disp-row">
            <span className="disp-badge-ok">✓ Dispensado</span>
            <span className="disp-gramaje">10.0 g</span>
          </div>
        </div>
        <div className="dispensation-card">
          <div className="disp-header">
            <span className="disp-id">#DISP-2026-071</span>
            <span className="disp-date">14 jun 2026</span>
          </div>
          <div className="disp-name">Flor indica — Lote L2024-02B</div>
          <div className="disp-detail">Cosecha sala B · Procesado 10 jun · Receta Dr. Martínez</div>
          <div className="disp-row">
            <span className="disp-badge-ok">✓ Dispensado</span>
            <span className="disp-gramaje">10.0 g</span>
          </div>
        </div>
        <div className="dispensation-card" style={{borderColor: "rgba(14,165,233,0.2)", background: "rgba(14,165,233,0.05)"}}>
          <div className="disp-header">
            <span className="disp-id" style={{color: "rgba(125,211,252,0.4)"}}>Próxima disponibilidad</span>
          </div>
          <div className="disp-name" style={{color: "rgba(186,230,253,0.45)"}}>Stock actual: 32.5 g disponibles</div>
          <div className="disp-detail">Siguiente cosecha estimada: julio 2026</div>
          <div className="disp-row">
            <span className="disp-badge-ok">🌱 En cultivo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* SEGURIDAD Y CUMPLIMIENTO LEGAL */}
<section className="legal-section" id="legal">
  <div className="section-inner">
    <div className="legal-grid">
      <div>
        <span className="section-tag">Protección completa</span>
        <h2 className="section-title">Tu tranquilidad legal, nuestra prioridad</h2>
        <p className="section-desc">
          Operamos con expedientes digitales completos para cada socio, en estricto cumplimiento de la normativa chilena. Ante cualquier fiscalización, tu protección está garantizada.
        </p>
        <div className="trust-cards" style={{marginTop: "2rem"}}>
          <div className="trust-card">
            <span className="trust-icon">📋</span>
            <h4>Expedientes digitales</h4>
            <p>Cédula, receta médica, contrato de delegación y declaración jurada. Todo gestionado y disponible.</p>
          </div>
          <div className="trust-card gold">
            <span className="trust-icon">⚖️</span>
            <h4>Marco legal vigente</h4>
            <p>Operación bajo Ley 20.000 y normativa de asociaciones cannábicas. Asesoría legal permanente.</p>
          </div>
          <div className="trust-card">
            <span className="trust-icon">🔐</span>
            <h4>Datos cifrados</h4>
            <p>Información médica y personal con cifrado y acceso basado en roles. Privacidad garantizada.</p>
          </div>
          <div className="trust-card gold">
            <span className="trust-icon">📊</span>
            <h4>Auditoría instantánea</h4>
            <p>Exportación de expedientes completos para fiscalización en segundos. Sin demoras, sin improvisación.</p>
          </div>
        </div>
      </div>

      <div style={{background: "var(--crema)", border: "1px solid var(--crema-oscuro)", borderRadius: "18px", padding: "32px"}}>
        <div style={{fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--dorado-fuerte)", marginBottom: "20px", fontFamily: "'Segoe UI', sans-serif"}}>
          ✅ Expediente digital por socio
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
          <div style={{display: "flex", alignItems: "center", gap: "11px", padding: "11px", background: "var(--blanco)", borderRadius: "9px", fontSize: "13px", fontFamily: "'Segoe UI', sans-serif"}}>
            <span>🪪</span>
            <span style={{fontWeight: 600, flex: 1, color: "var(--texto-oscuro)"}}>Cédula de identidad</span>
            <span style={{fontSize: "10px", color: "var(--oliva-oscuro)", fontWeight: 600, background: "#e0f2fe", padding: "2px 8px", borderRadius: "100px"}}>Verificado</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "11px", padding: "11px", background: "var(--blanco)", borderRadius: "9px", fontSize: "13px", fontFamily: "'Segoe UI', sans-serif"}}>
            <span>💊</span>
            <span style={{fontWeight: 600, flex: 1, color: "var(--texto-oscuro)"}}>Receta médica vigente</span>
            <span style={{fontSize: "10px", color: "var(--oliva-oscuro)", fontWeight: 600, background: "#e0f2fe", padding: "2px 8px", borderRadius: "100px"}}>Actualizada</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "11px", padding: "11px", background: "var(--blanco)", borderRadius: "9px", fontSize: "13px", fontFamily: "'Segoe UI', sans-serif"}}>
            <span>📝</span>
            <span style={{fontWeight: 600, flex: 1, color: "var(--texto-oscuro)"}}>Contrato de delegación firmado</span>
            <span style={{fontSize: "10px", color: "var(--oliva-oscuro)", fontWeight: 600, background: "#e0f2fe", padding: "2px 8px", borderRadius: "100px"}}>Firmado</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "11px", padding: "11px", background: "var(--blanco)", borderRadius: "9px", fontSize: "13px", fontFamily: "'Segoe UI', sans-serif"}}>
            <span>🤝</span>
            <span style={{fontWeight: 600, flex: 1, color: "var(--texto-oscuro)"}}>Declaración jurada firmada</span>
            <span style={{fontSize: "10px", color: "var(--oliva-oscuro)", fontWeight: 600, background: "#e0f2fe", padding: "2px 8px", borderRadius: "100px"}}>Firmada</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "11px", padding: "11px", background: "var(--blanco)", borderRadius: "9px", fontSize: "13px", fontFamily: "'Segoe UI', sans-serif"}}>
            <span>📜</span>
            <span style={{fontWeight: 600, flex: 1, color: "var(--texto-oscuro)"}}>Certificado de antecedentes</span>
            <span style={{fontSize: "10px", color: "var(--oliva-oscuro)", fontWeight: 600, background: "#e0f2fe", padding: "2px 8px", borderRadius: "100px"}}>Adjunto</span>
          </div>
          <div style={{marginTop: "6px", padding: "13px", background: "var(--tierra-calido)", borderRadius: "9px", color: "var(--crema)", fontSize: "13px", fontWeight: 600, textAlign: "center", fontFamily: "'Segoe UI', sans-serif"}}>
            🛡️ Expediente exportable ante cualquier fiscalización
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* VISIÓN Y MISIÓN */}
<section className="vm-section" id="nosotros">
  <div className="section-inner">
    <div style={{textAlign: "center", marginBottom: "0.5rem", position: "relative", zIndex: 1}}>
      <div className="ornament" style={{color: "var(--dorado-fuerte)"}}>— ✦ —</div>
      <span className="section-tag">Nuestra identidad</span>
      <h2 className="section-title">Visión y Misión</h2>
      <p className="section-desc" style={{color: "rgba(125,211,252,0.45)", margin: "0.5rem auto 0", textAlign: "center"}}>
        Construimos una asociación que trasciende el acceso al cannabis medicinal — construimos confianza, tecnología y comunidad.
      </p>
    </div>
    <div className="vm-grid" style={{position: "relative", zIndex: 1}}>
      <div className="vm-card vision">
        <div className="vm-type">Visión</div>
        <h3>Liderar el estándar en cannabis medicinal de Chile</h3>
        <p>
          Ser la asociación de cannabis medicinal más avanzada y confiable del país, estableciendo el referente en cultivo indoor tecnificado, trazabilidad total y protección legal para nuestros socios — donde cada miembro accede con la certeza de calidad, transparencia y seguridad que merece.
        </p>
        <div className="vm-pillars">
          <div className="vm-pillar">Tecnología de cultivo de precisión</div>
          <div className="vm-pillar">Transparencia total en cada etapa</div>
          <div className="vm-pillar">Referente nacional en buenas prácticas</div>
        </div>
      </div>
      <div className="vm-card mision">
        <div className="vm-type">Misión</div>
        <h3>Acceso seguro, legal y transparente al cannabis medicinal</h3>
        <p>
          Proveer a cada socio cannabis medicinal de alta calidad, cultivado exclusivamente en ambientes indoor controlados con revisión experta y personalizada, garantizando trazabilidad completa desde el cultivo hasta la dispensación, protegiendo su salud, privacidad y derechos a través de cumplimiento normativo riguroso y tecnología de gestión certificada.
        </p>
        <div className="vm-pillars">
          <div className="vm-pillar">Calidad reproducible y verificable</div>
          <div className="vm-pillar">Protección legal permanente</div>
          <div className="vm-pillar">Comunidad basada en la confianza</div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* CTA FINAL */}
<section className="cta-section" id="unirse">
  <div className="cta-inner">
    <div className="ornament" style={{color: "var(--dorado-fuerte)"}}>— ✦ —</div>
    <span className="section-tag">¿Listo para unirte?</span>
    <h2 className="section-title">Accede al cannabis medicinal que mereces</h2>
    <p className="section-desc" style={{margin: "1rem auto 2.5rem", textAlign: "center"}}>
      Un proceso de inscripción transparente, documentación digital y un equipo que te acompaña desde el primer día. Sin letra chica, sin complicaciones.
    </p>
    <div className="cta-actions">
      <a href="/inscripcion" className="btn-tierra">Iniciar postulación →</a>
      <a href="/faq" className="btn-outline-tierra">Preguntas frecuentes</a>
    </div>
    <div style={{marginTop: "3rem", display: "flex", justifyContent: "center", gap: "3.5rem", flexWrap: "wrap"}}>
      <div style={{textAlign: "center"}}>
        <div style={{fontSize: "1.5rem", fontWeight: 700, color: "var(--tierra-oscuro)", fontFamily: "'Georgia', serif"}}>100%</div>
        <div style={{fontSize: "11px", color: "var(--texto-suave)", fontFamily: "'Segoe UI', sans-serif"}}>Cultivo indoor controlado</div>
      </div>
      <div style={{textAlign: "center"}}>
        <div style={{fontSize: "1.5rem", fontWeight: 700, color: "var(--tierra-oscuro)", fontFamily: "'Georgia', serif"}}>24/7</div>
        <div style={{fontSize: "11px", color: "var(--texto-suave)", fontFamily: "'Segoe UI', sans-serif"}}>Monitoreo ambiental</div>
      </div>
      <div style={{textAlign: "center"}}>
        <div style={{fontSize: "1.5rem", fontWeight: 700, color: "var(--tierra-oscuro)", fontFamily: "'Georgia', serif"}}>Diaria</div>
        <div style={{fontSize: "11px", color: "var(--texto-suave)", fontFamily: "'Segoe UI', sans-serif"}}>Revisión experta de cultivos</div>
      </div>
      <div style={{textAlign: "center"}}>
        <div style={{fontSize: "1.5rem", fontWeight: 700, color: "var(--tierra-oscuro)", fontFamily: "'Georgia', serif"}}>Legal</div>
        <div style={{fontSize: "11px", color: "var(--texto-suave)", fontFamily: "'Segoe UI', sans-serif"}}>Cumplimiento total</div>
      </div>
    </div>
  </div>
</section>

<footer>
  <strong>GreenTech</strong> — Asociación de Cannabis Medicinal · Chile<br/>
  <span style={{marginTop: "4px", display: "block"}}>Operamos bajo la normativa vigente de la Ley 20.000 y reglamentos de asociaciones cannábicas de Chile.</span>
</footer>


    </>
  )
}
