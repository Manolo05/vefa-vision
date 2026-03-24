"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Credentials hardcodés (accès perso gratuit) ── */
const OWNER_EMAIL = "admin@vefa-vision.com";
const OWNER_PASSWORD = "vefa2026";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    if (
      email.trim().toLowerCase() === OWNER_EMAIL &&
      password === OWNER_PASSWORD
    ) {
      /* Stocker la session dans localStorage */
      localStorage.setItem("vv_auth", "true");
      router.push("/dashboard");
    } else {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(38 90% 45% / .12) 0%, transparent 60%), hsl(225,25%,5%)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Grille de fond */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(hsl(220 15% 20% / .5) 1px, transparent 1px), linear-gradient(90deg, hsl(220 15% 20% / .5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span
              className="text-4xl"
              style={{ color: "#C9A96E", filter: "drop-shadow(0 0 12px hsl(38 90% 55% / .5))" }}
            >
              ⬡
            </span>
            <span
              className="text-3xl font-bold"
              style={{
                background: "linear-gradient(135deg, #C9A96E, #e8c47a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              VEFA Vision
            </span>
          </Link>
          <p className="mt-3 text-sm text-zinc-500">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: "hsl(225 18% 10% / .9)",
            borderColor: "hsl(220 15% 18%)",
            boxShadow: "0 0 60px -20px hsl(38 90% 55% / .2), 0 24px 64px -16px hsl(0 0% 0% / .6)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h1
            className="text-xl font-bold text-white mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Connexion
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            Accédez à vos outils IA immobilier
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  ✉
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "hsl(225 20% 13%)",
                    border: "1px solid hsl(220 15% 20%)",
                    color: "white",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#C9A96E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 20%)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  🔒
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "hsl(225 20% 13%)",
                    border: "1px solid hsl(220 15% 20%)",
                    color: "white",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#C9A96E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 20%)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors text-sm"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "hsl(0 80% 20% / .4)", color: "#f87171", border: "1px solid hsl(0 70% 35%)" }}
              >
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: loading ? "hsl(38 60% 40%)" : "linear-gradient(135deg, #C9A96E, #b8933a)",
                color: "hsl(225,25%,5%)",
                boxShadow: loading ? "none" : "0 4px 20px -4px hsl(38 90% 55% / .4)",
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "hsl(220 15% 18%)" }} />
            <span className="text-xs text-zinc-600">Accès rapide</span>
            <div className="flex-1 h-px" style={{ background: "hsl(220 15% 18%)" }} />
          </div>

          {/* Quick access modules */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "CRM Clients", icon: "👥", href: "/clients" },
              { label: "Brief IA", icon: "📋", href: "/brief" },
              { label: "Outils PDF", icon: "📄", href: "/pdf-tools" },
            ].map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all group"
                style={{ background: "hsl(225 20% 13%)", border: "1px solid hsl(220 15% 18%)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "hsl(38 90% 55% / .4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 18%)")}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="text-xs text-zinc-500 group-hover:text-white transition-colors leading-tight">
                  {m.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-700">
          Accès réservé •{" "}
          <Link href="/" className="hover:text-zinc-400 transition-colors">
            Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
