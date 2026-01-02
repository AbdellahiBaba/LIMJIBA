import { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Sale, SaleWithItems } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  completed: { label: "Payé", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  credit: { label: "Crédit", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Clock },
  pending: { label: "En attente", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: Clock },
};

const paymentConfig: Record<string, { label: string; icon: any }> = {
  CASH: { label: "Espèces", icon: Banknote },
  CARD: { label: "Carte", icon: CreditCard },
  CREDIT: { label: "Crédit", icon: Clock },
  TRANSFER: { label: "Virement", icon: ArrowUpDown },
};

export default function Sales() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewSale, setViewSale] = useState<SaleWithItems | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Vente supprimée" });
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
      toast({ title: "Statut mis à jour" });
      if (viewSale) {
        setViewSale({ ...viewSale, status: "completed" });
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      sale.saleNumber.toLowerCase().includes(search.toLowerCase());
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
    const params = new URLSearchParams({
      primaryColor: branding.primaryColor,
    });
    if (branding.logo) {
      params.set("logo", branding.logo);
    }
    window.open(`/api/sales/${saleId}/receipt?${params.toString()}`, "_blank");
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-sales-title">
            Ventes
          </h1>
          <p className="text-muted-foreground text-sm">
            Historique et gestion des ventes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-sales-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Payé</SelectItem>
                <SelectItem value="credit">Crédit</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredSales || filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune vente trouvée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const status = statusConfig[sale.status || "completed"];
                    const payment = paymentConfig[sale.paymentMode] || { label: sale.paymentMode, icon: Banknote };
                    const StatusIcon = status?.icon || CheckCircle;
                    const PaymentIcon = payment.icon;
                    
                    return (
                      <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                        <TableCell className="font-medium">
                          {sale.saleNumber}
                        </TableCell>
                        <TableCell>{formatDateDMY(sale.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{payment.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${status?.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status?.label || "Payé"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {sale.total.toLocaleString("fr-FR")} DA
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
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintReceipt(sale.id)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimer ticket
                              </DropdownMenuItem>
                              {sale.status === "credit" && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({ id: sale.id, status: "completed" })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marquer payé
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(sale.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
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
            <DialogTitle>Détails de la vente</DialogTitle>
            <DialogDescription>
              {viewSale?.saleNumber}
            </DialogDescription>
          </DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{formatDateDMY(viewSale.date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Paiement:</span>
                  <p className="font-medium">
                    {paymentConfig[viewSale.paymentMode]?.label || viewSale.paymentMode}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={`${statusConfig[viewSale.status || "completed"]?.color} border-0`}>
                      {statusConfig[viewSale.status || "completed"]?.label || "Payé"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-bold text-lg">{viewSale.total.toLocaleString("fr-FR")} DA</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Articles</h4>
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
                  <span>Remise</span>
                  <span>-{viewSale.discount.toLocaleString("fr-FR")} DA</span>
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
                Marquer payé
              </Button>
            )}
            <Button variant="outline" onClick={() => handlePrintReceipt(viewSale?.id || "")}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette vente? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
