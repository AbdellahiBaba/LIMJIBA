import { useState, useEffect } from "react";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Save, Loader2, Award, Package, Clock, CheckCircle2, Truck, PackageCheck, XCircle, ChevronDown, ChevronUp, ShoppingBag, Star, Check, TrendingUp, Gift } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StoreSettings, StoreOrder, StoreReview } from "@shared/schema";

export default function StoreProfile() {
  const { t } = useStoreLanguage();
  const { customer, isAuthenticated, isLoading: authLoading, refreshProfile } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", fullName: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [storeRating, setStoreRating] = useState(0);
  const [storeRatingHover, setStoreRatingHover] = useState(0);
  const [storeReviewText, setStoreReviewText] = useState("");
  const [storeReviewSubmitted, setStoreReviewSubmitted] = useState(false);

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";
  const currency = t("currency");

  const { data: orders, isLoading: ordersLoading } = useQuery<StoreOrder[]>({
    queryKey: ["/api/store/auth/my-orders"],
    enabled: isAuthenticated,
  });

  const { data: storeReviews = [] } = useQuery<StoreReview[]>({
    queryKey: ["/api/store/reviews"],
    enabled: isAuthenticated,
  });

  const { data: loyaltyHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/store/auth/loyalty-transactions"],
    enabled: isAuthenticated,
  });

  const customerAlreadyRatedStore = isAuthenticated && customer ? storeReviews.some(r => r.customerEmail === customer.email) : false;

  const submitStoreReviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/store/reviews", {
        rating: storeRating,
        reviewText: storeReviewText || undefined,
      });
    },
    onSuccess: () => {
      setStoreReviewSubmitted(true);
      setStoreRating(0);
      setStoreReviewText("");
      queryClient.invalidateQueries({ queryKey: ["/api/store/reviews"] });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/store/login");
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (customer) {
      setForm({
        email: customer.email || "",
        fullName: customer.fullName || "",
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/store/auth/profile", form);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("Duplicate") || err?.status === 409) {
        alert(t("auth.emailTaken") || "An account with this email already exists");
      } else {
        alert(msg || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: { label: t("orders.status.pending"), icon: Clock, color: "#f59e0b" },
    confirmed: { label: t("orders.status.confirmed"), icon: CheckCircle2, color: "#3b82f6" },
    shipped: { label: t("orders.status.shipped"), icon: Truck, color: "#8b5cf6" },
    delivered: { label: t("orders.status.delivered"), icon: PackageCheck, color: "#22c55e" },
    cancelled: { label: t("orders.status.cancelled"), icon: XCircle, color: "#ef4444" },
  };

  if (!isAuthenticated) return null;

  const sortedOrders = orders ? [...orders].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8" style={{ color: primaryColor }} data-testid="text-profile-title">
        <User className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {t("profile.title")}
      </h1>

      {((customer?.loyaltyPoints ?? 0) > 0 || loyaltyHistory.length > 0) && (
        <div className="rounded-xl border bg-white shadow-sm p-6 mb-6" style={{ borderColor: "rgba(201,168,76,0.2)" }} data-testid="section-loyalty-points">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))" }}>
              <Award className="h-7 w-7" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("loyalty.yourPoints")}</p>
              <p className="text-3xl font-bold" style={{ color: accentColor }}>{customer?.loyaltyPoints ?? 0}</p>
              <p className="text-xs text-gray-400">{t("loyalty.earnInfo")}</p>
            </div>
          </div>
          {loyaltyHistory.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3" style={{ color: primaryColor }}>{t("loyalty.history")}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loyaltyHistory.slice(0, 10).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: `${primaryColor}04` }} data-testid={`tx-loyalty-${tx.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: tx.points >= 0 ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.1)" }}>
                        {tx.points >= 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <Gift className="h-3 w-3 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: primaryColor }}>
                          {tx.type === "earned" ? t("loyalty.txEarned") : tx.type === "redeemed" ? t("loyalty.txRedeemed") : tx.type === "manual" ? t("loyalty.txManual") : t("loyalty.txRefund")}
                        </p>
                        {tx.orderNumber && <p className="text-xs text-gray-400">#{tx.orderNumber}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: tx.points >= 0 ? "#16a34a" : "#dc2626" }}>
                        {tx.points >= 0 ? "+" : ""}{tx.points}
                      </span>
                      {tx.createdAt && <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{t("profile.editProfile")}</h3>

        <div className="space-y-4">
          <div>
            <Label>{t("auth.email")}</Label>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" className="rounded-lg mt-1" data-testid="input-profile-email" />
          </div>
          <div>
            <Label>{t("auth.fullName")}</Label>
            <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-name" />
          </div>
          <div>
            <Label>{t("auth.phone")}</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-phone" />
          </div>
          <div>
            <Label>{t("checkout.address")}</Label>
            <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-address" />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="rounded-full font-semibold"
          style={{ backgroundColor: saved ? "#22c55e" : accentColor, color: saved ? "white" : primaryColor }}
          disabled={saving}
          data-testid="button-save-profile"
        >
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("profile.saving")}</> : <><Save className="h-4 w-4 mr-2" /> {t("profile.save")}</>}
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: primaryColor }} data-testid="text-order-history-title">
          <Package className="h-5 w-5" style={{ color: accentColor }} />
          {t("profile.orderHistory")}
        </h3>

        {ordersLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!ordersLoading && sortedOrders.length === 0 && (
          <div className="rounded-xl border bg-white shadow-sm p-8 text-center" data-testid="section-no-orders">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-500">{t("profile.noOrders")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("profile.noOrdersSub")}</p>
            <Button
              className="mt-4 rounded-full"
              style={{ backgroundColor: accentColor, color: primaryColor }}
              onClick={() => setLocation("/store/products")}
              data-testid="button-start-shopping"
            >
              {t("cart.startShopping")}
            </Button>
          </div>
        )}

        {!ordersLoading && sortedOrders.length > 0 && (
          <div className="space-y-3" data-testid="section-order-list">
            {sortedOrders.map(order => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedOrder === order.id;
              let orderItems: any[] = [];
              try { orderItems = JSON.parse(order.items); } catch {}
              const itemCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

              return (
                <div
                  key={order.id}
                  className="rounded-xl border bg-white shadow-sm overflow-hidden transition-all"
                  data-testid={`order-history-card-${order.id}`}
                >
                  <button
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover-elevate"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    data-testid={`button-toggle-order-${order.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: primaryColor }} data-testid={`text-order-number-${order.id}`}>
                          {order.orderNumber}
                        </span>
                        <Badge
                          className="flex items-center gap-1 text-xs no-default-active-elevate"
                          style={{ backgroundColor: `${statusConfig.color}15`, color: statusConfig.color, border: `1px solid ${statusConfig.color}30` }}
                          data-testid={`badge-order-status-${order.id}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span data-testid={`text-order-date-${order.id}`}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                        </span>
                        <span>{itemCount} {t("profile.orderItems")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold whitespace-nowrap" style={{ color: primaryColor }} data-testid={`text-order-total-${order.id}`}>
                        {order.total.toFixed(2)} {currency}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2" data-testid={`section-order-details-${order.id}`}>
                      {orderItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                          <span className="text-gray-700">{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                        </div>
                      ))}

                      {(order.discount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>{t("cart.discount")}</span>
                          <span>-{order.discount?.toFixed(2)} {currency}</span>
                        </div>
                      )}

                      <div className="border-t pt-2 flex justify-between font-bold text-sm" style={{ color: primaryColor }}>
                        <span>{t("cart.total")}</span>
                        <span>{order.total.toFixed(2)} {currency}</span>
                      </div>

                      {order.paymentMethod && (
                        <div className="text-xs text-gray-500">
                          {t("orders.paymentMethod")}: <span className="font-medium">{order.paymentMethod}</span>
                        </div>
                      )}

                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={() => setLocation("/store/orders")}
                          data-testid={`button-track-order-${order.id}`}
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {t("checkout.trackOrder")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!customerAlreadyRatedStore && !storeReviewSubmitted && (
        <div className="rounded-xl border bg-white shadow-sm p-6 mt-6" style={{ borderColor: "rgba(201,168,76,0.2)" }} data-testid="section-rate-store">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5" style={{ color: accentColor }} />
            <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{t("reviews.rateStore")}</h3>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block" style={{ color: primaryColor }}>{t("reviews.rating")}</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  className="p-0.5"
                  onMouseEnter={() => setStoreRatingHover(s)}
                  onMouseLeave={() => setStoreRatingHover(0)}
                  onClick={() => setStoreRating(s)}
                  data-testid={`button-store-star-${s}`}
                >
                  <Star className="h-7 w-7 transition-colors" style={{ color: accentColor }} fill={s <= (storeRatingHover || storeRating) ? accentColor : "none"} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={storeReviewText}
            onChange={e => setStoreReviewText(e.target.value)}
            placeholder={t("reviews.writeReview")}
            className="rounded-lg mb-4"
            data-testid="input-store-review-text"
          />
          <Button
            onClick={() => submitStoreReviewMutation.mutate()}
            disabled={storeRating === 0 || submitStoreReviewMutation.isPending}
            className="rounded-full font-semibold"
            style={{ backgroundColor: accentColor, color: primaryColor }}
            data-testid="button-submit-store-review"
          >
            {submitStoreReviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
            {t("reviews.submitReview")}
          </Button>
        </div>
      )}

      {storeReviewSubmitted && (
        <div className="rounded-xl border bg-white shadow-sm p-5 mt-6 text-center" style={{ borderColor: "rgba(34,197,94,0.3)" }} data-testid="text-store-review-thanks">
          <Check className="h-6 w-6 mx-auto mb-2" style={{ color: "#22c55e" }} />
          <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>{t("reviews.thankYou")}</p>
        </div>
      )}

      {customerAlreadyRatedStore && !storeReviewSubmitted && (
        <div className="rounded-xl border bg-white shadow-sm p-5 mt-6" style={{ borderColor: "rgba(201,168,76,0.15)" }} data-testid="text-already-rated-store">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" style={{ color: "#22c55e" }} />
            <p className="text-sm text-gray-500">{t("reviews.alreadyReviewed")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
