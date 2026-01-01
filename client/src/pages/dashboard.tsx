import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  FileText,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gift,
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("company.tagline")}
        </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
