import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    let query = supabase.from("relances").select("type, status, sent_at, created_at").order("created_at", { ascending: false }).limit(100);
    if (clientId) query = (query as any).eq("client_id", clientId);
    const { data: relances } = await query;
    const stats = {
      total: relances?.length || 0,
      envoye: relances?.filter((r) => r.status === "envoye").length || 0,
      genere: relances?.filter((r) => r.status === "genere").length || 0,
      byType: {} as Record<string, number>,
      derniere: relances?.[0]?.sent_at || relances?.[0]?.created_at || null,
    };
    relances?.forEach((r) => { stats.byType[r.type] = (stats.byType[r.type] || 0) + 1; });
    return NextResponse.json({ success: true, stats, relances: relances || [] });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
