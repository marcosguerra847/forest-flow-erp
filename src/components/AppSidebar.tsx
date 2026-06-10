import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Trees, Factory, Boxes, Truck,
  FileBarChart, QrCode, MapPinned, Sprout, Users,
  Scissors, ClipboardCheck, Package2, AlertTriangle, ShoppingCart, Wallet,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import logoAsset from "@/assets/logo-bela-vista.png.asset.json";

const cadastros = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Fazendas", url: "/fazendas", icon: MapPinned },
  { title: "Talhões", url: "/talhoes", icon: Trees },
  { title: "Inventário Florestal", url: "/inventario", icon: Sprout },
];

const operacao = [
  { title: "Ordens de Colheita", url: "/ordens-colheita", icon: Scissors },
  { title: "Cargas (QR)", url: "/cargas", icon: Truck },
  { title: "Recebimento no Pátio", url: "/recebimento", icon: ClipboardCheck },
  { title: "Lotes do Pátio", url: "/lotes", icon: Boxes },
  { title: "Divergências", url: "/divergencias", icon: AlertTriangle },
];

const serraria = [
  { title: "Ordens de Produção", url: "/ordens-producao", icon: Factory },
  { title: "Produtos Acabados", url: "/produtos-acabados", icon: Package2 },
];

const comercial = [
  { title: "Clientes e Pedidos", url: "/comercial", icon: ShoppingCart },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
];

const inteligencia = [
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Rastreabilidade", url: "/rastreabilidade", icon: QrCode },
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  const renderGroup = (label: string, items: typeof cadastros) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <img src={logoAsset.url} alt="Fazenda Bela Vista" className="h-10 w-10 rounded-md object-cover shadow-[var(--shadow-glow)]" />
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-sidebar-foreground">Fazenda Bela Vista</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Madeira de Reflorestamento</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Cadastros", cadastros)}
        {renderGroup("Operação", operacao)}
        {renderGroup("Serraria", serraria)}
        {renderGroup("Comercial", comercial)}
        {renderGroup("Inteligência", inteligencia)}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-[10px] text-sidebar-foreground/40">
          Fase 1 · Operação completa
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
