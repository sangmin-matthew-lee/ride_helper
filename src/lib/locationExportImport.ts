import type { Location, LocationGender, LocationGroup } from "@/types";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type LocationExportFormat = "xlsx" | "csv" | "pdf";

const SHEET_NAME = "\uC8FC\uC18C";

const HEADER: [string, string, string, string, string] = [
  "\uC774\uB984",
  "\uC8FC\uC18C",
  "\uC804\uD654\uBC88\uD638",
  "\uB0A8/\uC5EC",
  "\uACE0\uC815/\uC784\uC2DC",
];

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function genderLabel(g?: LocationGender): string {
  if (g === "male") return "\uB0A8";
  if (g === "female") return "\uC5EC";
  return "";
}

function groupLabel(g?: LocationGroup): string {
  return g === "temporary" ? "\uC784\uC2DC" : "\uACE0\uC815";
}

function genderFromCell(s: string): LocationGender | undefined {
  const t = s.trim().toLowerCase();
  if (!t) return undefined;
  if (t === "\ub0a8" || t === "\ub0a8\uc131" || t === "male" || t === "m") return "male";
  if (t === "\uc5ec" || t === "\uc5ec\uc131" || t === "female" || t === "f") return "female";
  return undefined;
}

function groupFromCell(s: string): LocationGroup | undefined {
  const t = s.trim().toLowerCase();
  if (!t) return undefined;
  if (t === "\uace0\uc815" || t === "fixed") return "fixed";
  if (t === "\uc784\uc2dc" || t === "temporary" || t === "temp") return "temporary";
  return undefined;
}

function normalizeHeaderCell(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function buildExportRows(locations: Location[]): string[][] {
  return locations.map((loc) => [
    loc.nickname,
    loc.address,
    (loc.phone ?? "").trim(),
    genderLabel(loc.gender),
    groupLabel(loc.group),
  ]);
}

function exportFilename(ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `\uC8FC\uC18C_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${ext}`;
}

export function downloadLocationsAsCsv(locations: Location[]): void {
  const lines = [
    HEADER.map(csvCell).join(","),
    ...buildExportRows(locations).map((r) => r.map(csvCell).join(",")),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFilename("csv");
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadLocationsAsXlsx(locations: Location[]): void {
  const aoa = [HEADER, ...buildExportRows(locations)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, exportFilename("xlsx"));
}

const PDF_ROWS_PER_PAGE = 16;

export async function downloadLocationsAsPdf(locations: Location[]): Promise<void> {
  const rows = buildExportRows(locations);
  const chunks: string[][][] = [];
  for (let i = 0; i < rows.length; i += PDF_ROWS_PER_PAGE) {
    chunks.push(rows.slice(i, i + PDF_ROWS_PER_PAGE));
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;

  for (let p = 0; p < chunks.length; p++) {
    if (p > 0) pdf.addPage();
    const chunk = chunks[p];
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "position:fixed",
      "left:-12000px",
      "top:0",
      "width:900px",
      "padding:14px 16px",
      "background:#ffffff",
      "color:#111827",
      'font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
      "font-size:11px",
      "box-sizing:border-box",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "\uC800\uC7A5\uB41C \uC8FC\uC18C";
    title.style.cssText = "font-weight:700;font-size:14px;margin-bottom:10px;";
    wrap.appendChild(title);

    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    HEADER.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.style.cssText =
        "text-align:left;padding:6px 8px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600;";
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    chunk.forEach((r) => {
      const tr = document.createElement("tr");
      r.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = cell;
        td.style.cssText = "padding:5px 8px;border:1px solid #e5e7eb;vertical-align:top;";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    document.body.appendChild(wrap);
    try {
      const canvas = await html2canvas(wrap, {
        background: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      let imgW = maxW;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > maxH) {
        const s = maxH / imgH;
        imgH = maxH;
        imgW *= s;
      }
      const x = margin + (maxW - imgW) / 2;
      const y = margin + (maxH - imgH) / 2;
      pdf.addImage(imgData, "JPEG", x, y, imgW, imgH);
    } finally {
      document.body.removeChild(wrap);
    }
  }

  pdf.save(exportFilename("pdf"));
}

export function downloadLocations(locations: Location[], format: LocationExportFormat): void | Promise<void> {
  if (format === "csv") {
    downloadLocationsAsCsv(locations);
    return;
  }
  if (format === "xlsx") {
    downloadLocationsAsXlsx(locations);
    return;
  }
  return downloadLocationsAsPdf(locations);
}

export type ParsedLocationRow = {
  nickname: string;
  address: string;
  phone: string;
  gender: LocationGender | undefined;
  group: LocationGroup | undefined;
};

type ColMap = {
  nickname: number;
  address: number;
  phone?: number;
  gender?: number;
  group?: number;
};

function isProbablyHeaderRow(row: unknown[]): boolean {
  if (!row.length) return false;
  const joined = row.map((c) => normalizeHeaderCell(c)).join("|");
  return (
    joined.includes("\uc774\ub984") ||
    joined.includes("\uc8fc\uc18c") ||
    joined.includes("name") ||
    joined.includes("nickname") ||
    joined.includes("address")
  );
}

function colMapFromHeader(row: unknown[]): ColMap | null {
  const norm = row.map((c) => normalizeHeaderCell(c));
  const find = (...keys: string[]) => {
    for (const k of keys) {
      const i = norm.indexOf(k);
      if (i >= 0) return i;
    }
    return -1;
  };
  const nickname = find(
    "\uc774\ub984",
    "\ubcc4\uba85",
    "name",
    "nickname",
    "title"
  );
  const address = find("\uc8fc\uc18c", "address");
  if (nickname < 0 || address < 0) return null;
  const phone = find("\uc804\ud654", "\uc804\ud654\ubc88\ud638", "phone", "tel");
  const gender = find("\ub0a8/\uc5ec", "\uc131\ubcc4", "gender", "sex");
  const group = find("\uace0\uc815/\uc784\uc2dc", "group", "type");
  return {
    nickname,
    address,
    ...(phone >= 0 ? { phone } : {}),
    ...(gender >= 0 ? { gender } : {}),
    ...(group >= 0 ? { group } : {}),
  };
}

function parseGridToRows(grid: unknown[][]): ParsedLocationRow[] {
  if (!grid.length) return [];
  let start = 0;
  let map: ColMap;
  const first = grid[0].map((c) => c);
  if (isProbablyHeaderRow(first)) {
    const m = colMapFromHeader(first);
    if (m) {
      map = m;
      start = 1;
    } else {
      map = { nickname: 0, address: 1, phone: 2, gender: 3, group: 4 };
      start = 1;
    }
  } else {
    map = { nickname: 0, address: 1, phone: 2, gender: 3, group: 4 };
    start = 0;
  }

  const out: ParsedLocationRow[] = [];
  for (let r = start; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;
    const nick = String(row[map.nickname] ?? "").trim();
    const addr = String(row[map.address] ?? "").trim();
    if (!nick || !addr) continue;
    const phoneRaw =
      map.phone !== undefined ? String(row[map.phone] ?? "").trim() : "";
    const genderRaw =
      map.gender !== undefined ? String(row[map.gender] ?? "").trim() : "";
    const groupRaw =
      map.group !== undefined ? String(row[map.group] ?? "").trim() : "";
    out.push({
      nickname: nick,
      address: addr,
      phone: phoneRaw,
      gender: genderFromCell(genderRaw),
      group: groupFromCell(groupRaw),
    });
  }
  return out;
}

export async function parseLocationImportFile(file: File): Promise<ParsedLocationRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return parseGridToRows(grid);
}

export async function geocodeAddressForImport(
  address: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ko&key=${key}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
  };
  if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) return null;
  const loc = data.results[0].geometry.location;
  return {
    lat: loc.lat,
    lng: loc.lng,
    formattedAddress: data.results[0].formatted_address,
  };
}
