import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  ShoppingCart,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Reseller } from "@shared/schema";

interface ResellerAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellerId: string | null;
}

export function ResellerAccountDialog({ open, onOpenChange, resellerId }: ResellerAccountDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [markingAllPaid, setMarkingAllPaid] = useState(false);

  const { data: resellerAccountData, isLoading } = useQuery<{
    reseller: Reseller;
    sales: Array<any>;
    summary: { totalSalesCount: number; unpaidCount: number; totalAmount: number; totalPaid: number; totalUnpaid: number };
  }>({
    queryKey: ["/api/resellers", resellerId, "sales"],
    queryFn: async () => {
      const res = await fetch(`/api/resellers/${resellerId}/sales`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!resellerId && open,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ saleId, amount, paymentMethod: pm }: { saleId: string; amount: number; paymentMethod: string }) =>
      apiRequest("POST", `/api/sales/${saleId}/payments`, { amount, paymentMethod: pm }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers", resellerId, "sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resellers/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.paymentRecorded") });
      setPayingSaleId(null);
      setPaymentAmount("");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleStartPayment = (sale: any) => {
    const remaining = Math.max(0, (sale.total || 0) - (sale.amountPaid || 0));
    setPayingSaleId(sale.id);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod("CASH");
  };

  const handleConfirmPayment = () => {
    if (payingSaleId && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (amount > 0) {
        recordPaymentMutation.mutate({ saleId: payingSaleId, amount, paymentMethod });
      }
    }
  };

  const handleMarkAllPaid = async () => {
    if (!resellerAccountData) return;
    const unpaidSales = resellerAccountData.sales.filter(
      (s: any) => (s.status === "partial" || s.status === "credit") && (s.remaining ?? Math.max(0, (s.total || 0) - (s.amountPaid || 0))) > 0.01
    );
    if (unpaidSales.length === 0) return;
    if (!window.confirm(t("resellers.confirmMarkAllPaid"))) return;

    setMarkingAllPaid(true);
    try {
      for (const sale of unpaidSales) {
        const remaining = sale.remaining ?? Math.max(0, (sale.total || 0) - (sale.amountPaid || 0));
        await apiRequest("POST", `/api/sales/${sale.id}/payments`, { amount: remaining, paymentMethod: "CASH" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/resellers", resellerId, "sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resellers/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.allPaymentsRecorded") });
    } catch (error: any) {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    } finally {
      setMarkingAllPaid(false);
    }
  };

  const handleClose = (openState: boolean) => {
    onOpenChange(openState);
    if (!openState) {
      setPayingSaleId(null);
      setPaymentAmount("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t("resellers.accountDetails")}
          </DialogTitle>
          {resellerAccountData?.reseller && (
            <DialogDescription className="text-xs sm:text-sm">
              {resellerAccountData.reseller.name} — {resellerAccountData.reseller.phone || ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 sm:h-16 w-full" />
            ))}
          </div>
        ) : resellerAccountData ? (
          <div className="flex flex-col gap-3 sm:gap-4 overflow-hidden min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 sm:p-3 text-center">
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("resellers.totalSalesCount")}</p>
                <p className="text-base sm:text-lg font-bold" data-testid="text-account-total-sales">{resellerAccountData.summary.totalSalesCount}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 sm:p-3 text-center">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-1 text-red-600 dark:text-red-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("resellers.unpaidTickets")}</p>
                <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-account-unpaid-count">{resellerAccountData.summary.unpaidCount}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 sm:p-3 text-center">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-1 text-green-600 dark:text-green-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("resellers.totalPaid")}</p>
                <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 font-mono" data-testid="text-account-total-paid">{resellerAccountData.summary.totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-2 sm:p-3 text-center">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("resellers.totalUnpaid")}</p>
                <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 font-mono" data-testid="text-account-total-unpaid">{resellerAccountData.summary.totalUnpaid.toLocaleString()}</p>
              </div>
            </div>

            {resellerAccountData.summary.unpaidCount > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleMarkAllPaid}
                  disabled={markingAllPaid}
                  data-testid="button-mark-all-paid"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">{markingAllPaid ? t("resellers.processing") : t("resellers.markAllPaid")}</span>
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-hidden min-h-0">
              <h4 className="text-xs sm:text-sm font-medium mb-2">{t("resellers.salesHistory")}</h4>
              {resellerAccountData.sales.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("common.noData")}</p>
                </div>
              ) : (
                <ScrollArea className="h-[250px] sm:h-[300px] rounded-md border">
                  <div className="min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t("resellers.ticketNumber")}</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">{t("common.date")}</TableHead>
                          <TableHead className="text-xs">{t("common.total")}</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">{t("resellers.paidAmount")}</TableHead>
                          <TableHead className="text-xs">{t("resellers.remainingAmount")}</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">{t("common.status")}</TableHead>
                          <TableHead className="text-xs text-right">{t("resellers.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resellerAccountData.sales.map((sale: any) => {
                          const remaining = sale.remaining ?? Math.max(0, (sale.total || 0) - (sale.amountPaid || 0));
                          const isUnpaid = remaining > 0.01;
                          const isPayingThis = payingSaleId === sale.id;
                          const statusColor = sale.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : sale.status === "credit"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
                          return (
                            <TableRow key={sale.id} data-testid={`row-account-sale-${sale.id}`}>
                              <TableCell className="font-mono text-xs sm:text-sm py-2">{sale.ticketNumber || sale.id}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">
                                {sale.date ? new Date(sale.date).toLocaleDateString() : "-"}
                              </TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm py-2">{(sale.total || 0).toLocaleString()} DZD</TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm text-green-600 dark:text-green-400 py-2 hidden md:table-cell">
                                {(sale.amountPaid || 0).toLocaleString()} DZD
                              </TableCell>
                              <TableCell className="py-2">
                                {remaining > 0 ? (
                                  <span className="font-mono text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                                    {remaining.toLocaleString()} DZD
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs sm:text-sm text-muted-foreground">0 DZD</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 hidden sm:table-cell">
                                <Badge className={`${statusColor} text-[10px] sm:text-xs`}>
                                  {sale.status === "completed" ? t("sales.paid") : sale.status === "credit" ? t("sales.credit") : t("sales.pending")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-2">
                                {isUnpaid && !isPayingThis && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] sm:text-xs px-1.5 sm:px-3"
                                    onClick={() => handleStartPayment(sale)}
                                    data-testid={`button-record-payment-${sale.id}`}
                                  >
                                    <DollarSign className="h-3 w-3 sm:mr-1" />
                                    <span className="hidden sm:inline">{t("resellers.recordPayment")}</span>
                                  </Button>
                                )}
                                {isPayingThis && (
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-1.5" data-testid={`payment-form-${sale.id}`}>
                                    <Input
                                      type="number"
                                      value={paymentAmount}
                                      onChange={(e) => setPaymentAmount(e.target.value)}
                                      className="w-20 sm:w-24 h-7 sm:h-8 text-xs"
                                      min="0"
                                      max={remaining}
                                      step="0.01"
                                      data-testid={`input-payment-amount-${sale.id}`}
                                    />
                                    <div className="flex items-center gap-1">
                                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="w-20 sm:w-24 h-7 sm:h-8 text-[10px] sm:text-xs" data-testid={`select-payment-method-${sale.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="CASH">{t("sales.paymentMethodCash")}</SelectItem>
                                          <SelectItem value="CHEQUE">{t("sales.paymentMethodCheque")}</SelectItem>
                                          <SelectItem value="TRANSFER">{t("sales.paymentMethodTransfer")}</SelectItem>
                                          <SelectItem value="CARD">{t("sales.paymentMethodCard")}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                        onClick={handleConfirmPayment}
                                        disabled={recordPaymentMutation.isPending}
                                        data-testid={`button-confirm-payment-${sale.id}`}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                        onClick={() => setPayingSaleId(null)}
                                        data-testid={`button-cancel-payment-${sale.id}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
