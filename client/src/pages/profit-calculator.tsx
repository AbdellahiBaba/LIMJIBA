import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Receipt,
  Calendar,
} from "lucide-react";
import type { Product, Invoice, Sale } from "@shared/schema";

interface ProfitInputs {
  monthlyExpenses: number;
  monthlySalaries: number;
  productCostPercentage: number;
}

export default function ProfitCalculator() {
  const { t } = useLanguage();
  
  const [inputs, setInputs] = useState<ProfitInputs>(() => {
    const saved = localStorage.getItem("profit_calculator_inputs");
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      monthlyExpenses: 50000,
      monthlySalaries: 100000,
      productCostPercentage: 60,
    };
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const saveInputs = (newInputs: ProfitInputs) => {
    setInputs(newInputs);
    localStorage.setItem("profit_calculator_inputs", JSON.stringify(newInputs));
  };

  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyInvoices = invoices?.filter((inv) => {
      const date = new Date(inv.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }) || [];

    const monthlySales = sales?.filter((sale) => {
      const date = new Date(sale.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }) || [];

    const invoiceRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0);
    const salesRevenue = monthlySales.reduce((sum, sale) => sum + sale.total - (sale.discount || 0), 0);
    const totalRevenue = invoiceRevenue + salesRevenue;

    const productCost = totalRevenue * (inputs.productCostPercentage / 100);
    const totalCosts = productCost + inputs.monthlyExpenses + inputs.monthlySalaries;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const yearlyInvoices = invoices?.filter((inv) => {
      const date = new Date(inv.date);
      return date.getFullYear() === currentYear;
    }) || [];

    const yearlySales = sales?.filter((sale) => {
      const date = new Date(sale.date);
      return date.getFullYear() === currentYear;
    }) || [];

    const yearlyInvoiceRevenue = yearlyInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0);
    const yearlySalesRevenue = yearlySales.reduce((sum, sale) => sum + sale.total - (sale.discount || 0), 0);
    const yearlyRevenue = yearlyInvoiceRevenue + yearlySalesRevenue;

    const yearlyProductCost = yearlyRevenue * (inputs.productCostPercentage / 100);
    const yearlyExpenses = inputs.monthlyExpenses * 12;
    const yearlySalaries = inputs.monthlySalaries * 12;
    const yearlyTotalCosts = yearlyProductCost + yearlyExpenses + yearlySalaries;
    const yearlyNetProfit = yearlyRevenue - yearlyTotalCosts;

    const productProfits = products?.map((product) => {
      const costPerUnit = product.unitPrice * (inputs.productCostPercentage / 100);
      const profitPerUnit = product.unitPrice - costPerUnit;
      const margin = (profitPerUnit / product.unitPrice) * 100;
      return {
        ...product,
        costPerUnit,
        profitPerUnit,
        margin,
      };
    }) || [];

    return {
      totalRevenue,
      invoiceRevenue,
      salesRevenue,
      productCost,
      totalCosts,
      netProfit,
      profitMargin,
      monthlyInvoiceCount: monthlyInvoices.length,
      monthlySalesCount: monthlySales.length,
      yearlyRevenue,
      yearlyNetProfit,
      productProfits,
    };
  }, [products, invoices, sales, inputs]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString() + " DZD";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-profit-title">
            <Calculator className="h-6 w-6" />
            {t("profit.title") || "Profit Calculator"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("profit.description") || "Analyze your business profitability"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("profit.monthlyRevenue") || "Monthly Revenue"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-monthly-revenue">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.monthlyInvoiceCount} invoices + {analytics.monthlySalesCount} sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("profit.totalCosts") || "Total Costs"}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-costs">
              {formatCurrency(analytics.totalCosts)}
            </div>
            <p className="text-xs text-muted-foreground">
              Product + Expenses + Salaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("profit.netProfit") || "Net Profit"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-profit">
              {formatCurrency(analytics.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margin: {analytics.profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("profit.yearlyProfit") || "Yearly Profit"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.yearlyNetProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-yearly-profit">
              {formatCurrency(analytics.yearlyNetProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue: {formatCurrency(analytics.yearlyRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("profit.costInputs") || "Cost Inputs"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-cost">{t("profit.productCostPercentage") || "Product Cost (% of sale price)"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="product-cost"
                  type="number"
                  min="0"
                  max="100"
                  value={inputs.productCostPercentage}
                  onChange={(e) => saveInputs({ ...inputs, productCostPercentage: parseFloat(e.target.value) || 0 })}
                  className="flex-1"
                  data-testid="input-product-cost"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Product cost this month: {formatCurrency(analytics.productCost)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-expenses">{t("profit.monthlyExpenses") || "Monthly Business Expenses"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="monthly-expenses"
                  type="number"
                  min="0"
                  value={inputs.monthlyExpenses}
                  onChange={(e) => saveInputs({ ...inputs, monthlyExpenses: parseFloat(e.target.value) || 0 })}
                  className="flex-1"
                  data-testid="input-monthly-expenses"
                />
                <span className="text-muted-foreground">DZD</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rent, utilities, supplies, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-salaries">{t("profit.monthlySalaries") || "Monthly Salaries"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="monthly-salaries"
                  type="number"
                  min="0"
                  value={inputs.monthlySalaries}
                  onChange={(e) => saveInputs({ ...inputs, monthlySalaries: parseFloat(e.target.value) || 0 })}
                  className="flex-1"
                  data-testid="input-monthly-salaries"
                />
                <span className="text-muted-foreground">DZD</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total employee wages per month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t("profit.breakdown") || "Monthly Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Invoice Revenue</span>
                <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(analytics.invoiceRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">POS Sales Revenue</span>
                <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(analytics.salesRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Product Costs ({inputs.productCostPercentage}%)</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(analytics.productCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Business Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(inputs.monthlyExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Salaries</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(inputs.monthlySalaries)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-muted/50 px-2 rounded-md">
                <span className="font-semibold">Net Profit</span>
                <span className={`font-bold text-lg ${analytics.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {analytics.netProfit >= 0 ? "+" : ""}{formatCurrency(analytics.netProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("profit.productProfitability") || "Product Profitability"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("stock.productName") || "Product"}</TableHead>
                  <TableHead className="text-right">{t("stock.unitPrice") || "Sell Price"}</TableHead>
                  <TableHead className="text-right">{t("profit.costPerUnit") || "Cost"}</TableHead>
                  <TableHead className="text-right">{t("profit.profitPerUnit") || "Profit"}</TableHead>
                  <TableHead className="text-right">{t("profit.margin") || "Margin"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.productProfits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.productProfits.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-profit-${product.id}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">{formatCurrency(product.costPerUnit)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(product.profitPerUnit)}</TableCell>
                      <TableCell className="text-right">
                        <span className={product.margin >= 30 ? "text-green-600 dark:text-green-400" : product.margin >= 15 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
