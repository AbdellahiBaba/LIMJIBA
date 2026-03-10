import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Search, ClipboardList, Trash2, CheckCircle, Download, Package, Truck, Eye } from "lucide-react";
import type { PurchaseOrderWithItems, Supplier, Product } from "@shared/schema";

interface POItemForm {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export default function PurchaseOrders() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItemForm[]>([{ productId: "", productName: "", quantity: 1, unitCost: 0, total: 0 }]);

  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingPO, setShippingPO] = useState<PurchaseOrderWithItems | null>(null);
  const [shippingCostInput, setShippingCostInput] = useState("");
  const [distributionMethod, setDistributionMethod] = useState("by_quantity");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailPO, setDetailPO] = useState<PurchaseOrderWithItems | null>(null);

  const { data: pos = [], isLoading } = useQuery<PurchaseOrderWithItems[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: suppliersList = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: productsList = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: nextNumber } = useQuery<{ nextNumber: string }>({
    queryKey: ["/api/purchase-orders/next-number"],
  });

  useEffect(() => {
    if (nextNumber?.nextNumber && !orderNumber) {
      setOrderNumber(nextNumber.nextNumber);
    }
  }, [nextNumber]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/next-number"] });
      toast({ title: t("purchaseOrders.poCreated") });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/purchase-orders/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t("purchaseOrders.poReceived"), description: t("purchaseOrders.stockUpdated") });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: t("purchaseOrders.poDeleted") });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const shippingMutation = useMutation({
    mutationFn: (data: { id: string; shippingCost: number; distributionMethod: string }) =>
      apiRequest("POST", `/api/purchase-orders/${data.id}/shipping`, {
        shippingCost: data.shippingCost,
        distributionMethod: data.distributionMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t("purchaseOrders.shippingAddedSuccess") });
      closeShippingDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function closeDialog() {
    setDialogOpen(false);
    setOrderNumber(nextNumber?.nextNumber || "");
    setSupplierId("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setItems([{ productId: "", productName: "", quantity: 1, unitCost: 0, total: 0 }]);
  }

  function openShippingDialog(po: PurchaseOrderWithItems) {
    setShippingPO(po);
    setShippingCostInput("");
    setDistributionMethod("by_quantity");
    setShippingDialogOpen(true);
  }

  function closeShippingDialog() {
    setShippingDialogOpen(false);
    setShippingPO(null);
    setShippingCostInput("");
    setDistributionMethod("by_quantity");
  }

  function handleShippingSubmit() {
    if (!shippingPO) return;
    const cost = parseFloat(shippingCostInput);
    if (!cost || cost <= 0) {
      return toast({ title: t("purchaseOrders.shippingCostAmount"), variant: "destructive" });
    }
    shippingMutation.mutate({
      id: shippingPO.id,
      shippingCost: cost,
      distributionMethod,
    });
  }

  function openDetailDialog(po: PurchaseOrderWithItems) {
    setDetailPO(po);
    setDetailDialogOpen(true);
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === "productId") {
      const product = productsList.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitCost = product.costPrice || 0;
      }
    }
    newItems[index].total = newItems[index].quantity * newItems[index].unitCost;
    setItems(newItems);
  }

  function addItem() {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitCost: 0, total: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!supplierId) return toast({ title: t("purchaseOrders.supplierRequired"), variant: "destructive" });
    if (items.some(i => !i.productName || i.quantity <= 0)) return toast({ title: t("purchaseOrders.checkItems"), variant: "destructive" });
    
    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
    createMutation.mutate({
      orderNumber,
      supplierId,
      date,
      status: "draft",
      totalAmount,
      notes,
      items: items.map(i => ({
        productId: i.productId || null,
        productName: i.productName,
        quantity: i.quantity,
        unitCost: i.unitCost,
        total: i.total,
      })),
    });
  }

  function exportCSV() {
    const headers = [t("purchaseOrders.orderNumber"), t("purchaseOrders.supplier"), t("common.date"), t("common.status"), t("common.total")];
    const rows = filtered.map(po => [
      po.orderNumber, po.supplier?.name || "", po.date,
      statusLabel(po.status),
      po.totalAmount.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bons_commande_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      draft: t("purchaseOrders.statusDraft"),
      ordered: t("purchaseOrders.statusOrdered"),
      received: t("purchaseOrders.statusReceived"),
      cancelled: t("purchaseOrders.statusCancelled"),
    };
    return map[status] || status;
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    ordered: "bg-blue-100 text-blue-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const filtered = pos.filter(po => {
    const matchSearch = po.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (po.supplier?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <ClipboardList className="h-6 w-6 text-primary" />
            {t("purchaseOrders.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t("purchaseOrders.count")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-po">
            <Plus className="h-4 w-4 mr-2" />
            {t("purchaseOrders.newPO")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("purchaseOrders.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("purchaseOrders.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("purchaseOrders.statusDraft")}</SelectItem>
            <SelectItem value="ordered">{t("purchaseOrders.statusOrdered")}</SelectItem>
            <SelectItem value="received">{t("purchaseOrders.statusReceived")}</SelectItem>
            <SelectItem value="cancelled">{t("purchaseOrders.statusCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("purchaseOrders.orderNumber")}</TableHead>
                <TableHead>{t("purchaseOrders.supplier")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.total")}</TableHead>
                <TableHead className="text-right">{t("purchaseOrders.shippingCost")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("purchaseOrders.noPurchaseOrders")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(po => (
                  <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                    <TableCell className="font-medium font-mono">{po.orderNumber}</TableCell>
                    <TableCell>{po.supplier?.name || "-"}</TableCell>
                    <TableCell>{po.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={statusColors[po.status] || ""} variant="secondary">
                          {statusLabel(po.status)}
                        </Badge>
                        {po.shippingCost && po.shippingCost > 0 && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-shipping-${po.id}`}>
                            <Truck className="h-3 w-3 mr-1" />
                            {t("purchaseOrders.shippingAdded")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{po.totalAmount.toFixed(2)} DZD</TableCell>
                    <TableCell className="text-right font-mono">
                      {po.shippingCost && po.shippingCost > 0
                        ? `${po.shippingCost.toFixed(2)} DZD`
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailDialog(po)}
                          data-testid={`button-view-${po.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {po.status === "received" && (!po.shippingCost || po.shippingCost === 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openShippingDialog(po)}
                            data-testid={`button-shipping-${po.id}`}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            {t("purchaseOrders.addShipping")}
                          </Button>
                        )}
                        {(po.status === "draft" || po.status === "ordered") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(t("purchaseOrders.receiveConfirm"))) {
                                receiveMutation.mutate(po.id);
                              }
                            }}
                            disabled={receiveMutation.isPending}
                            data-testid={`button-receive-${po.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t("purchaseOrders.receive")}
                          </Button>
                        )}
                        {po.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(t("purchaseOrders.deleteConfirm"))) {
                                deleteMutation.mutate(po.id);
                              }
                            }}
                            data-testid={`button-delete-${po.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("purchaseOrders.title")}</DialogTitle>
            <DialogDescription>{t("purchaseOrders.createPO")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t("purchaseOrders.orderNumber")}</Label>
                <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} data-testid="input-order-number" />
              </div>
              <div>
                <Label>{t("purchaseOrders.supplier")} *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger data-testid="select-supplier">
                    <SelectValue placeholder={t("purchaseOrders.selectSupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("common.date")}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-date" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">{t("purchaseOrders.articles")}</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs">{t("purchaseOrders.product")}</Label>}
                      <Select value={item.productId} onValueChange={v => updateItem(idx, "productId", v)}>
                        <SelectTrigger data-testid={`select-product-${idx}`}>
                          <SelectValue placeholder={t("purchaseOrders.productPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {productsList.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">{t("purchaseOrders.designation")}</Label>}
                      <Input value={item.productName} onChange={e => updateItem(idx, "productName", e.target.value)} placeholder={t("common.name")} />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">{t("purchaseOrders.qty")}</Label>}
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">{t("purchaseOrders.unitCostLabel")}</Label>}
                      <Input type="number" step="0.01" value={item.unitCost} onChange={e => updateItem(idx, "unitCost", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1 text-right font-mono text-sm pt-1">
                      {item.total.toFixed(2)}
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-sm font-semibold">
                  {t("common.total")}: {items.reduce((sum, i) => sum + i.total, 0).toFixed(2)} DZD
                </span>
              </div>
            </div>

            <div>
              <Label>{t("common.notes")}</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">
              {t("purchaseOrders.createPO")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shippingDialogOpen} onOpenChange={(open) => { if (!open) closeShippingDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t("purchaseOrders.addShipping")}
            </DialogTitle>
            <DialogDescription>
              {shippingPO && `${shippingPO.orderNumber} - ${shippingPO.supplier?.name || ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("purchaseOrders.shippingCostAmount")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shippingCostInput}
                onChange={e => setShippingCostInput(e.target.value)}
                placeholder="0.00"
                data-testid="input-shipping-cost"
              />
            </div>
            <div>
              <Label>{t("purchaseOrders.distributionMethod")}</Label>
              <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                <SelectTrigger data-testid="select-distribution-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="by_quantity">{t("purchaseOrders.byQuantity")}</SelectItem>
                  <SelectItem value="by_value">{t("purchaseOrders.byValue")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {distributionMethod === "by_quantity"
                  ? t("purchaseOrders.byQuantityDesc")
                  : t("purchaseOrders.byValueDesc")
                }
              </p>
            </div>

            {shippingPO && shippingCostInput && parseFloat(shippingCostInput) > 0 && (
              <div>
                <Label className="text-sm font-semibold">{t("purchaseOrders.shippingBreakdown")}</Label>
                <div className="mt-2 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("purchaseOrders.product")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.qty")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.originalCost")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.shippingShare")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.adjustedUnitCost")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippingPO.items.map((item) => {
                        const shippingCost = parseFloat(shippingCostInput);
                        let itemShippingShare = 0;
                        if (distributionMethod === "by_quantity") {
                          const totalQty = shippingPO.items.reduce((sum, i) => sum + i.quantity, 0);
                          itemShippingShare = totalQty > 0 ? (shippingCost * item.quantity) / totalQty : 0;
                        } else {
                          const totalValue = shippingPO.items.reduce((sum, i) => sum + i.total, 0);
                          itemShippingShare = totalValue > 0 ? (shippingCost * item.total) / totalValue : 0;
                        }
                        const perUnitShipping = item.quantity > 0 ? itemShippingShare / item.quantity : 0;
                        const adjustedCost = item.unitCost + perUnitShipping;
                        return (
                          <TableRow key={item.id} data-testid={`row-shipping-preview-${item.id}`}>
                            <TableCell className="text-sm">{item.productName}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{item.unitCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{itemShippingShare.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold">{adjustedCost.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeShippingDialog}>{t("common.cancel")}</Button>
            <Button
              onClick={handleShippingSubmit}
              disabled={shippingMutation.isPending}
              data-testid="button-submit-shipping"
            >
              <Truck className="h-4 w-4 mr-1" />
              {t("purchaseOrders.addShipping")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={(open) => { if (!open) { setDetailDialogOpen(false); setDetailPO(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("purchaseOrders.poDetails")}
            </DialogTitle>
            <DialogDescription>
              {detailPO && `${detailPO.orderNumber} - ${detailPO.supplier?.name || ""}`}
            </DialogDescription>
          </DialogHeader>
          {detailPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("purchaseOrders.orderNumber")}</Label>
                  <p className="font-mono font-medium" data-testid="text-detail-order-number">{detailPO.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("purchaseOrders.supplier")}</Label>
                  <p className="font-medium" data-testid="text-detail-supplier">{detailPO.supplier?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("common.date")}</Label>
                  <p className="font-medium" data-testid="text-detail-date">{detailPO.date}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("common.status")}</Label>
                  <div className="mt-0.5">
                    <Badge className={statusColors[detailPO.status] || ""} variant="secondary" data-testid="badge-detail-status">
                      {statusLabel(detailPO.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold">{t("purchaseOrders.itemBreakdown")}</Label>
                <div className="mt-2 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("purchaseOrders.product")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.qty")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.unitCostLabel")}</TableHead>
                        {detailPO.shippingCost && detailPO.shippingCost > 0 && (
                          <>
                            <TableHead className="text-right">{t("purchaseOrders.shippingShare")}</TableHead>
                            <TableHead className="text-right">{t("purchaseOrders.adjustedUnitCost")}</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">{t("common.total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPO.items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-detail-item-${item.id}`}>
                          <TableCell className="text-sm">{item.productName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{item.unitCost.toFixed(2)}</TableCell>
                          {detailPO.shippingCost && detailPO.shippingCost > 0 && (
                            <>
                              <TableCell className="text-right font-mono text-sm">
                                {(item.shippingCostShare || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">
                                {(item.adjustedUnitCost || item.unitCost).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right font-mono text-sm">{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">{t("common.total")}:</span>
                  <span className="font-mono font-semibold" data-testid="text-detail-total">{detailPO.totalAmount.toFixed(2)} DZD</span>
                </div>
                {detailPO.shippingCost && detailPO.shippingCost > 0 && (
                  <>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">{t("purchaseOrders.shippingCost")}:</span>
                      <span className="font-mono font-semibold" data-testid="text-detail-shipping">{detailPO.shippingCost.toFixed(2)} DZD</span>
                    </div>
                    <Separator className="w-32" />
                    <div className="flex gap-4">
                      <span className="text-muted-foreground font-semibold">{t("common.total")} + {t("purchaseOrders.shippingCost")}:</span>
                      <span className="font-mono font-bold" data-testid="text-detail-grand-total">
                        {(detailPO.totalAmount + detailPO.shippingCost).toFixed(2)} DZD
                      </span>
                    </div>
                  </>
                )}
              </div>

              {detailPO.shippingCost && detailPO.shippingCost > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-semibold">{t("purchaseOrders.shippingInfo")}</Label>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t("purchaseOrders.totalShipping")}</Label>
                        <p className="font-mono font-medium" data-testid="text-detail-shipping-total">{detailPO.shippingCost.toFixed(2)} DZD</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t("purchaseOrders.shippingMethod")}</Label>
                        <p className="font-medium" data-testid="text-detail-shipping-method">
                          {detailPO.shippingDistributionMethod === "by_quantity"
                            ? t("purchaseOrders.byQuantity")
                            : t("purchaseOrders.byValue")
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t("purchaseOrders.addedOn")}</Label>
                        <p className="font-medium" data-testid="text-detail-shipping-date">{detailPO.shippingAddedAt || "-"}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {detailPO.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("common.notes")}</Label>
                    <p className="text-sm" data-testid="text-detail-notes">{detailPO.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
