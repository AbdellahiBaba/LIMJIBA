import { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, ArrowRight, Tag, Check, X, Package, AlertCircle, Shield } from "lucide-react";
import type { Product, StoreSettings } from "@shared/schema";

export default function StoreCart() {
  const { items, removeItem, updateQuantity, subtotal, itemCount, clearCart } = useCart();
  const { t, lang } = useStoreLanguage();
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount?: number; error?: string } | null>(null);

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const getProductStock = (productId: string): number | undefined => {
    return allProducts?.find(p => p.id === productId)?.stockQuantity;
  };

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
  const currency = t("currency");

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "rgba(201,168,76,0.1)" }}>
          <ShoppingCart className="h-10 w-10" style={{ color: "#C9A84C" }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-empty-cart">{t("cart.empty")}</h2>
        <p className="text-gray-400 mb-8">{t("cart.emptyMsg")}</p>
        <Link href="/store/products">
          <Button className="rounded-full px-10 py-6 store-btn-gold font-semibold" style={{ color: primaryColor }} data-testid="button-start-shopping">
            {t("cart.startShopping")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }} data-testid="text-cart-title">
            {t("cart.title")}
          </h1>
          <p className="text-sm text-gray-400 mt-1">{itemCount} {lang === "ar" ? "عنصر" : lang === "fr" ? "articles" : "items"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-400 hover:text-red-600 hover:bg-red-50" data-testid="button-clear-cart">
          <Trash2 className="h-4 w-4 mr-1" /> {t("cart.clearAll")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => {
            const currentStock = getProductStock(item.productId);
            const maxStock = currentStock ?? item.maxStock;
            const atMax = maxStock !== undefined && item.quantity >= maxStock;

            return (
              <div key={item.productId} className="store-card-premium flex items-center gap-4 p-4 rounded-xl" data-testid={`cart-item-${item.productId}`}>
                <div className="h-20 w-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" data-testid={`img-product-${item.productId}`} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-8 w-8 text-gray-200" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/store/products/${item.productId}`}>
                    <h3 className="font-semibold truncate hover:underline cursor-pointer" style={{ color: primaryColor }}>{item.productName}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                  <p className="font-bold mt-1 gold-text">{item.unitPrice.toFixed(2)} <span className="text-xs text-gray-400">{currency}</span></p>
                  {atMax && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1" data-testid={`text-max-stock-${item.productId}`}>
                      <AlertCircle className="h-3 w-3" />
                      {t("cart.maxAvailable")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-none hover:bg-gray-50" onClick={() => updateQuantity(item.productId, item.quantity - 1, maxStock)} data-testid={`button-cart-minus-${item.productId}`}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-bold" style={{ color: primaryColor }}>{item.quantity}</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-none hover:bg-gray-50" onClick={() => updateQuantity(item.productId, item.quantity + 1, maxStock)} disabled={atMax} data-testid={`button-cart-plus-${item.productId}`}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold text-sm w-24 text-right" style={{ color: primaryColor }}>{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => removeItem(item.productId)} data-testid={`button-cart-remove-${item.productId}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="store-card-premium rounded-xl p-6" data-testid="section-order-summary">
            <h3 className="text-lg font-bold mb-5" style={{ color: primaryColor }}>{t("cart.orderSummary")}</h3>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("cart.subtotal")} ({itemCount})</span>
                <span className="font-semibold">{subtotal.toFixed(2)} {currency}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("cart.discount")}</span>
                  <span>-{discount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="gold-divider" />
              <div className="flex justify-between text-xl font-bold pt-1" style={{ color: primaryColor }}>
                <span>{t("cart.total")}</span>
                <span className="gold-text">{total.toFixed(2)} <span className="text-sm text-gray-400">{currency}</span></span>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#C9A84C" }} />
                  <Input
                    placeholder={t("cart.promoCode")}
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                    className="pl-9 rounded-xl text-sm bg-gray-50 border-gray-200 focus:border-[#C9A84C]"
                    data-testid="input-promo-code"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  style={{ borderColor: "rgba(201,168,76,0.3)", color: primaryColor }}
                  onClick={() => validatePromo.mutate()}
                  disabled={!promoCode || validatePromo.isPending}
                  data-testid="button-apply-promo"
                >
                  {t("cart.apply")}
                </Button>
              </div>
              {promoResult && (
                <div className={`mt-2 text-sm flex items-center gap-1 ${promoResult.valid ? "text-green-600" : "text-red-500"}`} data-testid="text-promo-result">
                  {promoResult.valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {promoResult.valid ? `${t("cart.discountApplied")}: -${discount.toFixed(2)} ${currency}` : promoResult.error}
                </div>
              )}
            </div>

            <Link href={`/store/checkout${promoResult?.valid ? `?promo=${promoCode}` : ""}`}>
              <Button className="w-full rounded-xl font-bold h-12 text-base store-btn-gold" style={{ color: "#0A1628" }} data-testid="button-checkout">
                {t("cart.checkout")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
              <span>{lang === "ar" ? "دفع آمن ومضمون" : lang === "fr" ? "Paiement sécurisé" : "Secure checkout"}</span>
            </div>
          </div>

          <Link href="/store/products">
            <Button variant="outline" className="w-full rounded-xl" style={{ borderColor: "rgba(201,168,76,0.2)" }} data-testid="button-continue-shopping">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("cart.continue")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
