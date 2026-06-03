import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [nome, setNome] = useState<string>(user.email ?? "");
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (p?.nome) setNome(p.nome);
      if (r) setRoles(r.map((x: { role: string }) => x.role));
    })();
  }, [user.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground">SilvaCore</span> · Rastreabilidade Antifurto
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <Link to="/_authenticated/usuarios" className="hidden sm:inline text-muted-foreground hover:text-foreground">{nome}</Link>
              {roles.map((r) => (
                <span key={r} className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-primary">{r}</span>
              ))}
              <Button size="sm" variant="ghost" onClick={logout} className="h-8 gap-1.5">
                <LogOut className="h-3.5 w-3.5" /> Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
