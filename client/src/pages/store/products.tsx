import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Package, SlidersHorizontal } from "lucide-react";
import type { Product, StoreSettings, Category } from "@shared/schema";

export default function StoreProducts() {
  const { addItem, getItemQuantity } = useCart();
  const { t, lang } = useStoreLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

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

            return (
              <div key={product.id} className="store-card-premium group rounded-2xl overflow-hidden" data-testid={`card-product-${product.id}`}>
                <Link href={`/store/products/${product.id}`}>
                  <div className="h-48 md:h-56 overflow-hidden relative cursor-pointer" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover card-image" data-testid={`img-product-${product.id}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-12 w-12 text-gray-300" /></div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(10,22,40,0.85)", color: "#C9A84C" }}>{product.category}</span>
                    </div>
                    {product.stockQuantity <= 5 && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-500/90 text-white" data-testid={`badge-low-stock-${product.id}`}>
                          {t("products.onlyXLeft").replace("{x}", String(product.stockQuantity))}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/store/products/${product.id}`}>
                    <h3 className="font-semibold text-sm mb-1 hover:underline cursor-pointer line-clamp-2" style={{ color: primaryColor }} data-testid={`link-product-${product.id}`}>{product.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mb-3">{product.stockQuantity} {t("detail.available")}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-lg md:text-xl font-bold gold-text">{product.unitPrice.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 ml-1">{t("currency")}</span>
                    </div>
                    <Button
                      size="sm"
                      className={`rounded-full text-xs px-3 ${atMax ? "" : "store-btn-gold"}`}
                      style={atMax ? { backgroundColor: "#9ca3af", color: "#fff" } : { color: primaryColor }}
                      onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl }, 1, product.stockQuantity)}
                      disabled={atMax}
                      data-testid={`button-add-cart-${product.id}`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      {atMax ? t("cart.maxAvailable") : t("products.add")}
                    </Button>
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
