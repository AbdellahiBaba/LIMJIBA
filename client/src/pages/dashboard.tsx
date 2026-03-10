import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingBag, PiggyBank, Landmark, Edit3, Check, ArrowLeftRight, PlusCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DashboardStats, RecentActivity, StoreSettings } from "@shared/schema";

type SalesTrend = { month: string; sales: number; revenue: number };
type TopProduct = { name: string; quantity: number; revenue: number };
type LowStockProduct = { id: string; name: string; stockQuantity: number; lowStockThreshold: number };

interface BalanceSheet {
  openingBalance: number;
  walletBalances: { id: string; name: string; balance: number; openingBalance: number }[];
  totalWalletBalance: number;
  totalWalletOpeningBalance: number;
  income: { invoices: number; sales: number; storeOrders: number; quickInvoices: number; total: number };
  outgoing: { expenses: number; salaries: number; total: number };
  netProfit: number;
  currentBalance: number;
}

interface StoreOrdersSummary {
  orders: {
    id: string; orderNumber: string; customerName: string; customerEmail: string;
    total: number; status: string; paymentConfirmed: boolean; createdAt: string;
    items: { productName: string; quantity: number; unitPrice: number; purchasePrice: number; profit: number }[];
    profit: number;
  }[];
  totalOrders: number; totalRevenue: number; totalProfit: number;
  confirmedOrders: number; pendingOrders: number;
}

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

const periodKeys: PeriodKey[] = ["today", "week", "month", "year"];
const periodTranslationKeys: Record<PeriodKey, string> = {
  today: "dashboard.today",
  week: "dashboard.thisWeek",
  month: "dashboard.thisMonth",
  year: "dashboard.thisYear",
};

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
    case "quick_invoice": return "text-primary";
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

  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
    staleTime: 60000,
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

  const { data: balanceSheet } = useQuery<BalanceSheet>({
    queryKey: ["/api/dashboard/balance-sheet"],
    staleTime: 30000,
  });

  const { data: storeOrdersSummary } = useQuery<StoreOrdersSummary>({
    queryKey: ["/api/dashboard/store-orders-summary"],
    staleTime: 30000,
  });

  const { toast } = useToast();

  const [editingBalance, setEditingBalance] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [editingWalletOB, setEditingWalletOB] = useState<string | null>(null);
  const [walletOBInput, setWalletOBInput] = useState("");

  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditWalletId, setCreditWalletId] = useState("");
  const [creditWalletName, setCreditWalletName] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditMethod, setCreditMethod] = useState("");

  const transferMutation = useMutation({
    mutationFn: (data: { fromWalletId: string; toWalletId: string; amount: number }) =>
      apiRequest("POST", "/api/wallets/transfer", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/balance-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
      toast({ title: "Transfer completed successfully" });
      setTransferDialogOpen(false);
      setTransferFrom(""); setTransferTo(""); setTransferAmount("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const creditMutation = useMutation({
    mutationFn: (data: { walletId: string; amount: number; note: string; method: string }) =>
      apiRequest("POST", `/api/wallets/${data.walletId}/credit`, { amount: data.amount, note: data.note, method: data.method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/balance-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
      toast({ title: "Wallet credited successfully" });
      setCreditDialogOpen(false);
      setCreditAmount(""); setCreditNote(""); setCreditMethod("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const navigateToStockLowFilter = () => {
    window.location.href = "/emanager-portal/stock?filter=low";
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
              <h4 className="font-medium text-sm">{t("dashboard.customizeDisplay")}</h4>
              <div className="space-y-2">
                {(settings.widgetOrder || defaultWidgetOrder).map((key, idx) => {
                  const widgetLabels: Record<string, { label: string; settingKey: keyof DashboardSettings }> = {
                    statCards: { label: t("dashboard.statistics"), settingKey: "showStatCards" },
                    revenueExpenses: { label: t("dashboard.revenueExpenses"), settingKey: "showStatCards" },
                    recentActivity: { label: t("dashboard.recentActivity"), settingKey: "showRecentActivity" },
                    lowStock: { label: t("dashboard.lowStock"), settingKey: "showLowStock" },
                    quickActions: { label: t("dashboard.quickActions"), settingKey: "showQuickActions" },
                    companyInfo: { label: t("dashboard.companyInfoWidget"), settingKey: "showCompanyInfo" },
                    salesChart: { label: t("dashboard.salesChart"), settingKey: "showSalesChart" },
                    topProducts: { label: t("dashboard.topProductsWidget"), settingKey: "showTopProducts" },
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
                {t("common.reset")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="period-selector">
        {periodKeys.map((key) => (
          <Button
            key={key}
            variant={selectedPeriod === key ? "default" : "outline"}
            size="sm"
            className={`toggle-elevate ${selectedPeriod === key ? "toggle-elevated" : ""}`}
            onClick={() => setSelectedPeriod(key)}
            data-testid={`button-period-${key}`}
          >
            {t(periodTranslationKeys[key])}
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
                  description={`${(stats?.quickInvoicesTotal ?? 0).toLocaleString()} MRU`}
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
                  title={t("common.total") + " (MRU)"}
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
                  title={t("dashboard.avgOrderValue")}
                  value={`${(filteredStats?.avgOrderValue ?? 0).toLocaleString()} MRU`}
                  icon={Receipt}
                  testId="stat-avg-order-value"
                />
                <StatCard
                  title={t("dashboard.outstandingCredit")}
                  value={`${(filteredStats?.outstandingCredit ?? 0).toLocaleString()} MRU`}
                  icon={CreditCard}
                  variant={(filteredStats?.outstandingCredit ?? 0) > 0 ? "warning" : "default"}
                  testId="stat-outstanding-credit"
                />
                <StatCard
                  title={t("dashboard.topCustomer")}
                  value={filteredStats?.topCustomer?.name ?? "—"}
                  icon={Crown}
                  description={`${(filteredStats?.topCustomer?.amount ?? 0).toLocaleString()} MRU`}
                  testId="stat-top-customer"
                />
                <StatCard
                  title={t("dashboard.netIncome")}
                  value={`${(filteredStats?.netIncome ?? 0).toLocaleString()} MRU`}
                  icon={TrendingUp}
                  variant={(filteredStats?.netIncome ?? 0) >= 0 ? "success" : "warning"}
                  testId="stat-net-income"
                />
              </>
            )}
          </div>

          <Card data-testid="revenue-vs-expenses-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 pb-2">
              <CardTitle className="text-base sm:text-lg">{t("dashboard.revenueVsExpenses")}</CardTitle>
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
                    <span className="text-muted-foreground">{t("dashboard.revenue")}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-total-revenue">
                      {(filteredStats?.totalRevenue ?? 0).toLocaleString()} MRU
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
                    <span className="text-muted-foreground">{t("dashboard.expensesLabel")}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                      {(filteredStats?.totalExpenses ?? 0).toLocaleString()} MRU
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t text-sm">
                    <span className="font-medium">{t("dashboard.netResult")}</span>
                    <span
                      className={`font-bold ${(filteredStats?.netIncome ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      data-testid="text-net-result"
                    >
                      {(filteredStats?.netIncome ?? 0) >= 0 ? "+" : ""}{(filteredStats?.netIncome ?? 0).toLocaleString()} MRU
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
                              {activity.type === "expense" ? "-" : "+"}{(activity.amount || 0).toLocaleString()} MRU
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
                        href={`/emanager-portal/stock?filter=low&highlight=${product.id}`}
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
                        href="/emanager-portal/stock?filter=low"
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
                  href="/emanager-portal/invoices/new"
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
                  href="/emanager-portal/pos"
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
                  href="/emanager-portal/stock"
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
                  href="/emanager-portal/quick-invoice"
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
                <CardTitle className="text-base sm:text-lg">{storeSettings?.storeName || t("company.name")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.name")}</span>
                  <span className="font-medium text-right">{storeSettings?.storeName || t("company.name")}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.description")}</span>
                  <span className="font-medium text-right text-[10px] sm:text-sm">{storeSettings?.storeDescription || t("company.tagline")}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.address")}</span>
                  <span className="font-medium text-right text-[10px] sm:text-sm">{storeSettings?.contactAddress || t("company.address")}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("common.email")}</span>
                  <span className="font-medium">{storeSettings?.contactEmail || t("company.email")}</span>
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
                <CardTitle className="text-base sm:text-lg">{t("dashboard.monthlySales")}</CardTitle>
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
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("sales.title")} />
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
                <CardTitle className="text-base sm:text-lg">{t("dashboard.topSellingProducts")}</CardTitle>
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
                          <div className="text-xs sm:text-sm font-semibold">{product.quantity} {t("dashboard.sold")}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{product.revenue.toLocaleString()} MRU</div>
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

      {balanceSheet && (
        <Card data-testid="card-balance-sheet">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Balance Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50" data-testid="opening-balance-row">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">Opening Balance</span>
              {editingBalance ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="h-7 w-28 text-sm"
                    data-testid="input-opening-balance"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="button-save-opening-balance"
                    onClick={async () => {
                      try {
                        await apiRequest("POST", "/api/dashboard/opening-balance", { openingBalance: parseFloat(openingBalanceInput) || 0 });
                        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/balance-sheet"] });
                        setEditingBalance(false);
                      } catch {}
                    }}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold" data-testid="text-opening-balance">{balanceSheet.openingBalance.toLocaleString()} MRU</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" data-testid="button-edit-opening-balance"
                    onClick={() => { setOpeningBalanceInput(String(balanceSheet.openingBalance)); setEditingBalance(true); }}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">Income</span>
                  <span className="ml-auto text-sm font-bold text-green-700 dark:text-green-400" data-testid="text-total-income">{balanceSheet.income.total.toLocaleString()} MRU</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Invoices</span><span>{balanceSheet.income.invoices.toLocaleString()} MRU</span></div>
                  <div className="flex justify-between"><span>POS Sales</span><span>{balanceSheet.income.sales.toLocaleString()} MRU</span></div>
                  <div className="flex justify-between"><span>Store Orders</span><span>{balanceSheet.income.storeOrders.toLocaleString()} MRU</span></div>
                  <div className="flex justify-between"><span>Quick Invoices</span><span>{balanceSheet.income.quickInvoices.toLocaleString()} MRU</span></div>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">Outgoing</span>
                  <span className="ml-auto text-sm font-bold text-red-700 dark:text-red-400" data-testid="text-total-outgoing">{balanceSheet.outgoing.total.toLocaleString()} MRU</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Expenses</span><span>{balanceSheet.outgoing.expenses.toLocaleString()} MRU</span></div>
                  <div className="flex justify-between"><span>Salaries</span><span>{balanceSheet.outgoing.salaries.toLocaleString()} MRU</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/5 border" data-testid="net-profit-card">
                <div className="text-xs text-muted-foreground">Net Profit</div>
                <div className={`text-lg font-bold ${balanceSheet.netProfit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-profit">
                  {balanceSheet.netProfit >= 0 ? "+" : ""}{balanceSheet.netProfit.toLocaleString()} MRU
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border" data-testid="current-balance-card">
                <div className="text-xs text-muted-foreground">Current Balance</div>
                <div className="text-lg font-bold" data-testid="text-current-balance">
                  {balanceSheet.currentBalance.toLocaleString()} MRU
                </div>
              </div>
            </div>

            {balanceSheet.walletBalances.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-muted-foreground">Wallet Balances</div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" data-testid="button-wallet-transfer"
                    onClick={() => setTransferDialogOpen(true)}>
                    <ArrowLeftRight className="h-3 w-3" /> Transfer
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {balanceSheet.walletBalances.map(w => (
                    <div key={w.id} className="p-3 rounded-lg bg-muted/50 relative group" style={{ border: "1px solid rgba(201,168,76,0.1)" }} data-testid={`wallet-balance-${w.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground truncate">{w.name}</div>
                          <div className="text-base font-bold">{w.balance.toLocaleString()} MRU</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" style={{ color: "#22c55e" }} data-testid={`button-credit-wallet-${w.id}`}
                          onClick={() => { setCreditWalletId(w.id); setCreditWalletName(w.name); setCreditAmount(""); setCreditNote(""); setCreditMethod(""); setCreditDialogOpen(true); }}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      {editingWalletOB === w.id ? (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Input type="number" step="0.01" className="h-7 text-xs px-2 flex-1" value={walletOBInput} onChange={e => setWalletOBInput(e.target.value)} data-testid={`input-wallet-ob-${w.id}`} />
                          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" style={{ borderColor: "rgba(201,168,76,0.3)" }} data-testid={`button-save-wallet-ob-${w.id}`}
                            onClick={async () => {
                              await apiRequest("POST", `/api/wallets/${w.id}/opening-balance`, { openingBalance: parseFloat(walletOBInput) || 0 });
                              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/balance-sheet"] });
                              setEditingWalletOB(null);
                            }}>
                            <Check className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-muted-foreground">OB: {w.openingBalance.toLocaleString()} MRU</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity" data-testid={`button-edit-wallet-ob-${w.id}`}
                            onClick={() => { setWalletOBInput(String(w.openingBalance)); setEditingWalletOB(w.id); }}>
                            <Edit3 className="h-3 w-3" style={{ color: "#C9A84C" }} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> Wallet Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">From Wallet</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger data-testid="select-transfer-from">
                  <SelectValue placeholder="Select source wallet" />
                </SelectTrigger>
                <SelectContent>
                  {balanceSheet?.walletBalances.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.balance.toLocaleString()} MRU)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">To Wallet</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger data-testid="select-transfer-to">
                  <SelectValue placeholder="Select destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {balanceSheet?.walletBalances.filter(w => w.id !== transferFrom).map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.balance.toLocaleString()} MRU)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Amount (MRU)</Label>
              <Input type="number" min="0" step="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" data-testid="input-transfer-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button disabled={!transferFrom || !transferTo || !transferAmount || transferMutation.isPending} data-testid="button-confirm-transfer"
              onClick={() => transferMutation.mutate({ fromWalletId: transferFrom, toWalletId: transferTo, amount: parseFloat(transferAmount) || 0 })}>
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-green-600" /> Credit {creditWalletName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Method *</Label>
              <Select value={creditMethod} onValueChange={setCreditMethod}>
                <SelectTrigger data-testid="select-credit-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check_deposit">Check Deposit</SelectItem>
                  <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Amount (MRU) *</Label>
              <Input type="number" min="0" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="0.00" data-testid="input-credit-amount" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Note (optional)</Label>
              <Input value={creditNote} onChange={e => setCreditNote(e.target.value)} placeholder="e.g. Cash deposit" data-testid="input-credit-note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Cancel</Button>
            <Button disabled={!creditAmount || !creditMethod || creditMutation.isPending} data-testid="button-confirm-credit"
              onClick={() => creditMutation.mutate({ walletId: creditWalletId, amount: parseFloat(creditAmount) || 0, note: creditNote, method: creditMethod })}>
              {creditMutation.isPending ? "Crediting..." : "Credit Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {storeOrdersSummary && (
        <Card data-testid="card-store-orders-summary">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Store Orders History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">Total Orders</div>
                <div className="text-lg font-bold" data-testid="text-total-store-orders">{storeOrdersSummary.totalOrders}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">Revenue</div>
                <div className="text-lg font-bold text-green-600" data-testid="text-store-revenue">{storeOrdersSummary.totalRevenue.toLocaleString()} MRU</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">Profit</div>
                <div className="text-lg font-bold text-blue-600" data-testid="text-store-profit">{storeOrdersSummary.totalProfit.toLocaleString()} MRU</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-lg font-bold text-amber-600" data-testid="text-pending-orders">{storeOrdersSummary.pendingOrders}</div>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-auto">
              {storeOrdersSummary.orders.map(order => {
                const statusColors: Record<string, string> = {
                  pending: "bg-amber-100 text-amber-800",
                  confirmed: "bg-blue-100 text-blue-800",
                  shipped: "bg-purple-100 text-purple-800",
                  delivered: "bg-green-100 text-green-800",
                  cancelled: "bg-red-100 text-red-800",
                };
                const expanded = expandedOrderId === order.id;
                return (
                  <div key={order.id} className="rounded-lg border p-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setExpandedOrderId(expanded ? null : order.id)} data-testid={`store-order-row-${order.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-mono font-bold" data-testid={`text-order-number-${order.id}`}>{order.orderNumber}</span>
                        <Badge className={`text-[10px] ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>{order.status}</Badge>
                        {order.paymentConfirmed && <Badge className="text-[10px] bg-green-100 text-green-800">Paid</Badge>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold">{order.total.toFixed(2)} MRU</span>
                        <span className={`text-xs font-medium ${order.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {order.profit >= 0 ? "+" : ""}{order.profit.toFixed(2)}
                        </span>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{order.customerName}</span>
                      <span>·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {expanded && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex-1 truncate">{item.productName} × {item.quantity}</span>
                            <span className="text-muted-foreground mx-2">{item.unitPrice.toFixed(2)} MRU</span>
                            <span className={`font-medium ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {item.profit >= 0 ? "+" : ""}{item.profit.toFixed(2)} MRU
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
