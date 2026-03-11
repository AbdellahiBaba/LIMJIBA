import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, Edit, Trash2, Truck, Download } from "lucide-react";
import type { Supplier } from "@shared/schema";

export default function Suppliers() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: t("suppliers.supplierCreated") });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: t("suppliers.supplierUpdated") });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: t("suppliers.supplierDeleted") });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingSupplier(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast({ title: t("suppliers.nameRequired"), variant: "destructive" });
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function exportCSV() {
    const headers = [t("common.name"), t("common.phone"), t("common.email"), t("common.address"), t("common.notes")];
    const rows = filtered.map(s => [s.name, s.phone || "", s.email || "", s.address || "", s.notes || ""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fournisseurs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

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
            <Truck className="h-6 w-6 text-primary" />
            {t("suppliers.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t("suppliers.count")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-supplier">
            <Plus className="h-4 w-4 mr-2" />
            {t("suppliers.addSupplier")}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("suppliers.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.phone")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("common.address")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("suppliers.noSuppliers")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(supplier => (
                  <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone || "-"}</TableCell>
                    <TableCell>{supplier.email || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{supplier.address || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)} data-testid={`button-edit-${supplier.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(t("suppliers.deleteConfirm").replace("{name}", supplier.name))) {
                              deleteMutation.mutate(supplier.id);
                            }
                          }}
                          data-testid={`button-delete-${supplier.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? t("suppliers.editSupplier") : t("suppliers.newSupplier")}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? t("suppliers.editSupplierDesc") : t("suppliers.addSupplierDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("common.name")} *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("common.phone")}</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
              </div>
              <div>
                <Label>{t("common.email")}</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-email" />
              </div>
            </div>
            <div>
              <Label>{t("common.address")}</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} data-testid="input-address" />
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
              {editingSupplier ? t("common.modify") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
