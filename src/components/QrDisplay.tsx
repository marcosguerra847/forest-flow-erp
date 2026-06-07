import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrDisplay({ value, size = 160 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } }).catch(() => {});
  }, [value, size]);
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-3">
      <canvas ref={ref} />
      <span className="font-mono text-[10px] tracking-wide text-neutral-700">{value}</span>
    </div>
  );
}
