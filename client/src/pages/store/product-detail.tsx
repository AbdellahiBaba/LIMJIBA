import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, ArrowLeft, Minus, Plus, Check, Package, AlertCircle, Shield, Truck, CreditCard, Eye, Flame, Star, Loader2, Layers } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, StoreSettings, ProductReview, ProductVariant } from "@shared/schema";

export default function StoreProductDetail() {
  const [, params] = useRoute("/store/products/:id");
  const productId = params?.id;
  const { addItem, getItemQuantity, items } = useCart();
  const { t, lang } = useStoreLanguage();
  const { customer, isAuthenticated } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { recentlyViewed, addViewed } = useRecentlyViewed();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

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

  const { data: reviews = [] } = useQuery<ProductReview[]>({
    queryKey: ["/api/store/products", productId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/store/products/${productId}/reviews`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: variants = [] } = useQuery<ProductVariant[]>({
    queryKey: ["/api/store/products", productId, "variants"],
    queryFn: async () => {
      const res = await fetch(`/api/store/products/${productId}/variants`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId && !!product?.hasVariants,
  });

  const selectedVariant = product?.hasVariants ? variants.find(v => v.id === selectedVariantId) || variants[0] || null : null;

  useEffect(() => {
    if (product?.hasVariants && variants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(variants[0].id);
    }
  }, [product?.hasVariants, variants]);

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const customerAlreadyReviewed = isAuthenticated && customer ? reviews.some(r => r.customerEmail === customer.email) : false;

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/store/products/${productId}/reviews`, {
        rating: reviewRating,
        reviewText: reviewText || undefined,
      });
    },
    onSuccess: () => {
      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["/api/store/products", productId, "reviews"] });
    },
  });

  useEffect(() => {
    if (product) {
      addViewed({
        productId: product.id,
        productName: product.name,
        unitPrice: product.unitPrice,
        category: product.category,
        imageUrl: product.imageUrl,
      });
    }
  }, [product?.id]);

  const related = allProducts?.filter(p => p.id !== productId && p.category === product?.category).slice(0, 4) || [];

  const recentProducts = allProducts?.filter(p =>
    p.id !== productId && recentlyViewed.some(rv => rv.productId === p.id)
  ).sort((a, b) => {
    const aIdx = recentlyViewed.findIndex(rv => rv.productId === a.id);
    const bIdx = recentlyViewed.findIndex(rv => rv.productId === b.id);
    return aIdx - bIdx;
  }).slice(0, 4) || [];

  const isDeal = product ? (product.isDealOfDay && product.dealDiscount && product.dealDiscount > 0) : false;
  const basePrice = selectedVariant ? selectedVariant.unitPrice : (product?.unitPrice || 0);
  const effectivePrice = product ? (isDeal ? Math.round(basePrice * (1 - (product.dealDiscount || 0) / 100) * 100) / 100 : basePrice) : 0;

  const activeStock = selectedVariant ? selectedVariant.stockQuantity : (product?.stockQuantity || 0);
  const cartQty = product ? getItemQuantity(product.id) : 0;
  const remainingStock = activeStock - (selectedVariant ? items.filter(i => i.variantId === selectedVariant.id).reduce((s, i) => s + i.quantity, 0) : cartQty);
  const canAdd = remainingStock >= quantity;
  const maxSelectableQty = Math.max(0, remainingStock);

  const productDescription = product ? (lang === "ar" ? product.descriptionAr : lang === "fr" ? product.descriptionFr : product.descriptionEn) : null;

  const handleAddToCart = () => {
    if (!product || !canAdd) return;
    const cartItem: any = { productId: product.id, productName: selectedVariant ? `${product.name} (${selectedVariant.variantLabel})` : product.name, unitPrice: effectivePrice, category: product.category, imageUrl: selectedVariant?.imageUrl || product.imageUrl };
    if (selectedVariant) { cartItem.variantId = selectedVariant.id; cartItem.variantLabel = selectedVariant.variantLabel; }
    addItem(cartItem, quantity, activeStock);
    setAdded(true);
    setQuantity(1);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product || !canAdd) return;
    const cartItem: any = { productId: product.id, productName: selectedVariant ? `${product.name} (${selectedVariant.variantLabel})` : product.name, unitPrice: effectivePrice, category: product.category, imageUrl: selectedVariant?.imageUrl || product.imageUrl };
    if (selectedVariant) { cartItem.variantId = selectedVariant.id; cartItem.variantLabel = selectedVariant.variantLabel; }
    addItem(cartItem, quantity, activeStock);
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

  const displayStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const stockColor = displayStock > 10 ? "#22c55e" : displayStock > 5 ? "#eab308" : "#ef4444";

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
            {(selectedVariant?.imageUrl || product.imageUrl) ? (
              <img src={selectedVariant?.imageUrl || product.imageUrl!} alt={product.name} className="h-full w-full object-cover" data-testid={`img-product-${product.id}`} />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-20 w-20 text-gray-200" /></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full premium-badge">{product.category}</span>
            <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2" style={{ color: primaryColor }} data-testid="text-product-name">{product.name}</h1>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-2" data-testid="text-product-rating">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="h-4 w-4" style={{ color: accentColor }} fill={s <= Math.round(avgRating) ? accentColor : "none"} />
                  ))}
                </div>
                <span className="text-sm font-semibold" style={{ color: primaryColor }}>{avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">({reviews.length})</span>
              </div>
            )}
            <p className="text-gray-400 text-sm">{t("detail.sku")}: {product.barcode || product.id.substring(0, 8)}</p>
          </div>

          {productDescription && (
            <div className="text-sm text-gray-600 leading-relaxed" data-testid="text-product-description">
              {productDescription}
            </div>
          )}

          {product.hasVariants && variants.length > 0 && (
            <div data-testid="section-variants">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4" style={{ color: accentColor }} />
                <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                  {lang === "ar" ? "اختر النوع" : lang === "fr" ? "Choisir la variante" : "Select Variant"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariantId(v.id); setQuantity(1); }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                    style={{
                      borderColor: selectedVariantId === v.id ? accentColor : "rgba(201,168,76,0.2)",
                      backgroundColor: selectedVariantId === v.id ? `${accentColor}15` : "white",
                      color: selectedVariantId === v.id ? primaryColor : "#6b7280",
                      boxShadow: selectedVariantId === v.id ? `0 0 0 1px ${accentColor}` : "none",
                    }}
                    data-testid={`button-variant-${v.id}`}
                  >
                    {v.variantLabel}
                    {v.stockQuantity <= 0 && <span className="ml-1 text-xs text-red-400">({lang === "ar" ? "نفذ" : lang === "fr" ? "Épuisé" : "Out"})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div data-testid="text-product-price">
            {isDeal && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  <Flame className="h-3 w-3 inline mr-1" />-{product.dealDiscount}% {t("deals.off")}
                </span>
              </div>
            )}
            <span className="text-4xl md:text-5xl font-bold gold-text">{effectivePrice.toFixed(2)}</span>
            <span className="text-lg text-gray-400 ml-2">{t("currency")}</span>
            {isDeal && (
              <div className="text-sm text-gray-400 line-through mt-1">{t("deals.was")} {product.unitPrice.toFixed(2)} {t("currency")}</div>
            )}
          </div>

          <div className="gold-divider" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm" data-testid="text-stock-availability">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stockColor }} />
              <span style={{ color: stockColor, fontWeight: 600 }}>{displayStock} {t("detail.available")}</span>
            </div>
            {remainingStock < displayStock && remainingStock > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500" data-testid="text-in-cart">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{displayStock - remainingStock} in cart — {remainingStock} remaining</span>
              </div>
            )}
            {displayStock <= 5 && displayStock > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600" data-testid="text-low-stock-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("products.onlyXLeft").replace("{x}", String(displayStock))}</span>
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

      {recentProducts.length > 0 && (
        <section className="mt-16 md:mt-20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5" style={{ color: accentColor }} />
            <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>{t("recentlyViewed.title")}</h2>
          </div>
          <div className="gold-divider w-16 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {recentProducts.map(p => (
              <Link key={p.id} href={`/store/products/${p.id}`}>
                <div className="store-card-premium rounded-2xl overflow-hidden cursor-pointer" data-testid={`card-recent-${p.id}`}>
                  <div className="h-36 md:h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover card-image" />
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

      <section className="mt-16 md:mt-20" data-testid="section-reviews">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5" style={{ color: accentColor }} />
          <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>{t("reviews.title")}</h2>
        </div>
        <div className="gold-divider w-16 mb-8" />

        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm" data-testid="text-no-reviews">{t("reviews.noReviews")}</p>
        ) : (
          <div className="space-y-4 mb-8">
            {reviews.map(review => (
              <div key={review.id} className="rounded-xl border bg-white p-5" style={{ borderColor: "rgba(201,168,76,0.15)" }} data-testid={`card-review-${review.id}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className="h-3.5 w-3.5" style={{ color: accentColor }} fill={s <= review.rating ? accentColor : "none"} />
                      ))}
                    </div>
                    <span className="font-semibold text-sm" style={{ color: primaryColor }}>{review.customerName}</span>
                  </div>
                  {review.createdAt && (
                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
                {review.reviewText && <p className="text-sm text-gray-600 mt-2">{review.reviewText}</p>}
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && !customerAlreadyReviewed && !reviewSubmitted && (
          <div className="rounded-xl border bg-white p-6 mt-6" style={{ borderColor: "rgba(201,168,76,0.2)" }} data-testid="form-write-review">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>{t("reviews.writeReview")}</h3>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block" style={{ color: primaryColor }}>{t("reviews.rating")}</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    className="p-0.5"
                    onMouseEnter={() => setReviewHover(s)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(s)}
                    data-testid={`button-star-${s}`}
                  >
                    <Star className="h-7 w-7 transition-colors" style={{ color: accentColor }} fill={s <= (reviewHover || reviewRating) ? accentColor : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder={t("reviews.writeReview")}
              className="rounded-lg mb-4"
              data-testid="input-review-text"
            />
            <Button
              onClick={() => submitReviewMutation.mutate()}
              disabled={reviewRating === 0 || submitReviewMutation.isPending}
              className="rounded-full font-semibold"
              style={{ backgroundColor: accentColor, color: primaryColor }}
              data-testid="button-submit-review"
            >
              {submitReviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
              {t("reviews.submitReview")}
            </Button>
          </div>
        )}

        {customerAlreadyReviewed && (
          <p className="text-sm text-gray-500 mt-4" data-testid="text-already-reviewed">{t("reviews.alreadyReviewed")}</p>
        )}

        {reviewSubmitted && (
          <div className="rounded-xl border bg-white p-5 mt-4 text-center" style={{ borderColor: "rgba(34,197,94,0.3)" }} data-testid="text-review-thanks">
            <Check className="h-6 w-6 mx-auto mb-2" style={{ color: "#22c55e" }} />
            <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>{t("reviews.thankYou")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
