import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, Download } from "lucide-react";
import type { AuditLog } from "@shared/schema";

const actionColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-800",
  logout: "bg-gray-100 text-gray-800",
  create: "bg-green-100 text-green-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

export default function AuditLogPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  function exportCSV() {
    const headers = [t("common.date"), t("auditLog.user"), t("auditLog.action"), t("auditLog.entity"), t("auditLog.details"), t("auditLog.ip")];
    const rows = filtered.map(log => [
      formatDate(log.createdAt), log.username, log.action, log.entity,
      log.entityId || "", log.details || "", log.ipAddress || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal_audit_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = logs.filter(log => {
    const matchSearch = log.username.toLowerCase().includes(search.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.entityId || "").toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || log.action === actionFilter;
    const matchEntity = entityFilter === "all" || log.entity === entityFilter;
    return matchSearch && matchAction && matchEntity;
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
            <ScrollText className="h-6 w-6 text-primary" />
            {t("auditLog.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t("auditLog.count")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          {t("auditLog.exportCsv")}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("auditLog.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-action-filter">
            <SelectValue placeholder={t("auditLog.action")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditLog.allActions")}</SelectItem>
            <SelectItem value="login">{t("auditLog.actions.login")}</SelectItem>
            <SelectItem value="logout">{t("auditLog.actions.logout")}</SelectItem>
            <SelectItem value="create">{t("auditLog.actions.create")}</SelectItem>
            <SelectItem value="update">{t("auditLog.actions.update")}</SelectItem>
            <SelectItem value="delete">{t("auditLog.actions.delete")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-entity-filter">
            <SelectValue placeholder={t("auditLog.entity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditLog.allEntities")}</SelectItem>
            <SelectItem value="auth">{t("auditLog.entities.auth")}</SelectItem>
            <SelectItem value="sale">{t("auditLog.entities.sale")}</SelectItem>
            <SelectItem value="invoice">{t("auditLog.entities.invoice")}</SelectItem>
            <SelectItem value="product">{t("auditLog.entities.product")}</SelectItem>
            <SelectItem value="customer">{t("auditLog.entities.customer")}</SelectItem>
            <SelectItem value="supplier">{t("auditLog.entities.supplier")}</SelectItem>
            <SelectItem value="user">{t("auditLog.entities.user")}</SelectItem>
            <SelectItem value="expense">{t("auditLog.entities.expense")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("auditLog.user")}</TableHead>
                <TableHead>{t("auditLog.action")}</TableHead>
                <TableHead>{t("auditLog.entity")}</TableHead>
                <TableHead>{t("auditLog.details")}</TableHead>
                <TableHead>{t("auditLog.ip")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t("auditLog.noEntries")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => (
                  <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="font-medium">{log.username}</TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action] || ""} variant="secondary">
                        {t(`auditLog.actions.${log.action}`) !== `auditLog.actions.${log.action}` ? t(`auditLog.actions.${log.action}`) : log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{t(`auditLog.entities.${log.entity}`) !== `auditLog.entities.${log.entity}` ? t(`auditLog.entities.${log.entity}`) : log.entity}</span>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {log.details ? (() => {
                        try {
                          const d = JSON.parse(log.details);
                          return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ");
                        } catch { return log.details; }
                      })() : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
