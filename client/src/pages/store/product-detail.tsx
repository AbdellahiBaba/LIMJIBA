import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowLeft, Minus, Plus, Check, Package, AlertCircle, Shield, Truck, CreditCard } from "lucide-react";
import type { Product, StoreSettings } from "@shared/schema";

export default function StoreProductDetail() {
  const [, params] = useRoute("/store/products/:id");
  const productId = params?.id;
  const { addItem, getItemQuantity } = useCart();
  const { t, lang } = useStoreLanguage();
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/store/products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/store/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const related = allProducts?.filter(p => p.id !== productId && p.category === product?.category).slice(0, 4) || [];

  const cartQty = product ? getItemQuantity(product.id) : 0;
  const remainingStock = product ? product.stockQuantity - cartQty : 0;
  const canAdd = product ? (cartQty + quantity <= product.stockQuantity) : false;
  const maxSelectableQty = product ? Math.max(0, product.stockQuantity - cartQty) : 0;

  const handleAddToCart = () => {
    if (!product || !canAdd) return;
    addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl }, quantity, product.stockQuantity);
    setAdded(true);
    setQuantity(1);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product || !canAdd) return;
    addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl }, quantity, product.stockQuantity);
    setLocation("/store/checkout");
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="h-[500px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-500 mb-2">{t("detail.notFound")}</h2>
        <Link href="/store/products">
          <Button variant="outline" className="rounded-full mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("detail.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const stockColor = product.stockQuantity > 10 ? "#22c55e" : product.stockQuantity > 5 ? "#eab308" : "#ef4444";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/store/products">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full text-gray-500 hover:text-gray-800" data-testid="button-back-products">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("detail.back")}
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14" data-testid={`detail-product-${product.id}`}>
        <div className="store-card-premium rounded-2xl overflow-hidden">
          <div className="h-[400px] md:h-[500px] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" data-testid={`img-product-${product.id}`} />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-20 w-20 text-gray-200" /></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full premium-badge">{product.category}</span>
            <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2" style={{ color: primaryColor }} data-testid="text-product-name">{product.name}</h1>
            <p className="text-gray-400 text-sm">{t("detail.sku")}: {product.barcode || product.id.substring(0, 8)}</p>
          </div>

          <div data-testid="text-product-price">
            <span className="text-4xl md:text-5xl font-bold gold-text">{product.unitPrice.toFixed(2)}</span>
            <span className="text-lg text-gray-400 ml-2">{t("currency")}</span>
          </div>

          <div className="gold-divider" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm" data-testid="text-stock-availability">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stockColor }} />
              <span style={{ color: stockColor, fontWeight: 600 }}>{product.stockQuantity} {t("detail.available")}</span>
            </div>
            {cartQty > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500" data-testid="text-in-cart">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{cartQty} in cart — {remainingStock} remaining</span>
              </div>
            )}
            {product.stockQuantity <= 5 && (
              <div className="flex items-center gap-2 text-sm text-amber-600" data-testid="text-low-stock-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("products.onlyXLeft").replace("{x}", String(product.stockQuantity))}</span>
              </div>
            )}
            {product.weightPerUnit > 0 && (
              <div className="text-sm text-gray-500">
                {t("detail.weight")}: {product.weightPerUnit} kg / {product.unit}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
                <Button variant="ghost" size="sm" className="rounded-none h-12 w-12 p-0 hover:bg-gray-50" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="button-qty-minus">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-14 text-center font-bold text-lg" style={{ color: primaryColor }} data-testid="text-qty">{quantity}</span>
                <Button variant="ghost" size="sm" className="rounded-none h-12 w-12 p-0 hover:bg-gray-50" onClick={() => setQuantity(Math.min(maxSelectableQty, quantity + 1))} disabled={quantity >= maxSelectableQty} data-testid="button-qty-plus">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="lg"
                className={`rounded-xl flex-1 font-bold h-12 text-base ${!canAdd && !added ? "" : added ? "" : "store-btn-gold"}`}
                style={{
                  backgroundColor: added ? "#22c55e" : !canAdd ? "#9ca3af" : undefined,
                  color: added ? "white" : !canAdd ? "#fff" : "#0A1628"
                }}
                onClick={handleAddToCart}
                disabled={!canAdd || maxSelectableQty === 0}
                data-testid="button-add-to-cart"
              >
                {added ? <><Check className="h-5 w-5 mr-2" /> {t("detail.added")}</> : maxSelectableQty === 0 ? t("cart.maxAvailable") : <><ShoppingCart className="h-5 w-5 mr-2" /> {t("detail.addToCart")}</>}
              </Button>
            </div>
            <Button
              size="lg"
              className="rounded-xl w-full font-bold h-12 text-base"
              style={{
                backgroundColor: !canAdd ? "#9ca3af" : "#0A1628",
                color: !canAdd ? "#fff" : "#C9A84C"
              }}
              onClick={handleBuyNow}
              disabled={!canAdd || maxSelectableQty === 0}
              data-testid="button-buy-now"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {lang === "ar" ? "اشترِ الآن" : lang === "fr" ? "Acheter maintenant" : "Buy Now"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 p-3 rounded-lg" style={{ background: "rgba(201,168,76,0.05)" }}>
              <Shield className="h-4 w-4" style={{ color: accentColor }} />
              <span>{lang === "ar" ? "دفع آمن" : lang === "fr" ? "Paiement sécurisé" : "Secure Payment"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 p-3 rounded-lg" style={{ background: "rgba(201,168,76,0.05)" }}>
              <Truck className="h-4 w-4" style={{ color: accentColor }} />
              <span>{lang === "ar" ? "توصيل سريع" : lang === "fr" ? "Livraison rapide" : "Fast Delivery"}</span>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>{t("detail.related")}</h2>
          <div className="gold-divider w-16 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map(p => (
              <Link key={p.id} href={`/store/products/${p.id}`}>
                <div className="store-card-premium rounded-2xl overflow-hidden cursor-pointer" data-testid={`card-related-${p.id}`}>
                  <div className="h-36 md:h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover card-image" data-testid={`img-product-${p.id}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-12 w-12 text-gray-200" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1" style={{ color: primaryColor }}>{p.name}</p>
                    <p className="font-bold mt-1 gold-text">{p.unitPrice.toFixed(2)} <span className="text-xs text-gray-400">{t("currency")}</span></p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
