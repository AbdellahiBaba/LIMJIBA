import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useComparison } from "@/contexts/comparison-context";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Package, SlidersHorizontal, GitCompareArrows, X, ArrowRight } from "lucide-react";
import type { Product, StoreSettings, Category } from "@shared/schema";

function getProductName(product: Product, lang: string): string {
  if (lang === "ar" && product.nameAr) return product.nameAr;
  if (lang === "fr" && product.nameFr) return product.nameFr;
  return product.name;
}

export default function StoreProducts() {
  const { addItem, getItemQuantity } = useCart();
  const { compareItems, addToCompare, removeFromCompare, isInCompare } = useComparison();
  const { t, lang } = useStoreLanguage();
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("category") || "all";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get("category");
    setCategory(urlCategory || "all");
  }, [location]);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const { data: storeCategories } = useQuery<Category[]>({
    queryKey: ["/api/store/categories"],
  });

  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const getCategoryName = (cat: Category) => {
    if (lang === "ar" && cat.nameAr) return cat.nameAr;
    if (lang === "fr" && cat.nameFr) return cat.nameFr;
    return cat.name;
  };

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || p.category === category;
    return matchSearch && matchCategory;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-products-title">
          {t("products.title")}
        </h1>
        <p className="text-gray-500">{t("products.subtitle")}</p>
        <div className="gold-divider w-24 mx-auto mt-4" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("products.search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 rounded-xl h-11 border-gray-200 focus:border-[#C9A84C] bg-white"
            data-testid="input-search-products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-52 rounded-xl h-11 bg-white" data-testid="select-category">
            <SlidersHorizontal className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder={t("products.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("products.allCategories")}</SelectItem>
            {storeCategories?.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{getCategoryName(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {storeCategories && storeCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8" data-testid="category-pills">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${category === "all" ? "text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border"}`}
            style={category === "all" ? { background: "linear-gradient(135deg, #C9A84C, #B8963F)" } : {}}
          >
            {t("products.allCategories")}
          </button>
          {storeCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${category === cat.name ? "text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border"}`}
              style={category === cat.name ? { background: "linear-gradient(135deg, #C9A84C, #B8963F)" } : {}}
            >
              {getCategoryName(cat)}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">{t("products.noProducts")}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map(product => {
            const cartQty = getItemQuantity(product.id);
            const atMax = cartQty >= product.stockQuantity;
            const inCompare = isInCompare(product.id);
            const hasDeal = product.isDealOfDay && product.dealDiscount && product.dealDiscount > 0;
            const effectivePrice = hasDeal ? Math.round(product.unitPrice * (1 - (product.dealDiscount || 0) / 100) * 100) / 100 : product.unitPrice;

            return (
              <div key={product.id} className="store-card-premium group rounded-2xl overflow-hidden relative" data-testid={`card-product-${product.id}`}>
                <Link href={`/store/products/${product.id}`}>
                  <div className="h-48 md:h-56 overflow-hidden relative cursor-pointer" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={getProductName(product, lang)} className="h-full w-full object-cover card-image" data-testid={`img-product-${product.id}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-12 w-12 text-gray-300" /></div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(10,22,40,0.85)", color: "#C9A84C" }}>{product.category}</span>
                    </div>
                    {product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 5) && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: "#f59e0b" }} data-testid={`badge-low-stock-${product.id}`}>
                          {lang === "ar" ? "⚡ محدود" : lang === "fr" ? "⚡ Limité" : "⚡ Limited"}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <Link href={`/store/products/${product.id}`}>
                      <h3 className="font-semibold text-sm hover:underline cursor-pointer line-clamp-2" style={{ color: primaryColor }} data-testid={`link-product-${product.id}`}>{getProductName(product, lang)}</h3>
                    </Link>
                    <button
                      onClick={() => inCompare ? removeFromCompare(product.id) : addToCompare(product)}
                      className={`flex-shrink-0 p-1 rounded-full transition-all ${inCompare ? "bg-green-100 text-green-600" : "opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400"}`}
                      title={inCompare ? t("compare.remove") : t("compare.add")}
                      data-testid={`button-compare-${product.id}`}
                    >
                      <GitCompareArrows className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mb-2.5">
                    <span className="text-base md:text-xl font-bold gold-text">{effectivePrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">{t("currency")}</span>
                    {hasDeal && (
                      <div className="text-[10px] text-gray-400 line-through">{product.unitPrice.toFixed(2)}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className={`w-full rounded-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5 ${atMax ? "" : "store-btn-gold"}`}
                    style={atMax ? { backgroundColor: "#9ca3af", color: "#fff" } : { color: primaryColor }}
                    onClick={() => addItem({ productId: product.id, productName: getProductName(product, lang), unitPrice: effectivePrice, category: product.category, imageUrl: product.imageUrl }, 1, product.stockQuantity)}
                    disabled={atMax || product.stockQuantity <= 0}
                    data-testid={`button-add-cart-${product.id}`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{product.stockQuantity <= 0 ? t("products.outOfStock") : atMax ? t("cart.maxAvailable") : t("products.add")}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compareItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up" data-testid="compare-floating-bar">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl" style={{ background: primaryColor, border: `2px solid ${accentColor}` }}>
            <GitCompareArrows className="h-5 w-5" style={{ color: accentColor }} />
            <span className="text-white text-sm font-medium">
              {compareItems.length} {t("compare.selected")}
            </span>
            <Button
              size="sm"
              className="rounded-full store-btn-gold text-xs px-4"
              style={{ color: primaryColor }}
              onClick={() => setLocation("/store/compare")}
              disabled={compareItems.length < 2}
              data-testid="button-compare-now"
            >
              {t("compare.compare")} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            <button
              onClick={() => { compareItems.forEach(p => removeFromCompare(p.id)); }}
              className="text-gray-400 hover:text-white p-1"
              data-testid="button-clear-compare-bar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
