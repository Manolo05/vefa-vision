"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Download,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Minimize2,
  RotateCw,
} from "lucide-react";
import Link from "next/link";

type Action = "merge" | "split" | "compress" | "rotate";

const TOOLS: {
  id: Action;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  multiple: boolean;
}[] = [
  {
    id: "merge",
    label: "Fusionner",
    description: "Combiner plusieurs PDFs en un seul fichier",
    icon: <Layers className="w-5 h-5" />,
    color: "blue",
    multiple: true,
  },
  {
    id: "split",
    label: "Diviser",
    description: "Extraire des pages spécifiques d'un PDF",
    icon: <Scissors className="w-5 h-5" />,
    color: "purple",
    multiple: false,
  },
  {
    id: "compress",
    label: "Compresser",
    description: "Réduire la taille d'un fichier PDF",
    icon: <Minimize2 className="w-5 h-5" />,
    color: "emerald",
    multiple: false,
  },
  {
    id: "rotate",
    label: "Pivoter",
    description: "Faire pivoter toutes les pages d'un PDF",
    icon: <RotateCw className="w-5 h-5" />,
    color: "orange",
    multiple: false,
  },
];

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/20 border-blue-500 text-blue-400",
  purple: "bg-purple-500/20 border-purple-500 text-purple-400",
  emerald: "bg-emerald-500/20 border-emerald-500 text-emerald-400",
  orange: "bg-orange-500/20 border-orange-500 text-orange-400",
};

const BTN_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-500",
  purple: "bg-purple-600 hover:bg-purple-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  orange: "bg-orange-600 hover:bg-orange-500",
};

export default function PdfToolsPage() {
  const [activeTool, setActiveTool] = useState<Action>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [splitRange, setSplitRange] = useState("");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    downloadUrl?: string;
    fileName?: string;
    originalSize?: number;
    compressedSize?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTool = TOOLS.find((t) => t.id === activeTool)!;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf"
    );
    if (currentTool.multiple) {
      setFiles((prev) => [...prev, ...selected]);
    } else {
      setFiles(selected.slice(0, 1));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `$y(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const run = async () => {
    if (files.length === 0) {
      setError("Ajoutez au moins un fichier PDF");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("action", activeTool);
      files.forEach((f) => formData.append("files", f));

      if (activeTool === "split" && splitRange) {
        formData.append("range", splitRange);
      }
      if (activeTool === "rotate") {
        formData.append("angle", rotateAngle.toString());
      }

      const res = await fetch("/api/pdf-tools", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON (info/error) or binary (PDF)
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Erreur");
        }
        setResult({ success: true, message: data.message });
      } else {
        // Binary PDF response
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const disposition = res.headers.get("content-disposition") || "";
        const fileNameMatch = disposition.match(/filename="([^"]+)"/);
        const fileName = fileNameMatch?.[1] || "result.pdf";

        const originalSize = parseInt(res.headers.get("x-original-size") || "0");
        const compressedSize = parseInt(res.headers.get("x-compressed-size") || "0");

        setResult({
          success: true,
          downloadUrl: url,
          fileName,
          originalSize,
          compressedSize,
        });
      }
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const resetTool = (tool: Action) => {
    setActiveTool(tool);
    setFiles([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Outils PDF</h1>
              <p className="text-xs text-slate-400">VEFA Vision — Module 4</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Tool selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => resetTool(tool.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTool === tool.id
                  ? `${COLOR_MAP[tool.color]} border-2`
                  : "bg-white/5 border-white/10 hover:bg-white/10 border"
              }`}
            >
              <div
                className={`mb-2 ${
                  activeTool === tool.id ? "" : "text-slate-400"
                }`}
              >
                {tool.icon}
              </div>
              <div className="text-sm font-semibold">{tool.label}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">
                {tool.description}
              </div>
            </button>
          ))}
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all mb-4"
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">
            {currentTool.multiple
              ? "Glissez plusieurs PDFs ou "
              : "Glissez un PDF ou "}
            <span className="text-orange-400 font-medium">cliquez pour parcourir</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple={currentTool.multiple}
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-5">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5"
              >
                <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-slate-300 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tool-specific options */}
        {activeTool === "split" && (
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Pages à extraire (ex: 1-3,5,7-9)
            </label>
            <input
              type="text"
              value={splitRange}
              onChange={(e) => setSplitRange(e.target.value)}
              placeholder="1-3,5,7-9"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        )}

        {activeTool === "rotate" && (
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
              Angle de rotation
            </label>
            <div className="flex gap-3">
              {([90, 180, 270] as const).map((angle) => (
                <button
                  key={angle}
                  onClick={() => setRotateAngle(angle)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    rotateAngle === angle
                      ? "border-orange-500 bg-orange-500/20 text-orange-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={run}
          disabled={loading || files.length === 0}
          className={`w-full ${BTN_COLOR_MAP[currentTool.color]} disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              {currentTool.icon}
              {currentTool.label} le PDF
            </>
          )}
        </button>

        {/* Result */}
        {result?.success && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Opération réussie</span>
            </div>

            {result.message && (
              <p className="text-sm text-slate-300 mb-3">{result.message}</p>
            )}

            {result.originalSize && result.compressedSize ? (
              <div className="flex gap-6 text-sm mb-4">
                <div>
                  <p className="text-slate-400 text-xs">Taille originale</p>
                  <p className="font-medium">{formatSize(result.originalSize)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Taille compressée</p>
                  <p className="font-medium text-emerald-400">{formatSize(result.compressedSize)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Réduction</p>
                  <p className="font-medium text-emerald-400">
                    {Math.round((1 - result.compressedSize / result.originalSize) * 100)}%
                  </p>
                </div>
              </div>
            ) : null}

            {result.downloadUrl && (
              <a
                href={result.downloadUrl}
                download={result.fileName || "result.pdf"}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger {result.fileName}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
