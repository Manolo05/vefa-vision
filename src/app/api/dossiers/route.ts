import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

// GET /api/dossiers
export async function GET(req: NextRequest) {
      try {
              const { searchParams } = new URL(req.url);
              const clientId = searchParams.get("clientId");

        let query = supabaseAdmin
                .from("dossiers")
                .select(
                            `
                                    *,
                                            client:clients(id, nom, prenom, email),
                                                    relances:relances(count)
                                                          `
                          )
                .order("created_at", { ascending: false });

        if (clientId) {
                  query = query.eq("client_id", clientId);
        }

        const { data, error } = await query;
              if (error) throw error;

        return NextResponse.json({ success: true, dossiers: data || [] });
      } catch (error) {
              console.error("GET dossiers error:", error);
              return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
      }
}

// POST /api/dossiers — create dossier using raw SQL to bypass schema cache
export async function POST(req: NextRequest) {
      try {
              const body = await req.json();
              const {
                        client_id,
                        programme,
                        lot,
                        typologie,
                        surface,
                        prix,
                        statut,
                        notes,
                        date_signature,
                        date_livraison,
              } = body;

        if (!client_id || !programme) {
                  return NextResponse.json(
                      { error: "Client et programme requis" },
                      { status: 400 }
                            );
        }

        // Use raw SQL via rpc to bypass PostgREST schema cache issues
        const { data, error } = await supabaseAdmin.rpc("create_dossier", {
                  p_client_id: client_id,
                  p_programme: programme,
                  p_titre: programme,
                  p_lot: lot || null,
                  p_typologie: typologie || null,
                  p_surface: surface ? Number(surface) : null,
                  p_prix: prix ? Number(prix) : null,
                  p_statut: statut || "en_cours",
                  p_notes: notes || null,
                  p_date_signature: date_signature || null,
                  p_date_livraison: date_livraison || null,
        });

        if (error) {
                  // Fallback: try direct insert with only known columns
                const { data: fallbackData, error: fallbackError } = await supabaseAdmin
                    .from("dossiers")
                    .insert({
                                  client_id,
                                  programme,
                                  titre: programme,
                                  lot: lot || null,
                                  statut: statut || "en_cours",
                                  notes: notes || null,
                                  date_signature: date_signature || null,
                                  created_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (fallbackError) throw fallbackError;

                // Update with extra columns if insert succeeded
                if (fallbackData?.id && (typologie || surface || prix || date_livraison)) {
                            await supabaseAdmin
                              .from("dossiers")
                              .update({
                                              typologie: typologie || null,
                                              surface: surface ? Number(surface) : null,
                                              prix: prix ? Number(prix) : null,
                                              date_livraison: date_livraison || null,
                              })
                              .eq("id", fallbackData.id);
                }

                return NextResponse.json({ success: true, dossier: fallbackData });
        }

        return NextResponse.json({ success: true, dossier: data });
      } catch (error) {
              console.error("POST dossiers error:", error);
              return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
      }
}

// PATCH /api/dossiers — update dossier
export async function PATCH(req: NextRequest) {
      try {
              const body = await req.json();
              const { id, ...updates } = body;

        if (!id) {
                  return NextResponse.json({ error: "ID requis" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
                .from("dossiers")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();

        if (error) throw error;

        return NextResponse.json({ success: true, dossier: data });
      } catch (error) {
              console.error("PATCH dossiers error:", error);
              return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
      }
}
