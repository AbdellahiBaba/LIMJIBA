import { useStoreLanguage } from "@/components/store-layout";
import { FileText } from "lucide-react";
import type { StoreSettings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function StoreTerms() {
  const { t, lang } = useStoreLanguage();
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const terms = {
    en: [
      { title: "1. General", body: "By using LIMJIBA, you agree to these terms and conditions. All prices are displayed in MRU (Mauritanian Ouguiya). We reserve the right to update these terms at any time." },
      { title: "2. Orders & Payments", body: "Orders are confirmed upon receipt of payment. We accept mobile wallet payments (Bankily, Masrvi, Sedad) and bank transfers. Payment proof must be uploaded for order processing." },
      { title: "3. Shipping & Delivery", body: "We deliver across Mauritania. Delivery times vary by location and product availability. Shipping costs are calculated at checkout based on your location." },
      { title: "4. Returns & Refunds", body: "Returns are accepted within 7 days of delivery for unused items in their original packaging. Refunds are processed within 5 business days after the return is approved." },
      { title: "5. Privacy & Data", body: "We protect your personal information and never share your data with third parties without your consent. Your payment information is handled securely." },
      { title: "6. Contact", body: "For any questions regarding these terms, please contact us at support@limjiba.com." },
    ],
    fr: [
      { title: "1. Général", body: "En utilisant LIMJIBA, vous acceptez ces conditions générales. Tous les prix sont affichés en MRU (Ouguiya Mauritanien). Nous nous réservons le droit de mettre à jour ces conditions à tout moment." },
      { title: "2. Commandes & Paiements", body: "Les commandes sont confirmées dès réception du paiement. Nous acceptons les paiements par portefeuille mobile (Bankily, Masrvi, Sedad) et virements bancaires. La preuve de paiement doit être téléchargée pour le traitement de la commande." },
      { title: "3. Expédition & Livraison", body: "Nous livrons dans toute la Mauritanie. Les délais de livraison varient selon la localisation et la disponibilité des produits. Les frais de livraison sont calculés au moment du paiement." },
      { title: "4. Retours & Remboursements", body: "Les retours sont acceptés dans les 7 jours suivant la livraison pour les articles non utilisés dans leur emballage d'origine. Les remboursements sont traités sous 5 jours ouvrables." },
      { title: "5. Confidentialité", body: "Nous protégeons vos informations personnelles et ne partageons jamais vos données avec des tiers sans votre consentement." },
      { title: "6. Contact", body: "Pour toute question concernant ces conditions, veuillez nous contacter à support@limjiba.com." },
    ],
    ar: [
      { title: "١. أحكام عامة", body: "باستخدامكم لمنصة لمجيبة، فإنّكم توافقون على هذه الشروط والأحكام. جميع الأسعار معروضة بالأوقية الموريتانية (MRU). نحتفظ بحقّ تحديث هذه الشروط في أيّ وقت." },
      { title: "٢. الطلبات والمدفوعات", body: "يتمّ تأكيد الطلبات فور استلام الدفع. نقبل الدفع عبر المحافظ الإلكترونية (بنكيلي، مصرفي، سداد) والتحويلات البنكية. يجب رفع إثبات الدفع لمعالجة الطلب." },
      { title: "٣. الشحن والتوصيل", body: "نوصل الطلبات إلى جميع أنحاء موريتانيا. تختلف مدّة التوصيل حسب الموقع وتوفّر المنتجات. تُحسب تكاليف الشحن عند إتمام الطلب بناءً على موقعكم." },
      { title: "٤. الإرجاع والاسترداد", body: "يُقبل إرجاع المنتجات خلال ٧ أيام من التوصيل، شرط أن تكون غير مستخدمة وفي تغليفها الأصلي. تتمّ معالجة المبالغ المستردّة خلال ٥ أيام عمل بعد الموافقة على الإرجاع." },
      { title: "٥. الخصوصية وحماية البيانات", body: "نحمي معلوماتكم الشخصية ولا نشارك بياناتكم مع أطراف ثالثة دون موافقتكم. يتمّ التعامل مع معلومات الدفع بشكل آمن تماماً." },
      { title: "٦. التواصل", body: "لأيّ استفسار حول هذه الشروط، يُرجى التواصل معنا عبر support@limjiba.com." },
    ],
  };

  const sections = terms[lang as keyof typeof terms] || terms.en;

  return (
    <div className="store-page">
      <section className="py-16 text-center" style={{ background: `linear-gradient(160deg, ${primaryColor}, #0D1520)` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FileText className="h-10 w-10 mx-auto mb-4" style={{ color: accentColor }} />
          <h1 className={`text-3xl md:text-4xl font-bold text-white mb-4 ${lang === "ar" ? "store-heading-ar" : "brand-name"}`} data-testid="text-terms-title">
            {t("terms.title")}
          </h1>
          <div className="gold-divider w-16 mx-auto" />
        </div>
      </section>

      <section className="py-14" style={{ background: "#FAF6EE" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="store-card-premium rounded-xl p-6">
              <h3 className={`text-lg font-bold mb-3 ${lang === "ar" ? "store-heading-ar" : ""}`} style={{ color: primaryColor }}>
                {section.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
