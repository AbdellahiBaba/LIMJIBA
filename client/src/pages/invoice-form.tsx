import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
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
import { ArrowLeft, Plus, Trash2, Save, Printer } from "lucide-react";
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
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEditing = params.id && params.id !== "new";

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    responsible: "Djeilat Mohamed",
    role: "Ventes",
    paymentMode: "A TERME",
    dueDate: "",
    clientName: "",
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
    mutationFn: (data: { invoice: typeof formData & { totalHT: number; totalTTC: number; totalWeight: number }; items: InsertInvoiceItem[] }) =>
      apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice created successfully" });
      navigate("/invoices");
    },
    onError: () => {
      toast({ title: "Failed to create invoice", variant: "destructive" });
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
  const totalTTC = totalHT;
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
      invoice: { ...formData, totalHT, totalTTC, totalWeight },
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
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-invoice">
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
