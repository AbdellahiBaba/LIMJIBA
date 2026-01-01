import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Reseller, InsertReseller } from "@shared/schema";

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

  const createMutation = useMutation({
    mutationFn: (data: InsertReseller) => apiRequest("POST", "/api/resellers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.resellerAdded") });
      onSuccess();
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
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
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
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
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | undefined>();
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<Reseller | null>(null);

  const { data: resellers, isLoading } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("resellers.resellerDeleted") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

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
    onError: () => {
      toast({ title: t("resellers.noEligibleResellers"), variant: "destructive" });
    },
  });

  const resetPoolMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/resellers/reset-pool"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      toast({ title: t("resellers.winnerDrawn") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-resellers-title">
            {t("resellers.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("resellers.eligibleResellers")}
          </p>
        </div>
        <Button onClick={handleNew} data-testid="button-add-reseller">
          <Plus className="h-4 w-4 mr-2" />
          {t("resellers.addReseller")}
        </Button>
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
                              onClick={() => deleteMutation.mutate(reseller.id)}
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
    </div>
  );
}
