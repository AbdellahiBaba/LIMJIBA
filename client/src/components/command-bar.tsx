import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Users, UserCheck, FileText, ShoppingCart, Loader2 } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface SearchResult {
  id: string;
  type: "product" | "customer" | "reseller" | "invoice" | "sale";
  title: string;
  subtitle: string;
  url: string;
}

const typeIcons: Record<string, typeof Package> = {
  product: Package,
  customer: Users,
  reseller: UserCheck,
  invoice: FileText,
  sale: ShoppingCart,
};

const typeLabels: Record<string, string> = {
  product: "Produits",
  customer: "Clients",
  reseller: "Revendeurs",
  invoice: "Factures",
  sale: "Ventes",
};

export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: { results: SearchResult[] }) => {
        if (!cancelled) {
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const flatResults = results;

  const navigateToResult = useCallback((result: SearchResult) => {
    setLocation(result.url);
    onOpenChange(false);
  }, [setLocation, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        navigateToResult(flatResults[selectedIndex]);
      }
    }
  }, [flatResults, selectedIndex, navigateToResult]);

  const grouped = flatResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  let globalIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Recherche globale</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex items-center gap-2 px-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            data-testid="input-command-search"
            className="flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Rechercher produits, clients, factures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0.5">
            Ctrl+K
          </Badge>
        </div>

        <ScrollArea className="max-h-80">
          {query.length > 0 && query.length < 2 && !loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Tapez au moins 2 caractères
            </div>
          )}

          {loading && (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && debouncedQuery.length >= 2 && flatResults.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucun résultat
            </div>
          )}

          {!loading && flatResults.length > 0 && (
            <div className="p-1">
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = typeIcons[type] || Package;
                return (
                  <div key={type}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Icon className="h-3 w-3" />
                      {typeLabels[type] || type}
                    </div>
                    {items.map((result) => {
                      globalIndex++;
                      const idx = globalIndex;
                      return (
                        <div
                          key={`${result.type}-${result.id}`}
                          data-testid={`search-result-${result.type}-${result.id}`}
                          className={`flex flex-col gap-0.5 px-3 py-2 rounded-md cursor-pointer text-sm ${
                            idx === selectedIndex ? "bg-accent" : "hover-elevate"
                          }`}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          <span className="font-medium">{result.title}</span>
                          <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
