import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Printer, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { ProfitStats } from "@shared/schema";

export default function Reports() {
  const { t } = useLanguage();
  const today = new Date();
  const firstOfYear = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(todayStr);

  const { data: pnl, isLoading: pnlLoading } = useQuery<ProfitStats>({
    queryKey: ["/api/reports/pnl", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/pnl?start=${startDate}&end=${endDate}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: salesAnalysis, isLoading: salesLoading } = useQuery<any>({
    queryKey: ["/api/reports/sales-analysis"],
  });

  const { data: productPerf, isLoading: perfLoading } = useQuery<any>({
    queryKey: ["/api/reports/product-performance"],
  });

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  function exportPnlCSV() {
    if (!pnl) return;
    const rows = [
      [t("reports.pnlTitle"), ""],
      [`${t("reports.from")} - ${t("reports.to")}`, `${startDate} - ${endDate}`],
      ["", ""],
      [t("reports.salesRevenuePOS"), fmt(pnl.totalSalesRevenue)],
      [t("reports.invoiceRevenue"), fmt(pnl.totalInvoiceRevenue)],
      [t("reports.totalRevenue"), fmt(pnl.totalRevenue)],
      ["", ""],
      [t("reports.cogsCost"), fmt(pnl.totalProductCosts)],
      [t("reports.grossMargin"), fmt(pnl.grossProfit)],
      ["", ""],
      [t("reports.salariesCost"), fmt(pnl.totalSalaries)],
      [t("reports.operatingExpenses"), fmt(pnl.totalExpenses)],
      [`${t("reports.salariesCost")} + ${t("reports.operatingExpenses")}`, fmt(pnl.totalSalaries + pnl.totalExpenses)],
      ["", ""],
      [t("reports.netResult"), fmt(pnl.netProfit)],
      [t("reports.netMargin"), `${pnl.profitMargin.toFixed(1)}%`],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compte_resultat_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportProductCSV() {
    if (!productPerf?.products) return;
    const headers = [t("reports.productName"), t("reports.qtySold"), t("reports.revenue"), t("reports.cost"), t("reports.marginPercent")];
    const rows = productPerf.products.map((p: any) => [p.name, p.quantity, fmt(p.revenue), fmt(p.cost), `${p.margin.toFixed(1)}%`]);
    const csv = [headers, ...rows].map((r: string[]) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_produits_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t("reports.title")}
          </h1>
        </div>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="pnl" data-testid="tab-pnl">{t("reports.pnlTab")}</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">{t("reports.salesTab")}</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">{t("reports.productsTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("reports.pnlTitle")}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{t("reports.from")}</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" data-testid="input-start-date" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{t("reports.to")}</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" data-testid="input-end-date" />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportPnlCSV} data-testid="button-export-pnl">
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print-pnl">
                    <Printer className="h-4 w-4 mr-1" /> {t("reports.printBtn")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pnlLoading ? <Skeleton className="h-40" /> : pnl ? (
                <div className="space-y-4 print:text-black">
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">{t("reports.salesRevenuePOS")}</span>
                      <span className="font-mono">{fmt(pnl.totalSalesRevenue)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">{t("reports.invoiceRevenue")}</span>
                      <span className="font-mono">{fmt(pnl.totalInvoiceRevenue)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 border-primary font-semibold">
                      <span>{t("reports.totalRevenue")}</span>
                      <span className="font-mono text-primary">{fmt(pnl.totalRevenue)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-destructive">
                      <span className="text-sm">{t("reports.cogsCost")}</span>
                      <span className="font-mono">-{fmt(pnl.totalProductCosts)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 font-semibold">
                      <span>{t("reports.grossMargin")}</span>
                      <span className={`font-mono ${pnl.grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(pnl.grossProfit)} DZD
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.salariesCost")}</span>
                      <span className="font-mono">-{fmt(pnl.totalSalaries)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.operatingExpenses")}</span>
                      <span className="font-mono">-{fmt(pnl.totalExpenses)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-b-2 border-primary text-lg font-bold">
                      <span>{t("reports.netResult")}</span>
                      <span className={`font-mono ${pnl.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(pnl.netProfit)} DZD
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">{t("reports.netMargin")}</span>
                      <span className={`font-mono font-semibold ${pnl.profitMargin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {pnl.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("reports.totalSales")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="text-total-sales">{salesAnalysis?.totalSales || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("reports.totalRevenueLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-total-revenue">{fmt(salesAnalysis?.totalRevenue || 0)} DZD</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("reports.avgOrderValue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-avg-order">{fmt(salesAnalysis?.averageOrderValue || 0)} DZD</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.topCustomers")}</CardTitle>
            </CardHeader>
            <CardContent>
              {salesLoading ? <Skeleton className="h-40" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reports.client")}</TableHead>
                      <TableHead className="text-right">{t("reports.salesCount")}</TableHead>
                      <TableHead className="text-right">{t("reports.totalAmount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(salesAnalysis?.topCustomers || []).map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">{c.count}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.total)} DZD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {salesAnalysis?.salesByMonth && (
            <Card>
              <CardHeader>
                <CardTitle>{t("reports.salesByMonth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reports.month")}</TableHead>
                      <TableHead className="text-right">{t("reports.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(salesAnalysis.salesByMonth)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 12)
                      .map(([month, amount]) => (
                        <TableRow key={month}>
                          <TableCell>{month}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(amount as number)} DZD</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportProductCSV} data-testid="button-export-products">
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t("reports.topProducts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? <Skeleton className="h-40" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.productName")}</TableHead>
                        <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                        <TableHead className="text-right">{t("reports.marginPercent")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(productPerf?.bestPerformers || []).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.revenue)} DZD</TableCell>
                          <TableCell className="text-right">
                            <span className={p.margin >= 0 ? "text-green-600" : "text-destructive"}>
                              {p.margin.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  {t("reports.bottomProducts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? <Skeleton className="h-40" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.productName")}</TableHead>
                        <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                        <TableHead className="text-right">{t("reports.marginPercent")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(productPerf?.worstPerformers || []).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.revenue)} DZD</TableCell>
                          <TableCell className="text-right">
                            <span className={p.margin >= 0 ? "text-green-600" : "text-destructive"}>
                              {p.margin.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.allProducts")}</CardTitle>
            </CardHeader>
            <CardContent>
              {perfLoading ? <Skeleton className="h-40" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reports.productName")}</TableHead>
                      <TableHead className="text-right">{t("reports.qtySold")}</TableHead>
                      <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                      <TableHead className="text-right">{t("reports.cost")}</TableHead>
                      <TableHead className="text-right">{t("reports.marginPercent")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(productPerf?.products || []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(p.revenue)} DZD</TableCell>
                        <TableCell className="text-right font-mono">{fmt(p.cost)} DZD</TableCell>
                        <TableCell className="text-right">
                          <span className={p.margin >= 0 ? "text-green-600" : "text-destructive"}>
                            {p.margin.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
