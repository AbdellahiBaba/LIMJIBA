import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowRight, Star, Sparkles } from "lucide-react";
import type { Product, CmsBanner, StoreSettings } from "@shared/schema";

export default function StoreHome() {
  const { addItem } = useCart();

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: banners } = useQuery<CmsBanner[]>({
    queryKey: ["/api/store/banners"],
  });

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const accentColor = settings?.accentColor || "#C9A84C";
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const featured = products?.slice(0, 8) || [];

  return (
    <div className="store-page">
      <section className="relative overflow-hidden py-20 md:py-32" style={{ background: `linear-gradient(135deg, ${primaryColor}, #0A1628)` }} data-testid="section-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, rgba(201,168,76,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(201,168,76,0.2) 0%, transparent 50%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6" style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
            <Sparkles className="h-4 w-4" />
            Premium Quality Products
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight brand-name" style={{ letterSpacing: "0.05em" }}>
            {settings?.heroTitle || "Welcome to Our Store"}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {settings?.heroSubtitle || "Discover premium products at the best prices"}
          </p>
          <Link href="/store/products">
            <Button size="lg" className="text-lg px-8 py-6 rounded-full font-semibold shadow-xl store-btn-gold" style={{ backgroundColor: accentColor, color: "#0A1628" }} data-testid="button-shop-now">
              Shop Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {banners && banners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="section-banners">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map(banner => (
              <div key={banner.id} className="relative rounded-2xl overflow-hidden group cursor-pointer" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}10)`, border: `1px solid ${accentColor}20` }}>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>{banner.title}</h3>
                  {banner.subtitle && <p className="text-gray-600 text-sm">{banner.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="section-featured">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: primaryColor }}>
            <Star className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
            Featured Products
          </h2>
          <p className="text-gray-600">Discover our best offerings</p>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map(product => (
              <div key={product.id} className="group rounded-2xl border bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden" data-testid={`card-product-${product.id}`}>
                <div className="h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
                  <span className="text-5xl">📦</span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium mb-1" style={{ color: accentColor }}>{product.category}</p>
                  <Link href={`/store/products/${product.id}`}>
                    <h3 className="font-semibold text-sm mb-2 hover:underline cursor-pointer line-clamp-2" data-testid={`link-product-${product.id}`}>{product.name}</h3>
                  </Link>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>{product.unitPrice.toFixed(2)} <span className="text-xs">DZD</span></span>
                    <Button
                      size="sm"
                      className="rounded-full h-8 w-8 p-0"
                      style={{ backgroundColor: accentColor, color: primaryColor }}
                      onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category })}
                      data-testid={`button-add-cart-${product.id}`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {featured.length > 0 && (
          <div className="text-center mt-12">
            <Link href="/store/products">
              <Button variant="outline" size="lg" className="rounded-full px-8" style={{ borderColor: primaryColor, color: primaryColor }} data-testid="button-view-all">
                View All Products <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
