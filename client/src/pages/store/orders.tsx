import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Clock, CheckCircle2, Truck, PackageCheck } from "lucide-react";
import type { StoreOrder, StoreSettings } from "@shared/schema";

export default function StoreOrders() {
  const { t } = useStoreLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: { label: t("orders.status.pending"), icon: Clock, color: "#f59e0b" },
    confirmed: { label: t("orders.status.confirmed"), icon: CheckCircle2, color: "#3b82f6" },
    shipped: { label: t("orders.status.shipped"), icon: Truck, color: "#8b5cf6" },
    delivered: { label: t("orders.status.delivered"), icon: PackageCheck, color: "#22c55e" },
    cancelled: { label: t("orders.status.cancelled"), icon: Package, color: "#ef4444" },
  };

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";
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
        <div className="space-y-4">
          {orders.map(order => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const orderItems = JSON.parse(order.items);
            return (
              <div key={order.id} className="rounded-xl border bg-white shadow-sm p-6" data-testid={`order-card-${order.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: primaryColor }}>{order.orderNumber}</h3>
                    <p className="text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                  </div>
                  <Badge className="flex items-center gap-1 px-3 py-1" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="space-y-2 mb-4">
                  {orderItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                      <span>{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">{t("cart.total")}</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>{order.total.toFixed(2)} {currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
