import { createFileRoute, useRouter, redirect, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TreePine, ShieldCheck, QrCode, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo!");
    router.navigate({ to: "/" });
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { nome } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada. Você já pode entrar.");
    setTab("login");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[image:var(--gradient-forest)] p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[image:var(--gradient-accent)] shadow-[var(--shadow-glow)]">
            <TreePine className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">SilvaCore</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">ERP Madeireira & Silvicultura</div>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Rastreabilidade total<br />da fazenda à venda.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Controle antifurto da madeira: QR Code por carga, conferência no pátio, alertas automáticos de divergência e auditoria completa.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Feature icon={QrCode} title="QR por carga" />
            <Feature icon={ShieldCheck} title="Antifurto" />
            <Feature icon={Activity} title="Auditoria" />
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">v1.0 · Industrial · Lovable Cloud</div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-3 grid h-12 w-12 mx-auto place-items-center rounded-md bg-[image:var(--gradient-accent)]">
              <TreePine className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold">SilvaCore</h1>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="mt-6 space-y-4">
                <div className="space-y-1.5"><Label>Nome</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Senha</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
                <p className="text-[11px] text-muted-foreground">O primeiro usuário cadastrado vira <strong>admin</strong> automaticamente.</p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Voltar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-1.5 text-xs font-medium text-foreground">{title}</div>
    </div>
  );
}
