import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const DOCUMENTS_CHECKLIST = [
  { id: "cni", label: "CNI / Passeport", category: "identite", obligatoire: true },
  { id: "justif_domicile", label: "Justificatif de domicile", category: "identite", obligatoire: true },
  { id: "3_bulletins", label: "3 derniers bulletins de salaire", category: "revenus", obligatoire: true },
  { id: "avis_imposition", label: "2 derniers avis d'imposition", category: "revenus", obligatoire: true },
  { id: "releves_3mois", label: "3 derniers releves bancaires", category: "banque", obligatoire: true },
  { id: "apport", label: "Justificatif d'apport", category: "banque", obligatoire: false },
  { id: "contrat_travail", label: "Contrat de travail / K-bis", category: "revenus", obligatoire: true },
  { id: "contrat_reservation", label: "Contrat de reservation signe", category: "vefa", obligatoire: true },
  { id: "plan_appartement", label: "Plan de l'appartement", category: "vefa", obligatoire: true },
  { id: "notice_descriptive", label: "Notice descriptive", category: "vefa", obligatoire: false },
  { id: "simulation_pret", label: "Simulation de pret", category: "banque", obligatoire: false },
  { id: "offre_pret", label: "Offre de pret", category: "banque", obligatoire: false },
];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("dossier_documents").select("*").eq("dossier_id", params.id);
    if (error) throw error;
    const received = data || [];
    const checklist = DOCUMENTS_CHECKLIST.map((doc) => ({
      ...doc,
      status: received.find((r) => r.document_type === doc.id)?.status || "manquant",
      received_at: received.find((r) => r.document_type === doc.id)?.received_at || null,
    }));
    const missing = checklist.filter((d) => d.status === "manquant" && d.obligatoire);
    const completionRate = Math.round((checklist.filter((d) => d.status === "recu").length / checklist.length) * 100);
    return NextResponse.json({ success: true, checklist, missing, completionRate });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { document_type, status } = await req.json();
    await supabase.from("dossier_documents").upsert({
      dossier_id: params.id, document_type, status,
      received_at: status === "recu" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "dossier_id,document_type" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
