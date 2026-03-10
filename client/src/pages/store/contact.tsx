import { useQuery } from "@tanstack/react-query";
import { useStoreLanguage } from "@/components/store-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { CmsPage, StoreSettings } from "@shared/schema";

export default function StoreContact() {
  const { t, lang } = useStoreLanguage();
  const { data: page, isLoading } = useQuery<CmsPage>({ queryKey: ["/api/store/pages/contact"] });
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

  let socialLinks: Record<string, string> = {};
  try { socialLinks = JSON.parse(settings?.socialLinks || "{}"); } catch {}

  const contactItems = [
    { icon: Mail, value: settings?.contactEmail, label: lang === "ar" ? "البريد الإلكتروني" : lang === "fr" ? "Email" : "Email", testId: "text-contact-email" },
    { icon: Phone, value: settings?.contactPhone, label: lang === "ar" ? "الهاتف" : lang === "fr" ? "Téléphone" : "Phone", testId: "text-contact-phone" },
    { icon: MapPin, value: settings?.contactAddress, label: lang === "ar" ? "العنوان" : lang === "fr" ? "Adresse" : "Address", testId: "text-contact-address" },
  ].filter(item => item.value);

  return (
    <div className="store-page">
      <section className="py-16 text-center" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 brand-name" data-testid="text-contact-title">
            {t("contact.title")}
          </h1>
          <div className="gold-divider w-16 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            {lang === "ar" ? "نحن هنا لمساعدتك — تواصل معنا بأي وقت" : lang === "fr" ? "Nous sommes là pour vous aider — contactez-nous à tout moment" : "We're here to help — reach out anytime"}
          </p>
        </div>
      </section>

      <section className="py-16" style={{ background: "#FAF6EE" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {content.body && (
                <div className="store-card-premium rounded-xl p-6 mb-4 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.body }} />
              )}
              {contactItems.map((item, i) => (
                <div key={i} className="store-card-premium flex items-center gap-4 p-5 rounded-xl">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                    <item.icon className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{item.label}</p>
                    <p className="font-semibold mt-0.5" style={{ color: primaryColor }} data-testid={item.testId}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="store-card-premium rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}15)` }}>
                  <MessageCircle className="h-8 w-8" style={{ color: accentColor }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: primaryColor }}>
                  {lang === "ar" ? "مساعد لمجيبة الذكي" : lang === "fr" ? "Assistant LIMJIBA" : "LIMJIBA Assistant"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {lang === "ar" ? "تحدث مع مساعدنا الذكي للحصول على مساعدة فورية" : lang === "fr" ? "Discutez avec notre assistant pour une aide instantanée" : "Chat with our smart assistant for instant help"}
                </p>
              </div>
              {socialLinks.whatsapp && (
                <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="store-card-premium rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-green-50">
                      <SiWhatsapp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: primaryColor }}>WhatsApp</p>
                      <p className="text-sm text-gray-500">{lang === "ar" ? "تواصل معنا عبر واتساب" : lang === "fr" ? "Contactez-nous sur WhatsApp" : "Contact us on WhatsApp"}</p>
                    </div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
