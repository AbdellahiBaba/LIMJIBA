import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  category: string;
  imageUrl?: string | null;
  maxStock?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number, maxStock?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, maxStock?: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("store-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("store-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1, maxStock?: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      const currentQty = existing ? existing.quantity : 0;
      const effectiveMax = maxStock ?? item.maxStock;

      if (effectiveMax !== undefined && currentQty + quantity > effectiveMax) {
        const allowed = effectiveMax - currentQty;
        if (allowed <= 0) {
          toast({
            title: "Maximum available quantity reached",
            variant: "destructive",
          });
          return prev;
        }
        quantity = allowed;
        toast({
          title: "Maximum available quantity reached",
          variant: "destructive",
        });
      }

      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + quantity, maxStock: effectiveMax ?? i.maxStock }
            : i
        );
      }
      return [...prev, { ...item, quantity, maxStock: effectiveMax }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number, maxStock?: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const effectiveMax = maxStock ?? i.maxStock;
      if (effectiveMax !== undefined && quantity > effectiveMax) {
        toast({
          title: "Maximum available quantity reached",
          variant: "destructive",
        });
        return { ...i, quantity: effectiveMax };
      }
      return { ...i, quantity };
    }));
  };

  const clearCart = () => setItems([]);

  const getItemQuantity = (productId: string) => {
    return items.find(i => i.productId === productId)?.quantity || 0;
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, getItemQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
