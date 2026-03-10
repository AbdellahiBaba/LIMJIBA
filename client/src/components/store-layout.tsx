import { useState, createContext, useContext, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { ShoppingCart, Menu, X, Home, Package, Phone, Info, FileText, Globe, User, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoreSettings } from "@shared/schema";
import { type StoreLanguage, getStoreTranslation } from "@/locales/store";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

interface StoreLanguageContextType {
  lang: StoreLanguage;
  setLang: (l: StoreLanguage) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const StoreLanguageContext = createContext<StoreLanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  isRtl: false,
});

export function useStoreLanguage() {
  return useContext(StoreLanguageContext);
}

export function StoreLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<StoreLanguage>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("store-language") as StoreLanguage) || "en";
    }
    return "en";
  });

  const setLang = (l: StoreLanguage) => {
    setLangState(l);
    localStorage.setItem("store-language", l);
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return () => { document.documentElement.dir = "ltr"; };
  }, [lang]);

  const t = (key: string) => getStoreTranslation(lang, key);
  const isRtl = lang === "ar";

  return (
    <StoreLanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </StoreLanguageContext.Provider>
  );
}

const NAV_KEYS = [
  { path: "/store", key: "nav.home", icon: Home },
  { path: "/store/products", key: "nav.products", icon: Package },
  { path: "/store/orders", key: "nav.trackOrder", icon: Search },
  { path: "/store/about", key: "nav.about", icon: Info },
  { path: "/store/contact", key: "nav.contact", icon: Phone },
  { path: "/store/terms", key: "nav.terms", icon: FileText },
];

const LANG_OPTIONS: { code: StoreLanguage; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "عر" },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { lang, setLang, t } = useStoreLanguage();
  const { customer, isAuthenticated, logout } = useStoreAuth();

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const storeName = settings?.storeName || "LEMJIBA";
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";

  return (
    <div className="min-h-screen flex flex-col store-theme" dir={lang === "ar" ? "rtl" : "ltr"} style={{ "--store-primary": primaryColor, "--store-accent": accentColor } as React.CSSProperties}>
      <header className="store-header sticky top-0 z-50 border-b border-black/20" style={{ background: `linear-gradient(135deg, ${primaryColor}, #0A1628)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/store" className="flex items-center gap-3 text-white no-underline" data-testid="link-store-home">
              <img src={logoImg} alt={storeName} className="h-10 w-10 rounded-md object-contain bg-white/10 p-0.5" />
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-extrabold tracking-widest uppercase brand-name">{storeName}</span>
                <span className="text-[10px] font-medium tracking-wide opacity-70 brand-name-ar">لمجيبه</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1" data-testid="nav-store-desktop">
              {NAV_KEYS.map(item => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white/80 hover:text-white hover:bg-white/10 ${location === item.path ? "bg-white/15 text-white" : ""}`}
                    data-testid={`link-store-${item.key}`}
                  >
                    {t(item.key)}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-0.5 bg-white/10 rounded-md p-0.5" data-testid="store-language-switcher">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => setLang(opt.code)}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${lang === opt.code ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}
                    data-testid={`lang-${opt.code}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-1">
                  <Link href="/store/profile">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="link-store-profile">
                      <User className="h-4 w-4 mr-1" />
                      <span className="max-w-[80px] truncate text-xs">{customer?.fullName?.split(" ")[0]}</span>
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" onClick={logout} data-testid="button-store-logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1">
                  <Link href="/store/login">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="link-store-login">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/store/signup">
                    <Button size="sm" className="text-xs font-semibold" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="link-store-signup">
                      {t("nav.signup")}
                    </Button>
                  </Link>
                </div>
              )}

              <Link href="/store/cart">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative" data-testid="link-store-cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce-once" style={{ backgroundColor: accentColor, color: primaryColor }}>
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-store-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10" data-testid="nav-store-mobile">
            <div className="px-4 py-3 space-y-1">
              {NAV_KEYS.map(item => (
                <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-white/80 hover:text-white hover:bg-white/10 ${location === item.path ? "bg-white/15 text-white" : ""}`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {t(item.key)}
                  </Button>
                </Link>
              ))}
              <div className="flex items-center gap-1 pt-2 border-t border-white/10">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => { setLang(opt.code); setMobileMenuOpen(false); }}
                    className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${lang === opt.code ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {isAuthenticated ? (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <Link href="/store/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10">
                      <User className="h-4 w-4 mr-2" />
                      {t("nav.profile")}
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <Link href="/store/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/store/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10">
                      {t("nav.signup")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t text-gray-300" style={{ background: "#0A1628" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logoImg} alt={storeName} className="h-8 w-8 rounded object-contain" />
                <h3 className="text-lg font-extrabold tracking-widest uppercase brand-name" style={{ color: accentColor }}>{storeName}</h3>
              </div>
              <p className="text-xs tracking-wide opacity-60 brand-name-ar mb-2">لمجيبه</p>
              <p className="text-sm text-gray-400">{settings?.storeDescription || "Your premium e-commerce destination."}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">{t("footer.quickLinks")}</h4>
              <div className="space-y-2">
                {NAV_KEYS.map(item => (
                  <Link key={item.path} href={item.path} className="block text-sm text-gray-400 hover:text-white no-underline">
                    {t(item.key)}
                  </Link>
                ))}
                <Link href="/store/orders" className="block text-sm text-gray-400 hover:text-white no-underline">{t("footer.trackOrder")}</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">{t("footer.contact")}</h4>
              {settings?.contactEmail && <p className="text-sm text-gray-400">{settings.contactEmail}</p>}
              {settings?.contactPhone && <p className="text-sm text-gray-400">{settings.contactPhone}</p>}
              {settings?.contactAddress && <p className="text-sm text-gray-400">{settings.contactAddress}</p>}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700/50 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {storeName} / لمجيبه. {t("footer.rights")}.
          </div>
        </div>
      </footer>
    </div>
  );
}
