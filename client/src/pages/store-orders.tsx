import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Loader2, Clock, CheckCircle2, Truck, PackageCheck, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { StoreOrder } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock, color: "#f59e0b" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "#3b82f6" },
  { value: "shipped", label: "Shipped", icon: Truck, color: "#8b5cf6" },
  { value: "delivered", label: "Delivered", icon: PackageCheck, color: "#22c55e" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "#ef4444" },
];

export default function StoreOrdersAdmin() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<StoreOrder[]>({ queryKey: ["/api/store-orders"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/store-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Order status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/store-orders"] });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" data-testid="text-orders-title">
        <ShoppingBag className="h-7 w-7" />
        Store Orders
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No orders yet</p>
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
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.customerName} • {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{order.total.toFixed(2)} MRU</span>
                      <Badge className="flex items-center gap-1" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{order.customerEmail || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{order.customerPhone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Address</p>
                          <p className="font-medium">{order.customerAddress || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Promo Code</p>
                          <p className="font-medium">{order.promoCode || "-"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-2">Items</p>
                        <div className="space-y-1">
                          {orderItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-muted/50 px-3 py-1.5 rounded">
                              <span>{item.productName} × {item.quantity}</span>
                              <span>{(item.unitPrice * item.quantity).toFixed(2)} MRU</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-2 text-sm">
                          <span>Subtotal</span><span>{order.subtotal.toFixed(2)} MRU</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span><span>-{order.discount.toFixed(2)} MRU</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold mt-1">
                          <span>Total</span><span>{order.total.toFixed(2)} MRU</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Label className="text-sm font-medium">Update Status:</Label>
                        <Select value={order.status} onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                          <SelectTrigger className="w-48" data-testid={`select-order-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {order.notes && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Notes</p>
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
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}
