import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string; nome: string; email: string;
  roles: string[];
};
const ROLES = ["admin", "gestor", "campo", "patio", "serraria", "comercial"] as const;
type AppRole = typeof ROLES[number];

export const Route = createFileRoute("/_authenticated/usuarios")({ component: UsuariosPage });

function UsuariosPage() {
  const qc = useQueryClient();
  const [meIsAdmin, setMeIsAdmin] = useState<boolean | null>(null);

  useState(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      setMeIsAdmin(Boolean(data));
    })();
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("id,nome,email").order("nome");
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const byUser = new Map<string, string[]>();
      roles?.forEach((r: { user_id: string; role: string }) => {
        const a = byUser.get(r.user_id) ?? []; a.push(r.role); byUser.set(r.user_id, a);
      });
      return profiles.map(p => ({ ...p, roles: byUser.get(p.id) ?? [] })) as Profile[];
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as AppRole });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Papel atribuído"); qc.invalidateQueries({ queryKey: ["users-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Papel removido"); qc.invalidateQueries({ queryKey: ["users-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administração"
        title="Usuários e papéis"
        description="Atribua papéis para controlar quem pode cadastrar fazendas, registrar inventário, conferir cargas no pátio ou apontar produção."
      />

      {meIsAdmin === false && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <ShieldCheck className="mb-2 h-4 w-4 text-amber-500" />
          Apenas administradores podem alterar papéis. Você consegue visualizar mas não editar.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DataTable
          rows={users}
          columns={[
            { key: "nome", label: "Nome" },
            { key: "email", label: "E-mail" },
            { key: "roles", label: "Papéis", render: (u) => (
              <div className="flex flex-wrap gap-1">
                {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                {u.roles.map(r => (
                  <Badge key={r} variant="secondary" className="gap-1">
                    {r}
                    {meIsAdmin && (
                      <button onClick={() => removeRole.mutate({ userId: u.id, role: r })} className="ml-0.5 hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            ) },
            { key: "add", label: "", render: (u) => meIsAdmin ? (
              <div className="flex justify-end">
                <Select onValueChange={(v) => addRole.mutate({ userId: u.id, role: v as AppRole })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="+ Atribuir" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => !u.roles.includes(r)).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null },
          ]}
        />
      )}

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Papéis disponíveis</h3>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <RoleDesc role="admin" desc="Acesso total. Pode gerenciar usuários e papéis." />
          <RoleDesc role="gestor" desc="Cadastra fazendas, talhões, gere operações." />
          <RoleDesc role="campo" desc="Registra inventário, cargas, fotos no campo." />
          <RoleDesc role="patio" desc="Confere recebimento, movimenta lotes." />
          <RoleDesc role="serraria" desc="Aponta ordens de produção e rendimento." />
          <RoleDesc role="comercial" desc="Gere pedidos e entregas (Fase 3)." />
        </div>
      </div>
    </div>
  );
}

function RoleDesc({ role, desc }: { role: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <Badge variant="outline" className="h-fit">{role}</Badge>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
