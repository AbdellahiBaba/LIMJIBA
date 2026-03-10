import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowLeft, Minus, Plus, Check, Package } from "lucide-react";
import type { Product, StoreSettings } from "@shared/schema";

export default function StoreProductDetail() {
  const [, params] = useRoute("/store/products/:id");
  const productId = params?.id;
  const { addItem } = useCart();
  const { t } = useStoreLanguage();
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

  const primaryColor = settings?.primaryColor || "#1B2D4A";
  const accentColor = settings?.accentColor || "#96823A";

  const related = allProducts?.filter(p => p.id !== productId && p.category === product?.category).slice(0, 4) || [];

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="h-96 rounded-2xl" />
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/store/products">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full" data-testid="button-back-products">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("detail.back")}
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12" data-testid={`detail-product-${product.id}`}>
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
          <div className="h-96 flex items-center justify-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" data-testid={`img-product-${product.id}`} />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted"><Package className="h-12 w-12 text-muted-foreground/40" /></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Badge className="mb-3" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>{product.category}</Badge>
            <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-product-name">{product.name}</h1>
            <p className="text-gray-500 text-sm">{t("detail.sku")}: {product.barcode || product.id.substring(0, 8)}</p>
          </div>

          <div className="text-4xl font-bold" style={{ color: primaryColor }} data-testid="text-product-price">
            {product.unitPrice.toFixed(2)} <span className="text-lg font-normal">{t("currency")}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 text-green-500" />
              <span>{product.stockQuantity} {t("detail.available")}</span>
            </div>
            {product.weightPerUnit > 0 && (
              <div className="text-sm text-gray-600">
                {t("detail.weight")}: {product.weightPerUnit} kg / {product.unit}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-full">
              <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="button-qty-minus">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-semibold" data-testid="text-qty">{quantity}</span>
              <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0" onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))} data-testid="button-qty-plus">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="lg"
              className="rounded-full flex-1 font-semibold"
              style={{ backgroundColor: added ? "#22c55e" : accentColor, color: added ? "white" : primaryColor }}
              onClick={handleAddToCart}
              data-testid="button-add-to-cart"
            >
              {added ? <><Check className="h-5 w-5 mr-2" /> {t("detail.added")}</> : <><ShoppingCart className="h-5 w-5 mr-2" /> {t("detail.addToCart")}</>}
            </Button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{t("detail.related")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map(p => (
              <Link key={p.id} href={`/store/products/${p.id}`}>
                <div className="rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer" data-testid={`card-related-${p.id}`}>
                  <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" data-testid={`img-product-${p.id}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted"><Package className="h-12 w-12 text-muted-foreground/40" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                    <p className="font-bold mt-1" style={{ color: primaryColor }}>{p.unitPrice.toFixed(2)} {t("currency")}</p>
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
