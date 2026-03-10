import { useState, useEffect, useCallback } from "react";

interface RecentlyViewedItem {
  productId: string;
  productName: string;
  unitPrice: number;
  category: string;
  imageUrl: string | null;
  viewedAt: number;
}

const STORAGE_KEY = "limjiba-recently-viewed";
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const addViewed = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.productId !== item.productId);
      const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const getViewedCategories = useCallback((): string[] => {
    const cats = new Set(items.map(i => i.category));
    return Array.from(cats);
  }, [items]);

  const getViewedIds = useCallback((): string[] => {
    return items.map(i => i.productId);
  }, [items]);

  return { recentlyViewed: items, addViewed, getViewedCategories, getViewedIds };
}
