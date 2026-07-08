// Utilitário simples de exportação CSV (formato brasileiro: ";" como separador e vírgula decimal)
export function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
    if (s.includes(";") || s.includes("\n") || s.includes('"')) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = columns.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(";")).join("\n");
  return `\uFEFF${head}\n${body}`;
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
