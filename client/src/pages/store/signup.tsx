import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { StoreSettings } from "@shared/schema";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png";

export default function StoreSignup() {
  const { t } = useStoreLanguage();
  const { signup } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", fullName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const searchParams = new URLSearchParams(window.location.search);
  const redirectParam = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone || undefined });
      if (redirectParam === "checkout") {
        setLocation("/store/cart");
      } else {
        setLocation("/store");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="LIMJIBA" className="h-20 w-auto mx-auto mb-4 rounded-lg" />
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }} data-testid="text-signup-title">{t("auth.signupTitle")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border shadow-sm p-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm" data-testid="text-signup-error">{error}</div>
          )}
          <div>
            <Label htmlFor="fullName">{t("auth.fullName")}</Label>
            <Input id="fullName" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required className="rounded-lg mt-1" data-testid="input-signup-name" />
          </div>
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="rounded-lg mt-1" data-testid="input-signup-email" />
          </div>
          <div>
            <Label htmlFor="phone">{t("auth.phone")}</Label>
            <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-lg mt-1" data-testid="input-signup-phone" />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="rounded-lg mt-1" data-testid="input-signup-password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required className="rounded-lg mt-1" data-testid="input-signup-confirm" />
          </div>
          <Button type="submit" className="w-full rounded-full font-semibold" size="lg" style={{ backgroundColor: accentColor, color: primaryColor }} disabled={loading} data-testid="button-signup-submit">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("auth.creating")}</> : t("auth.signupBtn")}
          </Button>
          <p className="text-center text-sm text-gray-500">
            {t("auth.hasAccount")}{" "}
            <Link href={redirectParam ? `/store/login?redirect=${redirectParam}` : "/store/login"} className="font-semibold hover:underline" style={{ color: primaryColor }} data-testid="link-login">
              {t("nav.login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
