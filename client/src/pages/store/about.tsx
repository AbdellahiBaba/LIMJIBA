import { useQuery } from "@tanstack/react-query";
import { useStoreLanguage } from "@/components/store-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Award, Truck, Globe } from "lucide-react";
import type { CmsPage, StoreSettings } from "@shared/schema";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

export default function StoreAbout() {
  const { t, lang } = useStoreLanguage();
  const { data: page, isLoading } = useQuery<CmsPage>({ queryKey: ["/api/store/pages/about"] });
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  let content: any = {};
  try { content = JSON.parse(page?.content || "{}"); } catch {}

  const values = [
    { icon: Award, en: "Premium Quality", fr: "Qualité Premium", ar: "جودة عالية", descEn: "We source only the finest imported products", descFr: "Nous sélectionnons uniquement les meilleurs produits importés", descAr: "نختار فقط أجود المنتجات المستوردة" },
    { icon: Shield, en: "Trusted Service", fr: "Service de Confiance", ar: "خدمة موثوقة", descEn: "Building trust through transparent business", descFr: "Construire la confiance par la transparence", descAr: "بناء الثقة من خلال الشفافية" },
    { icon: Truck, en: "Fast Delivery", fr: "Livraison Rapide", ar: "توصيل سريع", descEn: "Reliable delivery across Mauritania", descFr: "Livraison fiable à travers la Mauritanie", descAr: "توصيل موثوق في جميع أنحاء موريتانيا" },
    { icon: Globe, en: "Global Imports", fr: "Importations Mondiales", ar: "استيراد عالمي", descEn: "Products sourced from around the world", descFr: "Produits sourcés du monde entier", descAr: "منتجات من جميع أنحاء العالم" },
  ];

  return (
    <div className="store-page">
      <section className="py-16 text-center" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <img src={logoImg} alt="LIMJIBA" className="w-20 h-20 mx-auto rounded-xl mb-6 object-contain" style={{ boxShadow: "0 0 40px rgba(201,168,76,0.2)" }} />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 brand-name" data-testid="text-about-title">
            {t("about.title")}
          </h1>
          <div className="gold-divider w-16 mx-auto mb-4" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {lang === "ar" ? "لمجيبة — علامتك التجارية الموثوقة للمنتجات المستوردة الفاخرة في موريتانيا" : lang === "fr" ? "LIMJIBA — votre marque de confiance pour les produits importés premium en Mauritanie" : "LIMJIBA — your trusted brand for premium imported products in Mauritania"}
          </p>
        </div>
      </section>

      {content.body && (
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.body }} />
          </div>
        </section>
      )}

      <section className="py-16" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" style={{ color: primaryColor }}>
            {lang === "ar" ? "لماذا تختار لمجيبة؟" : lang === "fr" ? "Pourquoi choisir LIMJIBA ?" : "Why Choose LIMJIBA?"}
          </h2>
          <div className="gold-divider w-16 mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div key={i} className="store-card-premium rounded-xl p-6 flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                  <v.icon className="h-6 w-6" style={{ color: accentColor }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1" style={{ color: primaryColor }}>{lang === "ar" ? v.ar : lang === "fr" ? v.fr : v.en}</h3>
                  <p className="text-sm text-gray-500">{lang === "ar" ? v.descAr : lang === "fr" ? v.descFr : v.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
