import { useState } from "react";
import { Link } from "wouter";
import { useStoreLanguage } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { StoreSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

export default function StoreForgotPassword() {
  const { t } = useStoreLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setDevToken(null);
    try {
      const res = await apiRequest("POST", "/api/store/auth/forgot-password", { email });
      const data = await res.json();
      setSuccess(true);
      if (data.token) {
        setDevToken(data.token);
      }
    } catch (err: any) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="LIMJIBA" className="h-20 w-auto mx-auto mb-4 rounded-lg" data-testid="img-forgot-logo" />
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }} data-testid="text-forgot-title">
            {t("auth.forgotPasswordTitle")}
          </h1>
          <p className="text-sm text-gray-500 mt-2" data-testid="text-forgot-subtitle">
            {t("auth.forgotPasswordSubtitle")}
          </p>
        </div>

        <div className="space-y-4 bg-white rounded-2xl border shadow-sm p-8">
          {success ? (
            <div data-testid="text-forgot-success">
              <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm mb-4" data-testid="text-forgot-success-message">
                {t("auth.forgotPasswordSuccess")}
              </div>
              {devToken && (
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-sm mb-4" data-testid="text-forgot-dev-token">
                  <p className="font-semibold mb-1">Dev Mode - Reset Link:</p>
                  <Link
                    href={`/store/reset-password?token=${devToken}`}
                    className="underline break-all"
                    data-testid="link-forgot-dev-reset"
                  >
                    /store/reset-password?token={devToken}
                  </Link>
                </div>
              )}
              <Link href="/store/login" data-testid="link-forgot-back-login">
                <Button
                  variant="outline"
                  className="w-full rounded-full font-semibold"
                  size="lg"
                  style={{ borderColor: accentColor, color: primaryColor }}
                  data-testid="button-forgot-back-login"
                >
                  {t("auth.backToLogin")}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} data-testid="form-forgot-password">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm mb-4" data-testid="text-forgot-error">{error}</div>
              )}
              <div className="mb-4">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="rounded-lg mt-1"
                  data-testid="input-forgot-email"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full font-semibold"
                size="lg"
                style={{ backgroundColor: accentColor, color: primaryColor }}
                disabled={loading}
                data-testid="button-forgot-submit"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("auth.sending")}</> : t("auth.sendResetLink")}
              </Button>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link
                  href="/store/login"
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}
                  data-testid="link-forgot-login"
                >
                  {t("auth.backToLogin")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
