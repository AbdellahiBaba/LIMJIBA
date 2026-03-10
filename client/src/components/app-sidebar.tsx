import { useLocation, Link } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { useAuth, hasPermission } from "@/contexts/auth-context";
import defaultLogoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";
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
  PackageCheck,
  Store,
  Tag,
  ShoppingBag,
  PanelTop,
  Bot,
  ExternalLink,
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
      title: t("nav.quickInvoice"),
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
      title: t("nav.sales"),
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
      title: t("nav.customers"),
      url: "/customers",
      icon: UserCircle,
      testId: "nav-customers",
      permission: "customers",
    },
    {
      title: t("nav.suppliers"),
      url: "/suppliers",
      icon: Truck,
      testId: "nav-suppliers",
      permission: "suppliers",
    },
    {
      title: t("nav.purchaseOrders"),
      url: "/purchase-orders",
      icon: ClipboardList,
      testId: "nav-purchase-orders",
      permission: "purchase_orders",
    },
    {
      title: t("nav.transportation"),
      url: "/transportation",
      icon: PackageCheck,
      testId: "nav-transportation",
      permission: "transportation",
    },
    {
      title: t("nav.salaries"),
      url: "/salaries",
      icon: Users,
      testId: "nav-salaries",
      permission: "salaries",
    },
    {
      title: t("nav.expenses"),
      url: "/expenses",
      icon: Receipt,
      testId: "nav-expenses",
      permission: "expenses",
    },
    {
      title: t("nav.reports"),
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
      title: t("nav.profit"),
      url: "/profit",
      icon: Calculator,
      testId: "nav-profit",
      permission: "reports",
    },
    {
      title: t("nav.auditLog"),
      url: "/audit-log",
      icon: ScrollText,
      testId: "nav-audit-log",
      permission: "audit_log",
    },
    {
      title: t("nav.settings"),
      url: "/settings",
      icon: Settings,
      testId: "nav-settings",
      permission: "settings",
    },
  ];

  const storeMenuItems = [
    {
      title: "Store Orders",
      url: "/store-orders",
      icon: ShoppingBag,
      testId: "nav-store-orders",
      permission: "dashboard",
    },
    {
      title: "Promo Codes",
      url: "/promo-codes",
      icon: Tag,
      testId: "nav-promo-codes",
      permission: "dashboard",
    },
    {
      title: "CMS",
      url: "/cms",
      icon: PanelTop,
      testId: "nav-cms",
      permission: "dashboard",
    },
    {
      title: "LEMJIBA Agent",
      url: "/limjiba",
      icon: Bot,
      testId: "nav-limjiba",
      permission: "dashboard",
    },
  ];

  const visibleStoreItems = storeMenuItems.filter(
    (item) => hasPermission(user, item.permission)
  );

  const visibleMenuItems = menuItems.filter(
    (item) => hasPermission(user, item.permission)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src={branding.logo || defaultLogoImg}
            alt={t("company.name")}
            className="w-10 h-10 rounded-md object-contain"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-sidebar-foreground">
              LEMJIBA
            </span>
            <span className="text-xs text-muted-foreground">لمجيبه</span>
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
        {visibleStoreItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
              Online Store
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleStoreItems.map((item) => {
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-testid="nav-view-store">
                    <a href="/store" target="_blank" rel="noopener noreferrer">
                      <Store className="h-4 w-4" />
                      <span>View Store</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{user?.username}</span>
            <Badge variant={user?.isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {user?.isAdmin ? t("settings.admin") : t("settings.staff")}
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
