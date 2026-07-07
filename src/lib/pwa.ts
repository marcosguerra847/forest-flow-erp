// Registro guardado do Service Worker.
// Nunca registra em dev, iframe do Lovable, ou hosts *.lovableproject(.dev).com / beta.lovable.dev.
// Suporta kill-switch via ?sw=off para desregistrar SWs presos.

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const scriptURL = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (scriptURL.endsWith(SW_URL)) await r.unregister();
    }
  } catch { /* noop */ }
}

export async function registerPWA(): Promise<void> {
  if (isRefusedContext()) { await unregisterMatching(); return; }
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("[pwa] registration failed", err);
  }
}
