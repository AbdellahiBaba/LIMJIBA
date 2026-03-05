import { useState } from "react";
import { useBranding } from "@/contexts/language-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Printer, Eye, FileText, History, Search, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuickInvoice as QuickInvoiceType } from "@shared/schema";

interface QuickLineItem {
  id: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  weightPerUnit: number;
  totalWeight: number;
  total: number;
}

function numberToFrenchWords(n: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  if (n === 0) return "zero";
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

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function QuickInvoice() {
  const { branding } = useBranding();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<QuickInvoiceType | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: today,
    responsible: "",
    role: "",
    paymentMode: "A TERME",
    dueDate: "",
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    applyTva: false,
    tvaRate: 0.19,
    notes: "",
  });

  const [items, setItems] = useState<QuickLineItem[]>([
    { id: crypto.randomUUID(), designation: "", quantity: 0, unitPrice: 0, weightPerUnit: 0, totalWeight: 0, total: 0 },
  ]);

  const { data: savedInvoices = [] } = useQuery<QuickInvoiceType[]>({
    queryKey: ["/api/quick-invoices"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await apiRequest("POST", "/api/quick-invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-invoices"] });
      toast({ title: "Facture sauvegardée", description: "Une copie a été enregistrée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la facture.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quick-invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-invoices"] });
      toast({ title: "Supprimée", description: "La facture a été supprimée." });
    },
  });

  const saveInvoiceCopy = () => {
    const filteredItems = items.filter(item => item.designation && item.quantity > 0);
    if (filteredItems.length === 0) return;
    saveMutation.mutate({
      invoiceNumber: formData.invoiceNumber || "SANS-NUM",
      date: formData.date,
      responsible: formData.responsible || null,
      role: formData.role || null,
      paymentMode: formData.paymentMode,
      dueDate: formData.dueDate || null,
      clientName: formData.clientName || null,
      clientAddress: formData.clientAddress || null,
      clientPhone: formData.clientPhone || null,
      applyTva: formData.applyTva,
      tvaRate: formData.tvaRate,
      totalHT: totalHT,
      tvaAmount: tvaAmount,
      totalTTC: totalTTC,
      totalWeight: totalWeight,
      notes: formData.notes || null,
      items: JSON.stringify(filteredItems),
      createdAt: new Date().toISOString(),
    });
  };

  const loadInvoice = (inv: QuickInvoiceType) => {
    setFormData({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      responsible: inv.responsible || "",
      role: inv.role || "",
      paymentMode: inv.paymentMode,
      dueDate: inv.dueDate || "",
      clientName: inv.clientName || "",
      clientAddress: inv.clientAddress || "",
      clientPhone: inv.clientPhone || "",
      applyTva: inv.applyTva,
      tvaRate: inv.tvaRate,
      notes: inv.notes || "",
    });
    try {
      const parsed = JSON.parse(inv.items);
      setItems(parsed.map((item: QuickLineItem) => ({ ...item, id: crypto.randomUUID() })));
    } catch {
      setItems([{ id: crypto.randomUUID(), designation: "", quantity: 0, unitPrice: 0, weightPerUnit: 0, totalWeight: 0, total: 0 }]);
    }
    setViewingInvoice(null);
    setShowHistory(false);
    toast({ title: "Facture chargée", description: `Facture ${inv.invoiceNumber} chargée dans le formulaire.` });
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), designation: "", quantity: 0, unitPrice: 0, weightPerUnit: 0, totalWeight: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuickLineItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
        }
        if (field === "quantity" || field === "weightPerUnit") {
          updated.totalWeight = Math.round(updated.quantity * updated.weightPerUnit * 1000) / 1000;
        }
        return updated;
      }
      return item;
    }));
  };

  const totalHT = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const tvaAmount = formData.applyTva ? Math.round(totalHT * formData.tvaRate * 100) / 100 : 0;
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100;
  const totalWeight = items.reduce((sum, item) => sum + item.totalWeight, 0);

  const handlePrint = () => {
    const companyName = branding?.companyInfo?.name || branding?.companyName || "POLY FLECTA PLASTICA";
    const tagline = branding?.companyInfo?.tagline || "FABRICATION D'EMBALLAGE EN PLASTIQUE";
    const address = branding?.companyInfo?.address || "";
    const phone = branding?.companyInfo?.phone || "";
    const primaryColor = branding?.primaryColor || "#1976D2";

    const filteredItems = items.filter(item => item.designation && item.quantity > 0);

    const itemRows = filteredItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'};">
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.designation}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${item.quantity}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${item.weightPerUnit > 0 ? item.weightPerUnit.toFixed(2) : '-'}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:500;">${item.totalWeight.toFixed(2)} kg</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;">${item.unitPrice.toLocaleString()} DZD</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:500;">${item.total.toLocaleString()} DZD</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><title>Facture ${formData.invoiceNumber}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 15mm; } }
  body { font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
</style>
</head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:15px;border-bottom:3px solid ${primaryColor};margin-bottom:20px;">
    <div>
      ${branding?.logo ? `<img src="${branding.logo}" alt="Logo" style="height:60px;margin-bottom:8px;" />` : `<div style="width:60px;height:60px;background:${primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border-radius:6px;margin-bottom:8px;">PFP</div>`}
      <h2 style="margin:0;color:${primaryColor};font-size:18px;">${companyName}</h2>
      <p style="margin:2px 0;font-size:12px;color:#666;">${tagline}</p>
      ${address ? `<p style="margin:2px 0;font-size:11px;color:#999;">${address}</p>` : ''}
      ${phone ? `<p style="margin:2px 0;font-size:11px;color:#999;">Tél: ${phone}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <h3 style="margin:0;font-size:24px;color:${primaryColor};">FACTURE</h3>
      <p style="margin:4px 0;font-size:13px;color:#666;">N°: ${formData.invoiceNumber || '---'}</p>
      <p style="margin:2px 0;font-size:13px;color:#666;">Date: ${formatDateDMY(formData.date)}</p>
      ${formData.dueDate ? `<p style="margin:2px 0;font-size:12px;color:#999;">Échéance: ${formatDateDMY(formData.dueDate)}</p>` : ''}
    </div>
  </div>

  <div style="display:flex;gap:20px;margin-bottom:20px;">
    <div style="flex:1;padding:12px;background:${primaryColor}10;border-radius:6px;">
      <h4 style="margin:0 0 6px;color:${primaryColor};font-size:13px;">Client</h4>
      <p style="margin:2px 0;font-size:13px;font-weight:500;">${formData.clientName || '---'}</p>
      ${formData.clientAddress ? `<p style="margin:2px 0;font-size:11px;color:#666;">${formData.clientAddress}</p>` : ''}
      ${formData.clientPhone ? `<p style="margin:2px 0;font-size:11px;color:#666;">Tél: ${formData.clientPhone}</p>` : ''}
    </div>
    <div style="flex:1;padding:12px;background:#f5f5f5;border-radius:6px;">
      <h4 style="margin:0 0 6px;color:${primaryColor};font-size:13px;">Détails</h4>
      <p style="margin:2px 0;font-size:11px;"><span style="color:#666;">Mode:</span> ${formData.paymentMode}</p>
      ${formData.responsible ? `<p style="margin:2px 0;font-size:11px;"><span style="color:#666;">Responsable:</span> ${formData.responsible}</p>` : ''}
      ${formData.role ? `<p style="margin:2px 0;font-size:11px;"><span style="color:#666;">Service:</span> ${formData.role}</p>` : ''}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;">
    <thead>
      <tr style="background:${primaryColor};">
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);width:30px;text-align:center;">#</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:left;">Désignation</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:50px;">Qté</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:70px;">Poids/U</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:80px;">Poids Total</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:90px;">Prix U.</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:100px;">Montant</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr style="background:#f0f0f0;">
        <td colspan="4" style="border:1px solid #ddd;padding:8px;font-weight:600;">Total H.T</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:600;">${totalWeight.toFixed(2)} kg</td>
        <td style="border:1px solid #ddd;padding:8px;"></td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:600;">${totalHT.toLocaleString()} DZD</td>
      </tr>
      ${formData.applyTva ? `<tr style="background:#fafafa;">
        <td colspan="6" style="border:1px solid #ddd;padding:8px;text-align:right;">TVA (${(formData.tvaRate * 100).toFixed(0)}%)</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:500;">${tvaAmount.toLocaleString()} DZD</td>
      </tr>` : ''}
      <tr style="background:#e0e0e0;">
        <td colspan="6" style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:700;">Total T.T.C</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:700;color:${primaryColor};">${totalTTC.toLocaleString()} DZD</td>
      </tr>
    </tfoot>
  </table>

  <div style="padding:12px;background:${primaryColor}08;border:1px solid ${primaryColor}30;border-radius:6px;margin-bottom:20px;">
    <p style="margin:0;font-size:12px;"><strong>Arrêté la présente facture à la somme de:</strong></p>
    <p style="margin:4px 0 0;font-size:14px;color:${primaryColor};font-weight:500;">${numberToFrenchWords(Math.floor(totalTTC))} dinars algériens${formData.applyTva ? ' (TTC)' : ''}</p>
  </div>

  ${formData.notes ? `<div style="margin-bottom:20px;padding:10px;background:#fffde7;border:1px solid #fff9c4;border-radius:4px;">
    <p style="margin:0;font-size:11px;color:#666;"><strong>Notes:</strong> ${formData.notes}</p>
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;margin-top:30px;">
    <div>
      <p style="font-size:12px;font-weight:600;margin-bottom:8px;">Signature du client</p>
      <div style="width:200px;height:50px;border-bottom:1px solid #ccc;"></div>
    </div>
    <div style="text-align:right;">
      <p style="font-size:12px;font-weight:600;margin-bottom:8px;">Cachet et signature</p>
      <div style="width:200px;height:50px;border-bottom:1px solid #ccc;"></div>
    </div>
  </div>
</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }

    saveInvoiceCopy();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2" data-testid="text-quick-invoice-title">
            <FileText className="h-6 w-6 text-primary" />
            Facture Rapide
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Facture indépendante — non enregistrée dans le système
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(true)} data-testid="button-history-quick">
            <History className="h-4 w-4 mr-2" />
            Historique ({savedInvoices.length})
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)} data-testid="button-preview-quick">
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          <Button onClick={handlePrint} data-testid="button-print-quick">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Cette facture est indépendante du système. Elle n'affectera pas le stock, les ventes ou la comptabilité. Une copie sera automatiquement sauvegardée lors de l'impression.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails de la facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="qi-number">Numéro de facture</Label>
              <Input
                id="qi-number"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Ex: 001/2026"
                data-testid="input-qi-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-date">Date</Label>
              <Input
                id="qi-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-qi-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-responsible">Responsable</Label>
              <Input
                id="qi-responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Nom du responsable"
                data-testid="input-qi-responsible"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-role">Service / Rôle</Label>
              <Input
                id="qi-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Ex: Ventes"
                data-testid="input-qi-role"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qi-client">Nom du client</Label>
              <Input
                id="qi-client"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Nom du client"
                data-testid="input-qi-client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-client-address">Adresse du client</Label>
              <Input
                id="qi-client-address"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                placeholder="Adresse (optionnel)"
                data-testid="input-qi-client-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-client-phone">Téléphone du client</Label>
              <Input
                id="qi-client-phone"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="Tél (optionnel)"
                data-testid="input-qi-client-phone"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qi-payment">Mode de paiement</Label>
              <Select
                value={formData.paymentMode}
                onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
              >
                <SelectTrigger data-testid="select-qi-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A TERME">A Terme</SelectItem>
                  <SelectItem value="COMPTANT">Comptant</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qi-duedate">Date d'échéance</Label>
              <Input
                id="qi-duedate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                data-testid="input-qi-duedate"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                id="qi-tva"
                checked={formData.applyTva}
                onCheckedChange={(checked) => setFormData({ ...formData, applyTva: checked })}
                data-testid="switch-qi-tva"
              />
              <Label htmlFor="qi-tva" className="font-medium">Appliquer TVA</Label>
            </div>
            {formData.applyTva && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Taux:</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.tvaRate}
                  onChange={(e) => { const v = Number(e.target.value); setFormData({ ...formData, tvaRate: isNaN(v) ? 0.19 : v }); }}
                  className="w-20"
                  data-testid="input-qi-tva-rate"
                />
                <span className="text-sm text-muted-foreground">({(formData.tvaRate * 100).toFixed(0)}%)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Articles</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-qi-add-item">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[70px]">Qté</TableHead>
                  <TableHead className="min-w-[200px]">Désignation</TableHead>
                  <TableHead className="min-w-[100px]">Prix U. (DZD)</TableHead>
                  <TableHead className="min-w-[80px]">Poids/U (kg)</TableHead>
                  <TableHead className="min-w-[80px] text-right">Poids Total</TableHead>
                  <TableHead className="min-w-[100px] text-right">Montant (DZD)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        className="w-20"
                        data-testid={`input-qi-qty-${item.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.designation}
                        onChange={(e) => updateItem(item.id, "designation", e.target.value)}
                        placeholder="Description de l'article"
                        data-testid={`input-qi-designation-${item.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-24"
                        data-testid={`input-qi-price-${item.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.weightPerUnit || ""}
                        onChange={(e) => updateItem(item.id, "weightPerUnit", parseFloat(e.target.value) || 0)}
                        className="w-20"
                        data-testid={`input-qi-weight-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.totalWeight.toFixed(2)} kg
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {item.total.toLocaleString()} DZD
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        data-testid={`button-qi-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="flex gap-8 text-sm">
              <span className="text-muted-foreground">Poids total:</span>
              <span className="font-mono font-medium">{totalWeight.toFixed(2)} kg</span>
            </div>
            <div className="flex gap-8 text-sm">
              <span className="text-muted-foreground">Total H.T:</span>
              <span className="font-mono font-medium" data-testid="text-qi-total-ht">{totalHT.toLocaleString()} DZD</span>
            </div>
            {formData.applyTva && (
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">TVA ({(formData.tvaRate * 100).toFixed(0)}%):</span>
                <span className="font-mono font-medium">{tvaAmount.toLocaleString()} DZD</span>
              </div>
            )}
            <div className="flex gap-8 text-lg font-semibold">
              <span>Total T.T.C:</span>
              <span className="font-mono" data-testid="text-qi-total-ttc">{totalTTC.toLocaleString()} DZD</span>
            </div>
            <p className="text-sm text-muted-foreground italic mt-1">
              {numberToFrenchWords(Math.floor(totalTTC))} dinars algériens
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes (optionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Conditions, remarques, informations supplémentaires..."
            rows={3}
            data-testid="textarea-qi-notes"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setShowPreview(true)} data-testid="button-preview-quick-bottom">
          <Eye className="h-4 w-4 mr-2" />
          Aperçu
        </Button>
        <Button onClick={handlePrint} data-testid="button-print-quick-bottom">
          <Printer className="h-4 w-4 mr-2" />
          Imprimer la facture
        </Button>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de la facture</DialogTitle>
            <DialogDescription className="sr-only">Aperçu avant impression</DialogDescription>
          </DialogHeader>
          <div className="bg-white text-gray-900 p-8 rounded-md border">
            <div className="relative z-10">
              <div
                className="flex items-start justify-between mb-6 pb-4"
                style={{ borderBottom: `3px solid ${branding.primaryColor}` }}
              >
                <div className="flex items-start gap-4">
                  {branding.logo ? (
                    <img src={branding.logo} alt="Logo" className="h-16 w-auto object-contain" />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-md flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      PFP
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: branding.primaryColor }}>
                      {branding.companyInfo?.name || "POLY FLECTA PLASTICA"}
                    </h2>
                    <p className="text-sm text-gray-600">{branding.companyInfo?.tagline || "FABRICATION D'EMBALLAGE EN PLASTIQUE"}</p>
                    {branding.companyInfo?.address && <p className="text-xs text-gray-500 mt-1">{branding.companyInfo.address}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold" style={{ color: branding.primaryColor }}>FACTURE</h3>
                  <p className="text-sm text-gray-600 mt-1">N°: {formData.invoiceNumber || "---"}</p>
                  <p className="text-sm text-gray-600">Date: {formatDateDMY(formData.date)}</p>
                  {formData.dueDate && <p className="text-xs text-gray-500">Échéance: {formatDateDMY(formData.dueDate)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="p-4 rounded-md" style={{ backgroundColor: `${branding.primaryColor}10` }}>
                  <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>Client</h4>
                  <p className="text-sm font-medium">{formData.clientName || "---"}</p>
                  {formData.clientAddress && <p className="text-xs text-gray-500">{formData.clientAddress}</p>}
                  {formData.clientPhone && <p className="text-xs text-gray-500">Tél: {formData.clientPhone}</p>}
                </div>
                <div className="p-4 rounded-md bg-gray-50">
                  <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>Détails</h4>
                  <p className="text-xs"><span className="text-gray-600">Mode:</span> {formData.paymentMode}</p>
                  {formData.responsible && <p className="text-xs"><span className="text-gray-600">Responsable:</span> {formData.responsible}</p>}
                  {formData.role && <p className="text-xs"><span className="text-gray-600">Service:</span> {formData.role}</p>}
                </div>
              </div>

              <table className="w-full text-sm mb-6 border-collapse">
                <thead>
                  <tr style={{ backgroundColor: branding.primaryColor }}>
                    <th className="text-white p-3 text-center border border-white/20 w-12">#</th>
                    <th className="text-white p-3 text-left border border-white/20">Désignation</th>
                    <th className="text-white p-3 text-center border border-white/20 w-16">Qté</th>
                    <th className="text-white p-3 text-center border border-white/20 w-20">Poids/U</th>
                    <th className="text-white p-3 text-center border border-white/20 w-24">Poids Total</th>
                    <th className="text-white p-3 text-right border border-white/20 w-24">Prix U.</th>
                    <th className="text-white p-3 text-right border border-white/20 w-28">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(item => item.designation).map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3 text-center border">{index + 1}</td>
                      <td className="p-3 border">{item.designation}</td>
                      <td className="p-3 text-center border">{item.quantity}</td>
                      <td className="p-3 text-center border">{item.weightPerUnit > 0 ? item.weightPerUnit.toFixed(2) : "-"}</td>
                      <td className="p-3 text-center border font-medium">{item.totalWeight.toFixed(2)} kg</td>
                      <td className="p-3 text-right border">{item.unitPrice.toLocaleString()} DZD</td>
                      <td className="p-3 text-right border font-medium">{item.total.toLocaleString()} DZD</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td colSpan={4} className="p-3 border font-semibold">Total H.T</td>
                    <td className="p-3 text-center border font-semibold">{totalWeight.toFixed(2)} kg</td>
                    <td className="p-3 border"></td>
                    <td className="p-3 text-right border font-semibold">{totalHT.toLocaleString()} DZD</td>
                  </tr>
                  {formData.applyTva && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="p-3 border text-right">TVA ({(formData.tvaRate * 100).toFixed(0)}%)</td>
                      <td className="p-3 text-right border font-medium">{tvaAmount.toLocaleString()} DZD</td>
                    </tr>
                  )}
                  <tr className="bg-gray-200">
                    <td colSpan={6} className="p-3 border text-right font-bold">Total T.T.C</td>
                    <td className="p-3 text-right border font-bold" style={{ color: branding.primaryColor }}>
                      {totalTTC.toLocaleString()} DZD
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div
                className="p-4 rounded-md mb-6"
                style={{ backgroundColor: `${branding.primaryColor}05`, border: `1px solid ${branding.primaryColor}30` }}
              >
                <p className="text-sm"><span className="font-semibold">Arrêté la présente facture à la somme de:</span></p>
                <p className="text-lg font-medium mt-1" style={{ color: branding.primaryColor }}>
                  {numberToFrenchWords(Math.floor(totalTTC))} dinars algériens
                  {formData.applyTva && " (TTC)"}
                </p>
              </div>

              {formData.notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
                  <p className="text-sm text-gray-700"><strong>Notes:</strong> {formData.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-semibold mb-2">Signature du client</p>
                  <div className="h-16 border-b border-gray-300"></div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold mb-2">Cachet et signature</p>
                  <div className="h-16 border-b border-gray-300"></div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
            <Button onClick={() => { setShowPreview(false); handlePrint(); }} data-testid="button-print-from-preview">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des factures rapides
            </DialogTitle>
            <DialogDescription>
              {savedInvoices.length} facture(s) sauvegardée(s)
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, client..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-9"
              data-testid="input-history-search"
            />
          </div>
          {savedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune facture sauvegardée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedInvoices
                  .filter((inv) => {
                    if (!historySearch) return true;
                    const q = historySearch.toLowerCase();
                    return (
                      inv.invoiceNumber.toLowerCase().includes(q) ||
                      (inv.clientName || "").toLowerCase().includes(q) ||
                      (inv.responsible || "").toLowerCase().includes(q)
                    );
                  })
                  .map((inv) => (
                    <TableRow key={inv.id} data-testid={`row-qi-${inv.id}`}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{formatDateDMY(inv.date)}</TableCell>
                      <TableCell>{inv.clientName || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{(inv.totalTTC || 0).toLocaleString()} DZD</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingInvoice(inv)}
                            data-testid={`button-view-qi-${inv.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadInvoice(inv)}
                            data-testid={`button-load-qi-${inv.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Supprimer cette facture ?")) {
                                deleteMutation.mutate(inv.id);
                              }
                            }}
                            data-testid={`button-delete-qi-${inv.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Facture {viewingInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>Détails de la facture sauvegardée</DialogDescription>
          </DialogHeader>
          {viewingInvoice && (() => {
            let parsedItems: QuickLineItem[] = [];
            try { parsedItems = JSON.parse(viewingInvoice.items); } catch {}
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date:</span> {formatDateDMY(viewingInvoice.date)}</div>
                  <div><span className="text-muted-foreground">Mode:</span> {viewingInvoice.paymentMode}</div>
                  {viewingInvoice.clientName && <div><span className="text-muted-foreground">Client:</span> {viewingInvoice.clientName}</div>}
                  {viewingInvoice.responsible && <div><span className="text-muted-foreground">Responsable:</span> {viewingInvoice.responsible}</div>}
                  {viewingInvoice.clientPhone && <div><span className="text-muted-foreground">Tél:</span> {viewingInvoice.clientPhone}</div>}
                  {viewingInvoice.dueDate && <div><span className="text-muted-foreground">Échéance:</span> {formatDateDMY(viewingInvoice.dueDate)}</div>}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-center">Qté</TableHead>
                      <TableHead className="text-right">Prix U.</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{item.designation}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{(item.unitPrice || 0).toLocaleString()} DZD</TableCell>
                        <TableCell className="text-right font-medium">{(item.total || 0).toLocaleString()} DZD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-semibold">Total TTC</span>
                  <span className="text-lg font-bold text-primary">{(viewingInvoice.totalTTC || 0).toLocaleString()} DZD</span>
                </div>
                {viewingInvoice.notes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm"><strong>Notes:</strong> {viewingInvoice.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewingInvoice(null)}>
              Fermer
            </Button>
            <Button onClick={() => { if (viewingInvoice) { loadInvoice(viewingInvoice); } }}>
              <Download className="h-4 w-4 mr-2" />
              Charger dans le formulaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
