/**
 * room-sketch.ts
 * Generates a 1-point perspective SVG sketch of an interior room.
 * Used as ControlNet conditioning image for Stable Diffusion.
 * Returns SVG string — convert to PNG with sharp.
 */

export interface RoomData {
  name: string;
  width: number;         // meters
  length: number;        // meters
  height?: number;       // meters (default 2.5)
  windows?: number;      // count on main wall (default 1)
  windowWall?: "back" | "left" | "right";
  hasDoor?: boolean;
  hasBalconyDoor?: boolean;
}

export function generateRoomSketchSVG(room: RoomData): string {
  const {
    width,
    length,
    height = 2.5,
    windows = 1,
    windowWall = "back",
    hasDoor = true,
    hasBalconyDoor = false,
  } = room;

  const CW = 800; // canvas width
  const CH = 600; // canvas height

  // ── Back wall sizing (based on real proportions) ──────────────────────
  const maxBW = CW * 0.42;
  const maxBH = CH * 0.48;
  const scale = Math.min(maxBW / width, maxBH / height);
  const bw = Math.round(width * scale);
  const bh = Math.round(height * scale);

  // Back wall centered
  const bx1 = Math.round(CW / 2 - bw / 2);
  const bx2 = Math.round(CW / 2 + bw / 2);
  const by1 = Math.round(CH / 2 - bh / 2);
  const by2 = Math.round(CH / 2 + bh / 2);

  // ── Room depth (length drives how "deep" the perspective looks) ────────
  // Depth ratio: longer room = more perspective convergence
  const depthRatio = Math.min(length / width, 2.5);
  const margin = Math.round(Math.min(CW, CH) * 0.06 * depthRatio);

  // "Frame" corners — the viewer's opening (with margin from canvas edge)
  const fx1 = margin;
  const fx2 = CW - margin;
  const fy1 = margin;
  const fy2 = CH - margin;

  const strokeColor = "#1a1a1a";
  const sw = 2; // stroke width

  // ── Build SVG ──────────────────────────────────────────────────────────
  let svg = `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CW}" height="${CH}" fill="white"/>
  <g stroke="${strokeColor}" stroke-width="${sw}" fill="none" stroke-linejoin="round">

    <!-- ── CEILING ── -->
    <polygon points="${fx1},${fy1} ${fx2},${fy1} ${bx2},${by1} ${bx1},${by1}" fill="#f5f5f5" stroke="${strokeColor}" stroke-width="${sw}"/>

    <!-- ── FLOOR ── -->
    <polygon points="${fx1},${fy2} ${fx2},${fy2} ${bx2},${by2} ${bx1},${by2}" fill="#e8e8e8" stroke="${strokeColor}" stroke-width="${sw}"/>

    <!-- ── LEFT WALL ── -->
    <polygon points="${fx1},${fy1} ${fx1},${fy2} ${bx1},${by2} ${bx1},${by1}" fill="#efefef" stroke="${strokeColor}" stroke-width="${sw}"/>

    <!-- ── RIGHT WALL ── -->
    <polygon points="${fx2},${fy1} ${fx2},${fy2} ${bx2},${by2} ${bx2},${by1}" fill="#e9e9e9" stroke="${strokeColor}" stroke-width="${sw}"/>

    <!-- ── BACK WALL ── -->
    <rect x="${bx1}" y="${by1}" width="${bw}" height="${bh}" fill="#fafafa" stroke="${strokeColor}" stroke-width="${sw}"/>
`;

  // ── Floor perspective grid lines ────────────────────────────────────
  const gridN = 5;
  for (let i = 1; i < gridN; i++) {
    const t = i / gridN;
    const gx1 = Math.round(bx1 + (fx1 - bx1) * t);
    const gx2 = Math.round(bx2 + (fx2 - bx2) * t);
    const gy = Math.round(by2 + (fy2 - by2) * t);
    svg += `    <line x1="${gx1}" y1="${gy}" x2="${gx2}" y2="${gy}" stroke="#ccc" stroke-width="0.5"/>\n`;
  }
  // Vertical grid on floor
  const vgN = 6;
  for (let i = 1; i < vgN; i++) {
    const t = i / vgN;
    const gxBack = Math.round(bx1 + (bx2 - bx1) * t);
    const gxFront = Math.round(fx1 + (fx2 - fx1) * t);
    svg += `    <line x1="${gxBack}" y1="${by2}" x2="${gxFront}" y2="${fy2}" stroke="#ccc" stroke-width="0.5"/>\n`;
  }

  // ── Windows ─────────────────────────────────────────────────────────
  if (windows > 0) {
    if (windowWall === "back") {
      const totalWinW = bw * 0.65;
      const winH = bh * (hasBalconyDoor ? 0.75 : 0.42);
      const winY1 = by1 + bh * 0.18;
      const winY2 = winY1 + winH;
      const winW = totalWinW / windows - 8;
      const gap = (totalWinW - winW * windows) / (windows + 1);
      for (let i = 0; i < windows; i++) {
        const wx = bx1 + gap + i * (winW + gap);
        svg += `
    <!-- Window ${i + 1} on back wall -->
    <rect x="${Math.round(wx)}" y="${Math.round(winY1)}" width="${Math.round(winW)}" height="${Math.round(winH)}" fill="#d4eaff" stroke="${strokeColor}" stroke-width="1.5"/>
    <line x1="${Math.round(wx + winW / 2)}" y1="${Math.round(winY1)}" x2="${Math.round(wx + winW / 2)}" y2="${Math.round(winY2)}" stroke="${strokeColor}" stroke-width="1"/>
    <line x1="${Math.round(wx)}" y1="${Math.round(winY1 + winH / 2)}" x2="${Math.round(wx + winW)}" y2="${Math.round(winY1 + winH / 2)}" stroke="${strokeColor}" stroke-width="1"/>\n`;
      }
    }

    if (windowWall === "left") {
      // Window on left wall (in perspective trapezoid)
      const wlx1 = Math.round(fx1 + (bx1 - fx1) * 0.3);
      const wlx2 = Math.round(fx1 + (bx1 - fx1) * 0.7);
      const wly1 = Math.round(fy1 + (by1 - fy1) * 0.3 + (CH * 0.12));
      const wly2 = Math.round(wly1 + CH * 0.22);
      svg += `
    <!-- Window on left wall -->
    <polygon points="${wlx1},${wly1} ${wlx2},${wly1} ${wlx2},${wly2} ${wlx1},${wly2}" fill="#d4eaff" stroke="${strokeColor}" stroke-width="1.5"/>\n`;
    }

    if (windowWall === "right") {
      const wrx1 = Math.round(bx2 + (fx2 - bx2) * 0.3);
      const wrx2 = Math.round(bx2 + (fx2 - bx2) * 0.7);
      const wry1 = Math.round(fy1 + (by1 - fy1) * 0.3 + (CH * 0.12));
      const wry2 = Math.round(wry1 + CH * 0.22);
      svg += `
    <!-- Window on right wall -->
    <polygon points="${wrx1},${wry1} ${wrx2},${wry1} ${wrx2},${wry2} ${wrx1},${wry2}" fill="#d4eaff" stroke="${strokeColor}" stroke-width="1.5"/>\n`;
    }
  }

  // ── Door ─────────────────────────────────────────────────────────────
  if (hasDoor) {
    const doorW = Math.round(bw * 0.17);
    const doorH = Math.round(bh * 0.72);
    const doorX = bx2 - doorW - Math.round(bw * 0.04);
    const doorY = by2 - doorH;
    svg += `
    <!-- Door on back wall -->
    <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" fill="#f0e0c8" stroke="${strokeColor}" stroke-width="1.5"/>
    <path d="M ${doorX + doorW} ${doorY} A ${doorW} ${Math.round(doorW * 0.9)} 0 0 0 ${doorX} ${doorY + Math.round(doorW * 0.9)}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="3,2" fill="none"/>
    <circle cx="${doorX + Math.round(doorW * 0.15)}" cy="${Math.round(doorY + doorH * 0.5)}" r="3" fill="${strokeColor}"/>\n`;
  }

  // ── Baseboard line ────────────────────────────────────────────────────
  svg += `
    <!-- Baseboard -->
    <line x1="${bx1}" y1="${by2 - 6}" x2="${bx2}" y2="${by2 - 6}" stroke="#999" stroke-width="1"/>
    <line x1="${fx1}" y1="${fy2 - 6}" x2="${bx1}" y2="${by2 - 6}" stroke="#999" stroke-width="0.8"/>
    <line x1="${fx2}" y1="${fy2 - 6}" x2="${bx2}" y2="${by2 - 6}" stroke="#999" stroke-width="0.8"/>
`;

  svg += `  </g>
</svg>`;

  return svg;
}

/**
 * Parse dimensions string like "4.5m × 6m, 27m²" or "4.80 x 5.20"
 * Returns { width, length } in meters
 */
export function parseDimensions(
  dimensionStr: string
): { width: number; length: number } | null {
  const match = dimensionStr.match(
    /(\d+(?:[.,]\d+)?)\s*[mx×xX]\s*(\d+(?:[.,]\d+)?)/i
  );
  if (!match) return null;
  return {
    width: parseFloat(match[1].replace(",", ".")),
    length: parseFloat(match[2].replace(",", ".")),
  };
}
