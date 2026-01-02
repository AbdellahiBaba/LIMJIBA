import { useLocation, Link } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
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
import {
  LayoutDashboard,
  FileText,
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
} from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { branding } = useBranding();

  const menuItems = [
    {
      title: t("nav.dashboard"),
      url: "/",
      icon: LayoutDashboard,
      testId: "nav-dashboard",
    },
    {
      title: t("nav.invoices"),
      url: "/invoices",
      icon: FileText,
      testId: "nav-invoices",
    },
    {
      title: t("nav.stock"),
      url: "/stock",
      icon: Package,
      testId: "nav-stock",
    },
    {
      title: t("nav.pos"),
      url: "/pos",
      icon: ShoppingCart,
      testId: "nav-pos",
    },
    {
      title: t("nav.sales") || "Ventes",
      url: "/sales",
      icon: History,
      testId: "nav-sales",
    },
    {
      title: t("nav.resellers"),
      url: "/resellers",
      icon: Gift,
      testId: "nav-resellers",
    },
    {
      title: t("nav.customers") || "Clients",
      url: "/customers",
      icon: UserCircle,
      testId: "nav-customers",
    },
    {
      title: t("nav.salaries") || "Salaries",
      url: "/salaries",
      icon: Users,
      testId: "nav-salaries",
    },
    {
      title: t("nav.expenses") || "Expenses",
      url: "/expenses",
      icon: Receipt,
      testId: "nav-expenses",
    },
    {
      title: t("nav.branding"),
      url: "/branding",
      icon: Palette,
      testId: "nav-branding",
    },
    {
      title: t("nav.profit") || "Profit Calculator",
      url: "/profit",
      icon: Calculator,
      testId: "nav-profit",
    },
  ];

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
              {menuItems.map((item) => {
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings className="h-3 w-3" />
          <span>v1.0.0 - Offline Mode</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
