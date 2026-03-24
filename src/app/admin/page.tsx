"use client";
import { useState } from "react";
import Link from "next/link";

/* ── Types ── */
type Tab = "dashboard" | "users" | "revenue" | "modules" | "settings";

/* ── Fake data ── */
const STATS = [
  { label: "Utilisateurs actifs", value: "1 248", change: "+12%", up: true, icon: "👥" },
  { label: "Revenus ce mois", value: "€ 48 320", change: "+8.4%", up: true, icon: "💰" },
  { label: "Briefs générés", value: "9 847", change: "+23%", up: true, icon: "📋" },
  { label: "Churn rate", value: "2.1%", change: "-0.4%", up: false, icon: "📉" },
];

const USERS = [
  { id: 1, name: "Sophie Martin", email: "s.martin@remax.fr", plan: "Pro", status: "Actif", joined: "12 Jan 2026", revenue: "99€" },
  { id: 2, name: "Thomas Dupont", email: "t.dupont@orpi.com", plan: "Starter", status: "Actif", joined: "03 Fév 2026", revenue: "59,99€" },
  { id: 3, name: "Claire Moreau", email: "c.moreau@century21.fr", plan: "Agence", status: "Actif", joined: "18 Jan 2026", revenue: "490€" },
  { id: 4, name: "Lucas Bernard", email: "l.bernard@laforet.fr", plan: "Pro", status: "Inactif", joined: "05 Mar 2026", revenue: "99€" },
  { id: 5, name: "Emma Leroy", email: "e.leroy@guy-hoquet.com", plan: "Starter", status: "Actif", joined: "22 Fév 2026", revenue: "59,99€" },
  { id: 6, name: "Maxime Petit", email: "m.petit@foncia.com", plan: "Pro", status: "Actif", joined: "01 Mar 2026", revenue: "99€" },
  { id: 7, name: "Julie Blanc", email: "j.blanc@nexity.fr", plan: "Agence", status: "Actif", joined: "14 Jan 2026", revenue: "490€" },
  { id: 8, name: "Antoine Garcia", email: "a.garcia@immo.fr", plan: "Starter", status: "Suspendu", joined: "28 Jan 2026", revenue: "59,99€" },
];

const MODULES_DATA = [
  { name: "Home Staging IA", uses: 4821, growth: "+34%", icon: "🏠", color: "#C9A96E" },
  { name: "Brief Commercial", uses: 3209, growth: "+18%", icon: "📋", color: "#6E9EC9" },
  { name: "CRM Clients", uses: 2441, growth: "+11%", icon: "👥", color: "#6EC98E" },
  { name: "Outils PDF", uses: 1876, growth: "+7%", icon: "📄", color: "#C96E6E" },
];

const REVENUE_MONTHS = [
  { month: "Oct", amount: 31200 },
  { month: "Nov", amount: 36800 },
  { month: "Déc", amount: 41500 },
  { month: "Jan", amount: 44200 },
  { month: "Fév", amount: 46900 },
  { month: "Mar", amount: 48320 },
];

/* ── Helpers ── */
function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Actif: "bg-emerald-900/50 text-emerald-400 border-emerald-700",
    Inactif: "bg-zinc-800 text-zinc-400 border-zinc-700",
    Suspendu: "bg-red-900/50 text-red-400 border-red-700",
    Pro: "bg-amber-900/50 text-amber-400 border-amber-700",
    Starter: "bg-blue-900/50 text-blue-400 border-blue-700",
    Agence: "bg-purple-900/50 text-purple-400 border-purple-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
      {status}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ── Main Component ── */
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [sideOpen, setSideOpen] = useState(true);

  const filtered = USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const maxRevenue = Math.max(...REVENUE_MONTHS.map((r) => r.amount));

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "users", label: "Utilisateurs", icon: "👥" },
    { id: "revenue", label: "Revenus", icon: "💰" },
    { id: "modules", label: "Modules", icon: "🧩" },
    { id: "settings", label: "Paramètres", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(225,25%,5%)", color: "white", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col border-r transition-all duration-300"
        style={{
          width: sideOpen ? 240 : 64,
          background: "hsl(225,20%,8%)",
          borderColor: "hsl(220,15%,14%)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "hsl(220,15%,14%)" }}>
          <span className="text-2xl flex-shrink-0">⬡</span>
          {sideOpen && (
            <div>
              <div className="font-bold text-sm" style={{ color: "#C9A96E" }}>VEFA Vision</div>
              <div className="text-xs text-zinc-500">Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
              style={{
                background: tab === item.id ? "hsl(38,70%,55%,0.15)" : "transparent",
                color: tab === item.id ? "#C9A96E" : "hsl(215,15%,55%)",
                borderLeft: tab === item.id ? "2px solid #C9A96E" : "2px solid transparent",
              }}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sideOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSideOpen(!sideOpen)}
          className="m-3 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all text-sm text-center"
        >
          {sideOpen ? "◀ Réduire" : "▶"}
        </button>

        {/* Back to site */}
        <div className="p-3 border-t" style={{ borderColor: "hsl(220,15%,14%)" }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <span>🏠</span>
            {sideOpen && <span>Voir le site</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "hsl(220,15%,14%)", background: "hsl(225,20%,7%)" }}>
          <div>
            <h1 className="font-bold text-lg">
              {tab === "dashboard" && "Dashboard"}
              {tab === "users" && "Gestion Utilisateurs"}
              {tab === "revenue" && "Revenus & Facturation"}
              {tab === "modules" && "Statistiques Modules"}
              {tab === "settings" && "Paramètres"}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700" style={{ background: "hsl(225,20%,10%)" }}>
              🟢 Tous systèmes opérationnels
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#C9A96E", color: "hsl(225,25%,6%)" }}>
              A
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((s) => (
                  <div key={s.label} className="rounded-xl p-5 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl">{s.icon}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.up ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                        {s.change}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{s.value}</div>
                    <div className="text-xs text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Revenue chart */}
              <div className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-semibold">Évolution des revenus</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">6 derniers mois</p>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">+54.9% sur 6 mois</span>
                </div>
                <div className="flex items-end gap-3 h-40">
                  {REVENUE_MONTHS.map((r) => (
                    <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-zinc-500">€{Math.round(r.amount / 1000)}k</span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.round((r.amount / maxRevenue) * 120)}px`,
                          background: r.month === "Mar" ? "linear-gradient(180deg, #C9A96E, #a07840)" : "hsl(220,15%,20%)",
                        }}
                      />
                      <span className="text-xs text-zinc-400 font-medium">{r.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent users + Module usage */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Recent users */}
                <div className="rounded-xl p-5 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                  <h2 className="font-semibold mb-4">Derniers inscrits</h2>
                  <div className="space-y-3">
                    {USERS.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(225,20%,16%)", color: "#C9A96E" }}>
                            {u.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{u.name}</div>
                            <div className="text-xs text-zinc-500">{u.joined}</div>
                          </div>
                        </div>
                        <Badge status={u.plan} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Module usage */}
                <div className="rounded-xl p-5 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                  <h2 className="font-semibold mb-4">Utilisation des modules</h2>
                  <div className="space-y-4">
                    {MODULES_DATA.map((m) => (
                      <div key={m.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span>{m.icon}</span>
                            <span>{m.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-400">{m.growth}</span>
                            <span className="text-sm font-medium">{m.uses.toLocaleString("fr-FR")}</span>
                          </div>
                        </div>
                        <MiniBar value={m.uses} max={MODULES_DATA[0].uses} color={m.color} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <input
                  type="text"
                  placeholder="🔍 Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 rounded-lg text-sm border outline-none flex-1 max-w-sm"
                  style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,20%)", color: "white" }}
                />
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(220,15%,14%)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "hsl(225,20%,8%)", borderBottom: "1px solid hsl(220,15%,14%)" }}>
                      {["Utilisateur", "Plan", "Statut", "Inscrit le", "Revenu/mois", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr
                        key={u.id}
                        className="border-b transition-colors hover:bg-white/2"
                        style={{
                          borderColor: "hsl(220,15%,12%)",
                          background: i % 2 === 0 ? "hsl(225,20%,10%)" : "hsl(225,20%,9%)",
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "hsl(225,20%,16%)", color: "#C9A96E" }}>
                              {u.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-zinc-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge status={u.plan} /></td>
                        <td className="px-4 py-3"><Badge status={u.status} /></td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{u.joined}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: "#C9A96E" }}>{u.revenue}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">Voir</button>
                            <button className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">Éditer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {tab === "revenue" && (
            <div className="space-y-6">
              {/* MRR cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "MRR (Mars 2026)", value: "€ 48 320", sub: "Monthly Recurring Revenue", color: "#C9A96E" },
                  { label: "ARR estimé", value: "€ 579 840", sub: "Annual Recurring Revenue", color: "#6EC98E" },
                  { label: "ARPU", value: "€ 38,71", sub: "Revenu moyen par utilisateur", color: "#6E9EC9" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                    <div className="text-xs text-zinc-500 mb-2">{c.label}</div>
                    <div className="text-3xl font-bold mb-1" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-xs text-zinc-600">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Revenue by plan */}
              <div className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                <h2 className="font-semibold mb-6">Revenus par plan</h2>
                <div className="space-y-4">
                  {[
                    { plan: "Agence", users: 12, revenue: 5880, color: "#9B6EC9" },
                    { plan: "Pro", users: 284, revenue: 28116, color: "#C9A96E" },
                    { plan: "Starter", users: 952, revenue: 57111, color: "#6E9EC9" },
                  ].map((p) => (
                    <div key={p.plan}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <Badge status={p.plan} />
                          <span className="text-sm text-zinc-400">{p.users} utilisateurs</span>
                        </div>
                        <span className="font-semibold" style={{ color: p.color }}>€ {p.revenue.toLocaleString("fr-FR")}</span>
                      </div>
                      <MiniBar value={p.revenue} max={57111} color={p.color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly table */}
              <div className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                <h2 className="font-semibold mb-4">Historique mensuel</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase border-b" style={{ borderColor: "hsl(220,15%,14%)" }}>
                      <th className="pb-3 text-left">Mois</th>
                      <th className="pb-3 text-right">MRR</th>
                      <th className="pb-3 text-right">Croissance</th>
                      <th className="pb-3 text-right">Nouveaux clients</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "hsl(220,15%,12%)" }}>
                    {[
                      { month: "Mars 2026", mrr: 48320, growth: "+3.0%", new: 68 },
                      { month: "Fév 2026", mrr: 46900, growth: "+6.1%", new: 54 },
                      { month: "Jan 2026", mrr: 44200, growth: "+6.5%", new: 71 },
                      { month: "Déc 2025", mrr: 41500, growth: "+12.8%", new: 89 },
                      { month: "Nov 2025", mrr: 36800, growth: "+18.0%", new: 102 },
                      { month: "Oct 2025", mrr: 31200, growth: "—", new: 127 },
                    ].map((r) => (
                      <tr key={r.month}>
                        <td className="py-3 text-zinc-300">{r.month}</td>
                        <td className="py-3 text-right font-medium">€ {r.mrr.toLocaleString("fr-FR")}</td>
                        <td className="py-3 text-right text-emerald-400 text-xs">{r.growth}</td>
                        <td className="py-3 text-right text-zinc-400">+{r.new}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MODULES ── */}
          {tab === "modules" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {MODULES_DATA.map((m) => (
                  <div key={m.name} className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{m.icon}</span>
                        <div>
                          <div className="font-semibold">{m.name}</div>
                          <div className="text-xs text-zinc-500">Ce mois-ci</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">{m.growth}</span>
                    </div>
                    <div className="text-3xl font-bold mb-2" style={{ color: m.color }}>
                      {m.uses.toLocaleString("fr-FR")}
                    </div>
                    <div className="text-xs text-zinc-500 mb-2">utilisations</div>
                    <MiniBar value={m.uses} max={MODULES_DATA[0].uses} color={m.color} />
                  </div>
                ))}
              </div>

              {/* Top actions */}
              <div className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                <h2 className="font-semibold mb-4">Actions les plus utilisées</h2>
                <div className="space-y-3">
                  {[
                    { action: "Générer un home staging (salon)", module: "Home Staging IA", count: 1842, pct: 90 },
                    { action: "Créer un brief commercial", module: "Brief Commercial", count: 1209, pct: 72 },
                    { action: "Fusionner des PDFs", module: "Outils PDF", count: 987, pct: 62 },
                    { action: "Ajouter un prospect", module: "CRM Clients", count: 854, pct: 54 },
                    { action: "Générer un home staging (cuisine)", module: "Home Staging IA", count: 742, pct: 45 },
                    { action: "Envoyer une relance email", module: "CRM Clients", count: 631, pct: 38 },
                  ].map((a) => (
                    <div key={a.action} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{a.action}</span>
                          <span className="text-zinc-500">{a.count.toLocaleString("fr-FR")}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${a.pct}%`, background: "#C9A96E" }} />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600 w-32 text-right">{a.module}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              {[
                {
                  title: "Informations générales",
                  fields: [
                    { label: "Nom de l'application", value: "VEFA Vision", type: "text" },
                    { label: "Email de contact", value: "admin@vefa-vision.com", type: "email" },
                    { label: "URL du site", value: "https://vefa-vision.vercel.app", type: "text" },
                  ],
                },
                {
                  title: "Tarification",
                  fields: [
                    { label: "Prix Starter (€/mois)", value: "59.99", type: "number" },
                    { label: "Prix Pro (€/mois)", value: "99", type: "number" },
                    { label: "Essai gratuit (jours)", value: "14", type: "number" },
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                  <h2 className="font-semibold mb-5">{section.title}</h2>
                  <div className="space-y-4">
                    {section.fields.map((f) => (
                      <div key={f.label}>
                        <label className="block text-xs text-zinc-500 mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          defaultValue={f.value}
                          className="w-full px-4 py-2.5 rounded-lg text-sm border outline-none"
                          style={{ background: "hsl(225,20%,13%)", borderColor: "hsl(220,15%,20%)", color: "white" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Toggles */}
              <div className="rounded-xl p-6 border" style={{ background: "hsl(225,20%,10%)", borderColor: "hsl(220,15%,14%)" }}>
                <h2 className="font-semibold mb-5">Fonctionnalités</h2>
                <div className="space-y-4">
                  {[
                    { label: "Mode maintenance", desc: "Désactiver l'accès public au site", on: false },
                    { label: "Inscriptions ouvertes", desc: "Permettre de nouveaux comptes", on: true },
                    { label: "Essai gratuit actif", desc: "Offrir 14 jours d'essai sans CB", on: true },
                    { label: "Notifications email", desc: "Alertes par email pour les admins", on: true },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-zinc-500">{t.desc}</div>
                      </div>
                      <div
                        className="w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-all"
                        style={{ background: t.on ? "#C9A96E" : "hsl(220,15%,20%)" }}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-white transition-all"
                          style={{ transform: t.on ? "translateX(20px)" : "translateX(0)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ background: "#C9A96E", color: "hsl(225,25%,6%)" }}
              >
                Enregistrer les modifications
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
