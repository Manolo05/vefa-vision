"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ── helpers ── */
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
          const el = ref.current
          if (!el) return;
          const obs = new IntersectionObserver(
                  ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold }
                );
          obs.observe(el);
          return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

type AnimProps = { children: React.ReactNode; delay?: number; className?: string };
function Anim({ children, delay = 0, className = "" }: AnimProps) {
    const { ref, visible } = useInView();
    return (
          <div
                  ref={ref}
                  className={className}
                  style={{
                            opacity: visible ? 1 : 0,
                            transform: visible ? "translateY(0)" : "translateY(28px)",
                            transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
                  }}
                >
            {children}
          </div>
        );
}

/* ── SVG icons ── */
const IconArrow = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
  );
const IconArrowSm = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
  );
const IconSparkle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  );
const IconHome = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  );
const IconFile = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  );
const IconUsers = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
const IconStack = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
  );
const IconBrain = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
  );
const IconZap = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  );
const IconShield = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  );
const IconBar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  );
const IconClock = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
const IconGlobe = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  );
const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
  );
const IconMenu = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  );
const IconX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  );

/* ── data ── */
const MODULES = [
  {
        icon: <IconHome />, title: "Home Staging IA",
        desc: "Importez un plan VEFA — chaque pièce est analysée et décorée fidèlement à son architecture réelle par IA.",
        tags: ["Analyse GPT-4o Vision", "Rendu pièce par pièce", "4 styles déco", "Export PDF"],
  },
  {
        icon: <IconFile />, title: "Brief Commercial",
        desc: "Uploadez vos documents VEFA et générez en 30s un brief commercial complet, une fiche investisseur ou une plaquette.",
        tags: ["OCR + Vision IA", "Brief commercial", "Fiche investisseur", "Contenu plaquette"],
  },
  {
        icon: <IconUsers />, title: "CRM Clients",
        desc: "Gérez vos dossiers clients VEFA, suivez l'avancement de chaque dossier et envoyez des relances par email en 1 clic.",
        tags: ["Pipeline Prospect→Signé", "8 templates email IA", "Checklist documents", "Suivi relances"],
  },
  {
        icon: <IconStack />, title: "Outils PDF",
        desc: "Fusionnez, divisez, compressez, annotez, signez et filigranez vos PDFs directement dans le navigateur.",
        tags: ["Fusionner / Diviser", "Filigrane & Signature", "Annoter & Pivoter", "Compression"],
  },
  ];

const FEATURES = [
  { icon: <IconBrain />, title: "IA de pointe", desc: "GPT-4o Vision et DALL-E 3 intégrés pour des résultats professionnels." },
  { icon: <IconZap />, title: "Ultra rapide", desc: "Générez un brief commercial complet en moins de 30 secondes." },
  { icon: <IconShield />, title: "Sécurisé", desc: "Vos données immobilières sont protégées et chiffrées." },
  { icon: <IconBar />, title: "Suivi CRM", desc: "Pipeline complet du prospect à la signature avec relances automatiques." },
  { icon: <IconClock />, title: "Gain de temps", desc: "Automatisez les tâches répétitives et concentrez-vous sur la vente." },
  { icon: <IconGlobe />, title: "100% en ligne", desc: "Aucune installation, accessible depuis n'importe quel navigateur." },
  ];

const PLANS = [
  {
        name: "Starter", price: "59,99", period: "/mois", popular: false,
        desc: "Pour les commerciaux indépendants qui débutent.",
        features: ["Home Staging IA (5 plans/mois)", "Brief Commercial (10 briefs/mois)", "CRM Clients (50 contacts)", "Outils PDF de base", "Support email"],
        cta: "Choisir Starter", href: "/dashboard",
  },
  {
        name: "Pro", price: "99", period: "/mois", popular: true,
        desc: "Pour les commerciaux confirmés qui veulent tout.",
        features: ["Home Staging IA illimité", "Brief Commercial illimité", "CRM Clients illimité", "Tous les outils PDF", "8 templates email IA", "Support prioritaire", "Export PDF personnalisé"],
        cta: "Choisir Pro", href: "/dashboard",
  },
  {
        name: "Agence", price: "Sur devis", period: "", popular: false,
        desc: "Pour les agences et promoteurs avec des besoins spécifiques.",
        features: ["Tout le plan Pro", "Multi-utilisateurs", "Marque blanche", "API dédiée", "Account manager dédié", "SLA garanti"],
        cta: "Nous contacter", href: "#",
  },
  ];

/* ═══════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════ */
export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
  
    return (
          <>
                <style>{`
                        :root {
                                  --gold: hsl(38,90%,55%);
                                            --gold-dark: hsl(38,95%,40%);
                                                      --gold-light: hsl(38,85%,70%);
                                                                --bg: hsl(225,25%,6%);
                                                                          --card: hsl(225,20%,10%);
                                                                                    --secondary: hsl(220,15%,16%);
                                                                                              --secondary-fg: hsl(210,20%,85%);
                                                                                                        --muted-fg: hsl(215,15%,55%);
                                                                                                                  --border: hsl(220,15%,18%);
                                                                                                                            --surface: hsl(225,18%,12%);
                                                                                                                                    }
                                                                                                                                            .grad-gold {
                                                                                                                                                      background: linear-gradient(135deg, hsl(38,90%,55%), hsl(28,95%,50%));
                                                                                                                                                                -webkit-background-clip: text;
                                                                                                                                                                          -webkit-text-fill-color: transparent;
                                                                                                                                                                                    background-clip: text;
                                                                                                                                                                                            }
                                                                                                                                                                                                    .glass {
                                                                                                                                                                                                              background: hsl(225 18% 12% / .75);
                                                                                                                                                                                                                        backdrop-filter: blur(20px);
                                                                                                                                                                                                                                  -webkit-backdrop-filter: blur(20px);
                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                  .glow { box-shadow: 0 0 40px -10px hsl(38 90% 55% / .35); }
                                                                                                                                                                                                                                                          .shadow-gold { box-shadow: 0 8px 32px -8px hsl(38 90% 55% / .25); }
                                                                                                                                                                                                                                                                  .building::before {
                                                                                                                                                                                                                                                                            content: '';
                                                                                                                                                                                                                                                                                      position: absolute;
                                                                                                                                                                                                                                                                                                inset: 0;
                                                                                                                                                                                                                                                                                                          background:
                                                                                                                                                                                                                                                                                                                      repeating-linear-gradient(transparent,transparent 16px,hsl(38 80% 55% / .07) 16px,hsl(38 80% 55% / .07) 17px),
                                                                                                                                                                                                                                                                                                                                  repeating-linear-gradient(90deg,transparent,transparent 18px,hsl(38 80% 55% / .07) 18px,hsl(38 80% 55% / .07) 19px);
                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                  .tag {
                                                                                                                                                                                                                                                                                                                                                            font-size: .7rem;
                                                                                                                                                                                                                                                                                                                                                                      padding: .2rem .7rem;
                                                                                                                                                                                                                                                                                                                                                                                border-radius: 9999px;
                                                                                                                                                                                                                                                                                                                                                                                          background: var(--secondary);
                                                                                                                                                                                                                                                                                                                                                                                                    color: var(--muted-fg);
                                                                                                                                                                                                                                                                                                                                                                                                              border: 1px solid var(--border);
                                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                                              @keyframes float {
                                                                                                                                                                                                                                                                                                                                                                                                                                        0%,100% { transform: translateY(0); }
                                                                                                                                                                                                                                                                                                                                                                                                                                                  50%      { transform: translateY(-10px); }
                                                                                                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  .float { animation: float 6s ease-in-out infinite; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        `}</style>
          
            {/* ── NAVBAR ── */}
                <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
                        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                                  <a href="/" className="font-bold text-2xl grad-gold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                              VEFA Vision
                                  </a>
                          {/* Desktop */}
                                  <div className="hidden md:flex items-center gap-8">
                                              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Fonctionnalités</a>
                                              <a href="#pricing"  className="text-sm text-zinc-400 hover:text-white transition-colors">Tarifs</a>
                                              <a href="#modules"  className="text-sm text-zinc-400 hover:text-white transition-colors">Modules</a>
                                              <Link href="/dashboard" className="text-sm px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-medium">Connexion</Link>
                                              <Link href="/dashboard" className="text-sm px-4 py-2 rounded-lg font-semibold transition-all glow" style={{ background: "var(--gold)", color: "hsl(225,25%,6%)" }}>
                                                            Essai gratuit
                                              </Link>
                                  </div>
                          {/* Hamburger */}
                                  <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
                                    {menuOpen ? <IconX /> : <IconMenu />}
                                  </button>
                        </div>
                  {/* Mobile menu */}
                  {menuOpen && (
                      <div className="md:hidden border-t border-zinc-800 px-6 pb-6 pt-4 flex flex-col gap-4" style={{ background: "var(--card)" }}>
                                  <a href="#features" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
                                  <a href="#pricing"  className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Tarifs</a>
                                  <a href="#modules"  className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Modules</a>
                                  <Link href="/dashboard" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Connexion</Link>
                                  <Link href="/dashboard" className="text-sm py-2 rounded-lg font-semibold text-center" style={{ background: "var(--gold)", color: "hsl(225,25%,6%)" }} onClick={() => setMenuOpen(false)}>
                                                Essai gratuit
                                  </Link>
                      </div>
                        )}
                </nav>
          
            {/* ── HERO ── */}
                <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20" style={{ background: "var(--bg)" }}>
                  {/* Background gradient */}
                        <div className="absolute inset-0 pointer-events-none">
                                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 80%, hsl(38 90% 45% / .1) 0%, transparent 70%)" }} />
                        </div>
                  {/* CSS Buildings */}
                        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 opacity-20 overflow-hidden pointer-events-none" style={{ height: "60%" }}>
                          {[
                        [70,55],[55,68],[100,90],[75,74],[130,100],[80,82],[95,66],[60,72],[105,88],[58,58]
                      ].map(([w,h],i) => (
                                    <div key={i} className="building relative flex-shrink-0" style={{ width: w, height: `${h}%`, background: "hsl(220,25%,18%)", borderTop: "2px solid hsl(220,25%,28%)" }} />
                                  ))}
                        </div>
                  {/* Glow bottom */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: "70%", height: "35%", background: "radial-gradient(ellipse at bottom, hsl(38 90% 55% / .12) 0%, transparent 70%)" }} />
                
                        <div className="relative z-10 text-center max-w-4xl mx-auto px-6 space-y-8">
                          {/* Badge */}
                                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-zinc-400 border border-zinc-700" style={{ background: "var(--secondary)" }}>
                                              <span style={{ color: "var(--gold)" }}><IconSparkle /></span>
                                              SaaS Immobilier VEFA — Powered by AI
                                  </div>
                        
                          {/* Headline */}
                                  <h1 className="font-bold leading-tight" style={{ fontSize: "clamp(2.4rem,6.5vw,4.75rem)", fontFamily: "'Space Grotesk',sans-serif" }}>
                                              La suite IA pour les<br />
                                              <span className="grad-gold">commerciaux VEFA</span>
                                  </h1>
                        
                          {/* Sub */}
                                  <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                                              Home staging IA, briefs commerciaux automatiques, CRM clients et outils PDF.<br />
                                              Tout ce dont vous avez besoin pour vendre plus, plus vite.
                                  </p>
                        
                          {/* CTA */}
                                  <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                                              <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all glow" style={{ background: "var(--gold)", color: "hsl(225,25%,6%)" }}>
                                                            Commencer gratuitement <IconArrow />
                                              </Link>
                                              <a href="#modules" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg border border-zinc-700 text-white hover:bg-zinc-800 transition-all">
                                                            Découvrir les modules
                                              </a>
                                  </div>
                        
                          {/* Stats */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 max-w-3xl mx-auto">
                                    {[
            { val: "GPT-4o", lbl: "Vision & Analyse" },
            { val: "DALL-E 3", lbl: "Génération image" },
            { val: "8 types", lbl: "Templates email" },
            { val: "7 actions", lbl: "Outils PDF" },
                        ].map(s => (
                                        <div key={s.lbl} className="text-center">
                                                        <div className="text-2xl font-bold" style={{ color: "var(--gold)", fontFamily: "'Space Grotesk',sans-serif" }}>{s.val}</div>
                                                        <div className="text-sm text-zinc-500 mt-1">{s.lbl}</div>
                                        </div>
                                      ))}
                                  </div>
                        </div>
                </section>
          
            {/* ── MODULES ── */}
                <section id="modules" className="py-24" style={{ background: "var(--bg)" }}>
                        <div className="max-w-6xl mx-auto px-6">
                                  <Anim className="text-center mb-16">
                                              <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontFamily: "'Space Grotesk',sans-serif" }}>
                                                            4 modules, <span className="grad-gold">une seule plateforme</span>
                                              </h2>
                                              <p className="text-zinc-400 max-w-xl mx-auto">Chaque module est conçu pour maximiser votre productivité et vos ventes VEFA.</p>
                                  </Anim>
                        
                                  <div className="grid md:grid-cols-2 gap-6">
                                    {MODULES.map((m, i) => (
                          <Anim key={m.title} delay={i * 80}>
                                          <div className="rounded-xl p-6 border border-zinc-800 transition-all duration-300 hover:border-yellow-500/30 hover:shadow-gold group cursor-pointer" style={{ background: "var(--card)" }}>
                                                            <div className="flex gap-4 items-start">
                                                                                <div className="p-3 rounded-lg flex-shrink-0" style={{ background: "var(--secondary)", color: "var(--gold)" }}>
                                                                                  {m.icon}
                                                                                  </div>
                                                                                <div>
                                                                                                      <h3 className="font-semibold text-lg mb-2 text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{m.title}</h3>
                                                                                                      <p className="text-sm text-zinc-400 leading-relaxed">{m.desc}</p>
                                                                                                      <div className="flex flex-wrap gap-2 mt-4">
                                                                                                        {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
                                                                                                        </div>
                                                                                  </div>
                                                            </div>
                                          </div>
                          </Anim>
                        ))}
                                  </div>
                        </div>
                </section>
          
            {/* ── FEATURES ── */}
                <section id="features" className="py-24" style={{ background: "hsl(225,20%,10%,.45)" }}>
                        <div className="max-w-6xl mx-auto px-6">
                                  <Anim className="text-center mb-16">
                                              <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontFamily: "'Space Grotesk',sans-serif" }}>
                                                            Pourquoi choisir <span className="grad-gold">VEFA Vision</span> ?
                                              </h2>
                                              <p className="text-zinc-400 max-w-xl mx-auto">Des outils pensés par et pour les professionnels de l&apos;immobilier neuf.</p>
                                  </Anim>
                        
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                                    {FEATURES.map((f, i) => (
                          <Anim key={f.title} delay={i * 70} className="text-center">
                                          <div className="inline-flex p-3 rounded-xl mb-4" style={{ background: "var(--secondary)", color: "var(--gold)" }}>
                                            {f.icon}
                                          </div>
                                          <h3 className="font-semibold text-lg mb-2 text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{f.title}</h3>
                                          <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                          </Anim>
                        ))}
                                  </div>
                        </div>
                </section>
          
            {/* ── PRICING ── */}
                <section id="pricing" className="py-24" style={{ background: "var(--bg)" }}>
                        <div className="max-w-6xl mx-auto px-6">
                                  <Anim className="text-center mb-16">
                                              <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontFamily: "'Space Grotesk',sans-serif" }}>
                                                            Des tarifs <span className="grad-gold">transparents</span>
                                              </h2>
                                              <p className="text-zinc-400 max-w-xl mx-auto">Choisissez le plan adapté à votre activité. Sans engagement.</p>
                                  </Anim>
                        
                                  <div className="grid md:grid-cols-3 gap-6">
                                    {PLANS.map((plan, i) => (
                          <Anim key={plan.name} delay={i * 100}>
                                          <div
                                                              className="relative rounded-2xl p-8 flex flex-col h-full"
                                                              style={{
                                                                                    background: "var(--card)",
                                                                                    border: plan.popular ? "2px solid var(--gold)" : "1px solid var(--border)",
                                                                                    boxShadow: plan.popular ? "0 0 50px -12px hsl(38 90% 55% / .35)" : undefined,
                                                              }}
                                                            >
                                            {plan.popular && (
                                                                                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full" style={{ background: "var(--gold)", color: "hsl(225,25%,6%)", fontFamily: "'Space Grotesk',sans-serif" }}>
                                                                                                        Populaire
                                                                                    </div>
                                                            )}
                                                            <div className="mb-6">
                                                                                <h3 className="font-bold text-xl text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{plan.name}</h3>
                                                                                <div className="flex items-baseline gap-1 mt-4 mb-2">
                                                                                                      <span className="text-4xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: plan.popular ? "var(--gold)" : "white" }}>
                                                                                                        {plan.price}
                                                                                                        </span>
                                                                                  {plan.period && <span className="text-zinc-400 text-sm">{plan.period}</span>}
                                                                                  {plan.price !== "Sur devis" && <span className="text-zinc-400 text-sm ml-1">€</span>}
                                                                                  </div>
                                                                                <p className="text-sm text-zinc-400">{plan.desc}</p>
                                                            </div>
                                          
                                                            <ul className="flex-1 flex flex-col gap-3 mb-8">
                                                              {plan.features.map(f => (
                                                                                    <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "var(--secondary-fg)" }}>
                                                                                                            <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }}><IconCheck /></span>
                                                                                      {f}
                                                                                      </li>
                                                                                  ))}
                                                            </ul>
                                          
                                                            <Link
                                                                                  href={plan.href}
                                                                                  className="w-full py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2 transition-all"
                                                                                  style={
                                                                                                          plan.popular
                                                                                                            ? { background: "var(--gold)", color: "hsl(225,25%,6%)" }
                                                                                                            : { background: "var(--secondary)", color: "var(--secondary-fg)" }
                                                                                    }
                                                                                >
                                                              {plan.cta} <IconArrowSm />
                                                            </Link>
                                          </div>
                          </Anim>
                        ))}
                                  </div>
                        </div>
                </section>
          
            {/* ── FOOTER ── */}
                <footer className="border-t py-12" style={{ borderColor: "var(--border)", background: "hsl(225,20%,10%,.3)" }}>
                        <div className="max-w-7xl mx-auto px-6">
                                  <div className="flex flex-wrap items-center justify-between gap-6">
                                              <div>
                                                            <span className="font-bold text-xl grad-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>VEFA Vision</span>
                                                            <p className="text-sm text-zinc-500 mt-1">La suite IA pour l&apos;immobilier VEFA.</p>
                                              </div>
                                              <div className="flex items-center gap-6 flex-wrap">
                                                            <a href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Fonctionnalités</a>
                                                            <a href="#pricing"  className="text-sm text-zinc-500 hover:text-white transition-colors">Tarifs</a>
                                                            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors">Connexion</Link>
                                                            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors">Inscription</Link>
                                              </div>
                                  </div>
                                  <div className="mt-8 pt-6 border-t text-center text-xs text-zinc-600" style={{ borderColor: "var(--border)" }}>
                                              © {new Date().getFullYear()} VEFA Vision. Tous droits réservés.
                                  </div>
                        </div>
                </footer>
          </>
        );
}
