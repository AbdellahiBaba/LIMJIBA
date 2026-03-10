import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsersRound, Bell, Loader2, Search } from "lucide-react";

interface StoreCustomer {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  createdAt: string;
}

export default function StoreCustomers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [message, setMessage] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [messageFr, setMessageFr] = useState("");

  const { data: customers, isLoading } = useQuery<StoreCustomer[]>({
    queryKey: ["/api/store-customers"],
  });

  const bulkNotify = useMutation({
    mutationFn: async (payload: {
      customerIds: string[];
      title: string;
      titleAr: string;
      titleFr: string;
      message: string;
      messageAr: string;
      messageFr: string;
    }) => {
      await apiRequest("POST", "/api/store-customers/bulk-notify", payload);
    },
    onSuccess: () => {
      toast({ title: t("common.success") || "Notification sent successfully" });
      setNotifyDialogOpen(false);
      resetNotifyForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const resetNotifyForm = () => {
    setTitle("");
    setTitleAr("");
    setTitleFr("");
    setMessage("");
    setMessageAr("");
    setMessageFr("");
  };

  const filteredCustomers = customers?.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const allIds = filteredCustomers?.map((c) => c.id) || [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSendNotification = () => {
    bulkNotify.mutate({
      customerIds: Array.from(selectedIds),
      title,
      titleAr,
      titleFr,
      message,
      messageAr,
      messageFr,
    });
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
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2" data-testid="text-store-customers-title">
            <UsersRound className="h-6 w-6" />
            Store Customers
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("common.manage") || "Manage"} store customers and send bulk notifications
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.size > 0 && (
            <Badge variant="secondary" data-testid="badge-selected-count">
              {selectedIds.size} selected
            </Badge>
          )}
          <Button
            onClick={() => setNotifyDialogOpen(true)}
            disabled={selectedIds.size === 0}
            data-testid="button-send-notification"
          >
            <Bell className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-store-customer-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredCustomers || filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersRound className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No store customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>{t("common.name") || "Name"}</TableHead>
                    <TableHead>{t("common.email") || "Email"}</TableHead>
                    <TableHead>{t("common.phone") || "Phone"}</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Loyalty Points</TableHead>
                    <TableHead>Join Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-store-customer-${customer.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={() => toggleOne(customer.id)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.fullName || "-"}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-customer-email-${customer.id}`}>
                        {customer.email || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-customer-phone-${customer.id}`}>
                        {customer.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-customer-orders-${customer.id}`}>
                        {customer.totalOrders ?? 0}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-customer-spent-${customer.id}`}>
                        {(customer.totalSpent ?? 0).toLocaleString()} MRU
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" data-testid={`badge-loyalty-${customer.id}`}>
                          {customer.loyaltyPoints ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-customer-joined-${customer.id}`}>
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Notification to {selectedIds.size} Customer{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-title">Title (EN)</Label>
              <Input
                id="notify-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                data-testid="input-notify-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-title-ar">Title AR</Label>
              <Input
                id="notify-title-ar"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="عنوان الإشعار"
                dir="rtl"
                data-testid="input-notify-title-ar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-title-fr">Title FR</Label>
              <Input
                id="notify-title-fr"
                value={titleFr}
                onChange={(e) => setTitleFr(e.target.value)}
                placeholder="Titre de la notification"
                data-testid="input-notify-title-fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message">Message (EN)</Label>
              <Textarea
                id="notify-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
                data-testid="input-notify-message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message-ar">Message AR</Label>
              <Textarea
                id="notify-message-ar"
                value={messageAr}
                onChange={(e) => setMessageAr(e.target.value)}
                placeholder="رسالة الإشعار"
                dir="rtl"
                rows={3}
                data-testid="input-notify-message-ar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message-fr">Message FR</Label>
              <Textarea
                id="notify-message-fr"
                value={messageFr}
                onChange={(e) => setMessageFr(e.target.value)}
                placeholder="Message de notification"
                rows={3}
                data-testid="input-notify-message-fr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)} data-testid="button-cancel-notify">
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={bulkNotify.isPending || !title || !message}
              data-testid="button-confirm-send-notification"
            >
              {bulkNotify.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Send In-Store Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}