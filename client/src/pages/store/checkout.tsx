import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Check, ArrowLeft, Loader2, Package } from "lucide-react";
import type { StoreSettings } from "@shared/schema";

export default function StoreCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", customerAddress: "", notes: "" });

  const searchParams = new URLSearchParams(window.location.search);
  const promoCode = searchParams.get("promo") || "";

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#4A0E4E";
  const accentColor = settings?.accentColor || "#D4AF37";

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
          promoCode: promoCode || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to place order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOrderPlaced({ orderNumber: data.orderNumber, total: data.total });
      clearCart();
    },
  });

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
          <Check className="h-10 w-10" style={{ color: accentColor }} />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: primaryColor }} data-testid="text-order-success">Order Placed!</h1>
        <p className="text-gray-600 mb-2">Your order <strong>{orderPlaced.orderNumber}</strong> has been received.</p>
        <p className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{orderPlaced.total.toFixed(2)} DZD</p>
        <p className="text-gray-500 mb-8">You will receive updates via email. You can also track your order status.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/store/orders">
            <Button variant="outline" className="rounded-full" data-testid="button-track-order">Track Order</Button>
          </Link>
          <Link href="/store">
            <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-continue-shopping">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-500 mb-4">Your cart is empty</h2>
        <Link href="/store/products">
          <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }}>Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/store/cart">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full" data-testid="button-back-cart">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Cart
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-8" style={{ color: primaryColor }} data-testid="text-checkout-title">
        <ShoppingBag className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>Customer Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Your full name" className="rounded-lg mt-1" data-testid="input-customer-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} placeholder="your@email.com" className="rounded-lg mt-1" data-testid="input-customer-email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="0555 123 456" className="rounded-lg mt-1" data-testid="input-customer-phone" />
              </div>
              <div>
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea id="address" value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} placeholder="Full delivery address" className="rounded-lg mt-1" data-testid="input-customer-address" />
              </div>
              <div>
                <Label htmlFor="notes">Order Notes (optional)</Label>
                <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions..." className="rounded-lg mt-1" data-testid="input-order-notes" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border bg-white shadow-sm p-6 sticky top-24" data-testid="section-checkout-summary">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>Order Summary</h3>
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                  <span className="font-semibold">{(item.unitPrice * item.quantity).toFixed(2)} DZD</span>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} DZD</span>
                </div>
                {promoCode && (
                  <div className="flex justify-between text-sm text-green-600 mt-1">
                    <span>Promo: {promoCode}</span>
                    <span>Applied at checkout</span>
                  </div>
                )}
              </div>
            </div>

            {placeOrder.isError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm" data-testid="text-checkout-error">
                {placeOrder.error.message}
              </div>
            )}

            <Button
              className="w-full rounded-full font-semibold"
              size="lg"
              style={{ backgroundColor: accentColor, color: primaryColor }}
              onClick={() => placeOrder.mutate()}
              disabled={placeOrder.isPending || !form.customerName || !form.customerPhone || !form.customerAddress}
              data-testid="button-place-order"
            >
              {placeOrder.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Placing Order...</> : <>Place Order</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
