import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "VEFA Vision — La suite IA pour les commerciaux VEFA",
    description: "Home Staging IA, Brief Commercial, CRM Clients et Outils PDF pour les professionnels de l'immobilier neuf VEFA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
          <html lang="fr">
                <head>
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
                </head>
                <body className={inter.className} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {children}
                </body>
          </html>
        );
}

/* ── Navbar partagée pour les pages intérieures (/dashboard, /brief, etc.) ── */
export function AppNav() {
    return (
          <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
                        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg hover:opacity-80 transition-opacity">
                                  <span className="text-2xl" style={{ color: "#C9A96E" }}>⬡</span>
                                  <span>VEFA Vision</span>
                        </Link>
                        <div className="flex items-center gap-0.5">
                                  <Link href="/home-staging" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all">
                                              <span>🏠</span><span className="hidden sm:inline">Home Staging</span>
                                  </Link>
                                  <Link href="/brief" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all">
                                              <span>📋</span><span className="hidden sm:inline">Brief</span>
                                  </Link>
                                  <Link href="/clients" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all">
                                              <span>👥</span><span className="hidden sm:inline">Clients</span>
                                  </Link>
                                  <Link href="/pdf-tools" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all">
                                              <span>📄</span><span className="hidden sm:inline">PDF</span>
                                  </Link>
                        </div>
                </div>
          </nav>
        );
}
