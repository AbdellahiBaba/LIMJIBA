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
  useSidebar,
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
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    { title: t("nav.dashboard"), url: "/emanager-portal", icon: LayoutDashboard, testId: "nav-dashboard", permission: "dashboard" },
    { title: t("nav.invoices"), url: "/emanager-portal/invoices", icon: FileText, testId: "nav-invoices", permission: "invoices" },
    { title: t("nav.quickInvoice"), url: "/emanager-portal/quick-invoice", icon: FilePen, testId: "nav-quick-invoice", permission: "invoices" },
    { title: t("nav.stock"), url: "/emanager-portal/stock", icon: Package, testId: "nav-stock", permission: "stock" },
    { title: t("nav.pos"), url: "/emanager-portal/pos", icon: ShoppingCart, testId: "nav-pos", permission: "pos" },
    { title: t("nav.sales"), url: "/emanager-portal/sales", icon: History, testId: "nav-sales", permission: "sales" },
    { title: t("nav.resellers"), url: "/emanager-portal/resellers", icon: Gift, testId: "nav-resellers", permission: "resellers" },
    { title: t("nav.customers"), url: "/emanager-portal/customers", icon: UserCircle, testId: "nav-customers", permission: "customers" },
    { title: t("nav.suppliers"), url: "/emanager-portal/suppliers", icon: Truck, testId: "nav-suppliers", permission: "suppliers" },
    { title: t("nav.purchaseOrders"), url: "/emanager-portal/purchase-orders", icon: ClipboardList, testId: "nav-purchase-orders", permission: "purchase_orders" },
    { title: t("nav.transportation"), url: "/emanager-portal/transportation", icon: PackageCheck, testId: "nav-transportation", permission: "transportation" },
    { title: t("nav.salaries"), url: "/emanager-portal/salaries", icon: Users, testId: "nav-salaries", permission: "salaries" },
    { title: t("nav.expenses"), url: "/emanager-portal/expenses", icon: Receipt, testId: "nav-expenses", permission: "expenses" },
    { title: t("nav.reports"), url: "/emanager-portal/reports", icon: BarChart3, testId: "nav-reports", permission: "reports" },
    { title: t("nav.branding"), url: "/emanager-portal/branding", icon: Palette, testId: "nav-branding", permission: "branding" },
    { title: t("nav.profit"), url: "/emanager-portal/profit", icon: Calculator, testId: "nav-profit", permission: "reports" },
    { title: t("nav.auditLog"), url: "/emanager-portal/audit-log", icon: ScrollText, testId: "nav-audit-log", permission: "audit_log" },
    { title: t("nav.settings"), url: "/emanager-portal/settings", icon: Settings, testId: "nav-settings", permission: "settings" },
  ];

  const storeMenuItems = [
    { title: "Store Orders", url: "/emanager-portal/store-orders", icon: ShoppingBag, testId: "nav-store-orders", permission: "dashboard" },
    { title: "Promo Codes", url: "/emanager-portal/promo-codes", icon: Tag, testId: "nav-promo-codes", permission: "dashboard" },
    { title: "CMS", url: "/emanager-portal/cms", icon: PanelTop, testId: "nav-cms", permission: "dashboard" },
    { title: "LIMJIBA Agent", url: "/emanager-portal/limjiba", icon: Bot, testId: "nav-limjiba", permission: "dashboard" },
  ];

  const visibleStoreItems = storeMenuItems.filter(
    (item) => hasPermission(user, item.permission)
  );

  const visibleMenuItems = menuItems.filter(
    (item) => hasPermission(user, item.permission)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4" style={{ background: "linear-gradient(180deg, #0A1628, #0D1520)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={branding.logo || defaultLogoImg}
              alt={t("company.name")}
              className="w-11 h-11 rounded-lg object-contain p-0.5"
              style={{ background: "rgba(201,168,76,0.08)", boxShadow: "0 0 15px rgba(201,168,76,0.1)" }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-[0.15em] uppercase" style={{ color: "#C9A84C" }}>
              LIMJIBA
            </span>
            <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)" }}>لمجيبة</span>
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
                      className={isActive ? "font-medium" : ""}
                      style={isActive ? { borderRight: "2px solid #C9A84C" } : {}}
                    >
                      <Link href={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icon className="h-4 w-4" style={isActive ? { color: "#C9A84C" } : {}} />
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
            <SidebarGroupLabel className="text-xs uppercase tracking-wider px-4" style={{ color: "#C9A84C" }}>
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
                        className={isActive ? "font-medium" : ""}
                        style={isActive ? { borderRight: "2px solid #C9A84C" } : {}}
                      >
                        <Link href={item.url} onClick={() => setOpenMobile(false)}>
                          <item.icon className="h-4 w-4" style={isActive ? { color: "#C9A84C" } : {}} />
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
      <SidebarFooter className="p-4" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{user?.username}</span>
            <Badge variant={user?.isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5 py-0" style={user?.isAdmin ? { background: "linear-gradient(135deg, #C9A84C, #B8963F)", color: "#0A1628" } : {}}>
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
