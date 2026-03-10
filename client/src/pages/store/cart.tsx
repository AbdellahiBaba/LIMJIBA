import { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, ArrowRight, Tag, Check, X } from "lucide-react";
import type { StoreSettings } from "@shared/schema";

export default function StoreCart() {
  const { items, removeItem, updateQuantity, subtotal, itemCount, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount?: number; error?: string } | null>(null);

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";

  const validatePromo = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/store/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, orderAmount: subtotal }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.valid && data.promo) {
        const discount = data.promo.discountType === "percentage"
          ? Math.round(subtotal * (data.promo.discountValue / 100) * 100) / 100
          : data.promo.discountValue;
        setPromoResult({ valid: true, discount });
      } else {
        setPromoResult({ valid: false, error: data.error });
      }
    },
  });

  const discount = promoResult?.valid ? (promoResult.discount || 0) : 0;
  const total = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingCart className="h-20 w-20 mx-auto text-gray-300 mb-6" />
        <h2 className="text-2xl font-bold text-gray-500 mb-2" data-testid="text-empty-cart">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Start shopping to add items to your cart</p>
        <Link href="/store/products">
          <Button className="rounded-full px-8" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-start-shopping">
            Start Shopping <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: primaryColor }} data-testid="text-cart-title">
          <ShoppingCart className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
          Shopping Cart ({itemCount})
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-700" data-testid="button-clear-cart">
          <Trash2 className="h-4 w-4 mr-1" /> Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.productId} className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm" data-testid={`cart-item-${item.productId}`}>
              <div className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
                <span className="text-2xl">📦</span>
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/store/products/${item.productId}`}>
                  <h3 className="font-semibold truncate hover:underline cursor-pointer">{item.productName}</h3>
                </Link>
                <p className="text-sm text-gray-500">{item.category}</p>
                <p className="font-bold mt-1" style={{ color: primaryColor }}>{item.unitPrice.toFixed(2)} DZD</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-full">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => updateQuantity(item.productId, item.quantity - 1)} data-testid={`button-cart-minus-${item.productId}`}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => updateQuantity(item.productId, item.quantity + 1)} data-testid={`button-cart-plus-${item.productId}`}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-bold w-28 text-right" style={{ color: primaryColor }}>{(item.unitPrice * item.quantity).toFixed(2)} DZD</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => removeItem(item.productId)} data-testid={`button-cart-remove-${item.productId}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white shadow-sm p-6" data-testid="section-order-summary">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>Order Summary</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                <span className="font-semibold">{subtotal.toFixed(2)} DZD</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{discount.toFixed(2)} DZD</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold" style={{ color: primaryColor }}>
                <span>Total</span>
                <span>{total.toFixed(2)} DZD</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                    className="pl-9 rounded-full text-sm"
                    data-testid="input-promo-code"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => validatePromo.mutate()}
                  disabled={!promoCode || validatePromo.isPending}
                  data-testid="button-apply-promo"
                >
                  Apply
                </Button>
              </div>
              {promoResult && (
                <div className={`mt-2 text-sm flex items-center gap-1 ${promoResult.valid ? "text-green-600" : "text-red-500"}`} data-testid="text-promo-result">
                  {promoResult.valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {promoResult.valid ? `Discount applied: -${discount.toFixed(2)} DZD` : promoResult.error}
                </div>
              )}
            </div>

            <Link href={`/store/checkout${promoResult?.valid ? `?promo=${promoCode}` : ""}`}>
              <Button className="w-full rounded-full font-semibold" size="lg" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-checkout">
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Link href="/store/products">
            <Button variant="outline" className="w-full rounded-full" data-testid="button-continue-shopping">
              <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
