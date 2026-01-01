import { createContext, useContext, useState, useEffect, useCallback } from "react";
import frTranslations from "../locales/fr.json";
import arTranslations from "../locales/ar.json";

type Language = "fr" | "ar";
type InvoiceLanguage = "fr" | "ar" | "bilingual";

interface CompanyInfo {
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  address: string;
  artisanNumber: string;
  articleNumber: string;
  fiscalNumber: string;
  phone: string;
  email: string;
  website: string;
}

interface BrandingSettings {
  logo: string | null;
  watermark: string | null;
  enableWatermark: boolean;
  useLogoAsWatermark: boolean;
  watermarkOpacity: number;
  logoPosition: "left" | "center" | "right";
  primaryColor: string;
  accentColor: string;
  invoiceLanguage: InvoiceLanguage;
  companyInfo: CompanyInfo;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  branding: BrandingSettings;
  updateBranding: (settings: Partial<BrandingSettings>) => void;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "POLY FLECTA PLASTICA",
  nameAr: "بولي فليكتا بلاستيكا",
  tagline: "FABRICATION D'EMBALLAGE EN PLASTIQUE",
  taglineAr: "تصنيع عبوات بلاستيكية",
  address: "Village Zaitout, Hammam Dalaa - M'sila",
  artisanNumber: "28/00 - 2896688A24",
  articleNumber: "",
  fiscalNumber: "",
  phone: "+213 6 70 04 91 24",
  email: "contact@polyflectaplastica.com",
  website: "www.polyflectaplastica.com",
};

const defaultBranding: BrandingSettings = {
  logo: null,
  watermark: null,
  enableWatermark: false,
  useLogoAsWatermark: true,
  watermarkOpacity: 0.12,
  logoPosition: "left",
  primaryColor: "#1976D2",
  accentColor: "#42A5F5",
  invoiceLanguage: "fr",
  companyInfo: defaultCompanyInfo,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, typeof frTranslations> = {
  fr: frTranslations,
  ar: arTranslations,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "fr";
  });

  const [branding, setBranding] = useState<BrandingSettings>(() => {
    const saved = localStorage.getItem("app-branding");
    if (saved) {
      try {
        return { ...defaultBranding, ...JSON.parse(saved) };
      } catch {
        return defaultBranding;
      }
    }
    return defaultBranding;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const updateBranding = useCallback((settings: Partial<BrandingSettings>) => {
    setBranding((prev) => {
      const updated = { 
        ...prev, 
        ...settings,
        companyInfo: settings.companyInfo 
          ? { ...prev.companyInfo, ...settings.companyInfo }
          : prev.companyInfo
      };
      localStorage.setItem("app-branding", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: unknown = translations[language];
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      return typeof value === "string" ? value : key;
    },
    [language]
  );

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
    
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [isRTL, language]);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", branding.primaryColor);
    document.documentElement.style.setProperty("--brand-accent", branding.accentColor);
  }, [branding.primaryColor, branding.accentColor]);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, isRTL, branding, updateBranding }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useBranding() {
  const { branding, updateBranding } = useLanguage();
  return { branding, updateBranding };
}
