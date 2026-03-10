import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreLanguage } from "@/components/store-layout";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

const texts = {
  en: {
    title: "Install LIMJIBA",
    subtitle: "Get a faster, app-like experience on your device",
    install: "Install",
    notNow: "Not now",
    iosTitle: "Install LIMJIBA",
    iosStep1: "Tap the Share button",
    iosStep2: "Select \"Add to Home Screen\"",
    iosClose: "Got it",
  },
  fr: {
    title: "Installer LIMJIBA",
    subtitle: "Profitez d'une expérience plus rapide sur votre appareil",
    install: "Installer",
    notNow: "Pas maintenant",
    iosTitle: "Installer LIMJIBA",
    iosStep1: "Appuyez sur le bouton Partager",
    iosStep2: "Sélectionnez \"Sur l'écran d'accueil\"",
    iosClose: "Compris",
  },
  ar: {
    title: "تثبيت لمجيبة",
    subtitle: "احصل على تجربة أسرع تشبه التطبيق على جهازك",
    install: "تثبيت",
    notNow: "ليس الآن",
    iosTitle: "تثبيت لمجيبة",
    iosStep1: "اضغط على زر المشاركة",
    iosStep2: "اختر \"إضافة إلى الشاشة الرئيسية\"",
    iosClose: "فهمت",
  },
};

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function isDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const { lang } = useStoreLanguage();
  const t = texts[lang] || texts.en;

  useEffect(() => {
    if (isInStandaloneMode() || isDismissed()) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const timer = setTimeout(() => {
      if (isIOS() && !isInStandaloneMode() && !isDismissed()) {
        setShowIosInstructions(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosInstructions(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (showIosInstructions) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-4" data-testid="pwa-ios-prompt">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="LIMJIBA" className="h-10 w-10 rounded-lg object-contain" />
              <h3 className="font-bold text-[#1B2D4A]">{t.iosTitle}</h3>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600" data-testid="button-dismiss-pwa">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p className="flex items-center gap-2">
              <Share className="h-4 w-4 text-[#96823A]" />
              1. {t.iosStep1}
            </p>
            <p className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[#96823A]" />
              2. {t.iosStep2}
            </p>
          </div>
          <Button onClick={handleDismiss} className="w-full rounded-full" style={{ backgroundColor: "#96823A", color: "#1B2D4A" }} data-testid="button-ios-close">
            {t.iosClose}
          </Button>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4" data-testid="pwa-install-prompt">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="LIMJIBA" className="h-12 w-12 rounded-lg object-contain" />
            <div>
              <h3 className="font-bold text-[#1B2D4A]">{t.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600" data-testid="button-dismiss-pwa">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={handleDismiss} className="flex-1 rounded-full text-sm" data-testid="button-pwa-not-now">
            {t.notNow}
          </Button>
          <Button onClick={handleInstall} className="flex-1 rounded-full text-sm font-semibold" style={{ backgroundColor: "#96823A", color: "#1B2D4A" }} data-testid="button-pwa-install">
            <Download className="h-4 w-4 mr-1" />
            {t.install}
          </Button>
        </div>
      </div>
    </div>
  );
}
