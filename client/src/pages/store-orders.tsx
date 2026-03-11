import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Loader2, Clock, CheckCircle2, Truck, PackageCheck, XCircle, ChevronDown, ChevronUp, CreditCard, Image, BadgeCheck, Bell, Mail, MessageCircle, Store } from "lucide-react";
import type { StoreOrder } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "pending", labelKey: "pending", icon: Clock, color: "#f59e0b" },
  { value: "confirmed", labelKey: "confirmed", icon: CheckCircle2, color: "#3b82f6" },
  { value: "shipped", labelKey: "shipped", icon: Truck, color: "#8b5cf6" },
  { value: "delivered", labelKey: "delivered", icon: PackageCheck, color: "#22c55e" },
  { value: "cancelled", labelKey: "cancelled", icon: XCircle, color: "#ef4444" },
];

const STATUS_LABELS: Record<string, Record<string, string>> = {
  pending: { en: "Pending", fr: "En attente", ar: "قيد الانتظار" },
  confirmed: { en: "Confirmed", fr: "Confirmé", ar: "مؤكد" },
  shipped: { en: "Shipped", fr: "Expédié", ar: "تم الشحن" },
  delivered: { en: "Delivered", fr: "Livré", ar: "تم التسليم" },
  cancelled: { en: "Cancelled", fr: "Annulé", ar: "ملغى" },
};

export default function StoreOrdersAdmin() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const lang = language || "en";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proofDialogUrl, setProofDialogUrl] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<StoreOrder[]>({ queryKey: ["/api/store-orders"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/store-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: t("storeOrders.updateStatus") });
      queryClient.invalidateQueries({ queryKey: ["/api/store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const confirmPayment = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/store-orders/${id}/confirm-payment`);
    },
    onSuccess: () => {
      toast({ title: t("storeOrders.paymentConfirmed") });
      queryClient.invalidateQueries({ queryKey: ["/api/store-orders"] });
    },
  });

  const sendNotification = useMutation({
    mutationFn: async ({ order, channel }: { order: StoreOrder; channel: string }) => {
      if (channel === "email") {
        const subject = encodeURIComponent(`LIMJIBA - ${t("storeOrders.paymentConfirmed")} - ${order.orderNumber}`);
        const body = encodeURIComponent(
          lang === "ar"
            ? `مرحباً ${order.customerName}،\n\nتم تأكيد دفعتك للطلب ${order.orderNumber} بمبلغ ${order.total.toFixed(2)} أوقية.\n\nشكراً لتسوقك معنا!\nلمجيبة`
            : lang === "fr"
            ? `Bonjour ${order.customerName},\n\nVotre paiement pour la commande ${order.orderNumber} de ${order.total.toFixed(2)} MRU a été confirmé.\n\nMerci pour votre achat!\nLIMJIBA`
            : `Hello ${order.customerName},\n\nYour payment for order ${order.orderNumber} of ${order.total.toFixed(2)} MRU has been confirmed.\n\nThank you for shopping with us!\nLIMJIBA`
        );
        window.open(`mailto:${order.customerEmail || ""}?subject=${subject}&body=${body}`, "_blank");
        return;
      }
      if (channel === "whatsapp") {
        const phone = (order.customerPhone || "").replace(/[^0-9+]/g, "");
        const text = encodeURIComponent(
          lang === "ar"
            ? `مرحباً ${order.customerName}! تم تأكيد دفعتك للطلب ${order.orderNumber} بمبلغ ${order.total.toFixed(2)} أوقية. شكراً لتسوقك مع لمجيبة!`
            : lang === "fr"
            ? `Bonjour ${order.customerName}! Votre paiement pour la commande ${order.orderNumber} de ${order.total.toFixed(2)} MRU a été confirmé. Merci pour votre achat chez LIMJIBA!`
            : `Hello ${order.customerName}! Your payment for order ${order.orderNumber} of ${order.total.toFixed(2)} MRU has been confirmed. Thank you for shopping with LIMJIBA!`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
        return;
      }
      if (channel === "in_store") {
        await apiRequest("POST", "/api/store/notifications", {
          customerEmail: order.customerEmail,
          orderNumber: order.orderNumber,
          type: "payment_confirmed",
          title: `Payment Confirmed - ${order.orderNumber}`,
          titleAr: `تم تأكيد الدفع - ${order.orderNumber}`,
          titleFr: `Paiement Confirmé - ${order.orderNumber}`,
          message: `Your payment of ${order.total.toFixed(2)} MRU for order ${order.orderNumber} has been confirmed.`,
          messageAr: `تم تأكيد دفعتك بمبلغ ${order.total.toFixed(2)} أوقية للطلب ${order.orderNumber}.`,
          messageFr: `Votre paiement de ${order.total.toFixed(2)} MRU pour la commande ${order.orderNumber} a été confirmé.`,
          channel: "in_store",
        });
      }
    },
    onSuccess: () => {
      toast({ title: t("storeOrders.notificationSent") });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" data-testid="text-orders-title">
        <ShoppingBag className="h-7 w-7" />
        {t("sidebar.storeOrders")}
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("storeOrders.noOrders") || "No orders yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const statusConfig = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedId === order.id;
            let orderItems: any[] = [];
            try { orderItems = JSON.parse(order.items); } catch {}

            return (
              <Card key={order.id} data-testid={`admin-order-${order.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm sm:text-base">{order.orderNumber}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <Badge className="flex items-center gap-1 text-[10px] sm:text-xs" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[order.status]?.[lang] || statusConfig.labelKey}
                        </Badge>
                        {order.paymentConfirmed && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 text-[10px] sm:text-xs" data-testid={`badge-payment-confirmed-${order.id}`}>
                            <BadgeCheck className="h-3 w-3" />
                            {t("storeOrders.paymentConfirmed")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{order.customerName} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-sm sm:text-base">{order.total.toFixed(2)} MRU</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("storeOrders.email")}</p>
                          <p className="font-medium">{order.customerEmail || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("storeOrders.phone") || "Phone"}</p>
                          <p className="font-medium">{order.customerPhone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("storeOrders.address") || "Address"}</p>
                          <p className="font-medium">{order.customerAddress || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("storeOrders.promoCode") || "Promo Code"}</p>
                          <p className="font-medium">{order.promoCode || "-"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> {t("storeOrders.paymentMethod")}</p>
                          <p className="font-medium" data-testid={`text-payment-method-${order.id}`}>{order.paymentMethod || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 flex-wrap"><Image className="h-3 w-3" /> {t("storeOrders.paymentProof")}</p>
                          {order.paymentProof ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setProofDialogUrl(order.paymentProof); }}
                              data-testid={`button-view-proof-${order.id}`}
                            >
                              {t("storeOrders.viewPaymentProof")}
                            </Button>
                          ) : (
                            <p className="font-medium">-</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-2">{t("storeOrders.items")}</p>
                        <div className="space-y-1">
                          {orderItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between gap-2 text-sm bg-muted/50 px-3 py-1.5 rounded">
                              <span>{item.productName} × {item.quantity}</span>
                              <span>{(item.unitPrice * item.quantity).toFixed(2)} MRU</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between gap-2 mt-2 text-sm">
                          <span>{t("storeOrders.subtotal")}</span><span>{order.subtotal.toFixed(2)} MRU</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between gap-2 text-sm text-green-600">
                            <span>{t("storeOrders.discount")}</span><span>-{order.discount.toFixed(2)} MRU</span>
                          </div>
                        )}
                        {(order.deliveryCost || 0) > 0 && (
                          <div className="flex justify-between gap-2 text-sm">
                            <span>{t("storeOrders.deliveryCost")}</span><span>{(order.deliveryCost || 0).toFixed(2)} MRU</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2 font-bold mt-1">
                          <span>{t("storeOrders.total")}</span><span>{order.total.toFixed(2)} MRU</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium">{t("storeOrders.updateStatus")}:</span>
                        <Select value={order.status} onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                          <SelectTrigger className="w-48" data-testid={`select-order-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{STATUS_LABELS[opt.value]?.[lang] || opt.labelKey}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {!order.paymentConfirmed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); confirmPayment.mutate(order.id); }}
                            disabled={confirmPayment.isPending}
                            className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                            data-testid={`button-confirm-payment-${order.id}`}
                          >
                            {confirmPayment.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BadgeCheck className="h-3.5 w-3.5 mr-1" />}
                            {t("storeOrders.confirmPayment")}
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-notify-${order.id}`}>
                              <Bell className="h-3.5 w-3.5 mr-1" />
                              {t("storeOrders.notifyCustomer")}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => sendNotification.mutate({ order, channel: "email" })}
                              data-testid={`button-notify-email-${order.id}`}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              {t("storeOrders.email")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendNotification.mutate({ order, channel: "whatsapp" })}
                              data-testid={`button-notify-whatsapp-${order.id}`}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              {t("storeOrders.whatsapp")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendNotification.mutate({ order, channel: "in_store" })}
                              data-testid={`button-notify-instore-${order.id}`}
                            >
                              <Store className="h-4 w-4 mr-2" />
                              {t("storeOrders.inStore")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {order.notes && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">{t("storeOrders.notes")}</p>
                          <p>{order.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!proofDialogUrl} onOpenChange={() => setProofDialogUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("storeOrders.paymentProof")}</DialogTitle>
          </DialogHeader>
          {proofDialogUrl && (
            <div className="flex justify-center">
              <img
                src={proofDialogUrl}
                alt="Payment proof"
                className="max-w-full max-h-[70vh] rounded object-contain"
                data-testid="img-payment-proof"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
