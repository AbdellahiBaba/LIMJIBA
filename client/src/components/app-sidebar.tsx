import { useLocation, Link } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
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
      adminOnly: false,
    },
    {
      title: t("nav.invoices"),
      url: "/invoices",
      icon: FileText,
      testId: "nav-invoices",
      adminOnly: false,
    },
    {
      title: t("nav.quickInvoice") || "Facture Rapide",
      url: "/quick-invoice",
      icon: FilePen,
      testId: "nav-quick-invoice",
      adminOnly: false,
    },
    {
      title: t("nav.stock"),
      url: "/stock",
      icon: Package,
      testId: "nav-stock",
      adminOnly: false,
    },
    {
      title: t("nav.pos"),
      url: "/pos",
      icon: ShoppingCart,
      testId: "nav-pos",
      adminOnly: false,
    },
    {
      title: t("nav.sales") || "Ventes",
      url: "/sales",
      icon: History,
      testId: "nav-sales",
      adminOnly: false,
    },
    {
      title: t("nav.resellers"),
      url: "/resellers",
      icon: Gift,
      testId: "nav-resellers",
      adminOnly: false,
    },
    {
      title: t("nav.customers") || "Clients",
      url: "/customers",
      icon: UserCircle,
      testId: "nav-customers",
      adminOnly: false,
    },
    {
      title: t("nav.salaries") || "Salaries",
      url: "/salaries",
      icon: Users,
      testId: "nav-salaries",
      adminOnly: true,
    },
    {
      title: t("nav.expenses") || "Expenses",
      url: "/expenses",
      icon: Receipt,
      testId: "nav-expenses",
      adminOnly: true,
    },
    {
      title: t("nav.branding"),
      url: "/branding",
      icon: Palette,
      testId: "nav-branding",
      adminOnly: true,
    },
    {
      title: t("nav.profit") || "Profit Calculator",
      url: "/profit",
      icon: Calculator,
      testId: "nav-profit",
      adminOnly: true,
    },
    {
      title: t("nav.settings") || "Parametres",
      url: "/settings",
      icon: Settings,
      testId: "nav-settings",
      adminOnly: true,
    },
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.isAdmin
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
