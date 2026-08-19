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
  /** Dados impressos na etiqueta (fazenda, carga, produto, cliente...) */
  details?: { label: string; value: string }[];
  /** Título da etiqueta impressa */
  tituloEtiqueta?: string;
  /** Instrução final da etiqueta (ex.: confirmação de recebimento) */
  notaEtiqueta?: string;
};

export function QrDisplay({ tipo, codigo, value, size = 200, label, details, tituloEtiqueta, notaEtiqueta }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  // A partir da evolução do QR: aponta para a página pública /r/<codigo>
  // (funciona com ou sem login; o código é a identidade permanente da madeira)
  const target =
    value ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/r/${encodeURIComponent(codigo)}`
      : `/r/${encodeURIComponent(codigo)}`);
  void tipo;

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, target, {
      width: size,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).catch(() => {});
    QRCode.toDataURL(target, { width: 512, margin: 2 }).then(setDataUrl).catch(() => {});
  }, [target, size]);

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

  const print = () => {
    const w = window.open("", "_blank", "width=560,height=760");
    if (!w) return;
    const linhas = (details ?? [])
      .map((d) => `<tr><th>${esc(d.label)}</th><td>${esc(d.value)}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta ${codigo}</title>
      <style>
      *{box-sizing:border-box}
      body{font-family:ui-sans-serif,system-ui;margin:0;padding:24px;color:#111}
      .etq{border:2px solid #111;border-radius:10px;padding:18px;max-width:460px;margin:0 auto}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #ccc;padding-bottom:10px}
      .brand{font-size:15px;font-weight:700;letter-spacing:.04em}
      .sub{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#666;margin-top:2px}
      .tit{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#666;text-align:right}
      .mid{display:flex;gap:14px;align-items:center;margin-top:12px}
      img{width:150px;height:150px}
      .code{font-family:ui-monospace,monospace;font-size:17px;font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}
      th{text-align:left;color:#666;font-weight:600;padding:2px 8px 2px 0;white-space:nowrap;text-transform:uppercase;font-size:9px;letter-spacing:.06em}
      td{padding:2px 0;font-weight:600}
      .lbl{font-size:11px;color:#333;margin-top:10px}
      .nota{margin-top:12px;border-top:1px dashed #999;padding-top:10px;font-size:10px;color:#333;line-height:1.5}
      .sig{margin-top:22px;font-size:9px;color:#666;display:flex;gap:12px}
      .sig div{flex:1;border-top:1px solid #111;padding-top:4px;text-transform:uppercase;letter-spacing:.08em}
      .url{font-size:8px;color:#666;word-break:break-all;margin-top:6px}
      </style></head>
      <body><div class="etq">
        <div class="hdr">
          <div><div class="brand">FAZENDA BELA VISTA</div><div class="sub">Rastreabilidade da madeira</div></div>
          <div class="tit">${esc(tituloEtiqueta ?? "Etiqueta de identificação")}</div>
        </div>
        <div class="mid">
          <img src="${dataUrl}" />
          <div style="flex:1">
            <div class="code">${esc(codigo)}</div>
            <table>${linhas}</table>
          </div>
        </div>
        ${label ? `<div class="lbl">${esc(label)}</div>` : ""}
        <div class="nota">${esc(notaEtiqueta ?? "Escaneie o QR Code para ver o histórico completo desta madeira, da floresta até a entrega.")}
          <div class="url">${esc(target)}</div>
        </div>
        <div class="sig"><div>Assinatura do responsável</div><div>Assinatura do cliente / recebedor</div></div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`);
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
