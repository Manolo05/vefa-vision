"use client";
import Link from "next/link";
import { useState, useCallback, useRef } from "react";
import {
  Upload, Sparkles, Download, RotateCcw, Building2, Loader2,
  CheckCircle2, AlertCircle, FileText, Mail, X, Users, BookOpen,
  Scissors, ChevronRight
} from "lucide-react";

const MODULES = [
  {
    href: "/",
    icon: "🏠",
    label: "Home Staging IA",
    tag: "Module 1",
    color: "from-amber-900/40 to-amber-800/20 border-amber-700/50 hover:border-[#C9A96E]",
    tagColor: "bg-amber-900/60 text-amber-300",
    desc: "Importez un plan VEFA — chaque pièce est analysée et décorée fidèlement à son architecture réelle.",
    features: ["Analyse GPT-4o Vision", "Rendu pièce par pièce", "4 styles déco", "Export PDF"],
  },
  {
    href: "/brief",
    icon: "📋",
    label: "Brief Commercial",
    tag: "Module 2",
    color: "from-blue-900/40 to-blue-800/20 border-blue-700/50 hover:border-blue-400",
    tagColor: "bg-blue-900/60 text-blue-300",
    desc: "Uploadez vos documents VEFA et générez en 30s un brief commercial complet, une fiche investisseur ou le contenu d'une plaquette.",
    features: ["OCR + Vision IA", "3 types de brief", "Brief commercial", "Fiche investisseur"],
  },
  {
    href: "/clients",
    icon: "👥",
    label: "CRM Clients",
    tag: "Module 3",
    color: "from-emerald-900/40 to-emerald-800/20 border-emerald-700/50 hover:border-emerald-400",
    tagColor: "bg-emerald-900/60 text-emerald-300",
    desc: "Gérez vos dossiers clients VEFA, suivez l'avancement de chaque dossier et envoyez des emails personnalisés en 1 clic.",
    features: ["Pipeline kanban", "8 templates email IA", "Checklist documents", "Suivi relances"],
  },
  {
    href: "/pdf-tools",
    icon: "📄",
    label: "Outils PDF",
    tag: "Module 4",
    color: "from-purple-900/40 to-purple-800/20 border-purple-700/50 hover:border-purple-400",
    tagColor: "bg-purple-900/60 text-purple-300",
    desc: "Fusionnez, divisez, compressez, annotez, signez et filigranez vos PDFs directement dans le navigateur.",
    features: ["Fusionner / Diviser", "Filigrane & Signature", "Annoter & Pivoter", "Compression"],
  },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A96E]/10 border border-[#C9A96E]/30 text-[#C9A96E] text-sm font-medium mb-6">
            <span>✦</span>
            SaaS Immobilier VEFA — Powered by AI
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            VEFA Vision
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            La suite IA complète pour les commerciaux immobilier VEFA.
            Visualisez, préparez, gérez et signez — tout en un.
          </p>
        </div>

        {/* 4 modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`group block rounded-2xl border bg-gradient-to-br ${mod.color} p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/30`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{mod.icon}</span>
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mod.tagColor} mb-1 block`}>
                      {mod.tag}
                    </span>
                    <h2 className="text-lg font-bold text-white">{mod.label}</h2>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all mt-1"
                />
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                {mod.desc}
              </p>
              <div className="flex flex-wrap gap-2">
                {mod.features.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-zinc-400 border border-white/10"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Analyse par IA", value: "GPT-4o", icon: "🧠" },
            { label: "Génération image", value: "DALL-E 3", icon: "🎨" },
            { label: "Templates email", value: "8 types", icon: "✉️" },
            { label: "Outils PDF", value: "7 actions", icon: "📎" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-white font-bold text-sm">{s.value}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
