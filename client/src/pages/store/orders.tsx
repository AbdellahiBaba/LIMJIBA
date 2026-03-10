import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Clock, CheckCircle2, Truck, PackageCheck, XCircle } from "lucide-react";
import type { StoreOrder, StoreSettings } from "@shared/schema";

const TIMELINE_STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;

export default function StoreOrders() {
  const { t } = useStoreLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: { label: t("orders.status.pending"), icon: Clock, color: "#f59e0b" },
    confirmed: { label: t("orders.status.confirmed"), icon: CheckCircle2, color: "#3b82f6" },
    shipped: { label: t("orders.status.shipped"), icon: Truck, color: "#8b5cf6" },
    delivered: { label: t("orders.status.delivered"), icon: PackageCheck, color: "#22c55e" },
    cancelled: { label: t("orders.status.cancelled"), icon: XCircle, color: "#ef4444" },
  };

  const TIMELINE_LABELS: Record<string, string> = {
    pending: t("orders.timeline.placed"),
    confirmed: t("orders.timeline.confirmed"),
    shipped: t("orders.timeline.shipped"),
    delivered: t("orders.timeline.delivered"),
  };

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#1B2D4A";
  const accentColor = settings?.accentColor || "#96823A";
  const currency = t("currency");

  const { data: orders, isLoading, refetch } = useQuery<StoreOrder[]>({
    queryKey: ["/api/store/orders/lookup", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await fetch(`/api/store/orders/lookup?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: searched && !!searchQuery.trim(),
  });

  const handleSearch = () => {
    setSearched(true);
    refetch();
  };

  const getStepIndex = (status: string) => {
    const idx = TIMELINE_STEPS.indexOf(status as typeof TIMELINE_STEPS[number]);
    return idx >= 0 ? idx : -1;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-track-title">
        <Package className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {t("orders.title")}
      </h1>
      <p className="text-gray-600 mb-8">{t("orders.subtitle")}</p>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("orders.placeholder")}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearched(false); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="pl-10 rounded-full"
            data-testid="input-order-search"
          />
        </div>
        <Button onClick={handleSearch} className="rounded-full px-6" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-search-order">
          {t("orders.search")}
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">{t("orders.searching")}</div>
      )}

      {searched && !isLoading && (!orders || orders.length === 0) && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">{t("orders.noOrders")}</h3>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map(order => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const orderItems = JSON.parse(order.items);
            const currentStep = getStepIndex(order.status);
            const isCancelled = order.status === "cancelled";

            return (
              <div key={order.id} className="rounded-xl border bg-white shadow-sm overflow-hidden" data-testid={`order-card-${order.id}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: primaryColor }}>{order.orderNumber}</h3>
                      <p className="text-sm text-gray-500">
                        {t("orders.orderDate")}: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Badge className="flex items-center gap-1 px-3 py-1" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {!isCancelled && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between relative">
                        {TIMELINE_STEPS.map((step, idx) => {
                          const isCompleted = idx <= currentStep;
                          const isCurrent = idx === currentStep;
                          const StepIcon = STATUS_CONFIG[step].icon;
                          return (
                            <div key={step} className="flex flex-col items-center relative z-10" style={{ width: "25%" }}>
                              <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompleted ? "text-white" : "bg-gray-100 text-gray-400 border-gray-200"
                                } ${isCurrent ? "ring-4 ring-opacity-30" : ""}`}
                                style={isCompleted ? {
                                  backgroundColor: STATUS_CONFIG[step].color,
                                  borderColor: STATUS_CONFIG[step].color,
                                  ...(isCurrent ? { boxShadow: `0 0 0 4px ${STATUS_CONFIG[step].color}30` } : {})
                                } : {}}
                              >
                                <StepIcon className="h-4 w-4" />
                              </div>
                              <p className={`text-xs mt-2 text-center font-medium ${isCompleted ? "" : "text-gray-400"}`}
                                style={isCompleted ? { color: STATUS_CONFIG[step].color } : {}}
                              >
                                {TIMELINE_LABELS[step]}
                              </p>
                            </div>
                          );
                        })}
                        <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 -z-0">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: currentStep >= 0 ? `${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}%` : "0%",
                              background: `linear-gradient(90deg, ${STATUS_CONFIG[TIMELINE_STEPS[0]].color}, ${STATUS_CONFIG[TIMELINE_STEPS[Math.min(currentStep, 3)]].color})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {orderItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                        <span>{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                      </div>
                    ))}
                  </div>

                  {order.paymentMethod && (
                    <div className="text-sm text-gray-500 mb-2">
                      {t("orders.paymentMethod")}: <span className="font-medium" style={{ color: primaryColor }}>{order.paymentMethod}</span>
                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t("cart.total")}</span>
                    <span className="text-xl font-bold" style={{ color: primaryColor }}>{order.total.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
