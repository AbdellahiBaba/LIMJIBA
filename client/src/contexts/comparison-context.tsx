import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Product } from "@shared/schema";

interface ComparisonContextType {
  compareItems: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  showCompare: boolean;
  setShowCompare: (show: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextType | null>(null);

const MAX_COMPARE = 4;

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const addToCompare = useCallback((product: Product) => {
    setCompareItems(prev => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareItems(prev => prev.filter(p => p.id !== productId));
  }, []);

  const isInCompare = useCallback((productId: string) => {
    return compareItems.some(p => p.id === productId);
  }, [compareItems]);

  const clearCompare = useCallback(() => {
    setCompareItems([]);
    setShowCompare(false);
  }, []);

  return (
    <ComparisonContext.Provider value={{ compareItems, addToCompare, removeFromCompare, isInCompare, clearCompare, showCompare, setShowCompare }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) throw new Error("useComparison must be used within ComparisonProvider");
  return context;
}
