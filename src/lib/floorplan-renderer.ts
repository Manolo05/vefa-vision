import { FloorPlan, Room } from "./plan-analyzer";

interface RenderOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  showDimensions?: boolean;
  showRoomNames?: boolean;
  style?: "technical" | "presentation";
}

const ROOM_COLORS: Record<string, string> = {
  salon: "#FFF8F0", cuisine: "#F0FFF4", chambre: "#F0F4FF",
  sdb: "#F0FBFF", wc: "#FAFAFA", hall: "#F5F5F0",
  bureau: "#FFF0F8", dressing: "#FFFAF0", autre: "#F8F8F8",
};

export function renderFloorPlanSVG(plan: FloorPlan, opts: RenderOptions = {}): string {
  const { canvasWidth = 1024, canvasHeight = 1024, showDimensions = true, showRoomNames = true } = opts;
  if (!plan.rooms || plan.rooms.length === 0) throw new Error("Aucune piece a rendre");

  const margin = 80;
  const usableW = canvasWidth - margin * 2;
  const usableH = canvasHeight - margin * 2;

  const allRooms = plan.rooms;
  const maxRoomW = allRooms.reduce((m, r) => Math.max(m, r.width), 0);
  const maxRoomH = allRooms.reduce((m, r) => Math.max(m, r.length), 0);
  const totalW = maxRoomW * 3.5;
  const totalH = maxRoomH * 3.5;
  const scaleX = usableW / totalW;
  const scaleY = usableH / totalH;
  const scale = Math.min(scaleX, scaleY, 60);

  const toX = (px: number) => margin + (px / 100) * totalW * scale;
  const toY = (py: number) => margin + (py / 100) * totalH * scale;
  const toW = (m: number) => m * scale;

  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/>
  <defs><filter id="sh"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.12"/></filter></defs>\n`;

  for (const room of allRooms) {
    const x = toX(room.position.x);
    const y = toY(room.position.y);
    const w = toW(room.width);
    const h = toW(room.length);
    const fill = ROOM_COLORS[room.type] || "#F8F8F8";
    const fs = Math.max(9, Math.min(w, h) * 0.13);

    svg += `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="#2D2D2D" stroke-width="2.5" filter="url(#sh)"/>\n`;

    if (showRoomNames) {
      svg += `  <text x="${(x+w/2).toFixed(1)}" y="${(y+h/2-fs*0.5).toFixed(1)}" font-family="Arial" font-size="${fs}" fill="#333" text-anchor="middle" font-weight="600">${room.name}</text>\n`;
      svg += `  <text x="${(x+w/2).toFixed(1)}" y="${(y+h/2+fs*0.9).toFixed(1)}" font-family="Arial" font-size="${(fs*0.85).toFixed(1)}" fill="#666" text-anchor="middle">${room.area.toFixed(1)} m²</text>\n`;
    }

    if (showDimensions) {
      svg += `  <text x="${(x+w/2).toFixed(1)}" y="${(y-5).toFixed(1)}" font-family="Arial" font-size="10" fill="#999" text-anchor="middle">${room.width.toFixed(2)} m</text>\n`;
    }

    for (const door of room.doors || []) {
      const dw = scale * 0.9;
      if (door.wall === "S") {
        const dx = x + w * door.position - dw/2;
        svg += `  <rect x="${dx.toFixed(1)}" y="${(y+h-4).toFixed(1)}" width="${dw.toFixed(1)}" height="4" fill="white" stroke="none"/>
  <path d="M ${dx.toFixed(1)} ${(y+h).toFixed(1)} A ${dw.toFixed(1)} ${dw.toFixed(1)} 0 0 0 ${(dx+dw).toFixed(1)} ${(y+h).toFixed(1)}" stroke="#2D2D2D" stroke-width="1" fill="none" stroke-dasharray="3,2"/>\n`;
      } else if (door.wall === "N") {
        const dx = x + w * door.position - dw/2;
        svg += `  <rect x="${dx.toFixed(1)}" y="${(y-4).toFixed(1)}" width="${dw.toFixed(1)}" height="4" fill="white" stroke="none"/>
  <path d="M ${dx.toFixed(1)} ${y.toFixed(1)} A ${dw.toFixed(1)} ${dw.toFixed(1)} 0 0 1 ${(dx+dw).toFixed(1)} ${y.toFixed(1)}" stroke="#2D2D2D" stroke-width="1" fill="none" stroke-dasharray="3,2"/>\n`;
      }
    }

    for (const win of room.windows || []) {
      const ww = (win.width || 1.2) * scale;
      if (win.wall === "N") {
        svg += `  <rect x="${(x+w*win.position-ww/2).toFixed(1)}" y="${(y-4).toFixed(1)}" width="${ww.toFixed(1)}" height="6" fill="#A8D8EA" stroke="#2D8BBA" stroke-width="1.5"/>\n`;
      } else if (win.wall === "S") {
        svg += `  <rect x="${(x+w*win.position-ww/2).toFixed(1)}" y="${(y+h-2).toFixed(1)}" width="${ww.toFixed(1)}" height="6" fill="#A8D8EA" stroke="#2D8BBA" stroke-width="1.5"/>\n`;
      } else if (win.wall === "E") {
        svg += `  <rect x="${(x+w-2).toFixed(1)}" y="${(y+h*win.position-ww/2).toFixed(1)}" width="6" height="${ww.toFixed(1)}" fill="#A8D8EA" stroke="#2D8BBA" stroke-width="1.5"/>\n`;
      } else if (win.wall === "W") {
        svg += `  <rect x="${(x-4).toFixed(1)}" y="${(y+h*win.position-ww/2).toFixed(1)}" width="6" height="${ww.toFixed(1)}" fill="#A8D8EA" stroke="#2D8BBA" stroke-width="1.5"/>\n`;
      }
    }
  }

  svg += `  <g transform="translate(${canvasWidth-45},45)">
    <circle r="18" fill="white" stroke="#333" stroke-width="1.5"/>
    <text x="0" y="6" font-family="Arial" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">N</text>
  </g>
  <text x="${margin}" y="${canvasHeight-20}" font-family="Arial" font-size="11" fill="#888">Surface : ${plan.totalArea} m² — ${plan.typology}</text>
</svg>`;
  return svg;
}
