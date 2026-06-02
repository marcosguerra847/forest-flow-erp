import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Trees, Package, Factory, Boxes, ShoppingCart,
  Truck, Wallet, FileBarChart, QrCode, TreePine,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

const operacional = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Florestal", url: "/florestal", icon: Trees },
  { title: "Entrada de Toras", url: "/toras", icon: Package },
  { title: "Produção", url: "/producao", icon: Factory },
  { title: "Estoque", url: "/estoque", icon: Boxes },
];

const negocio = [
  { title: "Comercial", url: "/comercial", icon: ShoppingCart },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
];

const inteligencia = [
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Rastreabilidade", url: "/rastreabilidade", icon: QrCode },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  const renderGroup = (label: string, items: typeof operacional) => (
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
          <div className="grid h-9 w-9 place-items-center rounded-md bg-[image:var(--gradient-accent)] shadow-[var(--shadow-glow)]">
            <TreePine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-sidebar-foreground">SilvaCore</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">ERP Madeireira</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operacional", operacional)}
        {renderGroup("Negócio", negocio)}
        {renderGroup("Inteligência", inteligencia)}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-[10px] text-sidebar-foreground/40">
          v0.1 · demo
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
