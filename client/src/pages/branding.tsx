import { useState, useRef, useCallback } from "react";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Palette, FileText, Image } from "lucide-react";

function extractColorsFromImage(imageUrl: string): Promise<{ primary: string; accent: string }> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ primary: "#1976D2", accent: "#42A5F5" });
        return;
      }
      
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      const colorCounts: Record<string, number> = {};
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = Math.round(imageData[i] / 32) * 32;
        const g = Math.round(imageData[i + 1] / 32) * 32;
        const b = Math.round(imageData[i + 2] / 32) * 32;
        const a = imageData[i + 3];
        
        if (a < 128) continue;
        if (r > 240 && g > 240 && b > 240) continue;
        if (r < 15 && g < 15 && b < 15) continue;
        
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }
      
      const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      
      if (sorted.length === 0) {
        resolve({ primary: "#1976D2", accent: "#42A5F5" });
        return;
      }
      
      const toHex = (rgb: string) => {
        const [r, g, b] = rgb.split(",").map(Number);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      };
      
      const primary = toHex(sorted[0][0]);
      const accent = sorted.length > 1 ? toHex(sorted[1][0]) : primary;
      
      resolve({ primary, accent });
    };
    img.onerror = () => {
      resolve({ primary: "#1976D2", accent: "#42A5F5" });
    };
    img.src = imageUrl;
  });
}

export default function Branding() {
  const { t } = useLanguage();
  const { branding, updateBranding } = useBranding();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      updateBranding({ logo: dataUrl });
      
      if (branding.useLogoAsWatermark) {
        updateBranding({ watermark: dataUrl });
      }
      
      toast({ title: t("branding.settingsSaved") });
    };
    reader.readAsDataURL(file);
  }, [updateBranding, branding.useLogoAsWatermark, toast, t]);

  const handleWatermarkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateBranding({ watermark: dataUrl, useLogoAsWatermark: false });
      toast({ title: t("branding.settingsSaved") });
    };
    reader.readAsDataURL(file);
  }, [updateBranding, toast, t]);

  const extractColors = useCallback(async () => {
    if (!branding.logo) {
      toast({ title: "Please upload a logo first", variant: "destructive" });
      return;
    }
    
    const colors = await extractColorsFromImage(branding.logo);
    setPrimaryColor(colors.primary);
    setAccentColor(colors.accent);
    updateBranding({ primaryColor: colors.primary, accentColor: colors.accent });
    toast({ title: t("branding.settingsSaved") });
  }, [branding.logo, updateBranding, toast, t]);

  const saveColors = useCallback(() => {
    updateBranding({ primaryColor, accentColor });
    toast({ title: t("branding.settingsSaved") });
  }, [primaryColor, accentColor, updateBranding, toast, t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-branding-title">
          {t("branding.title")}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t("branding.logo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              data-testid="input-logo-upload"
            />
            
            {branding.logo ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 border rounded-md flex items-center justify-center bg-muted/50 p-2">
                  <img
                    src={branding.logo}
                    alt="Company Logo"
                    className="max-w-full max-h-full object-contain"
                    data-testid="img-logo-preview"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    data-testid="button-change-logo"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateBranding({ logo: null })}
                    data-testid="button-remove-logo"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("branding.removeLogo")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32"
                onClick={() => logoInputRef.current?.click()}
                data-testid="button-upload-logo"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span>{t("branding.uploadLogo")}</span>
                </div>
              </Button>
            )}

            <div className="space-y-2">
              <Label>{t("branding.logoPosition")}</Label>
              <Select
                value={branding.logoPosition}
                onValueChange={(value: "left" | "center" | "right") =>
                  updateBranding({ logoPosition: value })
                }
              >
                <SelectTrigger data-testid="select-logo-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{t("branding.left")}</SelectItem>
                  <SelectItem value="center">{t("branding.center")}</SelectItem>
                  <SelectItem value="right">{t("branding.right")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t("branding.watermark")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={watermarkInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleWatermarkUpload}
              data-testid="input-watermark-upload"
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-watermark">{t("branding.enableWatermark")}</Label>
              <Switch
                id="enable-watermark"
                checked={branding.enableWatermark}
                onCheckedChange={(checked) => updateBranding({ enableWatermark: checked })}
                data-testid="switch-enable-watermark"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="use-logo-watermark">{t("branding.useLogoAsWatermark")}</Label>
              <Switch
                id="use-logo-watermark"
                checked={branding.useLogoAsWatermark}
                onCheckedChange={(checked) => {
                  updateBranding({
                    useLogoAsWatermark: checked,
                    watermark: checked ? branding.logo : branding.watermark,
                  });
                }}
                data-testid="switch-use-logo-watermark"
              />
            </div>

            {!branding.useLogoAsWatermark && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => watermarkInputRef.current?.click()}
                data-testid="button-upload-watermark"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("branding.uploadWatermark")}
              </Button>
            )}

            <div className="space-y-2">
              <Label>
                {t("branding.watermarkOpacity")}: {Math.round(branding.watermarkOpacity * 100)}%
              </Label>
              <Slider
                value={[branding.watermarkOpacity * 100]}
                onValueChange={([value]) => updateBranding({ watermarkOpacity: value / 100 })}
                min={5}
                max={30}
                step={1}
                data-testid="slider-watermark-opacity"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("branding.brandColors")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">{t("branding.primaryColor")}</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                  data-testid="input-primary-color"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono"
                  data-testid="input-primary-color-text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">{t("branding.accentColor")}</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                  data-testid="input-accent-color"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 font-mono"
                  data-testid="input-accent-color-text"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={extractColors}
                disabled={!branding.logo}
                data-testid="button-extract-colors"
              >
                <Palette className="h-4 w-4 mr-2" />
                {t("branding.extractFromLogo")}
              </Button>
              <Button onClick={saveColors} data-testid="button-save-colors">
                {t("common.save")}
              </Button>
            </div>

            <div className="flex gap-2 mt-4">
              <div
                className="w-16 h-16 rounded-md border"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="w-16 h-16 rounded-md border"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("branding.invoiceLanguage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={branding.invoiceLanguage}
              onValueChange={(value: "fr" | "ar" | "bilingual") =>
                updateBranding({ invoiceLanguage: value })
              }
            >
              <SelectTrigger data-testid="select-invoice-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">{t("branding.french")}</SelectItem>
                <SelectItem value="ar">{t("branding.arabic")}</SelectItem>
                <SelectItem value="bilingual">{t("branding.bilingual")}</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-sm text-muted-foreground">
              {branding.invoiceLanguage === "fr" && "Invoices will be generated in French."}
              {branding.invoiceLanguage === "ar" && "Invoices will be generated in Arabic (RTL)."}
              {branding.invoiceLanguage === "bilingual" && "Invoices will include both Arabic and French."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("branding.previewInvoice")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="relative border rounded-md bg-white dark:bg-gray-100 p-6 min-h-[400px] overflow-hidden"
            style={{ direction: branding.invoiceLanguage === "ar" ? "rtl" : "ltr" }}
          >
            {branding.enableWatermark && branding.watermark && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: branding.watermarkOpacity }}
              >
                <img 
                  src={branding.watermark} 
                  alt="Watermark" 
                  className="max-w-[60%] max-h-[60%] object-contain"
                />
              </div>
            )}
            
            <div className="relative z-10">
              <div 
                className="flex items-start justify-between mb-6 pb-4"
                style={{ borderBottom: `3px solid ${branding.primaryColor}` }}
              >
                <div 
                  className="flex items-start gap-4"
                  style={{ 
                    flexDirection: branding.logoPosition === "right" ? "row-reverse" : "row",
                    justifyContent: branding.logoPosition === "center" ? "center" : "flex-start",
                    width: branding.logoPosition === "center" ? "100%" : "auto"
                  }}
                >
                  {branding.logo ? (
                    <img 
                      src={branding.logo} 
                      alt="Logo" 
                      className="h-14 w-auto object-contain"
                    />
                  ) : (
                    <div 
                      className="w-14 h-14 rounded-md flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      PFP
                    </div>
                  )}
                  {branding.logoPosition !== "center" && (
                    <div className="text-gray-800">
                      <h2 
                        className="text-lg font-bold"
                        style={{ color: branding.primaryColor }}
                      >
                        POLY FLECTA PLASTICA
                      </h2>
                      <p className="text-xs text-gray-600">
                        {branding.invoiceLanguage === "ar" 
                          ? "تصنيع عبوات بلاستيكية" 
                          : "FABRICATION D'EMBALLAGE EN PLASTIQUE"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Village Zaitout, Hammam Dalaa - M'sila
                      </p>
                      <p className="text-xs text-gray-500">
                        CARTE ARTISAN N°: 28/00 - 2896688A24
                      </p>
                    </div>
                  )}
                </div>
                <div className={`text-${branding.invoiceLanguage === "ar" ? "left" : "right"}`}>
                  <h3 
                    className="text-xl font-bold"
                    style={{ color: branding.primaryColor }}
                  >
                    {branding.invoiceLanguage === "ar" ? "فاتورة" : 
                     branding.invoiceLanguage === "bilingual" ? "FACTURE / فاتورة" : "FACTURE"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {branding.invoiceLanguage === "ar" ? "رقم" : "N°"}: FA-2026-001
                  </p>
                  <p className="text-sm text-gray-600">
                    {branding.invoiceLanguage === "ar" ? "التاريخ" : "Date"}: 01/01/2026
                  </p>
                </div>
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr style={{ backgroundColor: branding.primaryColor }}>
                    <th className="text-white p-2 text-left">
                      {branding.invoiceLanguage === "ar" ? "الكمية" : "Qté"}
                    </th>
                    <th className="text-white p-2 text-left">
                      {branding.invoiceLanguage === "ar" ? "الوصف" : "Désignation"}
                    </th>
                    <th className="text-white p-2 text-right">
                      {branding.invoiceLanguage === "ar" ? "سعر الوحدة" : "Prix U"}
                    </th>
                    <th className="text-white p-2 text-right">
                      {branding.invoiceLanguage === "ar" ? "المبلغ" : "Montant"}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="p-2">100</td>
                    <td className="p-2">Sac en plastique 5KG</td>
                    <td className="p-2 text-right">250 DZD</td>
                    <td className="p-2 text-right">25,000 DZD</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-2">50</td>
                    <td className="p-2">Sac en plastique 10KG</td>
                    <td className="p-2 text-right">450 DZD</td>
                    <td className="p-2 text-right">22,500 DZD</td>
                  </tr>
                </tbody>
              </table>

              <div className={`text-${branding.invoiceLanguage === "ar" ? "left" : "right"} text-gray-800`}>
                <p className="text-sm">
                  {branding.invoiceLanguage === "ar" ? "المجموع (قبل الضريبة)" : "TOTAL H.T"}: 
                  <strong> 47,500 DZD</strong>
                </p>
                <p 
                  className="text-lg font-bold mt-1"
                  style={{ color: branding.primaryColor }}
                >
                  {branding.invoiceLanguage === "ar" ? "المجموع الكلي" : "TOTAL T.T.C"}: 47,500 DZD
                </p>
              </div>

              <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
                www.polyflectaplastica.com | contact@polyflectaplastica.com | +213 6 70 04 91 24
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
