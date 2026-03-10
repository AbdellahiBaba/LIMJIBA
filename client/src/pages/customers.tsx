import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { formatDateDMY } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Link2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/csv-export";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const customerFormSchema = z.object({
    name: z.string().min(1, t("customers.nameRequired")),
    phone: z.string().optional(),
    email: z.string().email(t("customers.invalidEmail")).optional().or(z.literal("")),
    address: z.string().optional(),
    creditLimit: z.number().min(0, t("customers.invalidCreditLimit")),
    notes: z.string().optional(),
  });

  type CustomerFormData = z.infer<typeof customerFormSchema>;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      creditLimit: 0,
      notes: "",
    },
  });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("customers.customerCreated") });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerFormData }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("customers.customerUpdated") });
      setDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("customers.customerDeleted") });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    form.reset({
      name: "",
      phone: "",
      email: "",
      address: "",
      creditLimit: 0,
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      creditLimit: customer.creditLimit || 0,
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
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
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-customers-title">
            {t("customers.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("customers.subtitle")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              if (!customers) return;
              exportToCsv(
                customers,
                [
                  { header: t("common.name"), accessor: (c) => c.name },
                  { header: t("common.phone"), accessor: (c) => c.phone },
                  { header: t("common.email"), accessor: (c) => c.email },
                  { header: t("common.address"), accessor: (c) => c.address },
                  { header: t("customers.creditLimit"), accessor: (c) => c.creditLimit },
                  { header: t("customers.currentBalance"), accessor: (c) => c.currentBalance },
                ],
                "clients"
              );
            }}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("common.exportCsv")}
          </Button>
          <Button onClick={handleAddCustomer} data-testid="button-add-customer">
            <Plus className="h-4 w-4 mr-2" />
            {t("customers.addCustomer")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("customers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-customer-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredCustomers || filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("customers.noCustomers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("common.phone")}</TableHead>
                    <TableHead className="text-right">{t("customers.creditLimit")}</TableHead>
                    <TableHead className="text-right">{t("customers.currentBalance")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const isOverLimit = (customer.currentBalance || 0) > (customer.creditLimit || 0);
                    
                    return (
                      <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {customer.address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.phone && (
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {customer.phone}
                              </p>
                            )}
                            {customer.email && (
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {customer.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {(customer.creditLimit || 0).toLocaleString()} MRU
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isOverLimit && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className={isOverLimit ? "text-destructive font-medium" : ""}>
                              {(customer.currentBalance || 0).toLocaleString()} MRU
                            </span>
                            {isOverLimit && (
                              <Badge variant="destructive" className="text-xs">
                                {t("customers.exceeded")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-customer-menu-${customer.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                data-testid={`button-copy-portal-${customer.id}`}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/customers/${customer.id}/portal-token`, { credentials: "include" });
                                    const data = await res.json();
                                    navigator.clipboard.writeText(
                                      window.location.origin + data.url
                                    );
                                    toast({ title: t("common.linkCopied") });
                                  } catch {
                                    toast({ title: t("common.error"), description: t("customers.portalLinkError"), variant: "destructive" });
                                  }
                                }}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                {t("common.copyPortalLink")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(customer)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? t("customers.editCustomer") : t("customers.addCustomer")}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? t("customers.editInfo") : t("customers.addInfo")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")} *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.email")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.address")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.creditLimit")} (MRU)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(e.target.value === "" ? "" as any : parseFloat(e.target.value))}
                        data-testid="input-customer-credit-limit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.notes")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-customer-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-customer"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("customers.deleteConfirmMessage").replace("{name}", customerToDelete?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
