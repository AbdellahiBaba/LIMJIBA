import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CreditCard, Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface PortalTransaction {
  id: string;
  type: "sale" | "invoice";
  date: string;
  reference: string;
  total: number;
  amountPaid: number;
  status: string;
  paymentMode: string;
}

interface PortalData {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    creditLimit: number;
    currentBalance: number;
  };
  transactions: PortalTransaction[];
  branding: {
    primaryColor?: string;
    companyName?: string;
    logo?: string;
  };
}

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "paid":
    case "completed":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate no-default-active-elevate">{t("sales.paid")}</Badge>;
    case "partial":
      return <Badge className="bg-orange-500 text-white no-default-hover-elevate no-default-active-elevate">{t("sales.partial")}</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500 text-white no-default-hover-elevate no-default-active-elevate">{t("sales.pending")}</Badge>;
    case "credit":
      return <Badge className="bg-red-600 text-white no-default-hover-elevate no-default-active-elevate">{t("sales.credit")}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CustomerPortal() {
  const { t } = useLanguage();
  const [, params] = useRoute("/portal/:customerId");
  const customerId = params?.customerId;
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const { data, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["/api/portal", customerId, token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${customerId}?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!customerId && !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold" data-testid="text-portal-error">
              Client introuvable
            </h2>
            <p className="text-muted-foreground text-sm">
              Le lien du portail est invalide ou le client n'existe pas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, transactions, branding } = data;
  const primaryColor = branding.primaryColor || "#0A1628";
  const isOverLimit = customer.currentBalance > customer.creditLimit;

  return (
    <div className="min-h-screen bg-muted/30">
      <div
        className="w-full py-6 px-4 sm:px-8"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4 flex-wrap">
          {branding.logo && (
            <img
              src={branding.logo}
              alt={branding.companyName || "Logo"}
              className="h-10 sm:h-12 w-auto rounded-md bg-white/20 p-1"
              data-testid="img-portal-logo"
            />
          )}
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-white"
              data-testid="text-portal-company"
            >
              {branding.companyName || t("customers.customerPortal")}
            </h1>
            <p className="text-white/80 text-sm" data-testid="text-portal-customer-name">
              {customer.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("customers.currentBalanceLabel")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isOverLimit && <AlertTriangle className="h-5 w-5 text-destructive" />}
                <p
                  className={`text-2xl font-bold ${isOverLimit ? "text-destructive" : ""}`}
                  data-testid="text-portal-balance"
                >
                  {customer.currentBalance.toLocaleString()} {t("common.currency")}
                </p>
              </div>
              {isOverLimit && (
                <p className="text-xs text-destructive mt-1">{t("customers.creditLimitExceeded")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("customers.creditLimitLabel")}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-portal-credit-limit">
                {customer.creditLimit.toLocaleString()} {t("common.currency")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-portal-transactions-title">
              {t("customers.transactionHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-portal-no-transactions">
                {t("common.noTransactions")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.reference")}</TableHead>
                      <TableHead>{t("common.type")}</TableHead>
                      <TableHead className="text-right">{t("common.total")}</TableHead>
                      <TableHead className="text-right">{t("sales.alreadyPaid")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateDMY(tx.date)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.reference}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                            {tx.type === "sale" ? t("common.sale") : t("common.invoice")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tx.total.toLocaleString()} {t("common.currency")}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tx.amountPaid.toLocaleString()} {t("common.currency")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tx.status, t)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}