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
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

export default function StoreLogin() {
  const { t } = useStoreLanguage();
  const { login } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    try {
      await login(email, password);
      if (redirectParam === "checkout") {
        setLocation("/store/checkout");
      } else {
        setLocation("/store");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="LIMJIBA" className="h-20 w-auto mx-auto mb-4 rounded-lg" />
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }} data-testid="text-login-title">{t("auth.loginTitle")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border shadow-sm p-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm" data-testid="text-login-error">{error}</div>
          )}
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-lg mt-1" data-testid="input-login-email" />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded-lg mt-1" data-testid="input-login-password" />
          </div>
          <Button type="submit" className="w-full rounded-full font-semibold" size="lg" style={{ backgroundColor: accentColor, color: primaryColor }} disabled={loading} data-testid="button-login-submit">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("auth.signingIn")}</> : t("auth.loginBtn")}
          </Button>
          <div className="text-center">
            <Link href="/store/forgot-password" className="text-xs hover:underline" style={{ color: accentColor }} data-testid="link-forgot-password">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <p className="text-center text-sm text-gray-500">
            {t("auth.noAccount")}{" "}
            <Link href={redirectParam ? `/store/signup?redirect=${redirectParam}` : "/store/signup"} className="font-semibold hover:underline" style={{ color: primaryColor }} data-testid="link-signup">
              {t("nav.signup")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
