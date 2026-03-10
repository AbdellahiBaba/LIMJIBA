import { useStoreLanguage } from "@/components/store-layout";
import { Mail, MessageCircle } from "lucide-react";
import type { StoreSettings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function StoreContact() {
  const { t, lang } = useStoreLanguage();
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const content = {
    en: {
      subtitle: "We're here to help — reach out anytime",
      emailLabel: "Email",
      emailDesc: "Send us an email and we'll respond within 24 hours",
      assistantTitle: "LIMJIBA Smart Assistant",
      assistantDesc: "Chat with our AI assistant for instant help with products, orders, and more",
      supportHours: "Support Hours",
      supportHoursText: "Sunday - Thursday: 9:00 AM - 6:00 PM",
    },
    fr: {
      subtitle: "Nous sommes là pour vous aider — contactez-nous à tout moment",
      emailLabel: "Email",
      emailDesc: "Envoyez-nous un email et nous répondrons sous 24 heures",
      assistantTitle: "Assistant Intelligent LIMJIBA",
      assistantDesc: "Discutez avec notre assistant IA pour une aide instantanée sur les produits, commandes et plus",
      supportHours: "Heures de Support",
      supportHoursText: "Dimanche - Jeudi : 9h00 - 18h00",
    },
    ar: {
      subtitle: "نحن هنا لخدمتكم — تواصلوا معنا في أيّ وقت",
      emailLabel: "البريد الإلكتروني",
      emailDesc: "راسلونا عبر البريد الإلكتروني وسنردّ عليكم خلال ٢٤ ساعة",
      assistantTitle: "مساعد لمجيبة الذكي",
      assistantDesc: "تحدّثوا مع مساعدنا الذكي للحصول على مساعدة فورية حول المنتجات والطلبات",
      supportHours: "ساعات الدعم",
      supportHoursText: "الأحد - الخميس: ٩:٠٠ صباحاً - ٦:٠٠ مساءً",
    },
  };

  const c = content[lang as keyof typeof content] || content.en;

  return (
    <div className="store-page">
      <section className="py-16 text-center" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className={`text-3xl md:text-4xl font-bold text-white mb-4 ${lang === "ar" ? "store-heading-ar" : "brand-name"}`} data-testid="text-contact-title">
            {t("contact.title")}
          </h1>
          <div className="gold-divider w-16 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{c.subtitle}</p>
        </div>
      </section>

      <section className="py-16" style={{ background: "#FAF6EE" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="store-card-premium flex items-center gap-4 p-6 rounded-xl">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                  <Mail className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{c.emailLabel}</p>
                  <a href="mailto:support@limjiba.com" className="font-semibold mt-0.5 block hover:underline" style={{ color: primaryColor }} data-testid="text-contact-email">
                    support@limjiba.com
                  </a>
                  <p className="text-xs text-gray-400 mt-1">{c.emailDesc}</p>
                </div>
              </div>

              <div className="store-card-premium rounded-xl p-6">
                <h3 className={`font-bold mb-2 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: primaryColor }}>{c.supportHours}</h3>
                <p className="text-sm text-gray-500">{c.supportHoursText}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="store-card-premium rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                  <MessageCircle className="h-8 w-8" style={{ color: accentColor }} />
                </div>
                <h3 className={`font-bold text-lg mb-2 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: primaryColor }}>
                  {c.assistantTitle}
                </h3>
                <p className="text-sm text-gray-500">{c.assistantDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
