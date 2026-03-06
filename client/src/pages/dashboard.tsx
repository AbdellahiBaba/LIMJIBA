import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Zap,
  Activity,
  ArrowRight,
  Receipt,
  Wallet,
  CreditCard,
  Crown,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Minus,
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
import type { DashboardStats, RecentActivity } from "@shared/schema";

type SalesTrend = { month: string; sales: number; revenue: number };
type TopProduct = { name: string; quantity: number; revenue: number };
type LowStockProduct = { id: string; name: string; stockQuantity: number; lowStockThreshold: number };

interface FilteredStats {
  period: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  salesCount: number;
  invoicesCount: number;
  avgOrderValue: number;
  outstandingCredit: number;
  topCustomer: { name: string; amount: number };
}

type PeriodKey = "today" | "week" | "month" | "year";

const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: "Cette année" },
];

interface DashboardSettings {
  showStatCards: boolean;
  showQuickActions: boolean;
  showCompanyInfo: boolean;
  showSalesChart: boolean;
  showTopProducts: boolean;
  showRecentActivity: boolean;
  showLowStock: boolean;
  widgetOrder: string[];
  collapsedWidgets: string[];
}

const defaultWidgetOrder = [
  "statCards",
  "revenueExpenses",
  "recentActivity",
  "lowStock",
  "quickActions",
  "companyInfo",
  "salesChart",
  "topProducts",
];

const defaultSettings: DashboardSettings = {
  showStatCards: true,
  showQuickActions: true,
  showCompanyInfo: true,
  showSalesChart: true,
  showTopProducts: true,
  showRecentActivity: true,
  showLowStock: true,
  widgetOrder: defaultWidgetOrder,
  collapsedWidgets: [],
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

  const moveWidget = (widgetKey: string, direction: "up" | "down") => {
    setSettings(prev => {
      const order = [...(prev.widgetOrder || defaultWidgetOrder)];
      const idx = order.indexOf(widgetKey);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return prev;
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      return { ...prev, widgetOrder: order };
    });
  };

  const toggleCollapsed = (widgetKey: string) => {
    setSettings(prev => {
      const collapsed = [...(prev.collapsedWidgets || [])];
      const idx = collapsed.indexOf(widgetKey);
      if (idx >= 0) collapsed.splice(idx, 1);
      else collapsed.push(widgetKey);
      return { ...prev, collapsedWidgets: collapsed };
    });
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return { settings, updateSetting, moveWidget, toggleCollapsed, resetToDefaults };
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  onClick,
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: "default" | "warning" | "success";
  onClick?: () => void;
  testId?: string;
}) {
  const iconColors = {
    default: "text-primary",
    warning: "text-orange-500",
    success: "text-green-500",
  };

  return (
    <Card className={onClick ? "cursor-pointer hover-elevate" : ""} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 p-3 sm:p-4 pb-1 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        <Icon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="text-lg sm:text-2xl font-bold truncate" data-testid={testId || `stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-1 sm:pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case "sale": return ShoppingCart;
    case "invoice": return FileText;
    case "expense": return Wallet;
    case "quick_invoice": return Zap;
    default: return Activity;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "sale": return "text-green-500";
    case "invoice": return "text-primary";
    case "expense": return "text-orange-500";
    case "quick_invoice": return "text-blue-500";
    default: return "text-muted-foreground";
  }
}

function getActivityBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "expense": return "destructive";
    default: return "secondary";
  }
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { settings, updateSetting, moveWidget, toggleCollapsed, resetToDefaults } = useDashboardSettings();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("month");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
  });
  
  const { data: salesTrends, isLoading: trendsLoading } = useQuery<SalesTrend[]>({
    queryKey: ["/api/dashboard/sales-trends"],
    staleTime: 30000,
  });
  
  const { data: topProducts, isLoading: topLoading } = useQuery<TopProduct[]>({
    queryKey: ["/api/dashboard/top-products"],
    staleTime: 30000,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    staleTime: 30000,
  });

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery<LowStockProduct[]>({
    queryKey: ["/api/dashboard/low-stock"],
    staleTime: 30000,
  });

  const { data: filteredStats, isLoading: filteredLoading } = useQuery<FilteredStats>({
    queryKey: ["/api/dashboard/stats-filtered", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats-filtered?period=${selectedPeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch filtered stats");
      return res.json();
    },
    staleTime: 30000,
  });

  const navigateToStockLowFilter = () => {
    window.location.href = "/stock?filter=low";
  };

  const revenuePercent = filteredStats && (filteredStats.totalRevenue + filteredStats.totalExpenses) > 0
    ? Math.round((filteredStats.totalRevenue / (filteredStats.totalRevenue + filteredStats.totalExpenses)) * 100)
    : 50;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate" data-testid="text-dashboard-title">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("company.tagline")}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-dashboard-settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Personnaliser l'affichage</h4>
              <div className="space-y-2">
                {(settings.widgetOrder || defaultWidgetOrder).map((key, idx) => {
                  const widgetLabels: Record<string, { label: string; settingKey: keyof DashboardSettings }> = {
                    statCards: { label: "Statistiques", settingKey: "showStatCards" },
                    revenueExpenses: { label: "Revenus/Dépenses", settingKey: "showStatCards" },
                    recentActivity: { label: "Activité récente", settingKey: "showRecentActivity" },
                    lowStock: { label: "Stock bas", settingKey: "showLowStock" },
                    quickActions: { label: "Actions rapides", settingKey: "showQuickActions" },
                    companyInfo: { label: "Info entreprise", settingKey: "showCompanyInfo" },
                    salesChart: { label: "Graphique ventes", settingKey: "showSalesChart" },
                    topProducts: { label: "Top produits", settingKey: "showTopProducts" },
                  };
                  const w = widgetLabels[key];
                  if (!w) return null;
                  return (
                    <div key={key} className="flex items-center gap-1 py-1 px-1 rounded hover:bg-muted/50">
                      <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <Label className="text-xs flex-1 truncate">{w.label}</Label>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveWidget(key, "up")} disabled={idx === 0}
                          data-testid={`button-move-up-${key}`}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveWidget(key, "down")}
                          disabled={idx === (settings.widgetOrder || defaultWidgetOrder).length - 1}
                          data-testid={`button-move-down-${key}`}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Switch
                          checked={settings[w.settingKey] as boolean}
                          onCheckedChange={(v) => updateSetting(w.settingKey, v)}
                          className="scale-75"
                          data-testid={`switch-${key}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={resetToDefaults}
                data-testid="button-reset-dashboard"
              >
                Réinitialiser
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="period-selector">
        {periodOptions.map((opt) => (
          <Button
            key={opt.key}
            variant={selectedPeriod === opt.key ? "default" : "outline"}
            size="sm"
            className={`toggle-elevate ${selectedPeriod === opt.key ? "toggle-elevated" : ""}`}
            onClick={() => setSelectedPeriod(opt.key)}
            data-testid={`button-period-${opt.key}`}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {settings.showStatCards && (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {isLoading ? (
              <>
                <StatCardSkeleton />
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
                  onClick={stats?.lowStockCount && stats.lowStockCount > 0 ? navigateToStockLowFilter : undefined}
                  description={stats?.lowStockCount && stats.lowStockCount > 0 ? t("dashboard.lowStockItems") : undefined}
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
                <StatCard
                  title={t("dashboard.quickInvoices")}
                  value={stats?.quickInvoicesCount ?? 0}
                  description={`${(stats?.quickInvoicesTotal ?? 0).toLocaleString()} DZD`}
                  icon={Zap}
                />
              </>
            )}
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" data-testid="filtered-kpi-row">
            {filteredLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title="Valeur Moyenne Commande"
                  value={`${(filteredStats?.avgOrderValue ?? 0).toLocaleString()} DZD`}
                  icon={Receipt}
                  testId="stat-avg-order-value"
                />
                <StatCard
                  title="Crédit en Cours"
                  value={`${(filteredStats?.outstandingCredit ?? 0).toLocaleString()} DZD`}
                  icon={CreditCard}
                  variant={(filteredStats?.outstandingCredit ?? 0) > 0 ? "warning" : "default"}
                  testId="stat-outstanding-credit"
                />
                <StatCard
                  title="Meilleur Client"
                  value={filteredStats?.topCustomer?.name ?? "—"}
                  icon={Crown}
                  description={`${(filteredStats?.topCustomer?.amount ?? 0).toLocaleString()} DZD`}
                  testId="stat-top-customer"
                />
                <StatCard
                  title="Revenu Net"
                  value={`${(filteredStats?.netIncome ?? 0).toLocaleString()} DZD`}
                  icon={TrendingUp}
                  variant={(filteredStats?.netIncome ?? 0) >= 0 ? "success" : "warning"}
                  testId="stat-net-income"
                />
              </>
            )}
          </div>

          <Card data-testid="revenue-vs-expenses-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
              <CardTitle className="text-base sm:text-lg">Revenus vs Dépenses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
              {filteredLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Revenus</span>
                    <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-total-revenue">
                      {(filteredStats?.totalRevenue ?? 0).toLocaleString()} DZD
                    </span>
                  </div>
                  <div className="relative h-6 rounded-md overflow-hidden bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 bg-green-500 rounded-l-md transition-all duration-500"
                      style={{ width: `${revenuePercent}%` }}
                      data-testid="bar-revenue"
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-red-500 rounded-r-md transition-all duration-500"
                      style={{ width: `${100 - revenuePercent}%` }}
                      data-testid="bar-expenses"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Dépenses</span>
                    <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                      {(filteredStats?.totalExpenses ?? 0).toLocaleString()} DZD
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t text-sm">
                    <span className="font-medium">Résultat Net</span>
                    <span
                      className={`font-bold ${(filteredStats?.netIncome ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      data-testid="text-net-result"
                    >
                      {(filteredStats?.netIncome ?? 0) >= 0 ? "+" : ""}{(filteredStats?.netIncome ?? 0).toLocaleString()} DZD
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {(settings.showRecentActivity || settings.showLowStock) && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {settings.showRecentActivity && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">{t("dashboard.recentActivity")}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {activityLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity) => {
                      const IconComp = getActivityIcon(activity.type);
                      const colorClass = getActivityColor(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                          data-testid={`activity-item-${activity.id}`}
                        >
                          <div className={`flex-shrink-0 ${colorClass}`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate" data-testid={`activity-desc-${activity.id}`}>
                              {activity.description}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {activity.reference} - {activity.date}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <Badge variant={getActivityBadgeVariant(activity.type)} className="text-[10px]">
                              {activity.type === "expense" ? "-" : "+"}{(activity.amount || 0).toLocaleString()} DZD
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("common.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {settings.showLowStock && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">{t("dashboard.lowStockAlerts")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {lowStockLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 flex-shrink-0" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                ) : lowStockProducts && lowStockProducts.length > 0 ? (
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <a
                        key={product.id}
                        href={`/stock?filter=low&highlight=${product.id}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover-elevate"
                        data-testid={`low-stock-item-${product.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={product.stockQuantity === 0 ? "destructive" : "secondary"} className="text-[10px]">
                            {product.stockQuantity} / {product.lowStockThreshold}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </a>
                    ))}
                    {lowStockProducts.length > 5 && (
                      <a
                        href="/stock?filter=low"
                        className="flex items-center justify-center gap-1 p-2 text-xs text-primary hover-elevate rounded-md"
                        data-testid="link-view-all-low-stock"
                      >
                        {t("dashboard.viewAll")} ({lowStockProducts.length})
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("common.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(settings.showQuickActions || settings.showCompanyInfo) && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {settings.showQuickActions && (
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">{t("dashboard.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                <a
                  href="/invoices/new"
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-new-invoice"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{t("dashboard.newInvoice")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("invoices.newInvoice")}</p>
                  </div>
                </a>
                <a
                  href="/pos"
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-open-pos"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{t("nav.pos")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("dashboard.newSale")}</p>
                  </div>
                </a>
                <a
                  href="/stock"
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-manage-stock"
                >
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{t("nav.stock")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("dashboard.addProduct")}</p>
                  </div>
                </a>
                <a
                  href="/quick-invoice"
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-md bg-muted hover-elevate"
                  data-testid="link-quick-invoice"
                >
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{t("nav.quickInvoice")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("dashboard.quickInvoices")}</p>
                  </div>
                </a>
              </CardContent>
            </Card>
          )}

          {settings.showCompanyInfo && (
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">{t("company.name")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.name")}</span>
                  <span className="font-medium text-right">POLY FLECTA PLASTICA</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.description")}</span>
                  <span className="font-medium text-right text-[10px] sm:text-sm">Fabrication d'Emballage en Plastique</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.address")}</span>
                  <span className="font-medium text-right text-[10px] sm:text-sm">Village Zaitout, Hammam Dalaa - W M'sila</span>
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
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {settings.showSalesChart && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">Ventes Mensuelles</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {trendsLoading ? (
                  <Skeleton className="h-[180px] sm:h-[250px] w-full" />
                ) : salesTrends && salesTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 180 : 250}>
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
                  <div className="h-[180px] sm:h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("common.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {settings.showTopProducts && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg">Produits les Plus Vendus</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {topLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2">
                        <div className="flex items-center gap-3 flex-1">
                          <Skeleton className="h-4 w-6" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topProducts && topProducts.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {topProducts.slice(0, 5).map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium text-muted-foreground w-4 sm:w-6 flex-shrink-0">{idx + 1}.</span>
                          <span className="text-xs sm:text-sm font-medium truncate">{product.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs sm:text-sm font-semibold">{product.quantity} vendus</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{product.revenue.toLocaleString()} DZD</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[180px] sm:h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("common.noData")}
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
