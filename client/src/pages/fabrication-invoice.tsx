import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save, Printer, Eye, Download, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { Product, InsertInvoiceItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FabricationLineItem {
  id: string;
  productId?: string;
  designation: string;
  weightKg: number;
  quantity: number;
  unitPrice: number;
  total: number;
}

function numberToFrenchWords(n: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  if (n === 0) return "zéro";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? (u === 1 && t !== 8 ? " et un" : "-" + units[u]) : (t === 8 ? "s" : ""));
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : (h > 1 && r === 0 ? "s" : ""));
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = t === 1 ? "mille" : numberToFrenchWords(t) + " mille";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const prefix = m === 1 ? "un million" : numberToFrenchWords(m) + " millions";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  return n.toString();
}

function numberToArabicWords(n: number): string {
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  if (n === 0) return "صفر";
  if (n < 10) return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return tens[t];
    return units[u] + " و" + tens[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return hundreds[h] + (r > 0 ? " و" + numberToArabicWords(r) : "");
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = t === 1 ? "ألف" : t === 2 ? "ألفان" : numberToArabicWords(t) + " آلاف";
    return prefix + (r > 0 ? " و" + numberToArabicWords(r) : "");
  }
  return n.toString();
}

export default function FabricationInvoice() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t, branding } = useLanguage();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const invoiceLang = branding.invoiceLanguage;
  const isRTL = invoiceLang === "ar";

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    responsible: "Djeilat Mohamed",
    role: "Fabrication",
    paymentMode: "A TERME",
    dueDate: "",
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    applyTva: false,
    tvaRate: 0.19,
  });

  const [items, setItems] = useState<FabricationLineItem[]>([
    { id: crypto.randomUUID(), designation: "", weightKg: 0, quantity: 0, unitPrice: 0, total: 0 },
  ]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: nextNumber } = useQuery<{ nextNumber: string }>({
    queryKey: ["/api/invoices/next-number"],
  });

  useEffect(() => {
    if (nextNumber) {
      const fabNumber = nextNumber.nextNumber.replace("FA-", "FAB-");
      setFormData((prev) => ({ ...prev, invoiceNumber: fabNumber }));
    }
  }, [nextNumber]);

  const createMutation = useMutation({
    mutationFn: async (data: { invoice: typeof formData & { totalHT: number; tvaAmount: number; totalTTC: number }; items: InsertInvoiceItem[] }) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: (createdInvoice: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("invoices.invoiceCreated") });
      
      // Open PDF for the saved invoice
      const params_url = new URLSearchParams({
        invoiceLanguage: branding.invoiceLanguage,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        logoPosition: branding.logoPosition,
        enableWatermark: String(branding.enableWatermark),
        watermarkOpacity: String(branding.watermarkOpacity),
      });
      
      if (branding.logo) {
        params_url.set("logo", branding.logo);
      }
      if (branding.enableWatermark && branding.watermark) {
        params_url.set("watermark", branding.watermark);
      }
      
      window.open(`/api/invoices/${createdInvoice.id}/pdf?${params_url.toString()}`, "_blank");
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), designation: "", weightKg: 0, quantity: 0, unitPrice: 0, total: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FabricationLineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const selectProduct = (id: string, productId: string) => {
    const product = products?.find((p) => p.id === productId);
    if (product) {
      setItems(
        items.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              productId,
              designation: product.name,
              weightKg: product.weightPerUnit || 0,
              unitPrice: product.costPrice || 0,
              total: item.quantity * (product.costPrice || 0),
            };
          }
          return item;
        })
      );
    }
  };

  const totalHT = items.reduce((sum, item) => sum + item.total, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
  const tvaAmount = formData.applyTva ? Math.round(totalHT * formData.tvaRate * 100) / 100 : 0;
  const totalTTC = totalHT + tvaAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceItems: InsertInvoiceItem[] = items
      .filter((item) => item.designation && item.quantity > 0)
      .map((item) => ({
        invoiceId: "",
        productId: item.productId || null,
        designation: item.designation + (item.weightKg ? ` (${item.weightKg}kg)` : ""),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));

    createMutation.mutate({
      invoice: { ...formData, totalHT, tvaAmount, totalTTC },
      items: invoiceItems,
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const companyInfo = branding.companyInfo || {};
    const logoHtml = branding.logo 
      ? `<img src="${branding.logo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />`
      : `<div style="width: 60px; height: 60px; background: ${branding.primaryColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">PFP</div>`;

    const watermarkHtml = branding.enableWatermark && branding.watermark 
      ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: ${branding.watermarkOpacity};">
          <img src="${branding.watermark}" alt="Watermark" style="max-width: 400px; max-height: 400px;" />
         </div>`
      : "";

    const formatNumber = (amount: number) => {
      return new Intl.NumberFormat("fr-DZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const itemRows = items
      .filter((item) => item.designation && item.quantity > 0)
      .map((item) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; ${isRTL ? "text-align: right;" : ""}">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; ${isRTL ? "text-align: right;" : ""}">${item.designation}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.weightKg.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${(item.weightKg * item.quantity).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? "left" : "right"};">${formatNumber(item.unitPrice)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? "left" : "right"};">${formatNumber(item.total)}</td>
        </tr>
      `).join("");

    const labels = {
      invoice: getLabel("FACTURE FABRICATION", "فاتورة تصنيع"),
      number: getLabel("N°", "رقم"),
      date: getLabel("Date", "التاريخ"),
      responsible: getLabel("Responsable", "المسؤول"),
      role: getLabel("Fonction", "الوظيفة"),
      paymentMode: getLabel("Mode de Paiement", "طريقة الدفع"),
      dueDate: getLabel("Échéance", "تاريخ الاستحقاق"),
      client: getLabel("Client", "العميل"),
      qty: getLabel("Qté", "الكمية"),
      designation: getLabel("Désignation", "الوصف"),
      unitWeight: getLabel("Poids/U (Kg)", "الوزن/و"),
      totalWeight: getLabel("Poids Total (Kg)", "الوزن الكلي"),
      unitPrice: getLabel("Prix U (DZD)", "سعر الوحدة"),
      amount: getLabel("Montant (DZD)", "المبلغ"),
      totalHT: getLabel("TOTAL H.T", "المجموع"),
      totalTTC: getLabel("TOTAL T.T.C", "المجموع الكلي"),
      weight: getLabel("Poids Total", "الوزن الكلي"),
      amountInWords: getLabel("Arrêter la présente facture à la somme de", "المبلغ بالحروف"),
      signature: getLabel("Cachet & Signature", "الختم والتوقيع"),
    };

    const html = `
<!DOCTYPE html>
<html dir="${isRTL ? "rtl" : "ltr"}" lang="${isRTL ? "ar" : "fr"}">
<head>
  <meta charset="UTF-8">
  <title>${labels.invoice} ${formData.invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { 
      font-family: ${isRTL ? "'Cairo', sans-serif" : "'Roboto', Arial, sans-serif"}; 
      margin: 0; padding: 40px; background: #fff; color: #333; 
      direction: ${isRTL ? "rtl" : "ltr"}; 
    }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid ${branding.primaryColor}; padding-bottom: 20px; }
    .company h1 { color: ${branding.primaryColor}; margin: 0; font-size: 24px; }
    .company p { margin: 5px 0; color: #666; font-size: 12px; }
    .invoice-info { text-align: ${isRTL ? "left" : "right"}; }
    .invoice-info h2 { color: ${branding.primaryColor}; margin: 0; }
    .invoice-info p { margin: 5px 0; font-size: 12px; }
    .meta-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
    .meta-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .meta-table .label { background: #f5f5f5; font-weight: 500; width: 150px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: ${branding.primaryColor}; color: white; padding: 10px; text-align: ${isRTL ? "right" : "left"}; font-size: 12px; }
    .items-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .items-table tr:nth-child(even) { background: #f9f9f9; }
    .totals { text-align: ${isRTL ? "left" : "right"}; margin-top: 20px; }
    .totals p { margin: 5px 0; font-size: 14px; }
    .totals .grand-total { font-size: 18px; font-weight: bold; color: ${branding.primaryColor}; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer p { font-size: 12px; color: #666; margin: 5px 0; }
    .signature { margin-top: 40px; text-align: ${isRTL ? "left" : "right"}; }
    .signature p { margin: 5px 0; font-size: 12px; }
    .print-btn { position: fixed; top: 20px; ${isRTL ? "left" : "right"}: 20px; padding: 10px 20px; background: ${branding.primaryColor}; color: white; border: none; cursor: pointer; border-radius: 4px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  ${watermarkHtml}
  <button class="print-btn" onclick="window.print()">${isRTL ? "طباعة" : "Print / Save as PDF"}</button>
  
  <div class="header">
    <div class="company">
      ${logoHtml}
      <h1>${companyInfo.name || "POLY FLECTA PLASTICA"}</h1>
      ${isRTL && companyInfo.nameAr ? `<h2 style="font-size: 16px; margin-top: 4px;">${companyInfo.nameAr}</h2>` : ""}
      <p>${getLabel("FABRICATION D'EMBALLAGE EN PLASTIQUE", "تصنيع عبوات بلاستيكية")}</p>
      <p>${companyInfo.address || "Village Zaitout, Local N°01, Commune Hammam Dalaa - W M'sila"}</p>
      ${companyInfo.artisanNumber ? `<p>CARTE ARTISAN N° : ${companyInfo.artisanNumber}</p>` : ""}
      ${companyInfo.articleNumber ? `<p>N° ARTICLE : ${companyInfo.articleNumber}</p>` : ""}
      ${companyInfo.fiscalNumber ? `<p>N° FISCAL : ${companyInfo.fiscalNumber}</p>` : ""}
    </div>
    <div class="invoice-info">
      <h2>${labels.invoice}</h2>
      <p><strong>${labels.number}:</strong> ${formData.invoiceNumber}</p>
      <p><strong>${labels.date}:</strong> ${formData.date}</p>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">${labels.responsible}</td>
      <td>${formData.responsible}</td>
      <td class="label">${labels.role}</td>
      <td>${formData.role}</td>
    </tr>
    <tr>
      <td class="label">${labels.paymentMode}</td>
      <td>${formData.paymentMode}</td>
      <td class="label">${labels.dueDate}</td>
      <td>${formData.dueDate || "-"}</td>
    </tr>
    ${formData.clientName ? `
    <tr>
      <td class="label">${labels.client}</td>
      <td colspan="3">${formData.clientName}</td>
    </tr>
    ` : ""}
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 60px;">${labels.qty}</th>
        <th>${labels.designation}</th>
        <th style="width: 100px; text-align: center;">${labels.unitWeight}</th>
        <th style="width: 100px; text-align: center;">${labels.totalWeight}</th>
        <th style="width: 100px; text-align: ${isRTL ? "left" : "right"};">${labels.unitPrice}</th>
        <th style="width: 100px; text-align: ${isRTL ? "left" : "right"};">${labels.amount}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <p>${labels.weight}: <strong>${totalWeight.toFixed(2)} Kg</strong></p>
    <p>${labels.totalHT}: <strong>${formatNumber(totalHT)} DZD</strong></p>
    ${formData.applyTva ? `<p>${getLabel("TVA", "ضريبة القيمة المضافة")} (${(formData.tvaRate * 100).toFixed(0)}%): <strong>${formatNumber(tvaAmount)} DZD</strong></p>` : ""}
    <p class="grand-total">${labels.totalTTC}: ${formatNumber(totalTTC)} DZD</p>
  </div>

  <div class="footer">
    <p><strong>${labels.amountInWords}:</strong></p>
    <p style="font-style: italic;">${getAmountInWords(totalTTC)}</p>
    <p><strong>${labels.paymentMode}:</strong> ${formData.paymentMode}</p>
  </div>

  <div class="signature">
    <p>${labels.signature}</p>
    <div style="width: 150px; height: 80px; border: 1px solid #ddd; margin-${isRTL ? "right" : "left"}: auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid ${branding.primaryColor}; font-size: 11px; color: #666;">
    <p>${companyInfo.website || "www.polyflectaplastica.com"} | ${companyInfo.email || "contact@polyflectaplastica.com"} | ${companyInfo.phone || "+213 6 70 04 91 24"}</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " DZD";
  };

  const getAmountInWords = (amount: number) => {
    const intPart = Math.floor(amount);
    if (invoiceLang === "ar") {
      return numberToArabicWords(intPart) + " دينار جزائري";
    }
    return numberToFrenchWords(intPart) + " dinars algériens";
  };

  const getLabel = (fr: string, ar: string) => {
    if (invoiceLang === "ar") return ar;
    if (invoiceLang === "bilingual") return `${fr} / ${ar}`;
    return fr;
  };

  const InvoicePreview = () => (
    <div 
      ref={invoiceRef}
      className="bg-white text-gray-900 p-8 min-h-[842px] relative"
      style={{ 
        direction: isRTL ? "rtl" : "ltr",
        fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "'Roboto', sans-serif"
      }}
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
            }}
          >
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt="Logo" 
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-md flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                PFP
              </div>
            )}
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ color: branding.primaryColor }}
              >
                {invoiceLang === "ar" ? branding.companyInfo.nameAr : branding.companyInfo.name}
              </h2>
              <p className="text-sm text-gray-600">
                {invoiceLang === "ar" ? branding.companyInfo.taglineAr : branding.companyInfo.tagline}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {branding.companyInfo.address}
              </p>
              {branding.companyInfo.artisanNumber && (
                <p className="text-xs text-gray-500">
                  CARTE ARTISAN N°: {branding.companyInfo.artisanNumber}
                </p>
              )}
              {branding.companyInfo.fiscalNumber && (
                <p className="text-xs text-gray-500">
                  NIF: {branding.companyInfo.fiscalNumber}
                </p>
              )}
            </div>
          </div>
          <div className={isRTL ? "text-left" : "text-right"}>
            <h3 
              className="text-2xl font-bold"
              style={{ color: branding.primaryColor }}
            >
              {getLabel("FACTURE DE FABRICATION", "فاتورة تصنيع")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {getLabel("N°", "رقم")}: {formData.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600">
              {getLabel("Date", "التاريخ")}: {formData.date}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="p-4 rounded-md" style={{ backgroundColor: `${branding.primaryColor}10` }}>
            <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>
              {getLabel("Client", "العميل")}
            </h4>
            <p className="text-sm">{formData.clientName || "---"}</p>
            <p className="text-xs text-gray-600">{formData.clientAddress}</p>
            <p className="text-xs text-gray-600">{formData.clientPhone}</p>
          </div>
          <div className="p-4 rounded-md" style={{ backgroundColor: `${branding.accentColor}10` }}>
            <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>
              {getLabel("Détails", "التفاصيل")}
            </h4>
            <p className="text-xs">
              <span className="text-gray-600">{getLabel("Mode de paiement", "طريقة الدفع")}:</span> {formData.paymentMode}
            </p>
            <p className="text-xs">
              <span className="text-gray-600">{getLabel("Responsable", "المسؤول")}:</span> {formData.responsible}
            </p>
            {formData.dueDate && (
              <p className="text-xs">
                <span className="text-gray-600">{getLabel("Échéance", "تاريخ الاستحقاق")}:</span> {formData.dueDate}
              </p>
            )}
          </div>
        </div>

        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr style={{ backgroundColor: branding.primaryColor }}>
              <th className="text-white p-3 text-center border border-white/20 w-12">#</th>
              <th className="text-white p-3 text-left border border-white/20">
                {getLabel("Désignation", "الوصف")}
              </th>
              <th className="text-white p-3 text-center border border-white/20 w-20">
                {getLabel("Poids/U", "الوزن/و")}
              </th>
              <th className="text-white p-3 text-center border border-white/20 w-16">
                {getLabel("Qté", "الكمية")}
              </th>
              <th className="text-white p-3 text-center border border-white/20 w-24">
                {getLabel("Poids Total", "الوزن الكلي")}
              </th>
              <th className="text-white p-3 text-right border border-white/20 w-24">
                {getLabel("Prix U.", "السعر")}
              </th>
              <th className="text-white p-3 text-right border border-white/20 w-28">
                {getLabel("Montant", "المبلغ")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.filter(item => item.designation).map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="p-3 text-center border">{index + 1}</td>
                <td className="p-3 border">{item.designation}</td>
                <td className="p-3 text-center border">{item.weightKg > 0 ? item.weightKg.toFixed(2) : "-"}</td>
                <td className="p-3 text-center border">{item.quantity}</td>
                <td className="p-3 text-center border font-medium">{(item.weightKg * item.quantity).toFixed(2)} Kg</td>
                <td className="p-3 text-right border">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right border font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td colSpan={2} className="p-3 border font-semibold">
                {getLabel("Total H.T", "المجموع")}
              </td>
              <td className="p-3 text-center border"></td>
              <td className="p-3 text-center border font-semibold">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
              <td className="p-3 text-center border font-semibold">{totalWeight.toFixed(2)} Kg</td>
              <td className="p-3 border"></td>
              <td className="p-3 text-right border font-semibold">
                {formatCurrency(totalHT)}
              </td>
            </tr>
            {formData.applyTva && (
              <tr className="bg-gray-50">
                <td colSpan={6} className="p-3 border text-right">
                  {getLabel(`TVA (${(formData.tvaRate * 100).toFixed(0)}%)`, `ضريبة القيمة المضافة (${(formData.tvaRate * 100).toFixed(0)}%)`)}
                </td>
                <td className="p-3 text-right border font-medium">
                  {formatCurrency(tvaAmount)}
                </td>
              </tr>
            )}
            <tr className="bg-gray-200">
              <td colSpan={6} className="p-3 border text-right font-bold">
                {getLabel("Total T.T.C", "المجموع الكلي")}
              </td>
              <td 
                className="p-3 text-right border font-bold"
                style={{ color: branding.primaryColor }}
              >
                {formatCurrency(totalTTC)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div 
          className="p-4 rounded-md mb-6"
          style={{ backgroundColor: `${branding.primaryColor}05`, border: `1px solid ${branding.primaryColor}30` }}
        >
          <p className="text-sm">
            <span className="font-semibold">{getLabel("Arrêté la présente facture à la somme de", "المبلغ الإجمالي بالحروف")}:</span>
          </p>
          <p className="text-lg font-medium mt-1" style={{ color: branding.primaryColor }}>
            {getAmountInWords(totalTTC)}
            {formData.applyTva && ` (${getLabel("TTC", "شامل الضريبة")})`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold mb-2">{getLabel("Signature du client", "توقيع العميل")}</p>
            <div className="h-16 border-b border-gray-300"></div>
          </div>
          <div className={isRTL ? "text-left" : "text-right"}>
            <p className="text-sm font-semibold mb-2">{getLabel("Cachet et signature", "الختم والتوقيع")}</p>
            <div className="h-16 border-b border-gray-300"></div>
          </div>
        </div>

        <div 
          className="mt-8 pt-4 border-t text-xs text-center"
          style={{ borderColor: branding.accentColor, color: branding.primaryColor }}
        >
          {branding.companyInfo.website && <span>{branding.companyInfo.website}</span>}
          {branding.companyInfo.email && <span> | {branding.companyInfo.email}</span>}
          {branding.companyInfo.phone && <span> | {branding.companyInfo.phone}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/invoices")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {t("invoices.newInvoice")} - {t("nav.stock")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {getLabel("Facture de fabrication avec détails de poids", "فاتورة تصنيع مع تفاصيل الوزن")}
          </p>
        </div>
      </div>

      <Card className="border-t-4" style={{ borderTopColor: branding.primaryColor }}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {branding.logo ? (
                <img 
                  src={branding.logo} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-md flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  PFP
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold" style={{ color: branding.primaryColor }}>
                  {branding.companyInfo.name || "POLY FLECTA PLASTICA"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {branding.companyInfo.tagline || getLabel("FABRICATION D'EMBALLAGE EN PLASTIQUE", "تصنيع عبوات بلاستيكية")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{branding.companyInfo.phone}</p>
              <p className="text-sm text-muted-foreground">{branding.companyInfo.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("invoices.invoiceNumber")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("invoices.invoiceNumber")}</Label>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="FAB-2026-001"
                    data-testid="input-invoice-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("invoices.invoiceDate")}</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="input-date"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{getLabel("Responsable", "المسؤول")}</Label>
                  <Input
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    data-testid="input-responsible"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{getLabel("Mode de paiement", "طريقة الدفع")}</Label>
                  <Select
                    value={formData.paymentMode}
                    onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                  >
                    <SelectTrigger data-testid="select-payment-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A TERME">A TERME</SelectItem>
                      <SelectItem value="ESPECES">{t("pos.cash")}</SelectItem>
                      <SelectItem value="CHEQUE">{t("pos.check")}</SelectItem>
                      <SelectItem value="VIREMENT">VIREMENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{getLabel("Échéance", "تاريخ الاستحقاق")}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  data-testid="input-due-date"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("invoices.clientName")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("invoices.clientName")}</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder={getLabel("Nom du client", "اسم العميل")}
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("invoices.clientAddress")}</Label>
                <Input
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  placeholder={getLabel("Adresse", "العنوان")}
                  data-testid="input-client-address"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("invoices.clientPhone")}</Label>
                <Input
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="+213..."
                  data-testid="input-client-phone"
                />
              </div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="applyTva"
                    checked={formData.applyTva}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, applyTva: checked })
                    }
                    data-testid="switch-apply-tva"
                  />
                  <Label htmlFor="applyTva" className="font-medium">
                    {getLabel("Appliquer TVA (19%)", "تطبيق ضريبة القيمة المضافة (19%)")}
                  </Label>
                </div>
                {formData.applyTva && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tvaRate" className="text-sm text-muted-foreground">
                      {getLabel("Taux:", "النسبة:")}
                    </Label>
                    <Input
                      id="tvaRate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.tvaRate}
                      onChange={(e) =>
                        setFormData({ ...formData, tvaRate: parseFloat(e.target.value) || 0.19 })
                      }
                      className="w-20"
                      data-testid="input-tva-rate"
                    />
                    <span className="text-sm text-muted-foreground">({(formData.tvaRate * 100).toFixed(0)}%)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("invoices.items")}</CardTitle>
            <Button type="button" onClick={addItem} size="sm" data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-1" />
              {t("invoices.addItem")}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">{getLabel("Désignation", "الوصف")}</TableHead>
                  <TableHead className="w-[10%]">{getLabel("Poids/U (Kg)", "الوزن/و")}</TableHead>
                  <TableHead className="w-[10%]">{t("common.quantity")}</TableHead>
                  <TableHead className="w-[12%]">{getLabel("Poids Total", "الوزن الكلي")}</TableHead>
                  <TableHead className="w-[13%]">{t("invoices.unitPrice")}</TableHead>
                  <TableHead className="w-[13%]">{t("common.total")}</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                    <TableCell>
                      <Select
                        value={item.productId || "custom"}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            updateItem(item.id, "productId", "");
                          } else {
                            selectProduct(item.id, value);
                          }
                        }}
                      >
                        <SelectTrigger data-testid={`select-product-${item.id}`}>
                          <SelectValue placeholder={getLabel("Sélectionner ou saisir", "اختر أو أدخل")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">{getLabel("Saisie libre", "إدخال مخصص")}</SelectItem>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({getLabel("Stock", "المخزون")}: {product.stockQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!item.productId && (
                        <Input
                          className="mt-2"
                          value={item.designation}
                          onChange={(e) => updateItem(item.id, "designation", e.target.value)}
                          placeholder={getLabel("Description", "الوصف")}
                          data-testid={`input-designation-${item.id}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.weightKg || ""}
                        onChange={(e) => updateItem(item.id, "weightKg", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        data-testid={`input-weight-${item.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        data-testid={`input-quantity-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      {(item.weightKg * item.quantity).toFixed(2)} Kg
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        data-testid={`input-price-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{getLabel("Poids Total", "الوزن الكلي")}:</span>
                  <span className="font-medium">{totalWeight.toFixed(2)} Kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TOTAL H.T:</span>
                  <span className="font-medium">{formatCurrency(totalHT)}</span>
                </div>
                {formData.applyTva && (
                  <div className="flex justify-between text-sm">
                    <span>TVA ({(formData.tvaRate * 100).toFixed(0)}%):</span>
                    <span className="font-medium">{formatCurrency(tvaAmount)}</span>
                  </div>
                )}
                <div 
                  className="flex justify-between text-lg font-bold pt-2 border-t"
                  style={{ color: branding.primaryColor }}
                >
                  <span>TOTAL T.T.C:</span>
                  <span>{formatCurrency(totalTTC)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            data-testid="button-preview"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("common.preview")}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePrint}
            data-testid="button-print"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("common.print")}
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}
          </Button>
        </div>
      </form>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("branding.previewInvoice")}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden">
            <InvoicePreview />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={handlePrint} data-testid="button-preview-print">
              <Printer className="h-4 w-4 mr-2" />
              {t("common.print")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
