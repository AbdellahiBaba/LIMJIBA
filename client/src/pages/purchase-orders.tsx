import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, ClipboardList, Trash2, CheckCircle, Download, Package } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItemForm[]>([{ productId: "", productName: "", quantity: 1, unitCost: 0, total: 0 }]);

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
      toast({ title: "Bon de commande créé" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/purchase-orders/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bon de commande réceptionné", description: "Le stock a été mis à jour" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: "Bon de commande supprimé" });
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
    if (!supplierId) return toast({ title: "Sélectionnez un fournisseur", variant: "destructive" });
    if (items.some(i => !i.productName || i.quantity <= 0)) return toast({ title: "Vérifiez les articles", variant: "destructive" });
    
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
    const headers = ["N° Commande", "Fournisseur", "Date", "Statut", "Montant Total"];
    const rows = filtered.map(po => [
      po.orderNumber, po.supplier?.name || "", po.date,
      po.status === "draft" ? "Brouillon" : po.status === "ordered" ? "Commandé" : po.status === "received" ? "Réceptionné" : "Annulé",
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

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    ordered: "bg-blue-100 text-blue-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    ordered: "Commandé",
    received: "Réceptionné",
    cancelled: "Annulé",
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
            Bons de Commande
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} bon(s) de commande</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-po">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau BC
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="ordered">Commandé</SelectItem>
            <SelectItem value="received">Réceptionné</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Commande</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun bon de commande trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(po => (
                  <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                    <TableCell className="font-medium font-mono">{po.orderNumber}</TableCell>
                    <TableCell>{po.supplier?.name || "-"}</TableCell>
                    <TableCell>{po.date}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[po.status] || ""} variant="secondary">
                        {statusLabels[po.status] || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{po.totalAmount.toFixed(2)} DZD</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(po.status === "draft" || po.status === "ordered") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Réceptionner ce bon de commande ?\nLe stock sera automatiquement mis à jour.")) {
                                receiveMutation.mutate(po.id);
                              }
                            }}
                            disabled={receiveMutation.isPending}
                            data-testid={`button-receive-${po.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Réceptionner
                          </Button>
                        )}
                        {po.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Supprimer ce bon de commande ?")) {
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
            <DialogTitle>Nouveau Bon de Commande</DialogTitle>
            <DialogDescription>Créez un bon de commande fournisseur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>N° Commande</Label>
                <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} data-testid="input-order-number" />
              </div>
              <div>
                <Label>Fournisseur *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger data-testid="select-supplier">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-date" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Articles</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs">Produit</Label>}
                      <Select value={item.productId} onValueChange={v => updateItem(idx, "productId", v)}>
                        <SelectTrigger data-testid={`select-product-${idx}`}>
                          <SelectValue placeholder="Produit..." />
                        </SelectTrigger>
                        <SelectContent>
                          {productsList.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Désignation</Label>}
                      <Input value={item.productName} onChange={e => updateItem(idx, "productName", e.target.value)} placeholder="Nom" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Qté</Label>}
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Prix Unitaire</Label>}
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
                  Total: {items.reduce((sum, i) => sum + i.total, 0).toFixed(2)} DZD
                </span>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">
              Créer le BC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
