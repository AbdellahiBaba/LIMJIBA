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
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png";

export default function StoreResetPassword() {
  const { t } = useStoreLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (!token) {
      setError(t("auth.invalidToken"));
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/store/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="LIMJIBA" className="h-20 w-auto mx-auto mb-4 rounded-lg" data-testid="img-reset-logo" />
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }} data-testid="text-reset-title">
            {t("auth.resetPasswordTitle")}
          </h1>
        </div>

        <div className="space-y-4 bg-white rounded-2xl border shadow-sm p-8">
          {success ? (
            <div data-testid="text-reset-success">
              <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm mb-4" data-testid="text-reset-success-message">
                {t("auth.resetPasswordSuccess")}
              </div>
              <Link href="/store/login" data-testid="link-reset-login">
                <Button
                  className="w-full rounded-full font-semibold"
                  size="lg"
                  style={{ backgroundColor: accentColor, color: primaryColor }}
                  data-testid="button-reset-login"
                >
                  {t("auth.loginBtn")}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} data-testid="form-reset-password">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm mb-4" data-testid="text-reset-error">{error}</div>
              )}
              {!token && (
                <div className="p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm mb-4" data-testid="text-reset-no-token">
                  {t("auth.invalidToken")}
                </div>
              )}
              <div className="mb-4">
                <Label htmlFor="password">{t("auth.newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="rounded-lg mt-1"
                  data-testid="input-reset-password"
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="rounded-lg mt-1"
                  data-testid="input-reset-confirm"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full font-semibold"
                size="lg"
                style={{ backgroundColor: accentColor, color: primaryColor }}
                disabled={loading || !token}
                data-testid="button-reset-submit"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("auth.resetting")}</> : t("auth.resetPasswordBtn")}
              </Button>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link
                  href="/store/login"
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}
                  data-testid="link-reset-back-login"
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
