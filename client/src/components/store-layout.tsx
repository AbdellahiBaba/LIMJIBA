import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCart } from "@/contexts/cart-context";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { ShoppingCart, Menu, Home, Package, Phone, Info, FileText, Globe, User, LogOut, Search, Bell, ChevronRight, Award, CheckCheck } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiSnapchat, SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { StoreSettings, StoreNotification } from "@shared/schema";
import { type StoreLanguage, getStoreTranslation } from "@/locales/store";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png";
import aegisai360LogoPath from "@assets/aegisai360_logo.svg";

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

function detectBrowserLanguage(): StoreLanguage {
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage || "en";
    const code = browserLang.toLowerCase().split("-")[0];
    if (code === "ar") return "ar";
    if (code === "fr") return "fr";
    return "en";
  } catch {
    return "en";
  }
}

export function StoreLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<StoreLanguage>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("store-language") as StoreLanguage;
      if (stored) return stored;
      const detected = detectBrowserLanguage();
      localStorage.setItem("store-language", detected);
      return detected;
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
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useCart();
  const { lang, setLang, t } = useStoreLanguage();
  const { customer, isAuthenticated, logout } = useStoreAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const { data: notifications } = useQuery<StoreNotification[]>({
    queryKey: ["/api/store/notifications"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/store/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/store/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/notifications"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const storeName = settings?.storeName || "LIMJIBA";
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  return (
    <div className="min-h-screen flex flex-col store-theme" dir={lang === "ar" ? "rtl" : "ltr"} style={{ "--store-primary": primaryColor, "--store-accent": accentColor } as React.CSSProperties}>
      <header
        className="store-header sticky top-0 z-50 will-change-[backdrop-filter,box-shadow]"
        style={{
          background: scrolled
            ? `linear-gradient(135deg, rgba(10,22,40,0.99), rgba(6,11,20,0.99))`
            : `linear-gradient(135deg, rgba(10,22,40,0.97), rgba(6,11,20,0.98))`,
          borderBottom: "1px solid rgba(201,168,76,0.15)",
          backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
          boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.3), 0 1px 0 rgba(201,168,76,0.1)" : "none",
          transition: "all 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-400 ${scrolled ? "h-14" : "h-16 md:h-18"}`}>
            <Link href="/store" className="flex items-center gap-3 text-white no-underline group" data-testid="link-store-home">
              <div className="relative rounded-xl overflow-hidden transition-transform group-hover:scale-105" style={{ background: "#FAF6EE", boxShadow: "0 0 16px rgba(201,168,76,0.3), 0 2px 8px rgba(0,0,0,0.2)", padding: "3px" }}>
                <img src={logoImg} alt={storeName} className="h-12 w-12 md:h-14 md:w-14 rounded-lg object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg md:text-xl brand-name brand-glow" data-text={storeName}>{storeName}</span>
                <span className="text-[10px] brand-name-ar" style={{ opacity: 0.75 }}>لمجيبة</span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5" data-testid="nav-store-desktop">
              {NAV_KEYS.map(item => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-sm font-medium transition-all duration-200 ${location === item.path ? "text-white" : "text-white/60 hover:text-white"}`}
                    style={location === item.path ? { background: "rgba(201,168,76,0.12)", color: "#C9A84C" } : {}}
                    data-testid={`link-store-${item.key}`}
                  >
                    {t(item.key)}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.12)" }} data-testid="store-language-switcher">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => setLang(opt.code)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all duration-200 ${lang === opt.code ? "text-gray-900 shadow-sm" : "text-white/50 hover:text-white/80"}`}
                    style={lang === opt.code ? { background: "#C9A84C" } : {}}
                    data-testid={`lang-${opt.code}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-0.5">
                  {(customer?.loyaltyPoints ?? 0) > 0 && (
                    <Link href="/store/profile">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold cursor-pointer" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }} data-testid="badge-loyalty-points">
                        <Award className="h-3.5 w-3.5" />
                        <span>{customer?.loyaltyPoints}</span>
                      </div>
                    </Link>
                  )}
                  <Link href="/store/profile">
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5" data-testid="link-store-profile">
                      <User className="h-4 w-4 mr-1" />
                      <span className="max-w-[80px] truncate text-xs">{customer?.fullName?.split(" ")[0]}</span>
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/5" onClick={logout} data-testid="button-store-logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1">
                  <Link href="/store/login">
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5 text-xs" data-testid="link-store-login">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/store/signup">
                    <Button size="sm" className="text-xs font-semibold rounded-lg store-btn-gold" style={{ color: "#0A1628" }} data-testid="link-store-signup">
                      {t("nav.signup")}
                    </Button>
                  </Link>
                </div>
              )}

              {isAuthenticated && (
                <div className="relative" ref={notifRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/5 relative"
                    onClick={() => setNotifOpen(!notifOpen)}
                    data-testid="button-store-notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs border-0 animate-bounce-once" style={{ background: "linear-gradient(135deg, #C9A84C, #B8963F)", color: "#0A1628" }}>
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  {notifOpen && (
                    <div
                      className="absolute top-full mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border max-h-[70vh] flex flex-col"
                      style={{ background: "#0A1628", borderColor: "rgba(201,168,76,0.2)", zIndex: 9999, right: lang === "ar" ? "auto" : 0, left: lang === "ar" ? 0 : "auto" }}
                      data-testid="dropdown-notifications"
                    >
                      <div className="p-3 border-b font-semibold text-sm flex items-center justify-between shrink-0" style={{ color: "#C9A84C", borderColor: "rgba(201,168,76,0.15)" }}>
                        <span>{t("notifications.title")}</span>
                        {unreadCount > 0 && (
                          <button
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-white/10 disabled:opacity-50"
                            style={{ color: "#C9A84C" }}
                            disabled={markAllRead.isPending}
                            onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }}
                            data-testid="button-mark-all-read"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {t("notifications.markAllRead")}
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {(!notifications || notifications.length === 0) ? (
                          <div className="p-6 text-center text-sm text-gray-400">{t("notifications.empty")}</div>
                        ) : (
                          notifications.slice(0, 15).map(n => (
                            <div
                              key={n.id}
                              className={`p-3 border-b last:border-b-0 text-sm cursor-pointer transition-colors hover:bg-white/10 ${!n.isRead ? "bg-[#C9A84C]/8" : ""}`}
                              style={{ borderColor: "rgba(201,168,76,0.08)" }}
                              onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                              data-testid={`notification-${n.id}`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.isRead && (
                                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#C9A84C" }} />
                                )}
                                <div className={!n.isRead ? "" : "pl-4"}>
                                  <p className="font-medium text-white text-sm leading-snug">
                                    {lang === "ar" ? (n.titleAr || n.title) : lang === "fr" ? (n.titleFr || n.title) : n.title}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    {lang === "ar" ? (n.messageAr || n.message) : lang === "fr" ? (n.messageFr || n.message) : n.message}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-1.5">
                                    {new Date(n.createdAt ?? Date.now()).toLocaleDateString(lang === "ar" ? "ar" : lang === "fr" ? "fr" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Link href="/store/cart">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5 relative" data-testid="link-store-cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs border-0 animate-bounce-once" style={{ background: "linear-gradient(135deg, #C9A84C, #B8963F)", color: "#0A1628" }}>
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden text-white/60 hover:text-white hover:bg-white/5"
                    data-testid="button-store-mobile-menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={lang === "ar" ? "left" : "right"}
                  className="w-[300px] p-0 border-0"
                  style={{ background: "linear-gradient(180deg, #0A1628, #060B14)" }}
                  data-testid="nav-store-mobile"
                >
                  <div className="flex items-center gap-3 p-5 pb-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                    <div className="rounded-xl overflow-hidden" style={{ background: "#FAF6EE", boxShadow: "0 0 12px rgba(201,168,76,0.25)", padding: "3px" }}>
                      <img src={logoImg} alt={storeName} className="h-11 w-11 rounded-lg object-contain" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm brand-name">{storeName}</span>
                      <span className="text-[9px] brand-name-ar" style={{ opacity: 0.65 }}>لمجيبة</span>
                    </div>
                  </div>
                  <div className="px-3 py-4 space-y-1">
                    {NAV_KEYS.map(item => (
                      <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start ${location === item.path ? "text-white" : "text-white/60 hover:text-white"}`}
                          style={location === item.path ? { background: "rgba(201,168,76,0.1)", color: "#C9A84C" } : {}}
                        >
                          <item.icon className="h-4 w-4 mr-2" style={{ color: location === item.path ? "#C9A84C" : undefined }} />
                          {t(item.key)}
                          <ChevronRight className="h-4 w-4 ml-auto opacity-30" />
                        </Button>
                      </Link>
                    ))}
                    <div className="flex items-center gap-1 pt-4 mt-2" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                      {LANG_OPTIONS.map(opt => (
                        <button
                          key={opt.code}
                          onClick={() => { setLang(opt.code); setMobileMenuOpen(false); }}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${lang === opt.code ? "text-gray-900" : "text-white/50 hover:text-white"}`}
                          style={lang === opt.code ? { background: "#C9A84C" } : {}}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {isAuthenticated ? (
                      <div className="pt-4 space-y-1" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                        <Link href="/store/profile" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white">
                            <User className="h-4 w-4 mr-2" />
                            {t("nav.profile")}
                          </Button>
                        </Link>
                        <Button variant="ghost" className="w-full justify-start text-white/40 hover:text-white" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                          <LogOut className="h-4 w-4 mr-2" />
                          {t("nav.logout")}
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-4 space-y-1" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                        <Link href="/store/login" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white">
                            {t("nav.login")}
                          </Button>
                        </Link>
                        <Link href="/store/signup" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="w-full store-btn-gold font-semibold" style={{ color: "#0A1628" }}>
                            {t("nav.signup")}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1" style={{ background: "#FAF6EE" }}>
        {children}
      </main>
      <PwaInstallPrompt />

      <footer style={{ background: "#060B14" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl overflow-hidden" style={{ background: "#FAF6EE", boxShadow: "0 0 16px rgba(201,168,76,0.3), 0 2px 8px rgba(0,0,0,0.2)", padding: "3px" }}>
                  <img src={logoImg} alt={storeName} className="h-12 w-12 rounded-lg object-contain" />
                </div>
                <div>
                  <h3 className="text-lg brand-name brand-glow" data-text={storeName}>{storeName}</h3>
                  <p className="text-xs brand-name-ar" style={{ opacity: 0.65 }}>لمجيبة</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{(() => {
                try {
                  if (settings?.footerDescription) {
                    const fd = JSON.parse(settings.footerDescription);
                    if (fd[lang]) return fd[lang];
                  }
                } catch {}
                return settings?.storeDescription || (lang === "ar" ? "وجهتكم المتميّزة للتسوّق الفاخر" : lang === "fr" ? "Votre destination premium pour le shopping en ligne" : "Your premium e-commerce destination");
              })()}</p>
              <div className="gold-divider w-16 mt-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "#C9A84C" }}>{t("footer.quickLinks")}</h4>
              <div className="space-y-2.5">
                {NAV_KEYS.map(item => (
                  <Link key={item.path} href={item.path} className="block text-sm text-gray-400 hover:text-white no-underline transition-colors">
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "#C9A84C" }}>{t("footer.contact")}</h4>
              <p className="text-sm text-gray-400 mb-1">
                <a href={`mailto:${settings?.contactEmail || "support@limjiba.com"}`} className="hover:text-white transition-colors">{settings?.contactEmail || "support@limjiba.com"}</a>
              </p>
              {settings?.contactPhone && <p className="text-sm text-gray-400 mb-1">{settings.contactPhone}</p>}
              {settings?.contactAddress && <p className="text-sm text-gray-400 mb-1">{settings.contactAddress}</p>}
              {(() => {
                let socialLinks: Record<string, string> = {};
                try { socialLinks = JSON.parse(settings?.socialLinks || "{}"); } catch { socialLinks = {}; }
                const socialItems = [
                  { key: "whatsapp", icon: SiWhatsapp, label: "WhatsApp", hoverColor: "#25D366" },
                  { key: "instagram", icon: SiInstagram, label: "Instagram", hoverColor: "#E4405F" },
                  { key: "facebook", icon: SiFacebook, label: "Facebook", hoverColor: "#1877F2" },
                  { key: "snapchat", icon: SiSnapchat, label: "Snapchat", hoverColor: "#FFFC00" },
                  { key: "tiktok", icon: SiTiktok, label: "TikTok", hoverColor: "#FF0050" },
                ].filter(item => {
                  const url = socialLinks[item.key]?.trim();
                  return url && (url.startsWith("https://") || url.startsWith("http://"));
                });
                if (socialItems.length === 0) return null;
                return (
                  <div className="flex items-center gap-4 mt-5" data-testid="footer-social-links">
                    <span className="text-xs text-[#C9A84C]/60 uppercase tracking-widest font-semibold">{t("footer.followUs")}</span>
                    {socialItems.map(item => (
                      <a
                        key={item.key}
                        href={socialLinks[item.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 transition-all duration-300 hover:scale-110 hover:drop-shadow-lg focus-visible:scale-110 focus-visible:outline-none"
                        aria-label={item.label}
                        data-testid={`link-social-${item.key}`}
                        onMouseEnter={e => (e.currentTarget.style.color = item.hoverColor)}
                        onMouseLeave={e => (e.currentTarget.style.color = "")}
                        onFocus={e => (e.currentTarget.style.color = item.hoverColor)}
                        onBlur={e => (e.currentTarget.style.color = "")}
                      >
                        <item.icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="mt-10 pt-8 text-center text-sm text-gray-500" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
            <div>&copy; {new Date().getFullYear()} {storeName} / لمجيبة. {t("footer.rights")}.</div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className="text-xs text-gray-400">Powered by</span>
              <a href="https://aegisai360.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ color: "#d4a520" }} data-testid="link-aegisai360">
                <img src={aegisai360LogoPath} alt="AegisAI360" className="h-4 w-4" />
                AegisAI360
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
