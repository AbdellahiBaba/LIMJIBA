import { useLocation, Link } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { useAuth, hasPermission } from "@/contexts/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  FilePen,
  Package,
  ShoppingCart,
  Gift,
  Settings,
  Palette,
  Calculator,
  Users,
  Receipt,
  History,
  UserCircle,
  Shield,
  Truck,
  BarChart3,
  ClipboardList,
  ScrollText,
} from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const { user } = useAuth();

  const menuItems = [
    {
      title: t("nav.dashboard"),
      url: "/",
      icon: LayoutDashboard,
      testId: "nav-dashboard",
      permission: "dashboard",
    },
    {
      title: t("nav.invoices"),
      url: "/invoices",
      icon: FileText,
      testId: "nav-invoices",
      permission: "invoices",
    },
    {
      title: t("nav.quickInvoice") || "Facture Rapide",
      url: "/quick-invoice",
      icon: FilePen,
      testId: "nav-quick-invoice",
      permission: "invoices",
    },
    {
      title: t("nav.stock"),
      url: "/stock",
      icon: Package,
      testId: "nav-stock",
      permission: "stock",
    },
    {
      title: t("nav.pos"),
      url: "/pos",
      icon: ShoppingCart,
      testId: "nav-pos",
      permission: "pos",
    },
    {
      title: t("nav.sales") || "Ventes",
      url: "/sales",
      icon: History,
      testId: "nav-sales",
      permission: "sales",
    },
    {
      title: t("nav.resellers"),
      url: "/resellers",
      icon: Gift,
      testId: "nav-resellers",
      permission: "resellers",
    },
    {
      title: t("nav.customers") || "Clients",
      url: "/customers",
      icon: UserCircle,
      testId: "nav-customers",
      permission: "customers",
    },
    {
      title: "Fournisseurs",
      url: "/suppliers",
      icon: Truck,
      testId: "nav-suppliers",
      permission: "suppliers",
    },
    {
      title: "Bons de Commande",
      url: "/purchase-orders",
      icon: ClipboardList,
      testId: "nav-purchase-orders",
      permission: "purchase_orders",
    },
    {
      title: t("nav.salaries") || "Salaries",
      url: "/salaries",
      icon: Users,
      testId: "nav-salaries",
      permission: "salaries",
    },
    {
      title: t("nav.expenses") || "Expenses",
      url: "/expenses",
      icon: Receipt,
      testId: "nav-expenses",
      permission: "expenses",
    },
    {
      title: "Rapports",
      url: "/reports",
      icon: BarChart3,
      testId: "nav-reports",
      permission: "reports",
    },
    {
      title: t("nav.branding"),
      url: "/branding",
      icon: Palette,
      testId: "nav-branding",
      permission: "branding",
    },
    {
      title: t("nav.profit") || "Profit Calculator",
      url: "/profit",
      icon: Calculator,
      testId: "nav-profit",
      permission: "reports",
    },
    {
      title: "Journal d'audit",
      url: "/audit-log",
      icon: ScrollText,
      testId: "nav-audit-log",
      permission: "audit_log",
    },
    {
      title: t("nav.settings") || "Parametres",
      url: "/settings",
      icon: Settings,
      testId: "nav-settings",
      permission: "settings",
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => hasPermission(user, item.permission)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt={t("company.name")}
              className="w-10 h-10 rounded-md object-contain"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <span className="text-white font-bold text-lg">PFP</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-sidebar-foreground">
              POLY FLECTA
            </span>
            <span className="text-xs text-muted-foreground">PLASTICA</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            {t("nav.dashboard")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={item.testId}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{user?.username}</span>
            <Badge variant={user?.isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {user?.isAdmin ? "Admin" : "Staff"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Settings className="h-3 w-3" />
            <span>v1.0.0</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
