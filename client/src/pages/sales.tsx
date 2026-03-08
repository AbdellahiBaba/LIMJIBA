import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { formatDateDMY } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MoreHorizontal,
  Eye,
  Printer,
  Trash2,
  CheckCircle,
  Clock,
  CreditCard,
  Banknote,
  ArrowUpDown,
  Download,
  DollarSign,
  User,
  Edit,
  Plus,
  Minus,
  X,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResellerAccountDialog } from "@/components/reseller-account-dialog";
import { exportToCsv } from "@/lib/csv-export";
import type { Sale, SaleWithItems, SaleItem, Product, Reseller } from "@shared/schema";

interface EditItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  credit: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const statusIcons: Record<string, any> = {
  completed: CheckCircle,
  partial: Clock,
  credit: Clock,
  pending: Clock,
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  CREDIT: Clock,
  TRANSFER: ArrowUpDown,
};

export default function Sales() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();

  const statusLabels: Record<string, string> = {
    completed: t("sales.paid"),
    partial: t("sales.partial"),
    credit: t("sales.credit"),
    pending: t("sales.pending"),
  };

  const paymentLabels: Record<string, string> = {
    CASH: t("pos.cash"),
    CARD: t("pos.card"),
    CREDIT: t("sales.credit"),
    TRANSFER: t("pos.transfer"),
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewSale, setViewSale] = useState<SaleWithItems | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSale, setEditSale] = useState<SaleWithItems | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<string>("0");
  const [editProductSearch, setEditProductSearch] = useState("");
  const [resellerDialogOpen, setResellerDialogOpen] = useState(false);
  const [selectedResellerId, setSelectedResellerId] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: resellers } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const resellerMap = new Map(resellers?.map(r => [r.id, r.name]) || []);

  const getClientName = (sale: Sale) => {
    if (sale.resellerId && resellerMap.has(sale.resellerId)) {
      return resellerMap.get(sale.resellerId) || "";
    }
    return sale.customerName || "";
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const saleNum = sales?.find(s => s.id === saleToDelete)?.saleNumber || "";
      toast({ title: t("sales.saleDeleted") });
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/sales/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("sales.statusUpdated") });
      if (viewSale) {
        setViewSale({ ...viewSale, status: "completed" });
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, amount, paymentMethod }: { id: string; amount: number; paymentMethod: string }) =>
      apiRequest("POST", `/api/sales/${id}/payments`, { amount, paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("sales.paymentRecorded") });
      setPaymentDialogOpen(false);
      setPaymentSale(null);
      setPaymentAmount("");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const editSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/sales/${id}/edit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("sales.saleEdited") });
      setEditDialogOpen(false);
      setEditSale(null);
      setEditItems([]);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const filteredProducts = useMemo(() => {
    if (!editProductSearch || !products) return [];
    const search = editProductSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(search) &&
      !editItems.some(ei => ei.productId === p.id)
    ).slice(0, 5);
  }, [editProductSearch, products, editItems]);

  const editSubtotal = editItems.reduce((sum, item) => sum + item.total, 0);
  const editTotal = Math.max(0, editSubtotal - (parseFloat(editDiscount) || 0));

  const handleEditSale = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/${id}`, { credentials: "include" });
      if (response.ok) {
        const data: SaleWithItems = await response.json();
        setEditSale(data);
        setEditItems(data.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })));
        setEditDiscount(String(data.discount || 0));
        setEditProductSearch("");
        setEditDialogOpen(true);
      }
    } catch (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const addEditItem = (product: Product) => {
    setEditItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.unitPrice,
      total: product.unitPrice,
    }]);
    setEditProductSearch("");
  };

  const removeEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditItemQuantity = (index: number, qty: number) => {
    if (qty < 1) return;
    setEditItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: qty, total: Math.round(qty * item.unitPrice * 100) / 100 } : item
    ));
  };

  const updateEditItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    setEditItems(prev => prev.map((item, i) =>
      i === index ? { ...item, unitPrice: price, total: Math.round(item.quantity * price * 100) / 100 } : item
    ));
  };

  const confirmEditSale = () => {
    if (!editSale || editItems.length === 0) return;
    editSaleMutation.mutate({
      id: editSale.id,
      data: {
        items: editItems,
        discount: parseFloat(editDiscount) || 0,
        customerName: editSale.customerName,
        customerPhone: editSale.customerPhone,
      },
    });
  };

  const filteredSales = sales?.filter((sale) => {
    const searchLower = search.toLowerCase();
    const clientName = getClientName(sale).toLowerCase();
    const matchesSearch =
      sale.saleNumber.toLowerCase().includes(searchLower) ||
      clientName.includes(searchLower);
    const matchesStatus =
      statusFilter === "all" || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewSale = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/${id}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setViewSale(data);
      }
    } catch (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handlePrintReceipt = (saleId: string) => {
    // Use public route - branding is fetched from server settings (no URL params needed)
    window.open(`/public/sales/${saleId}/ticket-pdf`, '_blank');
  };

  const handleDeleteClick = (id: string) => {
    setSaleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
    }
  };

  const handleExportCSV = () => {
    if (!sales) return;
    exportToCsv(
      sales,
      [
        { header: t("sales.number"), accessor: (s) => s.saleNumber },
        { header: t("common.date"), accessor: (s) => s.date },
        { header: t("sales.client"), accessor: (s) => getClientName(s) },
        { header: t("common.total"), accessor: (s) => s.total },
        { header: t("sales.paid"), accessor: (s) => s.amountPaid ?? 0 },
        { header: t("sales.status"), accessor: (s) => s.status },
        { header: t("sales.payment"), accessor: (s) => s.paymentMode },
      ],
      "ventes"
    );
  };

  const handleRecordPayment = (sale: Sale) => {
    const remaining = sale.total - (sale.amountPaid || 0);
    setPaymentSale(sale);
    setPaymentAmount(remaining.toString());
    setPaymentMethod("CASH");
    setPaymentDialogOpen(true);
  };

  const confirmRecordPayment = () => {
    if (paymentSale && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (amount > 0) {
        recordPaymentMutation.mutate({
          id: paymentSale.id,
          amount,
          paymentMethod,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-sales-title">
            {t("sales.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("sales.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          {t("common.exportCsv")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-sales-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder={t("sales.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sales.allStatuses")}</SelectItem>
                <SelectItem value="completed">{t("sales.paid")}</SelectItem>
                <SelectItem value="partial">{t("sales.partial")}</SelectItem>
                <SelectItem value="credit">{t("sales.credit")}</SelectItem>
                <SelectItem value="pending">{t("sales.pending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredSales || filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t("sales.noSales")}</h3>
              <p className="text-muted-foreground text-sm">
                {search || statusFilter !== "all"
                  ? t("sales.adjustSearch")
                  : t("sales.salesWillAppear")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sales.number")}</TableHead>
                    <TableHead>{t("sales.client")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("sales.payment")}</TableHead>
                    <TableHead>{t("sales.status")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const saleStatus = sale.status || "completed";
                    const StatusIcon = statusIcons[saleStatus] || CheckCircle;
                    const PaymentIcon = paymentIcons[sale.paymentMode] || Banknote;
                    
                    return (
                      <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                        <TableCell className="font-medium">
                          {sale.saleNumber}
                        </TableCell>
                        <TableCell data-testid={`text-client-${sale.id}`}>
                          {getClientName(sale) ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {sale.resellerId ? (
                                <button
                                  className="truncate max-w-[120px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
                                  onClick={() => {
                                    setSelectedResellerId(sale.resellerId);
                                    setResellerDialogOpen(true);
                                  }}
                                  data-testid={`link-reseller-${sale.id}`}
                                >
                                  {getClientName(sale)}
                                </button>
                              ) : (
                                <span className="truncate max-w-[120px]">{getClientName(sale)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDateDMY(sale.date)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{paymentLabels[sale.paymentMode] || sale.paymentMode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusColors[saleStatus]} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[saleStatus] || saleStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {sale.total.toLocaleString("fr-FR")} {t("common.currency")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${sale.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewSale(sale.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t("sales.viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSale(sale.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintReceipt(sale.id)}>
                                <Printer className="h-4 w-4 mr-2" />
                                {t("sales.printTicket")}
                              </DropdownMenuItem>
                              {(sale.status === "credit" || sale.status === "partial") && (
                                <DropdownMenuItem onClick={() => handleRecordPayment(sale)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  {t("sales.recordPayment")}
                                </DropdownMenuItem>
                              )}
                              {sale.status === "credit" && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({ id: sale.id, status: "completed" })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t("sales.markPaid")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(sale.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sales.saleDetails")}</DialogTitle>
            <DialogDescription>
              {viewSale?.saleNumber}
            </DialogDescription>
          </DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("common.date")}:</span>
                  <p className="font-medium">{formatDateDMY(viewSale.date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("sales.client")}:</span>
                  <p className="font-medium" data-testid="text-detail-client">
                    {getClientName(viewSale) || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("sales.payment")}:</span>
                  <p className="font-medium">
                    {paymentLabels[viewSale.paymentMode] || viewSale.paymentMode}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("sales.status")}:</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={`${statusColors[viewSale.status || "completed"]} border-0`}>
                      {statusLabels[viewSale.status || "completed"] || viewSale.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("common.total")}:</span>
                  <p className="font-bold text-lg">{viewSale.total.toLocaleString("fr-FR")} DA</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{t("sales.articles")}</h4>
                <div className="space-y-2">
                  {viewSale.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.productName} x{item.quantity}
                      </span>
                      <span className="font-medium">{item.total.toLocaleString("fr-FR")} DA</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewSale.discount && viewSale.discount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
                  <span>{t("sales.discount")}</span>
                  <span>-{viewSale.discount.toLocaleString("fr-FR")} {t("common.currency")}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewSale?.status === "credit" && (
              <Button 
                onClick={() => {
                  updateStatusMutation.mutate({ id: viewSale.id, status: "completed" });
                }}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("sales.markPaid")}
              </Button>
            )}
            <Button variant="outline" onClick={() => handlePrintReceipt(viewSale?.id || "")}>
              <Printer className="h-4 w-4 mr-2" />
              {t("common.print")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("common.deleteConfirmMessage")}
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sales.recordPayment")}</DialogTitle>
            <DialogDescription>
              {paymentSale?.saleNumber} - {t("sales.remainingBalance")}: {((paymentSale?.total || 0) - (paymentSale?.amountPaid || 0)).toLocaleString()} {t("common.currency")}
            </DialogDescription>
          </DialogHeader>
          {paymentSale && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("sales.total")}:</span>
                  <span className="font-mono font-medium">{paymentSale.total.toLocaleString()} {t("common.currency")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("sales.alreadyPaid")}:</span>
                  <span className="font-mono font-medium text-green-600">{(paymentSale.amountPaid || 0).toLocaleString()} {t("common.currency")}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>{t("sales.remaining")}:</span>
                  <span className="font-mono text-orange-600">{(paymentSale.total - (paymentSale.amountPaid || 0)).toLocaleString()} {t("common.currency")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("sales.paymentAmount")}</Label>
                <Input
                  type="number"
                  min="0"
                  max={paymentSale.total - (paymentSale.amountPaid || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-lg font-mono"
                  data-testid="input-payment-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("sales.paymentMethod")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("CASH")}
                    className="flex-col h-auto py-2"
                    size="sm"
                  >
                    <Banknote className="h-4 w-4 mb-1" />
                    <span className="text-xs">{t("pos.cash")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "CARD" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("CARD")}
                    className="flex-col h-auto py-2"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4 mb-1" />
                    <span className="text-xs">{t("pos.card")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "TRANSFER" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("TRANSFER")}
                    className="flex-col h-auto py-2"
                    size="sm"
                  >
                    <ArrowUpDown className="h-4 w-4 mb-1" />
                    <span className="text-xs">{t("pos.transfer")}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={confirmRecordPayment}
              disabled={recordPaymentMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              data-testid="button-confirm-payment"
            >
              {recordPaymentMutation.isPending ? t("common.saving") : t("sales.recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditSale(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("sales.editSale")}</DialogTitle>
            <DialogDescription>{editSale?.saleNumber}</DialogDescription>
          </DialogHeader>
          {editSale && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="space-y-2">
                <Label>{t("sales.addProduct")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("common.search")}
                    value={editProductSearch}
                    onChange={(e) => setEditProductSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-edit-product-search"
                  />
                </div>
                {filteredProducts.length > 0 && (
                  <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        onClick={() => addEditItem(product)}
                        data-testid={`button-add-product-${product.id}`}
                      >
                        <span>{product.name}</span>
                        <span className="text-muted-foreground font-mono">{product.unitPrice.toLocaleString("fr-FR")} DA</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 max-h-[280px]">
                <div className="space-y-2 pr-3">
                  {editItems.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">{t("sales.noItems")}</p>
                  ) : (
                    editItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2" data-testid={`edit-item-${index}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate flex-1">{item.productName}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeEditItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateEditItemQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateEditItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 h-7 text-center text-sm"
                              data-testid={`input-edit-qty-${index}`}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateEditItemQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1 flex-1">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">{t("sales.price")}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateEditItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="h-7 text-sm font-mono"
                              data-testid={`input-edit-price-${index}`}
                            />
                          </div>
                          <span className="font-mono text-sm font-medium whitespace-nowrap">
                            {item.total.toLocaleString("fr-FR")} {t("common.currency")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-sm whitespace-nowrap">{t("sales.discount")}:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="h-8 text-sm font-mono w-28"
                    data-testid="input-edit-discount"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("sales.subtotal")}:</span>
                  <span className="font-mono">{editSubtotal.toLocaleString("fr-FR")} DA</span>
                </div>
                {(parseFloat(editDiscount) || 0) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("sales.discount")}:</span>
                    <span className="font-mono">-{(parseFloat(editDiscount) || 0).toLocaleString("fr-FR")} DA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>{t("common.total")}:</span>
                  <span className="font-mono text-lg">{editTotal.toLocaleString("fr-FR")} DA</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditSale(null); }}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmEditSale}
              disabled={editSaleMutation.isPending || editItems.length === 0}
              data-testid="button-save-edit-sale"
            >
              <Save className="h-4 w-4 mr-2" />
              {editSaleMutation.isPending ? t("sales.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResellerAccountDialog
        open={resellerDialogOpen}
        onOpenChange={(open) => {
          setResellerDialogOpen(open);
          if (!open) setSelectedResellerId(null);
        }}
        resellerId={selectedResellerId}
      />
    </div>
  );
}
