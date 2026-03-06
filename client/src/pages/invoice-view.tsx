import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDateDMY } from "@/lib/dateUtils";
import { useLocation, useParams } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Banknote,
  Package,
  Truck,
  PackageCheck,
  CircleDashed,
  Mail,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceWithItems, InvoicePayment } from "@shared/schema";

function numberToFrenchWords(n: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  if (n === 0) return "zero";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? (u === 1 && t !== 8 ? " et un" : "-" + units[u]) : (t === 8 ? "s" : ""));
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : (h > 1 && r === 0 ? "s" : ""));
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = t === 1 ? "mille" : numberToFrenchWords(t) + " mille";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const prefix = m === 1 ? "un million" : numberToFrenchWords(m) + " millions";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  return n.toString();
}

const statusKeys: Record<string, { labelKey: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { labelKey: "invoices.pending", icon: Clock, variant: "secondary" },
  unpaid: { labelKey: "invoices.unpaid", icon: Clock, variant: "outline" },
  paid: { labelKey: "invoices.paid", icon: CheckCircle, variant: "default" },
  cancelled: { labelKey: "invoices.cancelled", icon: XCircle, variant: "destructive" },
};

export default function InvoiceView() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data: invoice, isLoading } = useQuery<InvoiceWithItems>({
    queryKey: ["/api/invoices", params.id],
  });

  const { data: paymentsData } = useQuery<{ payments: InvoicePayment[]; paidAmount: number }>({
    queryKey: ["/api/invoices", params.id, "payments"],
    enabled: !!params.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/invoices/${params.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("invoices.invoiceCreated") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (data: { invoiceId: string; amount: number; paymentMethod: string; paymentDate: string; reference?: string; notes?: string; createdAt: string }) =>
      apiRequest("POST", `/api/invoices/${params.id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: t("invoices.paymentRecorded") });
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest("DELETE", `/api/invoices/${params.id}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: t("invoices.paymentDeleted") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/invoices/${params.id}/delivery-status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: t("invoices.deliveryStatusUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: t("invoices.invalidAmount"), variant: "destructive" });
      return;
    }
    addPaymentMutation.mutate({
      invoiceId: params.id!,
      amount,
      paymentMethod,
      paymentDate: paymentDate,
      reference: paymentReference || undefined,
      notes: paymentNotes || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  const remainingAmount = invoice ? invoice.totalTTC - (paymentsData?.paidAmount || 0) : 0;

  const handlePrint = () => {
    const params_url = new URLSearchParams({
      invoiceLanguage: branding.invoiceLanguage,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      logoPosition: branding.logoPosition,
      enableWatermark: String(branding.enableWatermark),
      watermarkOpacity: String(branding.watermarkOpacity),
    });
    
    if (branding.logo) {
      params_url.set("logo", branding.logo);
    }
    if (branding.enableWatermark && branding.watermark) {
      params_url.set("watermark", branding.watermark);
    }
    
    window.open(`/public/invoices/${params.id}/pdf?${params_url.toString()}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-3 sm:p-6 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">{t("invoices.invoiceNotFound")}</h2>
        <Button variant="outline" onClick={() => navigate("/invoices")} className="mt-4">
          {t("invoices.backToInvoices")}
        </Button>
      </div>
    );
  }

  const status = statusKeys[invoice.status] || statusKeys.pending;
  const StatusIcon = status.icon;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} data-testid="button-back-invoices">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-invoice-title">
              {t("invoices.invoiceNumber")} {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("common.createdOn")} {formatDateDMY(invoice.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={invoice.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-36" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t("invoices.pending")}</SelectItem>
              <SelectItem value="unpaid">{t("invoices.unpaid")}</SelectItem>
              <SelectItem value="paid">{t("invoices.paid")}</SelectItem>
              <SelectItem value="cancelled">{t("invoices.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handlePrint} data-testid="button-print-invoice">
            <Printer className="h-4 w-4 mr-2" />
            {t("invoices.printPdf")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-primary">{branding.companyInfo.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {branding.companyInfo.tagline}
                </p>
              </div>
              <Badge variant={status.variant} className="self-start gap-1">
                <StatusIcon className="h-3 w-3" />
                {t(status.labelKey)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{t("invoices.invoiceNumber")}</p>
                <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{t("common.date")}</p>
                <p className="font-medium">{formatDateDMY(invoice.date)}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{t("invoices.responsible")}</p>
                <p className="font-medium">{invoice.responsible} - {invoice.role}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{t("invoices.paymentMode")}</p>
                <p className="font-medium">{invoice.paymentMode}</p>
              </div>
              {invoice.clientName && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{t("invoices.clientName")}</p>
                  <p className="font-medium">{invoice.clientName}</p>
                </div>
              )}
              {invoice.dueDate && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{t("invoices.dueDate")}</p>
                  <p className="font-medium">{invoice.dueDate}</p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">{t("invoices.qty")}</TableHead>
                    <TableHead>{t("invoices.designation")}</TableHead>
                    <TableHead className="text-right">{t("invoices.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("invoices.weightPerUnit")}</TableHead>
                    <TableHead className="text-right">{t("invoices.totalWeight")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.quantity}</TableCell>
                      <TableCell>{item.designation}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.unitPrice > 0 ? `${item.unitPrice.toLocaleString()} DZD` : "- DZD"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(item.weightPerUnit || 0).toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(item.totalWeight || 0).toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.total > 0 ? `${item.total.toLocaleString()} DZD` : "- DZD"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex flex-col items-end gap-2">
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">{t("invoices.totalWeight")}:</span>
                <span className="font-mono font-medium">
                  {(invoice.totalWeight || 0).toFixed(2)} kg
                </span>
              </div>
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">{t("invoices.totalHT")}:</span>
                <span className="font-mono font-medium">
                  {invoice.totalHT.toLocaleString()} DZD
                </span>
              </div>
              {invoice.applyTva && (
                <div className="flex gap-8 text-sm">
                  <span className="text-muted-foreground">TVA ({((invoice.tvaRate || 0.19) * 100).toFixed(0)}%):</span>
                  <span className="font-mono font-medium">
                    {(invoice.tvaAmount || 0).toLocaleString()} DZD
                  </span>
                </div>
              )}
              <div className="flex gap-8 text-lg font-semibold">
                <span>{t("invoices.totalTTC")}:</span>
                <span className="font-mono">
                  {invoice.totalTTC.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-sm">
              <p className="text-muted-foreground mb-1">
                {t("invoices.amountInWordsPrefix")}
              </p>
              <p className="font-medium italic">
                {numberToFrenchWords(Math.floor(invoice.totalTTC))}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("invoices.companyDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{branding.companyInfo.name}</p>
              <p className="text-muted-foreground">
                {branding.companyInfo.address}
              </p>
              <Separator className="my-3" />
              <div className="space-y-1">
                {branding.companyInfo.artisanNumber && (
                  <p><span className="text-muted-foreground">{t("invoices.artisanCard")}:</span> {branding.companyInfo.artisanNumber}</p>
                )}
                {branding.companyInfo.articleNumber && (
                  <p><span className="text-muted-foreground">{t("invoices.articleNumber")}:</span> {branding.companyInfo.articleNumber}</p>
                )}
                {branding.companyInfo.fiscalNumber && (
                  <p><span className="text-muted-foreground">{t("invoices.fiscalNumber")}:</span> {branding.companyInfo.fiscalNumber}</p>
                )}
              </div>
              <Separator className="my-3" />
              <p>{branding.companyInfo.email}</p>
              <p>{branding.companyInfo.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                {t("invoices.payments")}
              </CardTitle>
              {invoice.status !== "paid" && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)} data-testid="button-add-payment">
                  <Plus className="h-3 w-3 mr-1" />
                  {t("invoices.addPayment")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("invoices.invoiceTotal")}:</span>
                <span className="font-mono" data-testid="text-invoice-total">{invoice.totalTTC.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("invoices.paidAmount")}:</span>
                <span className="font-mono text-green-600" data-testid="text-paid-amount">{(paymentsData?.paidAmount || 0).toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{t("invoices.remainingAmount")}:</span>
                <span className={`font-mono ${remainingAmount > 0 ? "text-destructive" : "text-green-600"}`} data-testid="text-remaining-amount">
                  {remainingAmount.toLocaleString()} DZD
                </span>
              </div>
              <Progress
                value={invoice.totalTTC > 0 ? Math.min(((paymentsData?.paidAmount || 0) / invoice.totalTTC) * 100, 100) : 0}
                className="h-2"
                data-testid="progress-payment"
              />
              
              {paymentsData?.payments && paymentsData.payments.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    {paymentsData.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                        <div>
                          <p className="font-medium">{payment.amount.toLocaleString()} DZD</p>
                          <p className="text-muted-foreground">
                            {formatDateDMY(payment.paymentDate)} - {payment.paymentMethod}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deletePaymentMutation.mutate(payment.id)}
                          data-testid={`button-delete-payment-${payment.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t("invoices.deliveryStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={invoice.deliveryStatus || "none"}
                onValueChange={(value) => updateDeliveryStatusMutation.mutate(value)}
              >
                <SelectTrigger data-testid="select-delivery-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("invoices.deliveryNotDefined")}</SelectItem>
                  <SelectItem value="prepared">{t("invoices.deliveryPrepared")}</SelectItem>
                  <SelectItem value="shipped">{t("invoices.deliveryShipped")}</SelectItem>
                  <SelectItem value="delivered">{t("invoices.deliveryDelivered")}</SelectItem>
                </SelectContent>
              </Select>
              <Badge
                variant="outline"
                className={
                  invoice.deliveryStatus === "prepared"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : invoice.deliveryStatus === "shipped"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : invoice.deliveryStatus === "delivered"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }
                data-testid="badge-delivery-status"
              >
                {invoice.deliveryStatus === "prepared" && <Package className="h-3 w-3 mr-1" />}
                {invoice.deliveryStatus === "shipped" && <Truck className="h-3 w-3 mr-1" />}
                {invoice.deliveryStatus === "delivered" && <PackageCheck className="h-3 w-3 mr-1" />}
                {(!invoice.deliveryStatus || invoice.deliveryStatus === "none") && <CircleDashed className="h-3 w-3 mr-1" />}
                {invoice.deliveryStatus === "prepared"
                  ? t("invoices.deliveryPrepared")
                  : invoice.deliveryStatus === "shipped"
                  ? t("invoices.deliveryShipped")
                  : invoice.deliveryStatus === "delivered"
                  ? t("invoices.deliveryDelivered")
                  : t("invoices.deliveryNotDefined")}
              </Badge>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = new URLSearchParams({
                    primaryColor: branding.primaryColor,
                  });
                  if (branding.logo) url.set("logo", branding.logo);
                  window.open(`/public/invoices/${params.id}/delivery-note?${url.toString()}`, "_blank");
                }}
                data-testid="button-print-delivery-note"
              >
                <Printer className="h-4 w-4 mr-2" />
                {t("invoices.printDeliveryNote")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("common.actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={handlePrint}
                data-testid="button-download-pdf"
              >
                <Printer className="h-4 w-4 mr-2" />
                {t("invoices.downloadInvoice")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = new URLSearchParams({
                    primaryColor: branding.primaryColor,
                  });
                  if (branding.logo) url.set("logo", branding.logo);
                  window.open(`/public/invoices/${params.id}/delivery-note?${url.toString()}`, "_blank");
                }}
                data-testid="button-download-delivery-note"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("invoices.deliveryNote")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (invoice) {
                    setEmailTo(invoice.clientName ? "" : "");
                    setEmailSubject(`${t("invoices.invoiceNumber")} ${invoice.invoiceNumber} - ${branding.companyInfo.name}`);
                    setEmailBody(
                      `${t("invoices.invoiceNumber")} ${invoice.invoiceNumber} - ${formatDateDMY(invoice.date)} - ${invoice.totalTTC.toLocaleString()} DZD\n\n${branding.companyInfo.name}\n${branding.companyInfo.phone}`
                    );
                    setEmailDialogOpen(true);
                  }
                }}
                data-testid="button-email-invoice"
              >
                <Mail className="h-4 w-4 mr-2" />
                {t("invoices.sendByEmail")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/invoices")}
                data-testid="button-return-list"
              >
                {t("invoices.returnToList")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invoices.recordPayment")}</DialogTitle>
            <DialogDescription>
              {t("invoices.remainingToPay")}: {remainingAmount.toLocaleString()} DZD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("invoices.amountDZD")}</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={remainingAmount.toString()}
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.paymentDate")}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                data-testid="input-payment-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.paymentMethod")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("invoices.paymentMethodCash")}</SelectItem>
                  <SelectItem value="cheque">{t("invoices.paymentMethodCheque")}</SelectItem>
                  <SelectItem value="virement">{t("invoices.paymentMethodTransfer")}</SelectItem>
                  <SelectItem value="carte">{t("invoices.paymentMethodCard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.referenceOptional")}</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t("invoices.referencePlaceholder")}
                data-testid="input-payment-reference"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.notesOptional")}</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder={t("invoices.notesPlaceholder")}
                data-testid="input-payment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-cancel-payment">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {addPaymentMutation.isPending ? t("invoices.recording") : t("invoices.recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("invoices.sendByEmail")}
            </DialogTitle>
            <DialogDescription>
              {t("invoices.emailDraftDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("invoices.emailRecipient")}</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder={t("invoices.emailPlaceholder")}
                data-testid="input-email-to"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.emailSubject")}</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoices.emailBody")}</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                data-testid="input-email-body"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} data-testid="button-cancel-email">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                const draft = `${t("invoices.emailTo")}: ${emailTo}\n${t("invoices.emailSubject")}: ${emailSubject}\n\n${emailBody}`;
                navigator.clipboard.writeText(draft).then(() => {
                  toast({ title: t("invoices.emailDraftCopied") });
                  setEmailDialogOpen(false);
                }).catch(() => {
                  toast({ title: t("invoices.copyFailed"), variant: "destructive" });
                });
              }}
              data-testid="button-copy-email-draft"
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("invoices.copyDraft")}
            </Button>
            {emailTo && (
              <Button
                variant="secondary"
                onClick={() => {
                  const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                  window.open(mailtoUrl);
                }}
                data-testid="button-open-email-client"
              >
                <Mail className="h-4 w-4 mr-2" />
                {t("invoices.openInEmail")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
