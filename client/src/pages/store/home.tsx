import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowRight, Star, Sparkles, Package, Shield, Truck, Award, ChevronRight } from "lucide-react";
import type { Product, CmsBanner, StoreSettings, Category } from "@shared/schema";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

export default function StoreHome() {
  const { addItem } = useCart();
  const { t, lang } = useStoreLanguage();

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: banners } = useQuery<CmsBanner[]>({
    queryKey: ["/api/store/banners"],
  });

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/store/categories"],
  });

  const accentColor = settings?.accentColor || "#C9A84C";
  const primaryColor = settings?.primaryColor || "#0A1628";
  const featured = products?.slice(0, 8) || [];

  const getCategoryName = (cat: Category) => {
    if (lang === "ar" && cat.nameAr) return cat.nameAr;
    if (lang === "fr" && cat.nameFr) return cat.nameFr;
    return cat.name;
  };

  const trustBadges = [
    { icon: Truck, en: "Free Delivery", fr: "Livraison Gratuite", ar: "توصيل مجاني" },
    { icon: Shield, en: "Secure Payment", fr: "Paiement Sécurisé", ar: "دفع آمن" },
    { icon: Award, en: "Premium Quality", fr: "Qualité Premium", ar: "جودة عالية" },
  ];

  return (
    <div className="store-page">
      <section className="relative overflow-hidden min-h-[85vh] flex items-center" style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, #0D1520 50%, ${primaryColor} 100%)` }} data-testid="section-hero">
        <div className="hero-glow" style={{ width: "500px", height: "500px", background: accentColor, top: "-10%", left: "10%" }} />
        <div className="hero-glow" style={{ width: "400px", height: "400px", background: accentColor, bottom: "-5%", right: "15%", animationDelay: "2s" }} />
        <div className="hero-glow" style={{ width: "300px", height: "300px", background: accentColor, top: "40%", left: "60%", animationDelay: "1s" }} />

        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(201,168,76,0.1) 35px, rgba(201,168,76,0.1) 36px)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center w-full py-20">
          <div className="animate-fade-in-up">
            <div className="mx-auto mb-8 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden animate-float" style={{ boxShadow: `0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1)` }}>
              <img src={logoImg} alt="LIMJIBA" className="w-full h-full object-contain bg-white/10 p-2" />
            </div>
          </div>

          <div className="animate-fade-in-up-delay-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm mb-6 premium-badge">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">{t("home.badge")}</span>
            </div>
          </div>

          <h1 className="animate-fade-in-up-delay-1 text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 tracking-tight brand-name" style={{ letterSpacing: "0.08em" }}>
            {settings?.heroTitle || t("home.heroTitle")}
          </h1>

          <p className="animate-fade-in-up-delay-2 text-lg md:text-xl lg:text-2xl mb-4 max-w-3xl mx-auto font-serif-brand" style={{ color: accentColor }}>
            {t("home.badge")}
          </p>

          <p className="animate-fade-in-up-delay-2 text-base md:text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            {settings?.heroSubtitle || t("home.heroSubtitle")}
          </p>

          <div className="animate-fade-in-up-delay-3">
            <Link href="/store/products">
              <Button size="lg" className="text-lg px-10 py-7 rounded-full font-bold shadow-2xl store-btn-gold" style={{ color: "#0A1628" }} data-testid="button-shop-now">
                {t("home.shopNow")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-8 border-y" style={{ background: "linear-gradient(135deg, #FAF6EE, #fff)", borderColor: "rgba(201,168,76,0.15)" }} data-testid="section-trust">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {trustBadges.map((badge, i) => (
              <div key={i} className="trust-badge rounded-xl p-4 md:p-6 text-center" style={{ background: "rgba(10,22,40,0.03)", borderColor: "rgba(201,168,76,0.12)" }}>
                <badge.icon className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" style={{ color: accentColor }} />
                <p className="text-xs md:text-sm font-semibold" style={{ color: primaryColor }}>
                  {lang === "ar" ? badge.ar : lang === "fr" ? badge.fr : badge.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {banners && banners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="section-banners">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map(banner => (
              <div key={banner.id} className="relative rounded-2xl overflow-hidden group cursor-pointer store-card-premium p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>{banner.title}</h3>
                {banner.subtitle && <p className="text-gray-600 text-sm">{banner.subtitle}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {categories && categories.length > 0 && (
        <section className="py-16" style={{ background: "#FAF6EE" }} data-testid="section-categories">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: primaryColor }}>
                {lang === "ar" ? "تسوق حسب الفئة" : lang === "fr" ? "Acheter par Catégorie" : "Shop by Category"}
              </h2>
              <div className="gold-divider w-24 mx-auto mt-3" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {categories.slice(0, 8).map(cat => (
                <Link key={cat.id} href={`/store/products?category=${encodeURIComponent(cat.name)}`}>
                  <div className="group rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ background: "white", border: "1px solid rgba(201,168,76,0.12)" }}>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                      <Package className="h-7 w-7" style={{ color: accentColor }} />
                    </div>
                    <h3 className="font-semibold text-sm md:text-base" style={{ color: primaryColor }}>{getCategoryName(cat)}</h3>
                    <ChevronRight className="h-4 w-4 mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accentColor }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-20" style={{ background: "white" }} data-testid="section-featured">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3 premium-badge rounded-full px-4 py-1.5 text-sm">
              <Star className="h-4 w-4" />
              {t("home.featured")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: primaryColor }}>
              {t("home.featured")}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">{t("home.featuredSub")}</p>
            <div className="gold-divider w-24 mx-auto mt-4" />
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map(product => (
                <div key={product.id} className="store-card-premium group rounded-2xl overflow-hidden" data-testid={`card-product-${product.id}`}>
                  <div className="h-48 md:h-56 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover card-image" data-testid={`img-product-${product.id}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Package className="h-12 w-12 text-gray-300" /></div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(10,22,40,0.85)", color: accentColor }}>{product.category}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <Link href={`/store/products/${product.id}`}>
                      <h3 className="font-semibold text-sm mb-2 hover:underline cursor-pointer line-clamp-2" style={{ color: primaryColor }} data-testid={`link-product-${product.id}`}>{product.name}</h3>
                    </Link>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-lg md:text-xl font-bold gold-text">{product.unitPrice.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1">{t("currency")}</span>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full h-9 w-9 p-0 store-btn-gold"
                        style={{ color: primaryColor }}
                        onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl })}
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
                <Button variant="outline" size="lg" className="rounded-full px-10 font-semibold" style={{ borderColor: accentColor, color: primaryColor }} data-testid="button-view-all">
                  {t("home.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-16" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }} data-testid="section-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 brand-name">
            {lang === "ar" ? "لمجيبة" : "LIMJIBA"}
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto font-serif-brand" style={{ color: `${accentColor}cc` }}>
            {lang === "ar" ? "جودة لا تُضاهى، خدمة لا مثيل لها" : lang === "fr" ? "Qualité inégalée, service incomparable" : "Unmatched quality, unparalleled service"}
          </p>
          <Link href="/store/products">
            <Button size="lg" className="rounded-full px-10 py-6 store-btn-gold font-bold text-base" style={{ color: "#0A1628" }}>
              {t("home.shopNow")} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
