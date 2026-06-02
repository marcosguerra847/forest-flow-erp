import { ReactNode } from "react";

type Col<T> = { key: keyof T | string; label: string; render?: (row: T) => ReactNode; align?: "left" | "right" };

export function DataTable<T extends Record<string, any>>({
  columns, rows,
}: {
  columns: Col<T>[];
  rows: T[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-[var(--shadow-elegant)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40">
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={`px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 transition-colors hover:bg-secondary/30">
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={`px-4 py-3 text-foreground ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                  >
                    {c.render ? c.render(row) : String(row[c.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const map = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success border border-success/30",
    warning: "bg-warning/15 text-warning border border-warning/30",
    danger: "bg-destructive/15 text-destructive border border-destructive/30",
    info: "bg-accent/15 text-accent-foreground border border-accent/30",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
