import { useQuery } from "@tanstack/react-query";
import { useStoreLanguage } from "@/components/store-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Award, Truck, Globe } from "lucide-react";
import type { StoreSettings } from "@shared/schema";
import logoImg from "@assets/logo.png";

export default function StoreAbout() {
  const { t, lang } = useStoreLanguage();
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const values = [
    {
      icon: Award,
      title: { en: "Premium Quality", fr: "Qualité Premium", ar: "جودة فاخرة لا تُضاهى" },
      desc: { en: "We source only the finest imported products, handpicked for quality and value", fr: "Nous sélectionnons uniquement les meilleurs produits importés, triés sur le volet", ar: "نختار لكم بعناية فائقة أجود المنتجات المستوردة من أرقى المصادر العالمية" },
    },
    {
      icon: Shield,
      title: { en: "Trusted Service", fr: "Service de Confiance", ar: "ثقة وأمان" },
      desc: { en: "Building trust through transparent business practices and exceptional service", fr: "Construire la confiance par la transparence et un service exceptionnel", ar: "نبني علاقة ثقة متينة مع عملائنا من خلال الشفافية والتميّز في الخدمة" },
    },
    {
      icon: Truck,
      title: { en: "Fast Delivery", fr: "Livraison Rapide", ar: "توصيل سريع وموثوق" },
      desc: { en: "Reliable delivery across Mauritania, right to your doorstep", fr: "Livraison fiable à travers toute la Mauritanie, jusqu'à votre porte", ar: "نوصل طلباتكم إلى باب منزلكم في جميع أنحاء موريتانيا بكلّ أمان وسرعة" },
    },
    {
      icon: Globe,
      title: { en: "Global Imports", fr: "Importations Mondiales", ar: "استيراد من العالم إليكم" },
      desc: { en: "Premium products sourced from trusted suppliers around the world", fr: "Produits premium sourcés auprès de fournisseurs de confiance dans le monde entier", ar: "نجلب لكم أفضل المنتجات من موردين موثوقين حول العالم، لتكون بين أيديكم" },
    },
  ];

  const aboutContent = {
    en: {
      story: "LIMJIBA was born from a passion for bringing the finest imported products to Mauritania. We believe everyone deserves access to premium quality goods at fair prices, delivered with exceptional service.",
      mission: "Our Mission",
      missionText: "To be Mauritania's most trusted destination for premium imported products, combining world-class quality with local understanding and personalized service.",
      vision: "Our Vision",
      visionText: "A Mauritania where quality knows no borders — where every customer can access the best the world has to offer, with confidence and convenience.",
    },
    fr: {
      story: "LIMJIBA est née d'une passion pour apporter les meilleurs produits importés en Mauritanie. Nous croyons que chacun mérite un accès à des produits de qualité premium à des prix justes, livrés avec un service exceptionnel.",
      mission: "Notre Mission",
      missionText: "Être la destination la plus fiable de Mauritanie pour les produits importés premium, alliant qualité mondiale et service personnalisé.",
      vision: "Notre Vision",
      visionText: "Une Mauritanie où la qualité ne connaît pas de frontières — où chaque client peut accéder au meilleur que le monde a à offrir.",
    },
    ar: {
      story: "وُلدت لمجيبة من شغفٍ عميق بجلب أرقى المنتجات المستوردة إلى موريتانيا. نؤمن بأنّ كلّ شخص يستحق الحصول على منتجات فاخرة بأسعار عادلة، تصله بخدمة استثنائية تليق به.",
      mission: "رسالتنا",
      missionText: "أن نكون الوجهة الأولى والأكثر ثقةً في موريتانيا للمنتجات المستوردة الفاخرة، حيث نجمع بين الجودة العالمية والفهم المحلّي والخدمة الشخصية المتميّزة.",
      vision: "رؤيتنا",
      visionText: "موريتانيا حيث لا حدود للجودة — حيث يستطيع كلّ عميل الوصول إلى أفضل ما يقدّمه العالم، بكلّ ثقة وراحة.",
    },
  };

  const c = aboutContent[lang as keyof typeof aboutContent] || aboutContent.en;

  return (
    <div className="store-page">
      <section className="py-16 text-center" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <img src={logoImg} alt="LIMJIBA" className="w-20 h-20 mx-auto rounded-xl mb-6 object-contain" style={{ boxShadow: "0 0 40px rgba(201,168,76,0.2)" }} />
          <h1 className={`text-3xl md:text-4xl font-bold text-white mb-4 ${lang === "ar" ? "store-heading-ar" : "brand-name"}`} data-testid="text-about-title">
            {t("about.title")}
          </h1>
          <div className="gold-divider w-16 mx-auto mb-4" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {lang === "ar" ? "لمجيبة — علامتكم التجارية الموثوقة للمنتجات المستوردة الفاخرة في موريتانيا" : lang === "fr" ? "LIMJIBA — votre marque de confiance pour les produits importés premium en Mauritanie" : "LIMJIBA — your trusted brand for premium imported products in Mauritania"}
          </p>
        </div>
      </section>

      <section className="py-14" style={{ background: "#FAF6EE" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className={`text-lg leading-relaxed text-center ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: "#333" }}>
            {c.story}
          </p>
          <div className="gold-divider w-16 mx-auto mt-8 mb-0" />
        </div>
      </section>

      <section className="py-14" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="store-card-premium rounded-xl p-8 text-center">
              <h3 className={`text-xl font-bold mb-3 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: accentColor }}>{c.mission}</h3>
              <p className="text-gray-600 leading-relaxed">{c.missionText}</p>
            </div>
            <div className="store-card-premium rounded-xl p-8 text-center">
              <h3 className={`text-xl font-bold mb-3 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: accentColor }}>{c.vision}</h3>
              <p className="text-gray-600 leading-relaxed">{c.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16" style={{ background: "#FAF6EE" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-3xl font-bold text-center mb-3 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: primaryColor }}>
            {lang === "ar" ? "لماذا تختارون لمجيبة؟" : lang === "fr" ? "Pourquoi choisir LIMJIBA ?" : "Why Choose LIMJIBA?"}
          </h2>
          <div className="gold-divider w-16 mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div key={i} className="store-card-premium rounded-xl p-6 flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                  <v.icon className="h-6 w-6" style={{ color: accentColor }} />
                </div>
                <div>
                  <h3 className={`font-bold mb-1 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: primaryColor }}>
                    {v.title[lang as keyof typeof v.title] || v.title.en}
                  </h3>
                  <p className="text-sm text-gray-500">{v.desc[lang as keyof typeof v.desc] || v.desc.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
