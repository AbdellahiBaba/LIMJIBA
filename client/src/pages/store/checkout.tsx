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
import { ShoppingBag, Check, ArrowLeft, Loader2, Package, Upload, Copy, CheckCircle2, Wallet, ImageIcon, UserPlus, ShieldCheck, Bell, Zap, ArrowRight, Award, Gift, Minus, Plus } from "lucide-react";
import type { StoreSettings, PaymentWallet } from "@shared/schema";

export default function StoreCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const { t, lang } = useStoreLanguage();
  const { customer, isAuthenticated, isLoading: authLoading } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: string; total: number; pointsEarned: number } | null>(null);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", customerAddress: "", notes: "" });
  const [selectedWallet, setSelectedWallet] = useState<PaymentWallet | null>(null);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [guestContinue, setGuestContinue] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
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

  const lastSyncedEmailRef = useRef("");
  useEffect(() => {
    const email = isAuthenticated ? customer?.email : form.customerEmail;
    if (!email || !email.includes("@") || items.length === 0 || orderPlaced) return;
    if (lastSyncedEmailRef.current === email) return;
    const timer = setTimeout(() => {
      lastSyncedEmailRef.current = email;
      fetch("/api/store/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          customerName: form.customerName || customer?.fullName,
          language: lang,
          items: items.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.unitPrice, quantity: i.quantity })),
        }),
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, customer, form.customerEmail, items, lang, orderPlaced]);

  const searchParams = new URLSearchParams(window.location.search);
  const promoCode = searchParams.get("promo") || "";

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";
  const currency = t("currency");
  const pointsValue = (settings as any)?.pointsValue ?? 1;
  const pointsRate = (settings as any)?.pointsRate ?? 0.1;

  const { data: wallets } = useQuery<PaymentWallet[]>({ queryKey: ["/api/store/wallets"] });

  const availablePoints = isAuthenticated ? ((customer as any)?.loyaltyPoints || 0) : 0;
  const maxRedeemable = Math.min(availablePoints, Math.floor(subtotal * 0.5 / pointsValue));
  const loyaltyDiscount = usePoints ? Math.round(pointsToRedeem * pointsValue * 100) / 100 : 0;
  const orderTotal = Math.max(0, subtotal - loyaltyDiscount);
  const projectedPoints = Math.floor(orderTotal * pointsRate);

  useEffect(() => {
    if (!usePoints) setPointsToRedeem(0);
    else setPointsToRedeem(maxRedeemable);
  }, [usePoints, maxRedeemable]);

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
          pointsToRedeem: usePoints ? pointsToRedeem : 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to place order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOrderPlaced({ orderNumber: data.orderNumber, total: data.total, pointsEarned: projectedPoints });
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
        <p className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>{orderPlaced.total.toFixed(2)} {currency}</p>
        {isAuthenticated && orderPlaced.pointsEarned > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
            <Award className="h-4 w-4" />
            +{orderPlaced.pointsEarned} {t("loyalty.points")} {t("loyalty.txEarned").toLowerCase()}
          </div>
        )}
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

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
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

          {isAuthenticated && availablePoints > 0 && (
            <div className="rounded-xl border bg-white shadow-sm p-6" style={{ borderColor: `${accentColor}30` }} data-testid="section-loyalty-redeem">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                    <Gift className="h-4 w-4" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: primaryColor }}>{t("loyalty.redeemTitle")}</h3>
                    <p className="text-xs text-gray-400">{t("loyalty.redeemSubtitle")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setUsePoints(p => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                  style={{ backgroundColor: usePoints ? accentColor : "#d1d5db" }}
                  data-testid="toggle-use-points"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${usePoints ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3 p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}06` }}>
                <Award className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: primaryColor }}>{availablePoints} {t("loyalty.points")}</p>
                  <p className="text-xs text-gray-400">{t("loyalty.availablePoints")}</p>
                </div>
              </div>

              {usePoints && maxRedeemable > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">{t("loyalty.pointsToRedeem")}</span>
                    <span className="text-xs text-gray-400">{t("loyalty.maxRedeemNote").replace("{max}", String(maxRedeemable)).replace("{value}", (maxRedeemable * pointsValue).toFixed(0))}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPointsToRedeem(p => Math.max(0, p - 10))}
                      className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-gray-50"
                      data-testid="button-points-minus"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={maxRedeemable}
                        step={1}
                        value={pointsToRedeem}
                        onChange={e => setPointsToRedeem(Number(e.target.value))}
                        className="w-full accent-amber-500"
                        data-testid="slider-points-redeem"
                      />
                    </div>
                    <button
                      onClick={() => setPointsToRedeem(p => Math.min(maxRedeemable, p + 10))}
                      className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-gray-50"
                      data-testid="button-points-plus"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: `${accentColor}12` }}>
                    <span className="text-sm font-bold" style={{ color: primaryColor }}>{pointsToRedeem} {t("loyalty.points")}</span>
                    <span className="text-sm font-bold" style={{ color: accentColor }}>−{loyaltyDiscount.toFixed(2)} {currency}</span>
                  </div>
                </div>
              )}
              {usePoints && maxRedeemable === 0 && (
                <p className="text-xs text-gray-400 mt-2">{t("loyalty.maxRedeemNote").replace("{max}", "0").replace("{value}", "0")}</p>
              )}
            </div>
          )}

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
                  <div className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-2 overflow-hidden" style={{ backgroundColor: `${primaryColor}15` }}>
                    {w.iconUrl ? (
                      <img src={w.iconUrl} alt={w.name} className="h-10 w-10 object-contain" />
                    ) : (
                      <Wallet className="h-6 w-6" style={{ color: primaryColor }} />
                    )}
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
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1" style={{ color: accentColor }}>
                    <Gift className="h-3 w-3" /> {t("loyalty.discountLine")}
                  </span>
                  <span className="font-semibold" style={{ color: accentColor }}>−{loyaltyDiscount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span style={{ color: primaryColor }}>{t("cart.total")}</span>
                  <span style={{ color: primaryColor }}>{orderTotal.toFixed(2)} {currency}</span>
                </div>
              </div>
              {selectedWallet && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("orders.paymentMethod")}</span>
                  <span className="font-semibold">{getWalletDisplayName(selectedWallet)}</span>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="p-3 rounded-lg text-sm flex items-center gap-2 mb-4" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }} data-testid="text-loyalty-earn">
                <Award className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
                <span className="text-gray-600">
                  {t("loyalty.earnOnOrder").replace("{points}", String(Math.max(0, projectedPoints)))}
                </span>
              </div>
            )}

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
