import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { useLanguage, useBranding } from "@/contexts/language-context";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Product, InvoiceWithItems, InsertInvoiceItem } from "@shared/schema";

interface InvoiceLineItem {
  id: string;
  productId?: string;
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

export default function InvoiceForm() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEditing = params.id && params.id !== "new";
  const [showPreview, setShowPreview] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    responsible: "Djeilat Mohamed",
    role: "Ventes",
    paymentMode: "A TERME",
    dueDate: "",
    clientName: "",
    applyTva: false,
    tvaRate: 0.19,
  });

  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: crypto.randomUUID(), designation: "", quantity: 0, unitPrice: 0, weightPerUnit: 0, totalWeight: 0, total: 0 },
  ]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: existingInvoice } = useQuery<InvoiceWithItems>({
    queryKey: ["/api/invoices", params.id],
    enabled: !!isEditing,
  });

  const { data: nextNumber } = useQuery<{ nextNumber: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: !isEditing,
  });

  useEffect(() => {
    if (nextNumber && !isEditing) {
      setFormData((prev) => ({ ...prev, invoiceNumber: nextNumber.nextNumber }));
    }
  }, [nextNumber, isEditing]);

  useEffect(() => {
    if (existingInvoice) {
      setFormData({
        invoiceNumber: existingInvoice.invoiceNumber,
        date: existingInvoice.date,
        responsible: existingInvoice.responsible,
        role: existingInvoice.role,
        paymentMode: existingInvoice.paymentMode,
        dueDate: existingInvoice.dueDate || "",
        clientName: existingInvoice.clientName || "",
        applyTva: existingInvoice.applyTva || false,
        tvaRate: existingInvoice.tvaRate || 0.19,
      });
      if (existingInvoice.items.length > 0) {
        setItems(
          existingInvoice.items.map((item) => ({
            id: item.id,
            productId: item.productId || undefined,
            designation: item.designation,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            weightPerUnit: item.weightPerUnit || 0,
            totalWeight: item.totalWeight || 0,
            total: item.total,
          }))
        );
      }
    }
  }, [existingInvoice]);

  const createMutation = useMutation({
    mutationFn: async (data: { invoice: typeof formData & { totalHT: number; tvaAmount: number; totalTTC: number; totalWeight: number }; items: InsertInvoiceItem[] }) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: (createdInvoice: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice created successfully" });
      
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
      toast({ title: error.message || "Error", variant: "destructive" });
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), designation: "", quantity: 0, unitPrice: 0, weightPerUnit: 0, totalWeight: 0, total: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.total = updated.quantity * updated.unitPrice;
          }
          if (field === "quantity" || field === "weightPerUnit") {
            updated.totalWeight = updated.quantity * updated.weightPerUnit;
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
              unitPrice: product.unitPrice,
              weightPerUnit: product.weightPerUnit || 0,
              total: item.quantity * product.unitPrice,
              totalWeight: item.quantity * (product.weightPerUnit || 0),
            };
          }
          return item;
        })
      );
    }
  };

  const totalHT = items.reduce((sum, item) => sum + item.total, 0);
  const tvaAmount = formData.applyTva ? Math.round(totalHT * formData.tvaRate * 100) / 100 : 0;
  const totalTTC = totalHT + tvaAmount;
  const totalWeight = items.reduce((sum, item) => sum + item.totalWeight, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceItems: InsertInvoiceItem[] = items
      .filter((item) => item.designation && item.quantity > 0)
      .map((item) => ({
        invoiceId: "",
        productId: item.productId || null,
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        weightPerUnit: item.weightPerUnit,
        totalWeight: item.totalWeight,
        total: item.total,
      }));

    createMutation.mutate({
      invoice: { ...formData, totalHT, tvaAmount, totalTTC, totalWeight },
      items: invoiceItems,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-invoice-form-title">
            {isEditing ? "Edit Invoice" : "New Invoice"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? "Modify invoice details" : "Create a new invoice"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  placeholder="0001/2025"
                  required
                  data-testid="input-invoice-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsible</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) =>
                    setFormData({ ...formData, responsible: e.target.value })
                  }
                  required
                  data-testid="input-responsible"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  data-testid="input-role"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Client name (optional)"
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMode: value })
                  }
                >
                  <SelectTrigger data-testid="select-payment-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A TERME">A Terme</SelectItem>
                    <SelectItem value="COMPTANT">Comptant</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  data-testid="input-due-date"
                />
              </div>
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
                  Apply TVA (19%)
                </Label>
              </div>
              {formData.applyTva && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="tvaRate" className="text-sm text-muted-foreground">
                    Rate:
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Qty</TableHead>
                    <TableHead className="min-w-[200px]">Designation</TableHead>
                    <TableHead className="min-w-[100px]">Unit Price (DZD)</TableHead>
                    <TableHead className="min-w-[80px]">Weight/Unit (kg)</TableHead>
                    <TableHead className="min-w-[80px] text-right">Total Weight (kg)</TableHead>
                    <TableHead className="min-w-[100px] text-right">Total (DZD)</TableHead>
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
                          onChange={(e) =>
                            updateItem(item.id, "quantity", parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                          data-testid={`input-qty-${item.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Select
                            value={item.productId || "custom"}
                            onValueChange={(value) => {
                              if (value !== "custom") {
                                selectProduct(item.id, value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select or type custom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Custom item</SelectItem>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {product.unitPrice.toLocaleString()} DZD
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={item.designation}
                            onChange={(e) =>
                              updateItem(item.id, "designation", e.target.value)
                            }
                            placeholder="Item description"
                            data-testid={`input-designation-${item.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                          data-testid={`input-price-${item.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.weightPerUnit || ""}
                          onChange={(e) =>
                            updateItem(item.id, "weightPerUnit", parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                          data-testid={`input-weight-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.totalWeight.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.total.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
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
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="font-mono font-medium" data-testid="text-total-weight">
                  {totalWeight.toFixed(2)} kg
                </span>
              </div>
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">Total H.T:</span>
                <span className="font-mono font-medium" data-testid="text-total-ht">
                  {totalHT.toLocaleString()} DZD
                </span>
              </div>
              {formData.applyTva && (
                <div className="flex gap-8 text-sm">
                  <span className="text-muted-foreground">TVA ({(formData.tvaRate * 100).toFixed(0)}%):</span>
                  <span className="font-mono font-medium" data-testid="text-tva-amount">
                    {tvaAmount.toLocaleString()} DZD
                  </span>
                </div>
              )}
              <div className="flex gap-8 text-lg font-semibold">
                <span>Total T.T.C:</span>
                <span className="font-mono" data-testid="text-total-ttc">
                  {totalTTC.toLocaleString()} DZD
                </span>
              </div>
              <p className="text-sm text-muted-foreground italic mt-2" data-testid="text-amount-words">
                {numberToFrenchWords(Math.floor(totalTTC))}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/invoices")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowPreview(true)}
            data-testid="button-preview-invoice"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-invoice">
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </form>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div 
            ref={invoiceRef}
            className="bg-white text-gray-900 p-8 rounded-md border"
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
                <div className="flex items-start gap-4">
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
                      {branding.companyInfo?.name || "POLY FLECTA PLASTICA"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {branding.companyInfo?.tagline || "FABRICATION D'EMBALLAGE EN PLASTIQUE"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {branding.companyInfo?.address || "Village Zaitout, Local N°01, Commune Hammam Dalaa - W M'sila"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 
                    className="text-2xl font-bold"
                    style={{ color: branding.primaryColor }}
                  >
                    FACTURE
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    N°: {formData.invoiceNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: {formData.date}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="p-4 rounded-md" style={{ backgroundColor: `${branding.primaryColor}10` }}>
                  <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>
                    Client
                  </h4>
                  <p className="text-sm">{formData.clientName || "---"}</p>
                </div>
                <div className="p-4 rounded-md" style={{ backgroundColor: `${branding.accentColor}10` }}>
                  <h4 className="font-semibold mb-2" style={{ color: branding.primaryColor }}>
                    Détails
                  </h4>
                  <p className="text-xs">
                    <span className="text-gray-600">Mode de paiement:</span> {formData.paymentMode}
                  </p>
                  <p className="text-xs">
                    <span className="text-gray-600">Responsable:</span> {formData.responsible}
                  </p>
                  {formData.dueDate && (
                    <p className="text-xs">
                      <span className="text-gray-600">Échéance:</span> {formData.dueDate}
                    </p>
                  )}
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
                    <td className="p-3 text-right border font-semibold">
                      {totalHT.toLocaleString()} DZD
                    </td>
                  </tr>
                  {formData.applyTva && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="p-3 border text-right">TVA ({(formData.tvaRate * 100).toFixed(0)}%)</td>
                      <td className="p-3 text-right border font-medium">
                        {tvaAmount.toLocaleString()} DZD
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-200">
                    <td colSpan={6} className="p-3 border text-right font-bold">Total T.T.C</td>
                    <td 
                      className="p-3 text-right border font-bold"
                      style={{ color: branding.primaryColor }}
                    >
                      {totalTTC.toLocaleString()} DZD
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div 
                className="p-4 rounded-md mb-6"
                style={{ backgroundColor: `${branding.primaryColor}05`, border: `1px solid ${branding.primaryColor}30` }}
              >
                <p className="text-sm">
                  <span className="font-semibold">Arrêté la présente facture à la somme de:</span>
                </p>
                <p className="text-lg font-medium mt-1" style={{ color: branding.primaryColor }}>
                  {numberToFrenchWords(Math.floor(totalTTC))} dinars algériens
                  {formData.applyTva && " (TTC)"}
                </p>
              </div>

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
              Close
            </Button>
            <Button onClick={() => setShowPreview(false)} data-testid="button-confirm-preview">
              <Save className="h-4 w-4 mr-2" />
              Confirm & Continue Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
