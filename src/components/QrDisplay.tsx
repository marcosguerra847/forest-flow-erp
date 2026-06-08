import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

type Props = {
  /** Tipo da entidade — usado na URL pública de rastreio: cg | lp | pa | oc | op */
  tipo?: "cg" | "lp" | "pa" | "oc" | "op";
  /** Código humano (ex.: CG-2026-0001) */
  codigo: string;
  /** Valor cru opcional. Por padrão gera URL pública /qr/<tipo>/<codigo> */
  value?: string;
  size?: number;
  label?: string;
};

export function QrDisplay({ tipo, codigo, value, size = 200, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const target =
    value ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/qr/${tipo ?? "x"}/${encodeURIComponent(codigo)}`
      : `/qr/${tipo ?? "x"}/${encodeURIComponent(codigo)}`);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, target, {
      width: size,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).catch(() => {});
    QRCode.toDataURL(target, { width: 512, margin: 2 }).then(setDataUrl).catch(() => {});
  }, [target, size]);

  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR ${codigo}</title>
      <style>body{font-family:ui-sans-serif,system-ui;display:flex;flex-direction:column;align-items:center;padding:32px;}
      h1{font-size:14px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 4px;color:#555}
      .code{font-family:ui-monospace,monospace;font-size:18px;margin:8px 0 16px}
      .lbl{font-size:12px;color:#444;margin-top:12px;max-width:320px;text-align:center}
      img{width:320px;height:320px}</style></head>
      <body><h1>SilvaCore · Rastreio</h1><div class="code">${codigo}</div>
      <img src="${dataUrl}" /><div class="lbl">${label ?? ""}</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script></body></html>`);
    w.document.close();
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${codigo}.png`;
    a.click();
  };

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-3">
        <canvas ref={ref} />
        <div className="mt-2 text-center font-mono text-[10px] tracking-wide text-neutral-700">{codigo}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={print}><Printer className="mr-1 h-3.5 w-3.5" /> Imprimir</Button>
        <Button size="sm" variant="outline" onClick={download}><Download className="mr-1 h-3.5 w-3.5" /> PNG</Button>
      </div>
      {label && <p className="max-w-xs text-center text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}
