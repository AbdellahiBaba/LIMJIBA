import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import type { TransportationInvoice, TransportationInvoiceWithItems, Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRightLeft,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  TruckIcon,
  X,
  Printer,
} from "lucide-react";

interface TransportItem {
  productId: string;
  productName: string;
  quantity: number;
  weightPerUnit: number;
  totalWeight: number;
  unitPrice: number;
  totalValue: number;
}

function getDirectionShortLabel(direction: string, t: (key: string) => string) {
  if (direction === "delivery") return t("transportation.deliveryShort");
  if (direction === "client_return") return t("transportation.clientReturnShort");
  return t("transportation.returnShort");
}

function getDirectionLongLabel(direction: string, t: (key: string) => string) {
  if (direction === "delivery") return t("transportation.directionDelivery");
  if (direction === "client_return") return t("transportation.directionClientReturn");
  return t("transportation.directionReturn");
}

export default function TransportationInvoicePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<TransportationInvoiceWithItems | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery<TransportationInvoice[]>({
    queryKey: ["/api/transportation-invoices"],
  });

  const { data: productsData = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      !searchQuery ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.driverName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.departureLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.arrivalLocation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/transportation-invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-invoices"] });
      toast({ title: t("transportation.deleteSuccess") });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/transportation-invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-invoices"] });
      toast({ title: t("transportation.statusUpdateSuccess") });
    },
  });

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/transportation-invoices/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setSelectedInvoice(data);
      setShowViewDialog(true);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("transportation.confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || "pending";
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: t("transportation.statusPending"), className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
      in_transit: { label: t("transportation.statusInTransit"), className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
      completed: { label: t("transportation.statusCompleted"), className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
      cancelled: { label: t("transportation.statusCancelled"), className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    };
    const c = config[s] || config.pending;
    return <Badge className={c.className} data-testid={`badge-status-${s}`}>{c.label}</Badge>;
  };

  const getDirectionBadge = (direction: string) => {
    if (direction === "delivery") {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" data-testid="badge-direction-delivery">{t("transportation.deliveryShort")}</Badge>;
    }
    if (direction === "client_return") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" data-testid="badge-direction-client-return">{t("transportation.clientReturnShort")}</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" data-testid="badge-direction-return">{t("transportation.returnShort")}</Badge>;
  };

  const handleExportCSV = () => {
    const headers = [
      t("transportation.invoiceNumber"),
      t("transportation.date"),
      t("transportation.direction"),
      t("transportation.driverName"),
      t("transportation.vehiclePlate"),
      t("transportation.departureLocation"),
      t("transportation.arrivalLocation"),
      t("transportation.fuelCost"),
      t("transportation.driverFee"),
      t("transportation.otherCosts"),
      t("transportation.totalCost"),
      t("transportation.totalWeight"),
      t("transportation.totalValue"),
      t("transportation.status"),
    ];
    const rows = filtered.map((inv) => [
      inv.invoiceNumber,
      inv.date,
      getDirectionShortLabel(inv.direction, t),
      inv.driverName,
      inv.vehiclePlate || "",
      inv.departureLocation,
      inv.arrivalLocation,
      inv.fuelCost || 0,
      inv.driverFee || 0,
      inv.otherCosts || 0,
      inv.totalCost,
      inv.totalWeight || 0,
      inv.totalValue || 0,
      inv.status || "pending",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transportation-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TruckIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
            {t("transportation.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" />
            {t("transportation.exportCSV")}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-transport">
            <Plus className="h-4 w-4 mr-1" />
            {t("transportation.createInvoice")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder={t("common.search") + "..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:w-64"
          data-testid="input-search"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="pending">{t("transportation.statusPending")}</SelectItem>
            <SelectItem value="in_transit">{t("transportation.statusInTransit")}</SelectItem>
            <SelectItem value="completed">{t("transportation.statusCompleted")}</SelectItem>
            <SelectItem value="cancelled">{t("transportation.statusCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TruckIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-invoices">{t("transportation.noInvoices")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t("transportation.invoiceNumber")}</TableHead>
                    <TableHead className="text-xs">{t("transportation.date")}</TableHead>
                    <TableHead className="text-xs">{t("transportation.direction")}</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">{t("transportation.driverName")}</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">{t("transportation.route")}</TableHead>
                    <TableHead className="text-xs text-right">{t("transportation.totalCost")}</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">{t("transportation.totalValue")}</TableHead>
                    <TableHead className="text-xs hidden md:table-cell text-right">{t("transportation.totalWeight")}</TableHead>
                    <TableHead className="text-xs">{t("transportation.status")}</TableHead>
                    <TableHead className="text-xs text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id} data-testid={`row-transport-${inv.id}`}>
                      <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.date ? new Date(inv.date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{getDirectionBadge(inv.direction)}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{inv.driverName || "-"}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {inv.departureLocation} → {inv.arrivalLocation}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {(inv.totalCost || 0).toLocaleString()} {t("common.currency")}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono hidden md:table-cell">
                        {(inv.totalValue || 0).toLocaleString()} {t("common.currency")}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono hidden md:table-cell">
                        {(inv.totalWeight || 0).toLocaleString()} {t("transportation.kg")}
                      </TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-actions-${inv.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(inv.id)} data-testid={`button-view-${inv.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                            {inv.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: inv.id, status: "in_transit" })}
                                data-testid={`button-transit-${inv.id}`}
                              >
                                <TruckIcon className="h-4 w-4 mr-2" />
                                {t("transportation.markInTransit")}
                              </DropdownMenuItem>
                            )}
                            {(inv.status === "pending" || inv.status === "in_transit") && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: inv.id, status: "completed" })}
                                data-testid={`button-complete-${inv.id}`}
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                {t("transportation.markCompleted")}
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "cancelled" && inv.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: inv.id, status: "cancelled" })}
                                className="text-destructive"
                                data-testid={`button-cancel-${inv.id}`}
                              >
                                <X className="h-4 w-4 mr-2" />
                                {t("transportation.markCancelled")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(inv.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${inv.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateTransportDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        products={productsData}
      />

      {selectedInvoice && (
        <ViewTransportDialog
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}

function CreateTransportDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: nextNumberData } = useQuery<{ nextNumber: string }>({
    queryKey: ["/api/transportation-invoices/next-number"],
    enabled: open,
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    direction: "delivery" as "delivery" | "return" | "client_return",
    driverName: "",
    vehiclePlate: "",
    departureLocation: "",
    arrivalLocation: "",
    fuelCost: 0,
    driverFee: 0,
    otherCosts: 0,
    notes: "",
    responsible: "",
  });
  const [items, setItems] = useState<TransportItem[]>([]);

  const totalCost = (form.fuelCost || 0) + (form.driverFee || 0) + (form.otherCosts || 0);
  const totalWeight = items.reduce((sum, item) => sum + (item.totalWeight || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);

  const createMutation = useMutation({
    mutationFn: (data: { invoice: any; items: any[] }) =>
      apiRequest("POST", "/api/transportation-invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-invoices/next-number"] });
      toast({ title: t("transportation.createSuccess") });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: err.message || t("common.error"), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      direction: "delivery",
      driverName: "",
      vehiclePlate: "",
      departureLocation: "",
      arrivalLocation: "",
      fuelCost: 0,
      driverFee: 0,
      otherCosts: 0,
      notes: "",
      responsible: "",
    });
    setItems([]);
  };

  const handleSubmit = () => {
    if (!form.departureLocation || !form.arrivalLocation) {
      toast({ title: t("common.error"), description: "Fill required fields", variant: "destructive" });
      return;
    }
    const invoiceNumber = nextNumberData?.nextNumber || `BT-0001/${new Date().getFullYear()}`;
    createMutation.mutate({
      invoice: {
        invoiceNumber,
        date: form.date,
        direction: form.direction,
        driverName: form.driverName,
        vehiclePlate: form.vehiclePlate,
        departureLocation: form.departureLocation,
        arrivalLocation: form.arrivalLocation,
        fuelCost: form.fuelCost,
        driverFee: form.driverFee,
        otherCosts: form.otherCosts,
        totalCost,
        totalWeight,
        totalValue,
        notes: form.notes,
        responsible: form.responsible,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      items: items.map((item) => ({
        productId: item.productId || null,
        productName: item.productName,
        quantity: item.quantity,
        weightPerUnit: item.weightPerUnit,
        totalWeight: item.totalWeight,
        unitPrice: item.unitPrice,
        totalValue: item.totalValue,
      })),
    });
  };

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: 1, weightPerUnit: 0, totalWeight: 0, unitPrice: 0, totalValue: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "weightPerUnit") {
      updated[index].totalWeight = updated[index].quantity * updated[index].weightPerUnit;
    }
    if (field === "quantity" || field === "unitPrice") {
      updated[index].totalValue = updated[index].quantity * updated[index].unitPrice;
    }
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].weightPerUnit = product.weightPerUnit || 0;
        updated[index].unitPrice = product.unitPrice || 0;
        updated[index].totalWeight = updated[index].quantity * (product.weightPerUnit || 0);
        updated[index].totalValue = updated[index].quantity * (product.unitPrice || 0);
      }
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent
        className="w-[95vw] max-w-4xl max-h-[90vh] !flex !flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-primary" />
            {t("transportation.createInvoice")}
            {nextNumberData && (
              <Badge variant="outline" className="ml-2 font-mono">{nextNumberData.nextNumber}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("transportation.invoiceDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t("transportation.date")}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    data-testid="input-date"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.direction")}</Label>
                  <Select value={form.direction} onValueChange={(v: "delivery" | "return" | "client_return") => setForm({ ...form, direction: v })}>
                    <SelectTrigger data-testid="select-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">{t("transportation.directionDelivery")}</SelectItem>
                      <SelectItem value="return">{t("transportation.directionReturn")}</SelectItem>
                      <SelectItem value="client_return">{t("transportation.directionClientReturn")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.responsible")}</Label>
                  <Input
                    value={form.responsible}
                    onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                    data-testid="input-responsible"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("transportation.driverName")}</Label>
                  <Input
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    data-testid="input-driver-name"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.vehiclePlate")}</Label>
                  <Input
                    value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                    placeholder="00000-000-00"
                    data-testid="input-vehicle-plate"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("transportation.departureLocation")}</Label>
                  <Input
                    value={form.departureLocation}
                    onChange={(e) => setForm({ ...form, departureLocation: e.target.value })}
                    data-testid="input-departure"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.arrivalLocation")}</Label>
                  <Input
                    value={form.arrivalLocation}
                    onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })}
                    data-testid="input-arrival"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("transportation.costBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t("transportation.fuelCost")}</Label>
                  <Input
                    type="number"
                    value={form.fuelCost || ""}
                    onChange={(e) => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })}
                    min="0"
                    data-testid="input-fuel-cost"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.driverFee")}</Label>
                  <Input
                    type="number"
                    value={form.driverFee || ""}
                    onChange={(e) => setForm({ ...form, driverFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    data-testid="input-driver-fee"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("transportation.otherCosts")}</Label>
                  <Input
                    type="number"
                    value={form.otherCosts || ""}
                    onChange={(e) => setForm({ ...form, otherCosts: parseFloat(e.target.value) || 0 })}
                    min="0"
                    data-testid="input-other-costs"
                  />
                </div>
              </div>
              <div className="mt-3 text-right">
                <span className="text-sm text-muted-foreground">{t("transportation.totalCost")}: </span>
                <span className="font-bold font-mono text-lg" data-testid="text-total-cost">
                  {totalCost.toLocaleString()} {t("common.currency")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("transportation.products")}</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-product">
                <Plus className="h-3 w-3 mr-1" />
                {t("transportation.addProduct")}
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">{t("transportation.noInvoices")}</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-2 space-y-2" data-testid={`item-row-${index}`}>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-[10px]">{t("transportation.productName")}</Label>
                          <Select
                            value={item.productId || "custom"}
                            onValueChange={(v) => {
                              if (v === "custom") {
                                updateItem(index, "productId", "");
                              } else {
                                updateItem(index, "productId", v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-product-${index}`}>
                              <SelectValue placeholder={t("transportation.selectProduct")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">{t("transportation.customProduct")}</SelectItem>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} — {p.unitPrice.toLocaleString()} {t("common.currency")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!item.productId && (
                            <Input
                              value={item.productName}
                              onChange={(e) => updateItem(index, "productName", e.target.value)}
                              className="h-8 text-xs mt-1"
                              placeholder={t("transportation.customProduct")}
                              data-testid={`input-product-name-${index}`}
                            />
                          )}
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Label className="text-[10px]">{t("transportation.quantity")}</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min="1"
                            data-testid={`input-qty-${index}`}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Label className="text-[10px]">{t("transportation.unitPrice")}</Label>
                          <Input
                            type="number"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min="0"
                            data-testid={`input-unit-price-${index}`}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-[10px]">{t("transportation.itemTotalValue")}</Label>
                          <div className="h-8 flex items-center text-xs font-mono font-medium" data-testid={`text-item-value-${index}`}>
                            {(item.totalValue || 0).toLocaleString()} {t("common.currency")}
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => removeItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4 sm:col-span-4">
                          <Label className="text-[10px]">{t("transportation.weightPerUnit")}</Label>
                          <Input
                            type="number"
                            value={item.weightPerUnit || ""}
                            onChange={(e) => updateItem(index, "weightPerUnit", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min="0"
                            step="0.01"
                            data-testid={`input-weight-${index}`}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-4">
                          <Label className="text-[10px]">{t("transportation.itemTotalWeight")}</Label>
                          <div className="h-8 flex items-center text-xs font-mono" data-testid={`text-item-weight-${index}`}>
                            {(item.totalWeight || 0).toFixed(2)} {t("transportation.kg")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground">{t("transportation.totalWeight")}: </span>
                      <span className="font-bold font-mono" data-testid="text-total-weight">
                        {totalWeight.toFixed(2)} {t("transportation.kg")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("transportation.totalValue")}: </span>
                      <span className="font-bold font-mono" data-testid="text-total-value">
                        {totalValue.toLocaleString()} {t("common.currency")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs">{t("transportation.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              data-testid="input-notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} data-testid="button-cancel">
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">
            {createMutation.isPending ? t("common.saving") : t("transportation.createInvoice")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewTransportDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: TransportationInvoiceWithItems;
}) {
  const { t } = useLanguage();
  const { branding } = useBranding();

  const getStatusBadge = (status: string | null) => {
    const s = status || "pending";
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: t("transportation.statusPending"), className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
      in_transit: { label: t("transportation.statusInTransit"), className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
      completed: { label: t("transportation.statusCompleted"), className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
      cancelled: { label: t("transportation.statusCancelled"), className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    };
    const c = config[s] || config.pending;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const esc = (s: string) => {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    };

    const companyName = branding?.companyInfo?.name || branding?.companyName || "POLY FLECTA PLASTICA";
    const tagline = branding?.companyInfo?.tagline || "FABRICATION D'EMBALLAGE EN PLASTIQUE";
    const address = branding?.companyInfo?.address || "";
    const phone = branding?.companyInfo?.phone || "";
    const primaryColor = branding?.primaryColor || "#1976D2";
    const directionLabel = getDirectionShortLabel(invoice.direction, t);
    const directionColors: Record<string, string> = { delivery: "#1565C0", return: "#E65100", client_return: "#2E7D32" };
    const directionColor = directionColors[invoice.direction] || "#1565C0";
    const currency = t("common.currency");
    const hasValues = invoice.items.some(item => (item.unitPrice || 0) > 0);

    const itemRows = invoice.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'};">
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${esc(item.productName)}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${item.quantity}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${(item.weightPerUnit || 0).toFixed(2)} kg</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:500;">${(item.totalWeight || 0).toFixed(2)} kg</td>
        ${hasValues ? `<td style="border:1px solid #ddd;padding:8px;text-align:right;">${(item.unitPrice || 0).toLocaleString()} ${currency}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:500;">${(item.totalValue || 0).toLocaleString()} ${currency}</td>` : ''}
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><title>Bon de Transport ${esc(invoice.invoiceNumber)}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 15mm; } }
  body { font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
</style>
</head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:15px;border-bottom:3px solid ${primaryColor};margin-bottom:20px;">
    <div>
      ${branding?.logo ? `<img src="${branding.logo}" alt="Logo" style="height:60px;margin-bottom:8px;" />` : `<div style="width:60px;height:60px;background:${primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border-radius:6px;margin-bottom:8px;">PFP</div>`}
      <h2 style="margin:0;color:${primaryColor};font-size:18px;">${esc(companyName)}</h2>
      <p style="margin:2px 0;font-size:12px;color:#666;">${esc(tagline)}</p>
      ${address ? `<p style="margin:2px 0;font-size:11px;color:#999;">${esc(address)}</p>` : ''}
      ${phone ? `<p style="margin:2px 0;font-size:11px;color:#999;">${esc(phone)}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <h3 style="margin:0;font-size:22px;color:${primaryColor};">${esc(t("transportation.title"))}</h3>
      <p style="margin:4px 0;font-size:13px;color:#666;">N°: ${esc(invoice.invoiceNumber)}</p>
      <p style="margin:2px 0;font-size:13px;color:#666;">${esc(t("transportation.date"))}: ${esc(invoice.date)}</p>
      <div style="margin-top:6px;display:inline-block;padding:4px 12px;border-radius:4px;background:${directionColor};color:#fff;font-size:12px;font-weight:600;">${esc(directionLabel)}</div>
    </div>
  </div>

  <div style="display:flex;gap:20px;margin-bottom:20px;">
    ${(invoice.driverName || invoice.vehiclePlate || invoice.responsible) ? `<div style="flex:1;padding:12px;background:${primaryColor}10;border-radius:6px;">
      <h4 style="margin:0 0 6px;color:${primaryColor};font-size:13px;">${t("transportation.tripDetails")}</h4>
      ${invoice.driverName ? `<p style="margin:2px 0;font-size:13px;"><span style="color:#666;">${t("transportation.driverName")}:</span> <strong>${esc(invoice.driverName)}</strong></p>` : ''}
      ${invoice.vehiclePlate ? `<p style="margin:2px 0;font-size:12px;"><span style="color:#666;">${t("transportation.vehiclePlate")}:</span> ${esc(invoice.vehiclePlate)}</p>` : ''}
      ${invoice.responsible ? `<p style="margin:2px 0;font-size:12px;"><span style="color:#666;">${t("transportation.responsible")}:</span> ${esc(invoice.responsible)}</p>` : ''}
    </div>` : ''}
    <div style="flex:1;padding:12px;background:#f5f5f5;border-radius:6px;">
      <h4 style="margin:0 0 6px;color:${primaryColor};font-size:13px;">${t("transportation.route")}</h4>
      <p style="margin:2px 0;font-size:13px;"><span style="color:#666;">${t("transportation.departureLocation")}:</span> <strong>${esc(invoice.departureLocation)}</strong></p>
      <p style="margin:2px 0;font-size:13px;"><span style="color:#666;">${t("transportation.arrivalLocation")}:</span> <strong>${esc(invoice.arrivalLocation)}</strong></p>
    </div>
  </div>

  ${invoice.items.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px;">
    <thead>
      <tr style="background:${primaryColor};">
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);width:30px;text-align:center;">#</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:left;">${t("transportation.productName")}</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:50px;">${t("transportation.quantity")}</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:70px;">${t("transportation.weightPerUnit")}</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;width:80px;">${t("transportation.itemTotalWeight")}</th>
        ${hasValues ? `<th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:80px;">${t("transportation.unitPrice")}</th>
        <th style="color:#fff;padding:8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:90px;">${t("transportation.itemTotalValue")}</th>` : ''}
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr style="background:#f0f0f0;">
        <td colspan="3" style="border:1px solid #ddd;padding:8px;font-weight:600;">${t("transportation.totalWeight")} / ${t("transportation.totalValue")}</td>
        <td style="border:1px solid #ddd;padding:8px;"></td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:600;">${(invoice.totalWeight || 0).toFixed(2)} kg</td>
        ${hasValues ? `<td style="border:1px solid #ddd;padding:8px;"></td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:600;color:${primaryColor};">${(invoice.totalValue || 0).toLocaleString()} ${currency}</td>` : ''}
      </tr>
    </tfoot>
  </table>
  ` : ''}

  ${(invoice.totalCost || 0) > 0 ? `<div style="padding:12px;background:${primaryColor}08;border:1px solid ${primaryColor}30;border-radius:6px;margin-bottom:20px;">
    <h4 style="margin:0 0 8px;color:${primaryColor};font-size:13px;">${t("transportation.costBreakdown")}</h4>
    ${(invoice.fuelCost || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span>${t("transportation.fuelCost")}</span><span>${(invoice.fuelCost || 0).toLocaleString()} ${currency}</span></div>` : ''}
    ${(invoice.driverFee || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span>${t("transportation.driverFee")}</span><span>${(invoice.driverFee || 0).toLocaleString()} ${currency}</span></div>` : ''}
    ${(invoice.otherCosts || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span>${t("transportation.otherCosts")}</span><span>${(invoice.otherCosts || 0).toLocaleString()} ${currency}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:16px;font-weight:700;border-top:2px solid ${primaryColor};margin-top:4px;color:${primaryColor};"><span>${t("transportation.totalCost")}</span><span>${(invoice.totalCost || 0).toLocaleString()} ${currency}</span></div>
  </div>` : ''}

  ${invoice.notes ? `<div style="margin-bottom:20px;padding:10px;background:#fffde7;border:1px solid #fff9c4;border-radius:4px;">
    <p style="margin:0;font-size:11px;color:#666;"><strong>${t("transportation.notes")}:</strong> ${esc(invoice.notes)}</p>
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;margin-top:30px;">
    <div>
      <p style="font-size:12px;font-weight:600;margin-bottom:8px;">${esc(t("transportation.driverName"))}</p>
      <div style="width:200px;height:50px;border-bottom:1px solid #ccc;"></div>
    </div>
    <div style="text-align:right;">
      <p style="font-size:12px;font-weight:600;margin-bottom:8px;">${esc(t("invoices.stampAndSignature"))}</p>
      <div style="width:200px;height:50px;border-bottom:1px solid #ccc;"></div>
    </div>
  </div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-3xl max-h-[90vh] !flex !flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-primary" />
            {invoice.invoiceNumber}
            <span className="ml-2">{getStatusBadge(invoice.status)}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("transportation.invoiceDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("transportation.date")}:</span>
                  <span className="ml-2 font-medium">{invoice.date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("transportation.direction")}:</span>
                  <span className="ml-2">{getDirectionLongLabel(invoice.direction, t)}</span>
                </div>
                {invoice.driverName && (
                  <div>
                    <span className="text-muted-foreground">{t("transportation.driverName")}:</span>
                    <span className="ml-2 font-medium">{invoice.driverName}</span>
                  </div>
                )}
                {invoice.vehiclePlate && (
                  <div>
                    <span className="text-muted-foreground">{t("transportation.vehiclePlate")}:</span>
                    <span className="ml-2 font-mono">{invoice.vehiclePlate}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t("transportation.departureLocation")}:</span>
                  <span className="ml-2">{invoice.departureLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("transportation.arrivalLocation")}:</span>
                  <span className="ml-2">{invoice.arrivalLocation}</span>
                </div>
                {invoice.responsible && (
                  <div>
                    <span className="text-muted-foreground">{t("transportation.responsible")}:</span>
                    <span className="ml-2">{invoice.responsible}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {invoice.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("transportation.products")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("transportation.productName")}</TableHead>
                      <TableHead className="text-xs text-right">{t("transportation.quantity")}</TableHead>
                      <TableHead className="text-xs text-right">{t("transportation.weightPerUnit")}</TableHead>
                      <TableHead className="text-xs text-right">{t("transportation.itemTotalWeight")}</TableHead>
                      <TableHead className="text-xs text-right">{t("transportation.unitPrice")}</TableHead>
                      <TableHead className="text-xs text-right">{t("transportation.itemTotalValue")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.productName}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{(item.weightPerUnit || 0).toFixed(2)} {t("transportation.kg")}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{(item.totalWeight || 0).toFixed(2)} {t("transportation.kg")}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{(item.unitPrice || 0).toLocaleString()} {t("common.currency")}</TableCell>
                        <TableCell className="text-sm text-right font-mono font-medium">{(item.totalValue || 0).toLocaleString()} {t("common.currency")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between px-4 py-2 text-sm font-bold border-t">
                  <span>{t("transportation.totalWeight")}: {(invoice.totalWeight || 0).toFixed(2)} {t("transportation.kg")}</span>
                  <span>{t("transportation.totalValue")}: {(invoice.totalValue || 0).toLocaleString()} {t("common.currency")}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {(invoice.totalCost || 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("transportation.costBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {(invoice.fuelCost || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("transportation.fuelCost")}</span>
                      <span className="font-mono">{(invoice.fuelCost || 0).toLocaleString()} {t("common.currency")}</span>
                    </div>
                  )}
                  {(invoice.driverFee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("transportation.driverFee")}</span>
                      <span className="font-mono">{(invoice.driverFee || 0).toLocaleString()} {t("common.currency")}</span>
                    </div>
                  )}
                  {(invoice.otherCosts || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("transportation.otherCosts")}</span>
                      <span className="font-mono">{(invoice.otherCosts || 0).toLocaleString()} {t("common.currency")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>{t("transportation.totalCost")}</span>
                    <span className="font-mono text-lg">{(invoice.totalCost || 0).toLocaleString()} {t("common.currency")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {invoice.notes && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{t("transportation.notes")}: {invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="h-4 w-4 mr-1" />
            {t("common.print")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-view">
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
