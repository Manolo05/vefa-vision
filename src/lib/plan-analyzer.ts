import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Room {
  name: string;
  type: "salon" | "chambre" | "cuisine" | "sdb" | "wc" | "hall" | "bureau" | "dressing" | "autre";
  width: number;
  length: number;
  area: number;
  position: { x: number; y: number };
  doors: Array<{ wall: "N" | "S" | "E" | "W"; position: number }>;
  windows: Array<{ wall: "N" | "S" | "E" | "W"; position: number; width: number }>;
}

export interface FloorPlan {
  totalArea: number;
  typology: string;
  orientation: string;
  rooms: Room[];
  rawText: string;
  confidence: number;
}

export async function analyzePlanWithVision(
  imageBase64: string,
  mimeType: "image/png" | "image/jpeg" | "image/webp" = "image/png"
): Promise<FloorPlan> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Tu es un expert en lecture de plans architecturaux immobiliers.
Analyse ce plan d'appartement/maison et extrais TOUTES les informations avec la PRECISION MAXIMALE.

Retourne UNIQUEMENT un JSON valide respectant exactement ce schema :
{
  "totalArea": <surface totale en m2>,
  "typology": "<T1|T2|T3|T4|T5>",
  "orientation": "<N|S|E|W|NE|NW|SE|SW|Inconnue>",
  "confidence": <0.0 a 1.0>,
  "rooms": [
    {
      "name": "<nom exact sur le plan>",
      "type": "<salon|chambre|cuisine|sdb|wc|hall|bureau|dressing|autre>",
      "width": <largeur en metres, 2 decimales>,
      "length": <longueur en metres, 2 decimales>,
      "area": <surface en m2, 2 decimales>,
      "position": { "x": <0-100>, "y": <0-100> },
      "doors": [{ "wall": "<N|S|E|W>", "position": <0.0-1.0> }],
      "windows": [{ "wall": "<N|S|E|W>", "position": <0.0-1.0>, "width": <metres> }]
    }
  ]
}

REGLES : utilise les dimensions exactes si visibles. position x/y = coin haut-gauche (0=haut-gauche, 100=bas-droite).`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-4o Vision n'a pas retourne de reponse");

  const parsed = JSON.parse(content) as FloorPlan & { rawText?: string };
  parsed.rawText = content;
  parsed.rooms = parsed.rooms.map((room) => ({
    ...room,
    area:
      Math.abs(room.area - room.width * room.length) > room.width * room.length * 0.1
        ? parseFloat((room.width * room.length).toFixed(2))
        : room.area,
    doors: room.doors || [],
    windows: room.windows || [],
  }));
  return parsed;
}
