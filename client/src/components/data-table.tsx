import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Search,
} from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id?: string | number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  onExportCsv?: (rows: T[]) => void;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  selectable?: boolean;
  onBulkDelete?: (rows: T[]) => void;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  pageSize: defaultPageSize = 25,
  onExportCsv,
  searchPlaceholder = "Search...",
  searchFilter,
  selectable = false,
  onBulkDelete,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const filtered = useMemo(() => {
    if (!search || !searchFilter) return data;
    return data.filter((row) => searchFilter(row, search));
  }, [data, search, searchFilter]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((r) => (r as any).id).filter(Boolean)));
    }
  };

  const toggleSelect = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedRows = data.filter((r) => (r as any).id && selectedIds.has((r as any).id));

  const handleExport = () => {
    if (onExportCsv) {
      onExportCsv(selectedRows.length > 0 ? selectedRows : data);
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedRows.length > 0) {
      onBulkDelete(selectedRows);
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sortDir === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {searchFilter && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
              data-testid="table-search"
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {selectable && selectedRows.length > 0 && onBulkDelete && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} data-testid="table-bulk-delete">
              <Trash2 className="h-4 w-4 mr-1" />
              ({selectedRows.length})
            </Button>
          )}
          {onExportCsv && (
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="table-export-csv">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={paged.length > 0 && selectedIds.size === paged.length}
                    onCheckedChange={toggleSelectAll}
                    data-testid="table-select-all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable ? "cursor-pointer select-none" : ""}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, idx) => {
                const rowId = (row as any).id;
                return (
                  <TableRow key={rowId ?? idx}>
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={rowId != null && selectedIds.has(rowId)}
                          onCheckedChange={() => rowId != null && toggleSelect(rowId)}
                          data-testid={`table-select-${rowId ?? idx}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          {sorted.length} items
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
          >
            <SelectTrigger className="w-[80px]" data-testid="table-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground whitespace-nowrap">
            Page {safePage + 1} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              data-testid="table-pagination-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              data-testid="table-pagination-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
