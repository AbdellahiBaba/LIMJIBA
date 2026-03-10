import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Printer, TrendingUp, TrendingDown, DollarSign, Package, Truck, Calculator } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import type { ProfitStats, ProductProfitability, PurchaseOrderWithItems, BatchProfitability } from "@shared/schema";

export default function Reports() {
  const { t } = useLanguage();
  const today = new Date();
  const firstOfYear = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(todayStr);
  const [profitStartDate, setProfitStartDate] = useState(firstOfYear);
  const [profitEndDate, setProfitEndDate] = useState(todayStr);

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

  const { data: productProfitability, isLoading: productProfitLoading } = useQuery<ProductProfitability[]>({
    queryKey: ["/api/reports/profitability"],
  });

  const { data: purchaseOrders, isLoading: poLoading } = useQuery<PurchaseOrderWithItems[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: profitByDate, isLoading: profitByDateLoading } = useQuery<ProfitStats>({
    queryKey: ["/api/reports/pnl", profitStartDate, profitEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/pnl?start=${profitStartDate}&end=${profitEndDate}`, { credentials: "include" });
      return res.json();
    },
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

  function exportProductProfitabilityCSV() {
    if (!productProfitability?.length) return;
    exportToCsv(
      productProfitability,
      [
        { header: t("reports.productName"), accessor: (r) => r.productName },
        { header: t("reports.category"), accessor: (r) => r.category },
        { header: t("reports.currentStock"), accessor: (r) => r.currentStock },
        { header: t("reports.revenue"), accessor: (r) => r.totalRevenue.toFixed(2) },
        { header: t("reports.totalCost"), accessor: (r) => r.totalCost.toFixed(2) },
        { header: t("reports.totalProfit"), accessor: (r) => r.totalProfit.toFixed(2) },
        { header: t("reports.marginPercent"), accessor: (r) => `${r.profitMargin.toFixed(1)}%` },
        { header: t("reports.inventoryValue"), accessor: (r) => r.inventoryValue.toFixed(2) },
      ],
      "product_profitability"
    );
  }

  function exportBatchProfitabilityCSV() {
    if (!purchaseOrders?.length) return;
    const receivedPOs = purchaseOrders.filter(po => po.status === "received");
    const rows: any[] = [];
    for (const po of receivedPOs) {
      const totalItemsCost = po.items.reduce((sum, item) => sum + item.total, 0);
      rows.push({
        orderNumber: po.orderNumber,
        supplier: po.supplier?.name || "-",
        date: po.date,
        purchaseCost: totalItemsCost,
        shippingCost: po.shippingCost || 0,
        trueCost: totalItemsCost + (po.shippingCost || 0),
        totalAmount: po.totalAmount,
      });
    }
    exportToCsv(
      rows,
      [
        { header: t("reports.orderNumber"), accessor: (r) => r.orderNumber },
        { header: t("reports.supplier"), accessor: (r) => r.supplier },
        { header: t("reports.date"), accessor: (r) => r.date },
        { header: t("reports.purchaseCost"), accessor: (r) => r.purchaseCost.toFixed(2) },
        { header: t("reports.shippingCost"), accessor: (r) => r.shippingCost.toFixed(2) },
        { header: t("reports.trueCost"), accessor: (r) => r.trueCost.toFixed(2) },
      ],
      "batch_profitability"
    );
  }

  function exportTrueCostCSV() {
    if (!productProfitability?.length) return;
    const rows: any[] = [];
    for (const p of productProfitability) {
      for (const batch of p.batches) {
        rows.push({
          productName: p.productName,
          orderNumber: batch.orderNumber,
          unitCost: batch.unitCost,
          adjustedUnitCost: batch.adjustedUnitCost,
          shippingShare: batch.adjustedUnitCost - batch.unitCost,
          quantityPurchased: batch.quantityPurchased,
          quantityRemaining: batch.quantityRemaining,
        });
      }
    }
    exportToCsv(
      rows,
      [
        { header: t("reports.productName"), accessor: (r) => r.productName },
        { header: t("reports.orderNumber"), accessor: (r) => r.orderNumber },
        { header: t("reports.costPrice"), accessor: (r) => r.unitCost.toFixed(2) },
        { header: t("reports.shippingShare"), accessor: (r) => r.shippingShare.toFixed(2) },
        { header: t("reports.adjustedUnitCost"), accessor: (r) => r.adjustedUnitCost.toFixed(2) },
        { header: t("reports.qtySold"), accessor: (r) => r.quantityPurchased - r.quantityRemaining },
        { header: t("reports.remainingStock"), accessor: (r) => r.quantityRemaining },
      ],
      "true_product_cost"
    );
  }

  function exportProfitByDateCSV() {
    if (!profitByDate) return;
    const rows = [
      [t("reports.profitByDateTitle"), ""],
      [`${t("reports.from")} - ${t("reports.to")}`, `${profitStartDate} - ${profitEndDate}`],
      ["", ""],
      [t("reports.totalRevenue"), fmt(profitByDate.totalRevenue)],
      [t("reports.totalCOGS"), fmt(profitByDate.totalProductCosts)],
      [t("reports.shippingCosts"), fmt(profitByDate.totalShippingCosts)],
      [t("reports.deliveryCosts"), fmt(profitByDate.totalDeliveryCosts)],
      [t("reports.grossProfit"), fmt(profitByDate.grossProfit)],
      [t("reports.netResult"), fmt(profitByDate.netProfit)],
      [t("reports.netMargin"), `${profitByDate.profitMargin.toFixed(1)}%`],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit_by_date_${profitStartDate}_${profitEndDate}.csv`;
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
        <TabsList className="flex-wrap" data-testid="tabs-reports">
          <TabsTrigger value="pnl" data-testid="tab-pnl">{t("reports.pnlTab")}</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">{t("reports.salesTab")}</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">{t("reports.productsTab")}</TabsTrigger>
          <TabsTrigger value="product-profitability" data-testid="tab-product-profitability">{t("reports.productProfitabilityTab")}</TabsTrigger>
          <TabsTrigger value="batch-profitability" data-testid="tab-batch-profitability">{t("reports.batchProfitabilityTab")}</TabsTrigger>
          <TabsTrigger value="true-cost" data-testid="tab-true-cost">{t("reports.trueCostTab")}</TabsTrigger>
          <TabsTrigger value="profit-by-date" data-testid="tab-profit-by-date">{t("reports.profitByDateTab")}</TabsTrigger>
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
                      <span className="font-mono">{fmt(pnl.totalSalesRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">{t("reports.invoiceRevenue")}</span>
                      <span className="font-mono">{fmt(pnl.totalInvoiceRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 border-primary font-semibold">
                      <span>{t("reports.totalRevenue")}</span>
                      <span className="font-mono text-primary">{fmt(pnl.totalRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-destructive">
                      <span className="text-sm">{t("reports.cogsCost")}</span>
                      <span className="font-mono">-{fmt(pnl.totalProductCosts)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 font-semibold">
                      <span>{t("reports.grossMargin")}</span>
                      <span className={`font-mono ${pnl.grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(pnl.grossProfit)} MRU
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.salariesCost")}</span>
                      <span className="font-mono">-{fmt(pnl.totalSalaries)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.operatingExpenses")}</span>
                      <span className="font-mono">-{fmt(pnl.totalExpenses)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-b-2 border-primary text-lg font-bold">
                      <span>{t("reports.netResult")}</span>
                      <span className={`font-mono ${pnl.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(pnl.netProfit)} MRU
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
                <p className="text-2xl font-bold font-mono" data-testid="text-total-revenue">{fmt(salesAnalysis?.totalRevenue || 0)} MRU</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t("reports.avgOrderValue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-avg-order">{fmt(salesAnalysis?.averageOrderValue || 0)} MRU</p>
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
                        <TableCell className="text-right font-mono">{fmt(c.total)} MRU</TableCell>
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
                          <TableCell className="text-right font-mono">{fmt(amount as number)} MRU</TableCell>
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
                          <TableCell className="text-right font-mono">{fmt(p.revenue)} MRU</TableCell>
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
                          <TableCell className="text-right font-mono">{fmt(p.revenue)} MRU</TableCell>
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
                        <TableCell className="text-right font-mono">{fmt(p.revenue)} MRU</TableCell>
                        <TableCell className="text-right font-mono">{fmt(p.cost)} MRU</TableCell>
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

        <TabsContent value="product-profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t("reports.productProfitabilityTitle")}
                  </CardTitle>
                  <CardDescription>{t("reports.productProfitabilityDesc")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportProductProfitabilityCSV} data-testid="button-export-product-profitability">
                  <Download className="h-4 w-4 mr-1" /> {t("reports.exportCSV")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productProfitLoading ? <Skeleton className="h-60" /> : productProfitability && productProfitability.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.productName")}</TableHead>
                        <TableHead>{t("reports.category")}</TableHead>
                        <TableHead className="text-right">{t("reports.currentStock")}</TableHead>
                        <TableHead className="text-right">{t("reports.revenue")}</TableHead>
                        <TableHead className="text-right">{t("reports.totalCost")}</TableHead>
                        <TableHead className="text-right">{t("reports.totalProfit")}</TableHead>
                        <TableHead className="text-right">{t("reports.marginPercent")}</TableHead>
                        <TableHead className="text-right">{t("reports.inventoryValue")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productProfitability.map((p) => (
                        <TableRow key={p.productId} data-testid={`row-product-profitability-${p.productId}`}>
                          <TableCell className="font-medium">{p.productName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{p.currentStock}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.totalRevenue)} MRU</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.totalCost)} MRU</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={p.totalProfit >= 0 ? "text-green-600" : "text-destructive"}>
                              {fmt(p.totalProfit)} MRU
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={p.profitMargin >= 0 ? "text-green-600" : "text-destructive"}>
                              {p.profitMargin.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.inventoryValue)} MRU</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-product-profitability">{t("reports.noDataAvailable")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch-profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {t("reports.batchProfitabilityTitle")}
                  </CardTitle>
                  <CardDescription>{t("reports.batchProfitabilityDesc")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportBatchProfitabilityCSV} data-testid="button-export-batch-profitability">
                  <Download className="h-4 w-4 mr-1" /> {t("reports.exportCSV")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {poLoading ? <Skeleton className="h-60" /> : purchaseOrders && purchaseOrders.length > 0 ? (
                <div className="space-y-6">
                  {purchaseOrders
                    .filter(po => po.status === "received")
                    .map((po) => {
                      const totalItemsCost = po.items.reduce((sum, item) => sum + item.total, 0);
                      const shippingCost = po.shippingCost || 0;
                      const trueCost = totalItemsCost + shippingCost;
                      return (
                        <BatchProfitCard key={po.id} po={po} totalItemsCost={totalItemsCost} shippingCost={shippingCost} trueCost={trueCost} fmt={fmt} t={t} />
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-batch-profitability">{t("reports.noDataAvailable")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="true-cost" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {t("reports.trueCostTitle")}
                  </CardTitle>
                  <CardDescription>{t("reports.trueCostDesc")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportTrueCostCSV} data-testid="button-export-true-cost">
                  <Download className="h-4 w-4 mr-1" /> {t("reports.exportCSV")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productProfitLoading ? <Skeleton className="h-60" /> : productProfitability && productProfitability.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reports.productName")}</TableHead>
                        <TableHead>{t("reports.orderNumber")}</TableHead>
                        <TableHead className="text-right">{t("reports.costPrice")}</TableHead>
                        <TableHead className="text-right">{t("reports.shippingShare")}</TableHead>
                        <TableHead className="text-right">{t("reports.adjustedUnitCost")}</TableHead>
                        <TableHead className="text-right">{t("reports.qtySold")}</TableHead>
                        <TableHead className="text-right">{t("reports.remainingStock")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productProfitability.flatMap((p) =>
                        p.batches.map((batch, idx) => {
                          const shippingPerUnit = batch.adjustedUnitCost - batch.unitCost;
                          return (
                            <TableRow key={`${p.productId}-${batch.purchaseOrderId}-${idx}`} data-testid={`row-true-cost-${p.productId}-${idx}`}>
                              <TableCell className="font-medium">{p.productName}</TableCell>
                              <TableCell>{batch.orderNumber}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(batch.unitCost)} MRU</TableCell>
                              <TableCell className="text-right font-mono">
                                {shippingPerUnit > 0 ? (
                                  <span className="text-orange-600 dark:text-orange-400">+{fmt(shippingPerUnit)} MRU</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{fmt(batch.adjustedUnitCost)} MRU</TableCell>
                              <TableCell className="text-right">{batch.quantityPurchased - batch.quantityRemaining}</TableCell>
                              <TableCell className="text-right">{batch.quantityRemaining}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-true-cost">{t("reports.noDataAvailable")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-by-date" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {t("reports.profitByDateTitle")}
                  </CardTitle>
                  <CardDescription>{t("reports.profitByDateDesc")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{t("reports.from")}</Label>
                    <Input type="date" value={profitStartDate} onChange={e => setProfitStartDate(e.target.value)} className="w-36" data-testid="input-profit-start-date" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{t("reports.to")}</Label>
                    <Input type="date" value={profitEndDate} onChange={e => setProfitEndDate(e.target.value)} className="w-36" data-testid="input-profit-end-date" />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportProfitByDateCSV} data-testid="button-export-profit-by-date">
                    <Download className="h-4 w-4 mr-1" /> {t("reports.exportCSV")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profitByDateLoading ? <Skeleton className="h-60" /> : profitByDate ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t("reports.totalRevenue")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold font-mono" data-testid="text-profit-date-revenue">{fmt(profitByDate.totalRevenue)} MRU</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t("reports.totalCOGS")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold font-mono text-destructive" data-testid="text-profit-date-cogs">{fmt(profitByDate.totalProductCosts)} MRU</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t("reports.grossProfit")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-xl font-bold font-mono ${profitByDate.grossProfit >= 0 ? "text-green-600" : "text-destructive"}`} data-testid="text-profit-date-gross">
                          {fmt(profitByDate.grossProfit)} MRU
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t("reports.netResult")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-xl font-bold font-mono ${profitByDate.netProfit >= 0 ? "text-green-600" : "text-destructive"}`} data-testid="text-profit-date-net">
                          {fmt(profitByDate.netProfit)} MRU
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">{t("reports.salesRevenuePOS")}</span>
                      <span className="font-mono">{fmt(profitByDate.totalSalesRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">{t("reports.invoiceRevenue")}</span>
                      <span className="font-mono">{fmt(profitByDate.totalInvoiceRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 border-primary font-semibold">
                      <span>{t("reports.totalRevenue")}</span>
                      <span className="font-mono text-primary">{fmt(profitByDate.totalRevenue)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-destructive">
                      <span className="text-sm">{t("reports.cogsCost")}</span>
                      <span className="font-mono">-{fmt(profitByDate.totalProductCosts)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.shippingCosts")}</span>
                      <span className="font-mono">-{fmt(profitByDate.totalShippingCosts)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.deliveryCosts")}</span>
                      <span className="font-mono">-{fmt(profitByDate.totalDeliveryCosts)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 font-semibold">
                      <span>{t("reports.grossProfit")}</span>
                      <span className={`font-mono ${profitByDate.grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(profitByDate.grossProfit)} MRU
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.salariesCost")}</span>
                      <span className="font-mono">-{fmt(profitByDate.totalSalaries)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                      <span className="text-sm">{t("reports.operatingExpenses")}</span>
                      <span className="font-mono">-{fmt(profitByDate.totalExpenses)} MRU</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-b-2 border-primary text-lg font-bold">
                      <span>{t("reports.netResult")}</span>
                      <span className={`font-mono ${profitByDate.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(profitByDate.netProfit)} MRU
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">{t("reports.netMargin")}</span>
                      <span className={`font-mono font-semibold ${profitByDate.profitMargin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {profitByDate.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BatchProfitCard({ po, totalItemsCost, shippingCost, trueCost, fmt, t }: {
  po: PurchaseOrderWithItems;
  totalItemsCost: number;
  shippingCost: number;
  trueCost: number;
  fmt: (n: number) => string;
  t: (key: string) => string;
}) {
  const { data: profitability } = useQuery<BatchProfitability>({
    queryKey: ["/api/purchase-orders", po.id, "profitability"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${po.id}/profitability`, { credentials: "include" });
      return res.json();
    },
  });

  return (
    <div className="border rounded-lg p-4 space-y-3" data-testid={`row-batch-profitability-${po.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-lg">{po.orderNumber}</span>
          <span className="text-muted-foreground ml-2">({po.supplier?.name || "-"})</span>
          <span className="text-muted-foreground ml-2 text-sm">{po.date}</span>
        </div>
        <div className="flex items-center gap-3">
          {profitability && (
            <Badge variant={profitability.totalProfit >= 0 ? "default" : "destructive"}>
              {profitability.profitMargin.toFixed(1)}% margin
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className="bg-muted/50 rounded p-2">
          <p className="text-muted-foreground text-xs">{t("reports.purchaseCost")}</p>
          <p className="font-mono font-semibold">{fmt(totalItemsCost)} MRU</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
          <p className="text-muted-foreground text-xs">{t("reports.shippingCost")}</p>
          <p className="font-mono font-semibold text-orange-600">{shippingCost > 0 ? fmt(shippingCost) : "-"} {shippingCost > 0 ? "MRU" : ""}</p>
        </div>
        <div className="bg-muted/50 rounded p-2">
          <p className="text-muted-foreground text-xs">{t("reports.trueCost")}</p>
          <p className="font-mono font-semibold">{fmt(trueCost)} MRU</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
          <p className="text-muted-foreground text-xs">{t("reports.revenue")}</p>
          <p className="font-mono font-semibold text-green-600">{profitability ? fmt(profitability.totalRevenue) : "-"} {profitability ? "MRU" : ""}</p>
        </div>
        <div className={`rounded p-2 ${profitability && profitability.totalProfit >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
          <p className="text-muted-foreground text-xs">{t("reports.profit")}</p>
          <p className={`font-mono font-semibold ${profitability && profitability.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profitability ? fmt(profitability.totalProfit) : "-"} {profitability ? "MRU" : ""}
          </p>
        </div>
      </div>
      {profitability && profitability.remainingStock > 0 && (
        <div className="text-xs text-muted-foreground">
          {profitability.remainingStock} units remaining in stock (value: {fmt(profitability.remainingValue)} MRU)
        </div>
      )}
    </div>
  );
}
