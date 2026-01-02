import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  RefreshCw,
  Loader2,
  FileText,
  ShoppingCart,
  Users,
  Building2,
} from "lucide-react";
import type { ProfitStats } from "@shared/schema";

type PeriodType = "month" | "quarter" | "year" | "all";

function getDateRange(period: PeriodType): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  
  let startDate: string;
  switch (period) {
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      break;
    case "quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1).toISOString().split("T")[0];
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      break;
    case "all":
      startDate = "2000-01-01";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  }
  
  return { startDate, endDate };
}

export default function ProfitCalculator() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<PeriodType>("month");
  
  const { startDate, endDate } = getDateRange(period);
  
  const { data: stats, isLoading, refetch, isFetching } = useQuery<ProfitStats>({
    queryKey: ["/api/profit-stats", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/profit-stats?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch profit stats");
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DZD";
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "month": return t("profit.thisMonth");
      case "quarter": return t("profit.thisQuarter");
      case "year": return t("profit.thisYear");
      case "all": return t("profit.allTime");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-profit-title">
            <Calculator className="h-6 w-6" />
            {t("profit.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("profit.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t("profit.thisMonth")}</SelectItem>
              <SelectItem value="quarter">{t("profit.thisQuarter")}</SelectItem>
              <SelectItem value="year">{t("profit.thisYear")}</SelectItem>
              <SelectItem value="all">{t("profit.allTime")}</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("profit.totalRevenue")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-revenue">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getPeriodLabel()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("profit.totalCosts")}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-costs">
                  {formatCurrency(stats.totalProductCosts + stats.totalSalaries + stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("profit.productsSalariesExpenses")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("profit.netProfit")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-profit">
                  {formatCurrency(stats.netProfit)}
                </div>
                <Badge 
                  variant={stats.netProfit >= 0 ? "default" : "destructive"} 
                  className="mt-1"
                >
                  {stats.profitMargin.toFixed(1)}% {t("profit.margin")}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("profit.grossProfit")}
                </CardTitle>
                <Receipt className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-gross-profit">
                  {formatCurrency(stats.grossProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("profit.beforeExpenses")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t("profit.revenueBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{t("profit.invoiceRevenue")}</p>
                        <p className="text-xs text-muted-foreground">{t("profit.b2bSales")}</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(stats.totalInvoiceRevenue)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{t("profit.posRevenue")}</p>
                        <p className="text-xs text-muted-foreground">{t("profit.directSales")}</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(stats.totalSalesRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border-t-2 border-green-600">
                    <span className="font-semibold">{t("profit.totalRevenue")}</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      {formatCurrency(stats.totalRevenue)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  {t("profit.costsBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{t("profit.productCosts")}</p>
                        <p className="text-xs text-muted-foreground">{t("profit.costOfGoods")}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(stats.totalProductCosts)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{t("profit.salaries")}</p>
                        <p className="text-xs text-muted-foreground">{t("profit.employeeWages")}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(stats.totalSalaries)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{t("profit.expenses")}</p>
                        <p className="text-xs text-muted-foreground">{t("profit.rentUtilities")}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(stats.totalExpenses)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border-t-2 border-red-600">
                    <span className="font-semibold">{t("profit.totalCosts")}</span>
                    <span className="font-bold text-lg text-red-600 dark:text-red-400">
                      {formatCurrency(stats.totalProductCosts + stats.totalSalaries + stats.totalExpenses)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t("profit.profitSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{t("profit.grossProfit")}</p>
                  <p className={`text-xl font-bold ${stats.grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(stats.grossProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("profit.revenueMinusProducts")}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{t("profit.operatingCosts")}</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(stats.totalSalaries + stats.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("profit.salariesPlusExpenses")}
                  </p>
                </div>
                
                <div className={`text-center p-4 rounded-lg ${stats.netProfit >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                  <p className="text-sm text-muted-foreground mb-1">{t("profit.netProfit")}</p>
                  <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(stats.netProfit)}
                  </p>
                  <Badge variant={stats.netProfit >= 0 ? "default" : "destructive"} className="mt-2">
                    {stats.profitMargin.toFixed(1)}% {t("profit.margin")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <Calendar className="inline h-3 w-3 mr-1" />
            {t("profit.period")}: {stats.periodStart} - {stats.periodEnd}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t("profit.noData")}
        </div>
      )}
    </div>
  );
}
