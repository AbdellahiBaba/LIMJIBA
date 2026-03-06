import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  ArrowUpDown,
  History,
  Download,
  Upload,
  Barcode,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Printer,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/csv-export";
import type { Product, InsertProduct, StockMovementWithProduct, InventoryValuation } from "@shared/schema";

const categoryKeys = [
  { value: "Sacs en plastique", key: "stock.categories.plasticBags" },
  { value: "Emballage alimentaire", key: "stock.categories.foodPackaging" },
  { value: "Emballage industriel", key: "stock.categories.industrialPackaging" },
  { value: "Accessoires", key: "stock.categories.accessories" },
  { value: "Autres", key: "stock.categories.other" },
];

const categories = categoryKeys.map(c => c.value);

const stockReasonKeys = [
  { value: "purchase", key: "stock.reasons.purchase" },
  { value: "return", key: "stock.reasons.return" },
  { value: "damaged", key: "stock.reasons.damaged" },
  { value: "correction", key: "stock.reasons.correction" },
  { value: "transfer", key: "stock.reasons.transfer" },
  { value: "other", key: "stock.reasons.other" },
];

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertProduct>>({
    name: product?.name ?? "",
    category: product?.category ?? categories[0],
    unitPrice: product?.unitPrice ?? 0,
    costPrice: product?.costPrice ?? 0,
    weightPerUnit: product?.weightPerUnit ?? 0,
    stockQuantity: product?.stockQuantity ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 10,
    unit: product?.unit ?? "pcs",
    barcode: product?.barcode ?? "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: product?.name ?? "",
        category: product?.category ?? categories[0],
        unitPrice: product?.unitPrice ?? 0,
        costPrice: product?.costPrice ?? 0,
        weightPerUnit: product?.weightPerUnit ?? 0,
        stockQuantity: product?.stockQuantity ?? 0,
        lowStockThreshold: product?.lowStockThreshold ?? 10,
        unit: product?.unit ?? "pcs",
        barcode: product?.barcode ?? "",
      });
    }
  }, [open, product]);

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productAdded") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertProduct) =>
      apiRequest("PATCH", `/api/products/${product?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productUpdated") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = formData as InsertProduct;
    if (product) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData({ ...formData, barcode: `PFP-${timestamp}-${random}` });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product ? t("stock.editProduct") : t("stock.addProduct")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {product ? t("stock.editProduct") : t("stock.addProduct")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("stock.productName")} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("stock.productName")}
              required
              data-testid="input-product-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t("stock.category")} *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{t(cat.key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t("stock.unitPrice")} (DZD) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                required
                data-testid="input-unit-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">{t("stock.costPrice")} (DZD) *</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                required
                data-testid="input-cost-price"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightPerUnit">{t("stock.weightPerUnit")} (kg)</Label>
              <Input
                id="weightPerUnit"
                type="number"
                step="0.001"
                min="0"
                value={formData.weightPerUnit}
                onChange={(e) => setFormData({ ...formData, weightPerUnit: parseFloat(e.target.value) || 0 })}
                data-testid="input-weight-per-unit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("stock.unit")}</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger data-testid="select-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">{t("stock.pieces")}</SelectItem>
                  <SelectItem value="box">{t("stock.box")}</SelectItem>
                  <SelectItem value="kg">{t("stock.kg")}</SelectItem>
                  <SelectItem value="palette">{t("stock.palette")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">{t("stock.stockQuantity")} *</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                required
                data-testid="input-stock-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">{t("stock.lowStock")}</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                data-testid="input-low-stock"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">{t("stock.barcode")}</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={formData.barcode || ""}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder={t("stock.barcode")}
                data-testid="input-barcode"
              />
              <Button type="button" variant="outline" size="icon" onClick={generateBarcode} data-testid="button-generate-barcode">
                <Barcode className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-product">
              {isPending ? t("common.loading") : product ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("purchase");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) {
      setAdjustmentType("in");
      setQuantity(0);
      setReason("purchase");
      setReference("");
    }
  }, [open]);

  const adjustMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number; reason: string; reference?: string }) =>
      apiRequest("POST", "/api/stock-movements/adjust", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.stockAdjusted") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || quantity <= 0) return;
    
    const finalQuantity = adjustmentType === "out" ? -quantity : quantity;
    adjustMutation.mutate({
      productId: product.id,
      quantity: finalQuantity,
      reason,
      reference: reference || undefined,
    });
  };

  const getReasonLabel = (reasonValue: string) => {
    const reasonObj = stockReasonKeys.find(r => r.value === reasonValue);
    if (!reasonObj) return reasonValue;
    return t(reasonObj.key);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("stock.adjustStock")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("stock.adjustStock")}
          </DialogDescription>
        </DialogHeader>
        {product && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("stock.currentStock")}: {product.stockQuantity} {product.unit}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === "in" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustmentType("in")}
                data-testid="button-stock-in"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {t("stock.stockIn")}
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "out" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustmentType("out")}
                data-testid="button-stock-out"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                {t("stock.stockOut")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{t("stock.quantity")} *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                required
                data-testid="input-adjust-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t("stock.reason")} *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue>{getReasonLabel(reason)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stockReasonKeys.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">{t("stock.reference")}</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t("stock.referencePlaceholder")}
                data-testid="input-reference"
              />
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                {t("stock.newStock")}: <span className="font-medium">
                  {adjustmentType === "in" 
                    ? product.stockQuantity + quantity 
                    : Math.max(0, product.stockQuantity - quantity)} {product.unit}
                </span>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={adjustMutation.isPending || quantity <= 0} data-testid="button-confirm-adjust">
                {adjustMutation.isPending ? t("common.loading") : t("common.confirm")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StockHistoryDialog({
  open,
  onOpenChange,
  product,
  t,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  t: (key: string) => string;
  language: string;
}) {
  const { data: movements, isLoading } = useQuery<StockMovementWithProduct[]>({
    queryKey: ["/api/stock-movements", product?.id],
    enabled: open && !!product,
  });

  const getReasonLabel = (reason: string) => {
    const reasonObj = stockReasonKeys.find(r => r.value === reason);
    if (!reasonObj) return reason;
    return t(reasonObj.key);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "ar" ? "ar-DZ" : language === "en" ? "en-US" : "fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("stock.stockHistory")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("stock.stockHistory")}
          </DialogDescription>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("stock.currentStock")}: {product.stockQuantity} {product.unit}
              </p>
            </div>
            
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : movements && movements.length > 0 ? (
                <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.id} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {movement.quantity > 0 ? (
                            <ArrowUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={movement.quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                          </span>
                        </div>
                        <Badge variant="secondary">{getReasonLabel(movement.reason)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {movement.previousStock} {"->"} {movement.newStock}
                      </div>
                      {movement.reference && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("stock.reference")}: {movement.reference}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(movement.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("stock.noMovements")}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportExportSection({ t }: { t: (key: string) => string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/products/export/csv");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: t("stock.exportSuccess") });
    } catch (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const csvData = await file.text();
      const response = await apiRequest("POST", "/api/products/import/csv", { csvData });
      const result = response as unknown as { imported: number; errors: string[] };
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      
      if (result.imported > 0) {
        toast({ title: `${t("stock.importSuccess")}: ${result.imported} ${t("stock.products")}` });
      }
      if (result.errors && result.errors.length > 0) {
        toast({ 
          title: `${result.errors.length} ${t("stock.importErrors")}`, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("common.error"), variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-csv">
        <Download className="h-4 w-4 mr-2" />
        {t("stock.export")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-import-csv">
        <Upload className="h-4 w-4 mr-2" />
        {t("stock.import")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

export default function Stock() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: inventoryValuation } = useQuery<InventoryValuation>({
    queryKey: ["/api/inventory/valuation"],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/products/${id}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productDeleted") });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products?.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingProduct(undefined);
    setDialogOpen(true);
  };

  const printBarcodeLabels = (productsToPrint: Product[]) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const labelsHtml = productsToPrint.map((p) => `
      <div class="label">
        <div class="name">${p.name}</div>
        <div class="barcode-text">${p.barcode || p.id.slice(0, 12)}</div>
        <svg class="barcode-svg" id="bc-${p.id}"></svg>
        <div class="price">${p.unitPrice.toLocaleString()} DZD</div>
      </div>
    `).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
    <style>
      @page { margin: 5mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Roboto', Arial, sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
      .label {
        border: 1px solid #ccc; padding: 3mm; text-align: center;
        page-break-inside: avoid; height: 32mm; display: flex;
        flex-direction: column; justify-content: center; align-items: center;
      }
      .name { font-weight: bold; font-size: 9pt; margin-bottom: 1mm; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .barcode-text { font-family: monospace; font-size: 8pt; letter-spacing: 1px; margin-bottom: 1mm; }
      .barcode-svg { max-width: 55mm; height: 12mm; }
      .price { font-weight: bold; font-size: 10pt; margin-top: 1mm; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <div class="no-print" style="padding:10px;text-align:center;margin-bottom:10px;">
      <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;">
        ${t("stock.printLabels")}
      </button>
      <span style="margin-left:10px;">${productsToPrint.length} ${t("stock.labelCount")}</span>
    </div>
    <div class="grid">${labelsHtml}</div>
    <script>
      function drawBarcode(svgEl, text) {
        if (!svgEl || !text) return;
        const code128B = [
          '11011001100','11001101100','11001100110','10010011000','10010001100',
          '10001001100','10011001000','10011000100','10001100100','11001001000',
          '11001000100','11000100100','10110011100','10011011100','10011001110',
          '10111001100','10011101100','10011100110','11001110010','11001011100',
          '11001001110','11011100100','11001110100','11100101100','11100100110',
          '11101100100','11100110100','11100110010','11011011000','11011000110',
          '11000110110','10100011000','10001011000','10001000110','10110001000',
          '10001101000','10001100010','11010001000','11000101000','11000100010',
          '10110111000','10110001110','10001101110','10111011000','10111000110',
          '10001110110','11101110110','11010001110','11000101110','11011101000',
          '11011100010','11011101110','11101011000','11101000110','11100010110',
          '11101101000','11101100010','11100011010','11101111010','11001000010',
          '11110001010','10100110000','10100001100','10010110000','10010000110',
          '10000101100','10000100110','10110010000','10110000100','10011010000',
          '10011000010','10000110100','10000110010','11000010010','11001010000',
          '11110111010','11000010100','10001111010','10100111100','10010111100',
          '10010011110','10111100100','10011110100','10011110010','11110100100',
          '11110010100','11110010010','11011011110','11110110110','11110011010',
          '11000111010','11010111000','11010111110','10001111110'
        ];
        const startB = '11010010000';
        const stop = '1100011101011';
        let sum = 104;
        let pattern = startB;
        for (let i = 0; i < text.length; i++) {
          const v = text.charCodeAt(i) - 32;
          if (v >= 0 && v < code128B.length) {
            pattern += code128B[v];
            sum += v * (i + 1);
          }
        }
        pattern += code128B[sum % 103];
        pattern += stop;
        const w = pattern.length;
        svgEl.setAttribute('viewBox', '0 0 ' + w + ' 40');
        let bars = '';
        for (let i = 0; i < pattern.length; i++) {
          if (pattern[i] === '1') {
            bars += '<rect x="' + i + '" y="0" width="1" height="40" fill="black"/>';
          }
        }
        svgEl.innerHTML = bars;
      }
      document.querySelectorAll('.barcode-svg').forEach(function(svg) {
        var label = svg.closest('.label');
        var text = label ? label.querySelector('.barcode-text').textContent.trim() : '';
        drawBarcode(svg, text);
      });
    </script></body></html>`);
    win.document.close();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(undefined);
  };

  const handleAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustDialogOpen(true);
  };

  const handleHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-stock-title">
            {t("stock.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("stock.searchProducts")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!products) return;
              exportToCsv(
                products,
                [
                  { header: t("stock.csvName"), accessor: (p) => p.name },
                  { header: t("stock.csvCategory"), accessor: (p) => p.category },
                  { header: t("stock.csvUnitPrice"), accessor: (p) => p.unitPrice },
                  { header: t("stock.csvCostPrice"), accessor: (p) => p.costPrice },
                  { header: t("stock.csvStock"), accessor: (p) => p.stockQuantity },
                  { header: t("stock.csvUnit"), accessor: (p) => p.unit },
                  { header: t("stock.csvBarcode"), accessor: (p) => p.barcode },
                ],
                "stock"
              );
            }}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("common.exportCsv")}
          </Button>
          <ImportExportSection t={t} />
          <Button
            variant="outline"
            onClick={() => {
              if (filteredProducts && filteredProducts.length > 0) {
                printBarcodeLabels(filteredProducts);
              }
            }}
            disabled={!filteredProducts || filteredProducts.length === 0}
            data-testid="button-print-all-barcodes"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("stock.printBarcodes")}
          </Button>
          <Button onClick={handleNew} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            {t("stock.addProduct")}
          </Button>
        </div>
      </div>

      {inventoryValuation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stock.totalInventoryValue")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-total-inventory-value">
                {inventoryValuation.totalInventoryValue.toLocaleString()} DZD
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("stock.perGaapIfrs")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stock.productsInStock")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-products-with-stock">
                {inventoryValuation.productsWithStock} / {inventoryValuation.totalProducts}
              </div>
            </CardContent>
          </Card>
          
          {inventoryValuation.productsWithWarnings > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {t("stock.costWarnings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-cost-warnings">
                  {inventoryValuation.productsWithWarnings}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("stock.productsCostZero")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              {t("stock.lowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge
                  key={product.id}
                  variant="secondary"
                  className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                >
                  {product.name} ({product.stockQuantity} {t("stock.left")})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("stock.searchByNameOrBarcode")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-products"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
                <SelectValue placeholder={t("stock.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.allCategories")}</SelectItem>
                {categoryKeys.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{t(cat.key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      <div className="flex items-center gap-1">
                        {t("stock.product")}
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>{t("stock.category")}</TableHead>
                    <TableHead className="text-right">{t("stock.unitPrice")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.costPrice")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock.stock")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.inventoryValue")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                    const hasCostWarning = product.stockQuantity > 0 && product.costPrice <= 0;
                    const inventoryValue = Math.round(product.stockQuantity * product.costPrice * 100) / 100;
                    return (
                      <TableRow 
                        key={product.id} 
                        data-testid={`row-product-${product.id}`}
                        className={hasCostWarning ? "bg-red-50 dark:bg-red-950/20" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="font-medium">{product.name}</span>
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Barcode className="h-3 w-3" />
                                  {product.barcode}
                                </div>
                              )}
                              {hasCostWarning && (
                                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("stock.updateCostPrice")}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {categoryKeys.find(c => c.value === product.category) ? t(categoryKeys.find(c => c.value === product.category)!.key) : product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {product.unitPrice.toLocaleString()} DZD
                        </TableCell>
                        <TableCell className={`text-right font-mono ${hasCostWarning ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                          {product.costPrice.toLocaleString()} DZD
                          {hasCostWarning && (
                            <AlertTriangle className="inline-block ml-1 h-3 w-3 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isLowStock ? "text-orange-600 dark:text-orange-400 font-medium" : ""}>
                            {product.stockQuantity} {product.unit}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="inline-block ml-1 h-3 w-3 text-orange-500" />
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${hasCostWarning ? "text-red-600 dark:text-red-400" : ""}`} data-testid={`text-inventory-value-${product.id}`}>
                          {inventoryValue.toLocaleString()} DZD
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavoriteMutation.mutate(product.id)}
                              data-testid={`button-favorite-${product.id}`}
                              className="toggle-elevate"
                            >
                              <Star className={`h-4 w-4 ${product.isFavorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => printBarcodeLabels([product])}
                              data-testid={`button-print-barcode-${product.id}`}
                              title={t("stock.printBarcode")}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAdjust(product)}
                              data-testid={`button-adjust-${product.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleHistory(product)}
                              data-testid={`button-history-${product.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(product)}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t("common.noData")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search || categoryFilter !== "all" ? t("stock.searchProducts") : t("stock.addProduct")}
              </p>
              {!search && categoryFilter === "all" && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("stock.addProduct")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
        onSuccess={handleDialogClose}
        t={t}
      />

      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        product={adjustingProduct}
        onSuccess={() => setAdjustDialogOpen(false)}
        t={t}
      />

      <StockHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        product={historyProduct}
        t={t}
        language={language}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stock.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("stock.confirmDeleteMessage").replace("{name}", productToDelete?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
