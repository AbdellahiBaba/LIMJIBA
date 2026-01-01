import { useQuery } from "@tanstack/react-query";
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome to POLY FLECTA PLASTICA Business Management System
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
              title="Total Products"
              value={stats?.totalProducts ?? 0}
              icon={Package}
              description="Active products in inventory"
            />
            <StatCard
              title="Low Stock Items"
              value={stats?.lowStockCount ?? 0}
              icon={AlertTriangle}
              description="Items below threshold"
              variant={stats?.lowStockCount && stats.lowStockCount > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Total Invoices"
              value={stats?.totalInvoices ?? 0}
              icon={FileText}
              description={`${stats?.pendingInvoices ?? 0} pending`}
            />
            <StatCard
              title="Today's Sales"
              value={stats?.todaySales ?? 0}
              icon={ShoppingCart}
              description="Transactions today"
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
              title="Today's Revenue"
              value={`${(stats?.todayRevenue ?? 0).toLocaleString()} DZD`}
              icon={TrendingUp}
              description="Total sales amount"
              variant="success"
            />
            <StatCard
              title="Active Resellers"
              value={stats?.activeResellers ?? 0}
              icon={Users}
              description="Registered resellers"
            />
            <StatCard
              title="Reward Pool"
              value={stats?.rewardPoolCount ?? 0}
              icon={Gift}
              description="Eligible for rewards"
            />
            <StatCard
              title="Pending Invoices"
              value={stats?.pendingInvoices ?? 0}
              icon={Clock}
              description="Awaiting payment"
              variant={stats?.pendingInvoices && stats.pendingInvoices > 0 ? "warning" : "default"}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <a
              href="/invoices/new"
              className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
              data-testid="link-new-invoice"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">New Invoice</p>
                <p className="text-xs text-muted-foreground">Create invoice</p>
              </div>
            </a>
            <a
              href="/pos"
              className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
              data-testid="link-open-pos"
            >
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Open POS</p>
                <p className="text-xs text-muted-foreground">Start selling</p>
              </div>
            </a>
            <a
              href="/stock"
              className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
              data-testid="link-manage-stock"
            >
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Manage Stock</p>
                <p className="text-xs text-muted-foreground">View inventory</p>
              </div>
            </a>
            <a
              href="/resellers"
              className="flex items-center gap-3 p-4 rounded-md bg-muted hover-elevate"
              data-testid="link-resellers"
            >
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Reseller Rewards</p>
                <p className="text-xs text-muted-foreground">Manage program</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">POLY FLECTA PLASTICA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity</span>
              <span className="font-medium">Fabrication d'Emballage en Plastique</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right">Village Zaitout, Hammam Dalaa - W M'sila</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carte Artisan</span>
              <span className="font-medium">28/ 00 - 2896688A24</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">N. Article</span>
              <span className="font-medium">101082709</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">+213 6 70 04 91 24</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
