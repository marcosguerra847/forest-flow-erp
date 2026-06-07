import { supabase } from "@/integrations/supabase/client";

export async function proximoCodigo(prefixo: "OC" | "CG" | "LP" | "OP" | "PA" | "DV"): Promise<string> {
  const { data, error } = await supabase.rpc("proximo_codigo" as never, { _prefixo: prefixo } as never);
  if (error) throw error;
  return data as string;
}
