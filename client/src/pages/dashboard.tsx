import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Package,
  FileText,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gift,
  BarChart3,
  Settings2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardStats } from "@shared/schema";

type SalesTrend = { month: string; sales: number; revenue: number };
type TopProduct = { name: string; quantity: number; revenue: number };

interface DashboardSettings {
  showStatCards: boolean;
  showQuickActions: boolean;
  showCompanyInfo: boolean;
  showSalesChart: boolean;
  showTopProducts: boolean;
}

const defaultSettings: DashboardSettings = {
  showStatCards: true,
  showQuickActions: true,
  showCompanyInfo: true,
  showSalesChart: true,
  showTopProducts: true,
};

function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    try {
      const stored = localStorage.getItem("dashboardSettings");
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("dashboardSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof DashboardSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return { settings, updateSetting, resetToDefaults };
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: "default" | "warning" | "success";
}) {
  const iconColors = {
    default: "text-primary",
    warning: "text-orange-500",
    success: "text-green-500",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { settings, updateSetting, resetToDefaults } = useDashboardSettings();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  const { data: salesTrends, isLoading: trendsLoading } = useQuery<SalesTrend[]>({
    queryKey: ["/api/dashboard/sales-trends"],
  });
  
  const { data: topProducts, isLoading: topLoading } = useQuery<TopProduct[]>({
    queryKey: ["/api/dashboard/top-products"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("company.tagline")}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-dashboard-settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Personnaliser l'affichage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showStatCards" className="text-sm">Statistiques</Label>
                  <Switch
                    id="showStatCards"
                    checked={settings.showStatCards}
                    onCheckedChange={(v) => updateSetting("showStatCards", v)}
                    data-testid="switch-stat-cards"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showQuickActions" className="text-sm">Actions rapides</Label>
                  <Switch
                    id="showQuickActions"
                    checked={settings.showQuickActions}
                    onCheckedChange={(v) => updateSetting("showQuickActions", v)}
                    data-testid="switch-quick-actions"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showCompanyInfo" className="text-sm">Info entreprise</Label>
                  <Switch
                    id="showCompanyInfo"
                    checked={settings.showCompanyInfo}
                    onCheckedChange={(v) => updateSetting("showCompanyInfo", v)}
                    data-testid="switch-company-info"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showSalesChart" className="text-sm">Graphique ventes</Label>
                  <Switch
                    id="showSalesChart"
                    checked={settings.showSalesChart}
                    onCheckedChange={(v) => updateSetting("showSalesChart", v)}
                    data-testid="switch-sales-chart"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showTopProducts" className="text-sm">Top produits</Label>
                  <Switch
                    id="showTopProducts"
                    checked={settings.showTopProducts}
                    onCheckedChange={(v) => updateSetting("showTopProducts", v)}
                    data-testid="switch-top-products"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={resetToDefaults}
                data-testid="button-reset-dashboard"
              >
                Reinitialiser
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {settings.showStatCards && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title={t("dashboard.totalProducts")}
                  value={stats?.totalProducts ?? 0}
                  icon={Package}
                />
                <StatCard
                  title={t("dashboard.lowStockAlerts")}
                  value={stats?.lowStockCount ?? 0}
                  icon={AlertTriangle}
                  variant={stats?.lowStockCount && stats.lowStockCount > 0 ? "warning" : "default"}
                />
                <StatCard
                  title={t("dashboard.invoicesThisMonth")}
                  value={stats?.totalInvoices ?? 0}
                  description={`${stats?.pendingInvoices ?? 0} ${t("invoices.pending").toLowerCase()}`}
                  icon={FileText}
                />
                <StatCard
                  title={t("dashboard.salesToday")}
                  value={stats?.todaySales ?? 0}
                  icon={ShoppingCart}
                  variant="success"
                />
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title={t("common.total") + " (DZD)"}
                  value={`${(stats?.todayRevenue ?? 0).toLocaleString()}`}
                  icon={TrendingUp}
                  variant="success"
                />
                <StatCard
                  title={t("dashboard.activeResellers")}
                  value={stats?.activeResellers ?? 0}
                  icon={Users}
                />
                <StatCard
                  title={t("resellers.inRewardPool")}
                  value={stats?.rewardPoolCount ?? 0}
                  icon={Gift}
                />
                <StatCard
                  title={t("invoices.pending")}
                  value={stats?.pendingInvoices ?? 0}
                  icon={Clock}
                  variant={stats?.pendingInvoices && stats.pendingInvoices > 0 ? "warning" : "default"}
                />
              </>
            )}
          </div>
        </>
      )}

      {(settings.showQuickActions || settings.showCompanyInfo) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {settings.showQuickActions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("dashboard.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <a
                  href="/invoices/new"
                  className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-new-invoice"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t("dashboard.newInvoice")}</p>
                    <p className="text-xs text-muted-foreground">{t("invoices.newInvoice")}</p>
                  </div>
                </a>
                <a
                  href="/pos"
                  className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-open-pos"
                >
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t("nav.pos")}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.newSale")}</p>
                  </div>
                </a>
                <a
                  href="/stock"
                  className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-manage-stock"
                >
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t("nav.stock")}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.addProduct")}</p>
                  </div>
                </a>
                <a
                  href="/resellers"
                  className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-resellers"
                >
                  <Gift className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t("nav.resellers")}</p>
                    <p className="text-xs text-muted-foreground">{t("resellers.title")}</p>
                  </div>
                </a>
              </CardContent>
            </Card>
          )}

          {settings.showCompanyInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("company.name")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.name")}</span>
                  <span className="font-medium">POLY FLECTA PLASTICA</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.description")}</span>
                  <span className="font-medium text-right">Fabrication d'Emballage en Plastique</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.address")}</span>
                  <span className="font-medium text-right">Village Zaitout, Hammam Dalaa - W M'sila</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Carte Artisan</span>
                  <span className="font-medium">28/ 00 - 2896688A24</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">N. Article</span>
                  <span className="font-medium">101082709</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.phone")}</span>
                  <span className="font-medium">+213 6 70 04 91 24</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(settings.showSalesChart || settings.showTopProducts) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {settings.showSalesChart && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Ventes Mensuelles</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : salesTrends && salesTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ventes" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Aucune donnee disponible
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {settings.showTopProducts && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Produits les Plus Vendus</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : topProducts && topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.slice(0, 5).map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                          <span className="text-sm font-medium truncate max-w-[150px]">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{product.quantity} vendus</div>
                          <div className="text-xs text-muted-foreground">{product.revenue.toLocaleString()} DZD</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Aucune donnee disponible
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
