import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Gift,
  Users,
  Trophy,
  Edit,
  Trash2,
  Sparkles,
  Settings,
  Check,
  Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Reseller, InsertReseller } from "@shared/schema";

type PrintField = "name" | "phone" | "email" | "totalPurchases" | "rewardThreshold" | "progress" | "status";

interface PrintFieldConfig {
  key: PrintField;
  label: string;
}

const PRINT_FIELDS: PrintFieldConfig[] = [
  { key: "name", label: "Nom" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "totalPurchases", label: "Total achats" },
  { key: "rewardThreshold", label: "Seuil récompense" },
  { key: "progress", label: "Progression" },
  { key: "status", label: "Statut" },
];

const DEFAULT_ADMIN_FIELDS: PrintField[] = ["name", "phone", "email", "totalPurchases", "rewardThreshold", "progress", "status"];
const DEFAULT_CUSTOMER_FIELDS: PrintField[] = ["name", "phone", "totalPurchases", "progress"];

function ResellerFormDialog({
  open,
  onOpenChange,
  reseller,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reseller?: Reseller;
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertReseller>>({
    name: reseller?.name ?? "",
    phone: reseller?.phone ?? "",
    email: reseller?.email ?? "",
    totalPurchases: reseller?.totalPurchases ?? 0,
    rewardThreshold: reseller?.rewardThreshold ?? 100000,
    inRewardPool: reseller?.inRewardPool ?? false,
    isWinner: reseller?.isWinner ?? false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: reseller?.name ?? "",
        phone: reseller?.phone ?? "",
        email: reseller?.email ?? "",
        totalPurchases: reseller?.totalPurchases ?? 0,
        rewardThreshold: reseller?.rewardThreshold ?? 100000,
        inRewardPool: reseller?.inRewardPool ?? false,
        isWinner: reseller?.isWinner ?? false,
      });
    }
  }, [open, reseller]);

  const createMutation = useMutation({
    mutationFn: (data: InsertReseller) => apiRequest("POST", "/api/resellers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.resellerAdded") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertReseller) =>
      apiRequest("PATCH", `/api/resellers/${reseller?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.resellerUpdated") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = formData as InsertReseller;
    if (reseller) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reseller ? t("resellers.editReseller") : t("resellers.addReseller")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {reseller ? t("resellers.editReseller") : t("resellers.addReseller")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("resellers.name")} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("resellers.resellerName")}
              required
              data-testid="input-reseller-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("resellers.phone")}</Label>
              <Input
                id="phone"
                value={formData.phone ?? ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+213..."
                data-testid="input-reseller-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("resellers.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-reseller-email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rewardThreshold">{t("resellers.rewardThreshold")} (DZD)</Label>
            <Input
              id="rewardThreshold"
              type="number"
              min="0"
              value={formData.rewardThreshold}
              onChange={(e) =>
                setFormData({ ...formData, rewardThreshold: parseFloat(e.target.value) || 0 })
              }
              data-testid="input-reward-threshold"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-reseller">
              {isPending ? t("common.loading") : reseller ? t("common.save") : t("resellers.addReseller")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WinnerDialog({
  open,
  onOpenChange,
  winner,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: Reseller | null;
  t: (key: string) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogTitle className="sr-only">{t("resellers.congratulations")}</DialogTitle>
        <DialogDescription className="sr-only">{t("resellers.congratulations")}</DialogDescription>
        <div className="py-8">
          <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("resellers.congratulations")}</h2>
          {winner && (
            <>
              <p className="text-3xl font-bold text-primary mb-2">{winner.name}</p>
              <p className="text-muted-foreground">
                {t("resellers.totalPurchases")}: {winner.totalPurchases.toLocaleString()} DZD
              </p>
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => onOpenChange(false)}>
            <Check className="h-4 w-4 mr-2" />
            {t("resellers.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Resellers() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | undefined>();
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<Reseller | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [adminFields, setAdminFields] = useState<PrintField[]>([...DEFAULT_ADMIN_FIELDS]);
  const [customerFields, setCustomerFields] = useState<PrintField[]>([...DEFAULT_CUSTOMER_FIELDS]);
  const [printTab, setPrintTab] = useState<string>("admin");

  const { data: resellers, isLoading } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: `Revendeur "${resellerToDelete?.name || ""}" supprimé avec succès` });
      setDeleteDialogOpen(false);
      setResellerToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleDeleteClick = (reseller: Reseller) => {
    setResellerToDelete(reseller);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (resellerToDelete) {
      deleteMutation.mutate(resellerToDelete.id);
    }
  };

  const drawWinnerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resellers/draw-winner");
      return response.json() as Promise<Reseller>;
    },
    onSuccess: (winner) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setSelectedWinner(winner);
      setWinnerDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("resellers.noEligibleResellers"), variant: "destructive" });
    },
  });

  const resetPoolMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/resellers/reset-pool"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      toast({ title: t("resellers.winnerDrawn") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const filteredResellers = resellers?.filter((reseller) =>
    reseller.name.toLowerCase().includes(search.toLowerCase()) ||
    (reseller.phone?.includes(search) ?? false)
  );

  const inPoolCount = resellers?.filter((r) => r.inRewardPool).length ?? 0;
  const winnersCount = resellers?.filter((r) => r.isWinner).length ?? 0;

  const handleEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingReseller(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingReseller(undefined);
  };

  const toggleField = (copy: "admin" | "customer", field: PrintField) => {
    const setter = copy === "admin" ? setAdminFields : setCustomerFields;
    setter(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const handlePrint = () => {
    const resellersToPrint = filteredResellers || [];
    if (resellersToPrint.length === 0) {
      toast({ title: "Aucun revendeur à imprimer", variant: "destructive" });
      return;
    }

    const companyName = branding?.companyName || "POLY FLECTA PLASTICA";

    const buildTable = (fields: PrintField[], copyTitle: string) => {
      const headers = fields.map(f => PRINT_FIELDS.find(pf => pf.key === f)?.label || f).map(h => `<th style="border:1px solid #333;padding:6px 10px;text-align:left;background:#f0f0f0;font-size:11px;">${h}</th>`).join("");

      const rows = resellersToPrint.map(r => {
        const progress = Math.min((r.totalPurchases / r.rewardThreshold) * 100, 100);
        const cellMap: Record<PrintField, string> = {
          name: r.name,
          phone: r.phone || "-",
          email: r.email || "-",
          totalPurchases: `${r.totalPurchases.toLocaleString()} DZD`,
          rewardThreshold: `${r.rewardThreshold.toLocaleString()} DZD`,
          progress: `${Math.round(progress)}%`,
          status: r.isWinner ? "🏆 Gagnant" : r.inRewardPool ? "🎁 Éligible" : "Actif",
        };
        const cells = fields.map(f => `<td style="border:1px solid #ccc;padding:5px 10px;font-size:11px;">${cellMap[f]}</td>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("");

      return `
        <div style="page-break-after:always;padding:20px;">
          <div style="text-align:center;margin-bottom:15px;">
            <h2 style="margin:0;font-size:16px;">${companyName}</h2>
            <p style="margin:4px 0;font-size:12px;color:#666;">Liste des revendeurs — ${copyTitle}</p>
            <p style="margin:2px 0;font-size:10px;color:#999;">Imprimé le: ${new Date().toLocaleDateString("fr-FR")}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="text-align:right;font-size:10px;color:#999;margin-top:10px;">Total: ${resellersToPrint.length} revendeur(s)</p>
        </div>`;
    };

    let html = `<html><head><title>Revendeurs</title><style>@media print { body { margin: 0; } }</style></head><body>`;
    html += buildTable(adminFields, "Copie Admin");
    html += buildTable(customerFields, "Copie Client");
    html += `</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
    setPrintDialogOpen(false);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-resellers-title">
            {t("resellers.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("resellers.eligibleResellers")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPrintDialogOpen(true)} data-testid="button-print-resellers">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleNew} data-testid="button-add-reseller">
            <Plus className="h-4 w-4 mr-2" />
            {t("resellers.addReseller")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("resellers.totalResellers")}
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resellers?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("resellers.inRewardPool")}
            </CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inPoolCount}</div>
            <p className="text-xs text-muted-foreground">{t("resellers.eligibleResellers")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("resellers.pastWinners")}
            </CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winnersCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("resellers.rewardDraw")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => resetPoolMutation.mutate()}
                disabled={resetPoolMutation.isPending || inPoolCount === 0}
                data-testid="button-reset-pool"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("resellers.resetPool")}
              </Button>
              <Button
                onClick={() => drawWinnerMutation.mutate()}
                disabled={drawWinnerMutation.isPending || inPoolCount === 0}
                data-testid="button-draw-winner"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {drawWinnerMutation.isPending ? t("common.loading") : t("resellers.drawWinner")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {inPoolCount === 0
              ? t("resellers.noResellersEligible")
              : `${inPoolCount} ${t("resellers.eligibleClickDraw")}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("resellers.searchResellers")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-resellers"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredResellers && filteredResellers.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("resellers.name")}</TableHead>
                    <TableHead>{t("resellers.contact")}</TableHead>
                    <TableHead>{t("resellers.totalPurchases")}</TableHead>
                    <TableHead>{t("resellers.progress")}</TableHead>
                    <TableHead>{t("resellers.status")}</TableHead>
                    <TableHead className="text-right">{t("resellers.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResellers.map((reseller) => {
                    const progress = Math.min(
                      (reseller.totalPurchases / reseller.rewardThreshold) * 100,
                      100
                    );
                    return (
                      <TableRow key={reseller.id} data-testid={`row-reseller-${reseller.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {reseller.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{reseller.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{reseller.phone || "-"}</p>
                            <p className="text-muted-foreground text-xs">
                              {reseller.email || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {reseller.totalPurchases.toLocaleString()} DZD
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2 w-24" />
                            <p className="text-xs text-muted-foreground">
                              {Math.round(progress)}% to threshold
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {reseller.isWinner && (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                                <Trophy className="h-3 w-3 mr-1" />
                                {t("resellers.winner")}
                              </Badge>
                            )}
                            {reseller.inRewardPool && (
                              <Badge variant="secondary">
                                <Gift className="h-3 w-3 mr-1" />
                                {t("resellers.inRewardPool")}
                              </Badge>
                            )}
                            {!reseller.inRewardPool && !reseller.isWinner && (
                              <Badge variant="outline">{t("resellers.active")}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(reseller)}
                              data-testid={`button-edit-${reseller.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(reseller)}
                              data-testid={`button-delete-${reseller.id}`}
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
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t("common.noData")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search
                  ? t("resellers.searchResellers")
                  : t("resellers.addReseller")}
              </p>
              {!search && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("resellers.addReseller")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ResellerFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        reseller={editingReseller}
        onSuccess={handleDialogClose}
        t={t}
      />

      <WinnerDialog
        open={winnerDialogOpen}
        onOpenChange={setWinnerDialogOpen}
        winner={selectedWinner}
        t={t}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le revendeur <strong>{resellerToDelete?.name}</strong> ? Cette action est irréversible.
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
              {deleteMutation.isPending ? t("common.loading") : t("common.delete") || "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Imprimer la liste des revendeurs</DialogTitle>
            <DialogDescription>
              Personnalisez les informations visibles pour chaque copie
            </DialogDescription>
          </DialogHeader>
          <Tabs value={printTab} onValueChange={setPrintTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" data-testid="tab-admin-copy">Copie Admin</TabsTrigger>
              <TabsTrigger value="customer" data-testid="tab-customer-copy">Copie Client</TabsTrigger>
            </TabsList>
            <TabsContent value="admin" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez les champs à afficher dans la copie admin
              </p>
              <div className="space-y-3">
                {PRINT_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <Checkbox
                      id={`admin-${field.key}`}
                      checked={adminFields.includes(field.key)}
                      onCheckedChange={() => toggleField("admin", field.key)}
                      data-testid={`checkbox-admin-${field.key}`}
                    />
                    <Label htmlFor={`admin-${field.key}`} className="text-sm cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="customer" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez les champs à afficher dans la copie client
              </p>
              <div className="space-y-3">
                {PRINT_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <Checkbox
                      id={`customer-${field.key}`}
                      checked={customerFields.includes(field.key)}
                      onCheckedChange={() => toggleField("customer", field.key)}
                      data-testid={`checkbox-customer-${field.key}`}
                    />
                    <Label htmlFor={`customer-${field.key}`} className="text-sm cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <div className="bg-muted/50 rounded-lg p-3 mt-2">
            <p className="text-xs text-muted-foreground">
              <strong>Admin:</strong> {adminFields.length} champ(s) sélectionné(s) — <strong>Client:</strong> {customerFields.length} champ(s) sélectionné(s)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredResellers?.length || 0} revendeur(s) seront imprimés (2 copies par page)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handlePrint}
              disabled={adminFields.length === 0 && customerFields.length === 0}
              data-testid="button-confirm-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer (2 copies)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
