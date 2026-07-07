// Fila offline de eventos de QR Code.
// Guarda inserts pendentes em IndexedDB (com a foto como Blob) e sincroniza quando volta a conexão.
import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";

type PendingEvento = {
  id?: number;
  codigo: string;
  tipo: string;
  etapa: string;
  descricao: string | null;
  observacao: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  latitude: number | null;
  longitude: number | null;
  foto?: Blob | null;
  foto_ext?: string | null;
  criado_em: string;
};

const DB_NAME = "bela-vista-offline";
const STORE = "eventos_pendentes";
let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponível");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueEvento(ev: PendingEvento): Promise<number> {
  const d = await db();
  return (await d.add(STORE, ev)) as number;
}

export async function countPendentes(): Promise<number> {
  try {
    const d = await db();
    return await d.count(STORE);
  } catch { return 0; }
}

async function uploadFoto(codigo: string, foto: Blob, ext: string): Promise<string | null> {
  const path = `${codigo}/${Date.now()}.${ext}`;
  const up = await supabase.storage.from("qr-eventos").upload(path, foto, { contentType: foto.type || "image/jpeg" });
  if (up.error) throw up.error;
  const { data: signed } = await supabase.storage.from("qr-eventos").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl ?? null;
}

export async function flushPendentes(): Promise<{ enviados: number; restantes: number }> {
  let enviados = 0;
  const d = await db();
  const all = await d.getAll(STORE);
  for (const ev of all as (PendingEvento & { id: number })[]) {
    try {
      let foto_url: string | null = null;
      if (ev.foto) foto_url = await uploadFoto(ev.codigo, ev.foto, ev.foto_ext ?? "jpg");
      const { error } = await supabase.from("eventos_qr" as never).insert({
        codigo: ev.codigo,
        tipo: ev.tipo,
        etapa: ev.etapa,
        descricao: ev.descricao,
        observacao: ev.observacao,
        usuario_id: ev.usuario_id,
        usuario_nome: ev.usuario_nome,
        latitude: ev.latitude,
        longitude: ev.longitude,
        foto_url,
        criado_em: ev.criado_em,
      } as never);
      if (error) throw error;
      await d.delete(STORE, ev.id);
      enviados++;
    } catch (e) {
      console.warn("[offline-queue] falha ao sincronizar evento", ev.id, e);
      break; // preserva ordem, tenta depois
    }
  }
  return { enviados, restantes: await d.count(STORE) };
}

let listenersReady = false;
export function initSync(onChange?: (count: number) => void): void {
  if (typeof window === "undefined" || listenersReady) return;
  listenersReady = true;
  const tick = async () => {
    if (!navigator.onLine) { onChange?.(await countPendentes()); return; }
    const r = await flushPendentes().catch(() => ({ restantes: 0 }));
    onChange?.(r.restantes);
  };
  window.addEventListener("online", tick);
  window.addEventListener("focus", tick);
  // primeira tentativa em background
  setTimeout(tick, 1500);
}
