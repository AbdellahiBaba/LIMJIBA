import { useState, useEffect } from "react";
import { useStoreLanguage } from "@/components/store-layout";
import { useStoreAuth } from "@/contexts/store-auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { StoreSettings } from "@shared/schema";

export default function StoreProfile() {
  const { t } = useStoreLanguage();
  const { customer, isAuthenticated, isLoading: authLoading, refreshProfile } = useStoreAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ fullName: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/store/login");
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (customer) {
      setForm({
        fullName: customer.fullName || "",
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/store/auth/profile", form);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8" style={{ color: primaryColor }} data-testid="text-profile-title">
        <User className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {t("profile.title")}
      </h1>

      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{t("profile.editProfile")}</h3>

        <div className="space-y-4">
          <div>
            <Label>{t("auth.email")}</Label>
            <Input value={customer?.email || ""} disabled className="rounded-lg mt-1 bg-gray-50" />
          </div>
          <div>
            <Label>{t("auth.fullName")}</Label>
            <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-name" />
          </div>
          <div>
            <Label>{t("auth.phone")}</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-phone" />
          </div>
          <div>
            <Label>{t("checkout.address")}</Label>
            <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="rounded-lg mt-1" data-testid="input-profile-address" />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="rounded-full font-semibold"
          style={{ backgroundColor: saved ? "#22c55e" : accentColor, color: saved ? "white" : primaryColor }}
          disabled={saving}
          data-testid="button-save-profile"
        >
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("profile.saving")}</> : <><Save className="h-4 w-4 mr-2" /> {t("profile.save")}</>}
        </Button>
      </div>
    </div>
  );
}
