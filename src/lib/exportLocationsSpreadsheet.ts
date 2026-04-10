import type { Location, LocationGender, LocationGroup } from "@/types";

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

/**
 * UTF-8 BOM CSV — Excel opens as spreadsheet. Columns: name (별명 필드), address, phone, gender, group.
 */
export function downloadLocationsAsExcelCsv(locations: Location[]): void {
  const header = [
    "\uC774\uB984",
    "\uC8FC\uC18C",
    "\uC804\uD654\uBC88\uD638",
    "\uB0A8/\uC5EC",
    "\uACE0\uC815/\uC784\uC2DC",
  ];
  const rows = locations.map((loc) => [
    loc.nickname,
    loc.address,
    (loc.phone ?? "").trim(),
    genderLabel(loc.gender),
    groupLabel(loc.group),
  ]);
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  a.download = `\uC8FC\uC18C_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
