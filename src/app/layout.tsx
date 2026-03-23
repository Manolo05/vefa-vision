import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
