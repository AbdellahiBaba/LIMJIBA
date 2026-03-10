import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Check, ArrowLeft, Loader2, Package, Upload, Copy, CheckCircle2, Wallet, ImageIcon, UserPlus, ShieldCheck, Bell, Zap, ArrowRight } from "lucide-react";
import type { StoreSettings, PaymentWallet } from "@shared/schema";

export default function StoreCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const { t, lang } = useStoreLanguage();
  const { customer, isAuthenticated } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", customerAddress: "", notes: "" });
  const [selectedWallet, setSelectedWallet] = useState<PaymentWallet | null>(null);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [guestContinue, setGuestContinue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated && customer) {
      setForm(f => ({
        ...f,
        customerName: f.customerName || customer.fullName || "",
        customerEmail: f.customerEmail || customer.email || "",
        customerPhone: f.customerPhone || customer.phone || "",
        customerAddress: f.customerAddress || customer.address || "",
      }));
    }
  }, [isAuthenticated, customer]);

  const searchParams = new URLSearchParams(window.location.search);
  const promoCode = searchParams.get("promo") || "";

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#1B2D4A";
  const accentColor = settings?.accentColor || "#96823A";
  const currency = t("currency");

  const { data: wallets } = useQuery<PaymentWallet[]>({ queryKey: ["/api/store/wallets"] });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const copyWalletNumber = () => {
    if (!selectedWallet) return;
    navigator.clipboard.writeText(selectedWallet.walletNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWalletDisplayName = (w: PaymentWallet) => {
    if (lang === "ar" && w.nameAr) return w.nameAr;
    if (lang === "fr" && w.nameFr) return w.nameFr;
    return w.name;
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
          promoCode: promoCode || undefined,
          paymentMethod: selectedWallet?.name || null,
          paymentProof: paymentProof || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to place order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOrderPlaced({ orderNumber: data.orderNumber, total: data.total });
      clearCart();
    },
  });

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
          <Check className="h-10 w-10" style={{ color: accentColor }} />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: primaryColor }} data-testid="text-order-success">{t("checkout.orderPlaced")}</h1>
        <p className="text-gray-600 mb-2">{t("checkout.orderNumber")}: <strong>{orderPlaced.orderNumber}</strong></p>
        <p className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{orderPlaced.total.toFixed(2)} {currency}</p>
        <p className="text-gray-500 mb-8">{t("checkout.orderSuccess")}</p>
        <div className="flex gap-4 justify-center">
          <Link href="/store/orders">
            <Button variant="outline" className="rounded-full" data-testid="button-track-order">{t("checkout.trackOrder")}</Button>
          </Link>
          <Link href="/store">
            <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }} data-testid="button-continue-shopping">{t("checkout.continueShopping")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-500 mb-4">{t("cart.empty")}</h2>
        <Link href="/store/products">
          <Button className="rounded-full" style={{ backgroundColor: accentColor, color: primaryColor }}>{t("home.shopNow")}</Button>
        </Link>
      </div>
    );
  }

  if (!isAuthenticated && !guestContinue) {
    const benefitItems = [
      { icon: ShieldCheck, text: t("checkout.benefitTracking") },
      { icon: Zap, text: t("checkout.benefitFaster") },
      { icon: Bell, text: t("checkout.benefitNotifications") },
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/store/cart">
          <Button variant="ghost" size="sm" className="mb-6 rounded-full" data-testid="button-back-cart">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("cart.title")}
          </Button>
        </Link>

        <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, #0D1520)` }}>
            <UserPlus className="h-12 w-12 mx-auto text-white/80 mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">{t("checkout.accountPromptTitle")}</h2>
            <p className="text-white/70 text-sm">{t("checkout.accountPromptSubtitle")}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: primaryColor }}>{t("checkout.accountBenefits")}</h3>
              {benefitItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                    <item.icon className="h-4 w-4" style={{ color: accentColor }} />
                  </div>
                  <span className="text-sm text-gray-600">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Link href="/store/signup?redirect=checkout">
                <Button
                  className="w-full rounded-full font-semibold text-sm"
                  size="lg"
                  style={{ backgroundColor: accentColor, color: primaryColor }}
                  data-testid="button-create-account-checkout"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("checkout.createAccount")}
                </Button>
              </Link>

              <button
                onClick={() => setGuestContinue(true)}
                className="w-full text-center text-sm py-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-600"
                data-testid="button-continue-guest"
              >
                {t("checkout.continueGuest")}
                <ArrowRight className="h-4 w-4 inline ml-1" />
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              {t("checkout.alreadyHaveAccount")}{" "}
              <Link href="/store/login?redirect=checkout" className="font-semibold hover:underline" style={{ color: primaryColor }}>
                {t("nav.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = form.customerName && form.customerPhone && form.customerAddress && selectedWallet && paymentProof;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/store/cart">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full" data-testid="button-back-cart">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("cart.title")}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-8" style={{ color: primaryColor }} data-testid="text-checkout-title">
        <ShoppingBag className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {t("checkout.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>{t("checkout.customerInfo")}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("checkout.fullName")} *</Label>
                <Input id="name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-name" />
              </div>
              <div>
                <Label htmlFor="email">{t("checkout.email")}</Label>
                <Input id="email" type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-email" />
              </div>
              <div>
                <Label htmlFor="phone">{t("checkout.phone")} *</Label>
                <Input id="phone" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-phone" />
              </div>
              <div>
                <Label htmlFor="address">{t("checkout.address")} *</Label>
                <Textarea id="address" value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} className="rounded-lg mt-1" data-testid="input-customer-address" />
              </div>
              <div>
                <Label htmlFor="notes">{t("checkout.notes")}</Label>
                <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-lg mt-1" data-testid="input-order-notes" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold mb-2" style={{ color: primaryColor }}>
              <Wallet className="inline h-5 w-5 mr-2" style={{ color: accentColor }} />
              {t("payment.title")}
            </h3>
            <p className="text-sm text-gray-500 mb-5">{t("payment.subtitle")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {wallets?.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWallet(w); setCopied(false); }}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                    selectedWallet?.id === w.id ? "shadow-md" : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={selectedWallet?.id === w.id ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : {}}
                  data-testid={`wallet-${w.iconType}`}
                >
                  {selectedWallet?.id === w.id && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4" style={{ color: accentColor }} />
                  )}
                  <div className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Wallet className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                  <p className="font-bold text-sm" style={{ color: primaryColor }}>{getWalletDisplayName(w)}</p>
                </button>
              ))}
            </div>

            {selectedWallet && (
              <div className="rounded-lg border p-4 mb-5" style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}>
                <p className="text-xs text-gray-500 mb-1">{t("payment.transferTo")} <strong>{getWalletDisplayName(selectedWallet)}</strong></p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-mono font-bold tracking-wider" style={{ color: primaryColor }} data-testid="text-wallet-number">
                    {selectedWallet.walletNumber}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-7 px-3"
                    onClick={copyWalletNumber}
                    data-testid="button-copy-wallet"
                  >
                    {copied ? <><CheckCircle2 className="h-3 w-3 mr-1" />{t("payment.copied")}</> : <><Copy className="h-3 w-3 mr-1" />{t("payment.copyNumber")}</>}
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold mb-2 block">{t("payment.uploadProof")}</Label>
              <p className="text-xs text-gray-500 mb-3">{t("payment.uploadHint")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-payment-proof"
              />
              {paymentProof ? (
                <div className="rounded-lg border overflow-hidden">
                  <img src={paymentProof} alt="Payment proof" className="w-full max-h-48 object-contain bg-gray-50" data-testid="img-payment-proof" />
                  <div className="p-2 flex items-center justify-between bg-gray-50 border-t">
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {t("payment.proofUploaded")}
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => fileInputRef.current?.click()} data-testid="button-change-proof">
                      {t("payment.changeProof")}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 p-8 text-center transition-colors"
                  data-testid="button-upload-proof"
                >
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">{t("payment.uploadProof")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("payment.uploadHint")}</p>
                </button>
              )}
            </div>

            {!paymentProof && selectedWallet && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {t("payment.required")}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-xl border bg-white shadow-sm p-6 sticky top-24" data-testid="section-checkout-summary">
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>{t("checkout.summary")}</h3>
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                  <span className="font-semibold">{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("cart.subtotal")}</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} {currency}</span>
                </div>
              </div>
              {selectedWallet && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("orders.paymentMethod")}</span>
                  <span className="font-semibold">{getWalletDisplayName(selectedWallet)}</span>
                </div>
              )}
            </div>

            {placeOrder.isError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm" data-testid="text-checkout-error">
                {placeOrder.error.message}
              </div>
            )}

            <Button
              className="w-full rounded-full font-semibold"
              size="lg"
              style={{ backgroundColor: canSubmit ? accentColor : "#ccc", color: canSubmit ? primaryColor : "#666" }}
              onClick={() => placeOrder.mutate()}
              disabled={placeOrder.isPending || !canSubmit}
              data-testid="button-place-order"
            >
              {placeOrder.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {t("checkout.placing")}</> : <>{t("checkout.placeOrder")}</>}
            </Button>
            {!canSubmit && (
              <p className="text-xs text-center text-gray-400 mt-2">
                {!selectedWallet ? t("payment.selectWallet") : !paymentProof ? t("payment.required") : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
