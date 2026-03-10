import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Check, ArrowLeft, Loader2, Package } from "lucide-react";
import type { StoreSettings } from "@shared/schema";

export default function StoreCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const { t } = useStoreLanguage();
  const { customer, isAuthenticated } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", customerAddress: "", notes: "" });

  useEffect(() => {
    if (isAuthenticated && customer) {
      setForm(f => ({
        ...f,
        customerName: f.customerName || customer.fullName || "",
        customerEmail: f.customerEmail || customer.email || "",
        customerPhone: f.customerPhone || customer.phone || "",
        customerAddress: f.customerAddress || customer.address || "",
      }));
    }
  }, [isAuthenticated, customer]);

  const searchParams = new URLSearchParams(window.location.search);
  const promoCode = searchParams.get("promo") || "";

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";
  const currency = t("currency");

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
        <h1 className="text-3xl font-bold mb-3" style={{ color: primaryColor }} data-testid="text-order-success">{t("checkout.orderPlaced")}</h1>
        <p className="text-gray-600 mb-2">{t("checkout.orderNumber")}: <strong>{orderPlaced.orderNumber}</strong></p>
        <p className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{orderPlaced.total.toFixed(2)} {currency}</p>
        <p className="text-gray-500 mb-8">{t("checkout.orderSuccess")}</p>
        <div className="flex gap-4 justify-center">
          <Link href="/store/orders">
            <Button variant="outline" className="rounded-full" data-testid="button-track-order">{t("checkout.trackOrder")}</Button>
          </Link>
          <Link href="/store">
            <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-continue-shopping">{t("checkout.continueShopping")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-500 mb-4">{t("cart.empty")}</h2>
        <Link href="/store/products">
          <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }}>{t("home.shopNow")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/store/cart">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full" data-testid="button-back-cart">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("cart.title")}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-8" style={{ color: primaryColor }} data-testid="text-checkout-title">
        <ShoppingBag className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {t("checkout.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>{t("checkout.customerInfo")}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("checkout.fullName")} *</Label>
                <Input id="name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-name" />
              </div>
              <div>
                <Label htmlFor="email">{t("checkout.email")}</Label>
                <Input id="email" type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-email" />
              </div>
              <div>
                <Label htmlFor="phone">{t("checkout.phone")} *</Label>
                <Input id="phone" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-phone" />
              </div>
              <div>
                <Label htmlFor="address">{t("checkout.address")} *</Label>
                <Textarea id="address" value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-address" />
              </div>
              <div>
                <Label htmlFor="notes">{t("checkout.notes")}</Label>
                <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-lg mt-1" data-testid="input-order-notes" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border bg-white shadow-sm p-6 sticky top-24" data-testid="section-checkout-summary">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>{t("checkout.summary")}</h3>
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                  <span className="font-semibold">{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("cart.subtotal")}</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} {currency}</span>
                </div>
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
              {placeOrder.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {t("checkout.placing")}</> : <>{t("checkout.placeOrder")}</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
