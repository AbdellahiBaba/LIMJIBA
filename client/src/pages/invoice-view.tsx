import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceWithItems } from "@shared/schema";

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

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  unpaid: { label: "Unpaid", icon: Clock, variant: "outline" },
  paid: { label: "Paid", icon: CheckCircle, variant: "default" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
};

export default function InvoiceView() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  const { data: invoice, isLoading } = useQuery<InvoiceWithItems>({
    queryKey: ["/api/invoices", params.id],
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
    
    window.open(`/api/invoices/${params.id}/pdf?${params_url.toString()}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Invoice not found</h2>
        <Button variant="outline" onClick={() => navigate("/invoices")} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-invoice-title">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground text-sm">
              Created on {invoice.date}
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handlePrint} data-testid="button-print-invoice">
            <Printer className="h-4 w-4 mr-2" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-primary">POLY FLECTA PLASTICA</h2>
                <p className="text-sm text-muted-foreground">
                  FABRICATION D'EMBALLAGE EN PLASTIQUE
                </p>
              </div>
              <Badge variant={status.variant} className="self-start gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Invoice Number</p>
                <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{invoice.date}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Responsible</p>
                <p className="font-medium">{invoice.responsible} - {invoice.role}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Payment Mode</p>
                <p className="font-medium">{invoice.paymentMode}</p>
              </div>
              {invoice.clientName && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{invoice.clientName}</p>
                </div>
              )}
              {invoice.dueDate && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{invoice.dueDate}</p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">Qty</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Weight/Unit</TableHead>
                    <TableHead className="text-right">Total Weight</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="font-mono font-medium">
                  {(invoice.totalWeight || 0).toFixed(2)} kg
                </span>
              </div>
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">Total H.T:</span>
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
                <span>Total T.T.C:</span>
                <span className="font-mono">
                  {invoice.totalTTC.toLocaleString()} DZD
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-sm">
              <p className="text-muted-foreground mb-1">
                Arrêter la présente facture à la somme de:
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
              <CardTitle className="text-sm">Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">POLY FLECTA PLASTICA</p>
              <p className="text-muted-foreground">
                Village Zaitout, Local N°01
              </p>
              <p className="text-muted-foreground">
                Commune Hammam Dalaa - W M'sila
              </p>
              <Separator className="my-3" />
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Carte Artisan:</span> 28/ 00 - 2896688A24</p>
                <p><span className="text-muted-foreground">N° Article:</span> 101082709</p>
                <p><span className="text-muted-foreground">N° Fiscal:</span> 28516010001318002800</p>
              </div>
              <Separator className="my-3" />
              <p>contact@polyflectaplastica.com</p>
              <p>+213 6 70 04 91 24</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={handlePrint}
                data-testid="button-download-pdf"
              >
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/invoices")}
              >
                Back to List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
