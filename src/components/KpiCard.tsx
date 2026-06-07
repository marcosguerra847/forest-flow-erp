import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label, value, delta, icon: Icon, tone = "default",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-elegant)] transition-colors hover:border-primary/40">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</div>
          {delta && (
            <div className={cn(
              "mt-1 text-xs",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "danger" && "text-destructive",
              tone === "default" && "text-muted-foreground",
            )}>{delta}</div>
          )}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
