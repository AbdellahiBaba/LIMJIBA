import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Clock,
  Package,
  Check,
  Printer,
  Keyboard,
  RotateCcw,
  ArrowLeft,
  Star,
  ChevronDown,
  User,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import type { Product, CartItem, Reseller, Sale, InsertSale, InsertSaleItem, InsertReseller } from "@shared/schema";

export default function POS() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [selectedReseller, setSelectedReseller] = useState<string>("none");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [addResellerDialogOpen, setAddResellerDialogOpen] = useState(false);
  const [newResellerName, setNewResellerName] = useState("");
  const [newResellerPhone, setNewResellerPhone] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnTicketNumber, setReturnTicketNumber] = useState("");
  const [returnLookupData, setReturnLookupData] = useState<any>(null);
  const [returnLookupError, setReturnLookupError] = useState("");
  const [returnLookupLoading, setReturnLookupLoading] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [recentSalesOpen, setRecentSalesOpen] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: resellers } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const { data: allSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  const recentSales = allSales?.slice(0, 5);

  const createSaleMutation = useMutation({
    mutationFn: async (data: { sale: InsertSale; items: InsertSaleItem[] }) => {
      const response = await apiRequest("POST", "/api/sales", data);
      return response.json() as Promise<{ id: string }>;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setLastSaleId(response.id);
      setCheckoutDialogOpen(false);
      setSuccessDialogOpen(true);
      setCart([]);
      setDiscountPercent(0);
      setDiscountAmount(0);
      setSelectedReseller("none");
      setCustomerName("");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const createResellerMutation = useMutation({
    mutationFn: async (data: InsertReseller) => {
      const response = await apiRequest("POST", "/api/resellers", data);
      return response.json() as Promise<Reseller>;
    },
    onSuccess: (newReseller) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setSelectedReseller(newReseller.id);
      setAddResellerDialogOpen(false);
      setNewResellerName("");
      setNewResellerPhone("");
      toast({ title: t("pos.resellerAdded") || "Reseller added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const lookupSaleForReturn = async () => {
    if (!returnTicketNumber.trim()) {
      setReturnLookupError(t("pos.enterTicketNumber") || "Please enter a ticket number");
      return;
    }
    setReturnLookupLoading(true);
    setReturnLookupError("");
    setReturnLookupData(null);
    setReturnQuantities({});
    try {
      const response = await fetch(`/api/sales/lookup?saleNumber=${encodeURIComponent(returnTicketNumber.trim())}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        setReturnLookupError(err.error || t("pos.saleNotFound") || "Sale not found");
        return;
      }
      const data = await response.json();
      setReturnLookupData(data);
    } catch (e: any) {
      setReturnLookupError(e.message || t("common.error"));
    } finally {
      setReturnLookupLoading(false);
    }
  };

  const processReturnMutation = useMutation({
    mutationFn: async (data: { saleId: string; items: { productId: string; quantity: number }[]; reason: string }) => {
      const response = await apiRequest("POST", `/api/sales/${data.saleId}/returns`, {
        items: data.items,
        reason: data.reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("pos.returnProcessed") || "Return processed successfully" });
      setReturnDialogOpen(false);
      setReturnTicketNumber("");
      setReturnLookupData(null);
      setReturnQuantities({});
      setReturnReason("");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleProcessReturn = () => {
    if (!returnLookupData) return;
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (itemsToReturn.length === 0) {
      toast({ title: t("pos.selectItemsToReturn") || "Select at least one item to return", variant: "destructive" });
      return;
    }
    processReturnMutation.mutate({
      saleId: returnLookupData.id,
      items: itemsToReturn,
      reason: returnReason,
    });
  };

  const returnRefundTotal = returnLookupData
    ? returnLookupData.items.reduce((sum: number, item: any) => {
        const qty = returnQuantities[item.productId] || 0;
        return sum + (qty * item.unitPrice);
      }, 0)
    : 0;

  const handleAddReseller = () => {
    if (!newResellerName.trim()) {
      toast({ title: t("resellers.nameRequired") || "Name is required", variant: "destructive" });
      return;
    }
    createResellerMutation.mutate({
      name: newResellerName.trim(),
      phone: newResellerPhone.trim() || null,
      email: null,
      totalPurchases: 0,
      rewardThreshold: 100000,
      inRewardPool: false,
      isWinner: false,
      wonAt: null,
    });
  };

  const filteredProducts = products?.filter((product) => {
    const searchLower = search.toLowerCase();
    return product.name.toLowerCase().includes(searchLower) ||
           (product.barcode && product.barcode.toLowerCase().includes(searchLower));
  });

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({ title: "Product out of stock", variant: "destructive" });
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast({ title: "Cannot exceed available stock", variant: "destructive" });
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.unitPrice,
          total: product.unitPrice,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products?.find((p) => p.id === productId);
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (product && newQty > product.stockQuantity) {
              toast({ title: "Cannot exceed available stock", variant: "destructive" });
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setSelectedReseller("none");
    setCustomerName("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const percentDiscount = (subtotal * discountPercent) / 100;
  const totalDiscount = percentDiscount + discountAmount;
  const total = Math.max(0, subtotal - totalDiscount);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setAmountPaidInput(total.toString());
    setCheckoutDialogOpen(true);
  };

  const amountPaid = parseFloat(amountPaidInput) || 0;
  const remainingBalance = Math.max(0, total - amountPaid);

  const completeSale = () => {
    const today = new Date().toISOString().split("T")[0];
    const saleNumber = `POS-${Date.now()}`;

    const saleItems: InsertSaleItem[] = cart.map((item) => ({
      saleId: "",
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    // Determine status based on payment
    let status = "completed";
    if (amountPaid <= 0) {
      status = "credit";
    } else if (amountPaid < total) {
      status = "partial";
    }

    createSaleMutation.mutate({
      sale: {
        saleNumber,
        date: today,
        paymentMode,
        total,
        discount: totalDiscount,
        amountPaid: Math.round(amountPaid * 100) / 100,
        resellerId: selectedReseller !== "none" ? selectedReseller : null,
        status,
        customerName: customerName.trim() || null,
      },
      items: saleItems,
    });
  };

  const handlePrintReceipt = () => {
    if (lastSaleId) {
      // Use public route - branding is fetched from server settings (no URL params needed)
      window.open(`/public/sales/${lastSaleId}/ticket-pdf`, '_blank');
    }
    setSuccessDialogOpen(false);
  };

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

    // Escape: Clear cart
    if (e.key === "Escape") {
      e.preventDefault();
      if (checkoutDialogOpen) {
        setCheckoutDialogOpen(false);
      } else if (successDialogOpen) {
        setSuccessDialogOpen(false);
      } else {
        clearCart();
        toast({ title: "Panier vidé" });
      }
      return;
    }

    // F2: Open checkout
    if (e.key === "F2") {
      e.preventDefault();
      if (!checkoutDialogOpen && cart.length > 0) {
        handleCheckout();
      }
      return;
    }

    // F4: Complete sale (when checkout dialog is open)
    if (e.key === "F4" && checkoutDialogOpen) {
      e.preventDefault();
      completeSale();
      return;
    }

    // Number keys 1-9: Quick add products (first 9 filtered products)
    if (e.key >= "1" && e.key <= "9" && !checkoutDialogOpen && !successDialogOpen) {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      const productsToShow = filteredProducts || [];
      if (index < productsToShow.length) {
        addToCart(productsToShow[index]);
      }
      return;
    }

    // Delete: Remove last item from cart
    if (e.key === "Delete" && cart.length > 0 && !checkoutDialogOpen) {
      e.preventDefault();
      const lastItem = cart[cart.length - 1];
      removeFromCart(lastItem.productId);
      return;
    }
  }, [cart, checkoutDialogOpen, successDialogOpen, filteredProducts, toast]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-2 sm:mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("pos.searchProducts") + " / Code-barres"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  const exactMatch = products?.find(p => p.barcode === search.trim());
                  if (exactMatch) {
                    addToCart(exactMatch);
                    setSearch("");
                  }
                }
              }}
              className="pl-9"
              data-testid="input-pos-search"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {productsLoading ? (
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-24 sm:h-32 rounded-md" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const favoriteProducts = filteredProducts.filter(p => p.isFavorite);
                if (favoriteProducts.length === 0) return null;
                return (
                  <div data-testid="section-favorites">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">Favoris</span>
                    </div>
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-3">
                      {favoriteProducts.map((product) => {
                        const inCart = cart.find((item) => item.productId === product.id);
                        const isOutOfStock = product.stockQuantity <= 0;
                        return (
                          <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock}
                            className={`relative p-2 sm:p-4 rounded-md border-2 border-yellow-400/50 text-left hover-elevate active-elevate-2 min-h-[80px] ${
                              inCart ? "border-primary bg-primary/5" : "bg-card"
                            } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                            data-testid={`button-favorite-product-${product.id}`}
                          >
                            <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] sm:text-xs px-1 sm:px-2" data-testid={`badge-stock-${product.id}`}>
                              {product.stockQuantity}
                            </Badge>
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-background/70 rounded-md flex items-center justify-center z-10">
                                <span className="text-xs font-semibold text-destructive">{"\u00C9puis\u00E9"}</span>
                              </div>
                            )}
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 absolute top-1 left-1" />
                            <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded bg-muted mx-auto mb-1 sm:mb-2">
                              <Package className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium text-[10px] sm:text-sm text-center line-clamp-2 mb-0.5 sm:mb-1">
                              {product.name}
                            </h3>
                            <p className="text-center font-mono text-[10px] sm:text-sm text-primary font-semibold">
                              {product.unitPrice.toLocaleString()} DZD
                            </p>
                            {inCart && (
                              <div className="flex justify-center mt-1">
                                <Badge className="text-[8px] sm:text-xs px-1 sm:px-2">{inCart.quantity}</Badge>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <Separator className="mb-3" />
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((item) => item.productId === product.id);
                  const isOutOfStock = product.stockQuantity <= 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`relative p-2 sm:p-4 rounded-md border text-left hover-elevate active-elevate-2 min-h-[80px] ${
                        inCart ? "border-primary bg-primary/5" : "bg-card"
                      } ${isOutOfStock ? "cursor-not-allowed" : ""}`}
                      data-testid={`button-product-${product.id}`}
                    >
                      <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] sm:text-xs px-1 sm:px-2" data-testid={`badge-stock-${product.id}`}>
                        {product.stockQuantity}
                      </Badge>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-background/70 rounded-md flex items-center justify-center z-10">
                          <span className="text-xs font-semibold text-destructive">{"\u00C9puis\u00E9"}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded bg-muted mx-auto mb-1 sm:mb-2">
                        <Package className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-[10px] sm:text-sm text-center line-clamp-2 mb-0.5 sm:mb-1">
                        {product.name}
                      </h3>
                      <p className="text-center font-mono text-[10px] sm:text-sm text-primary font-semibold">
                        {product.unitPrice.toLocaleString()} DZD
                      </p>
                      {inCart && (
                        <div className="flex justify-center mt-1">
                          <Badge className="text-[8px] sm:text-xs px-1 sm:px-2">{inCart.quantity}</Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
              <h3 className="font-medium text-sm sm:text-lg mb-1">{t("stock.noProducts")}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {search ? t("pos.searchProducts") : t("stock.addProduct")}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <Card className="lg:w-96 flex flex-col max-h-[40vh] lg:max-h-none">
        <CardHeader className="p-3 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{t("pos.cart")}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 hidden sm:flex" data-testid="button-keyboard-help">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold mb-2">Raccourcis clavier:</p>
                  <p><kbd className="bg-muted px-1 rounded">1-9</kbd> Ajouter produit</p>
                  <p><kbd className="bg-muted px-1 rounded">F2</kbd> Paiement</p>
                  <p><kbd className="bg-muted px-1 rounded">F4</kbd> Confirmer vente</p>
                  <p><kbd className="bg-muted px-1 rounded">Suppr</kbd> Retirer dernier</p>
                  <p><kbd className="bg-muted px-1 rounded">Échap</kbd> Vider panier</p>
                </div>
              </TooltipContent>
            </Tooltip>
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs sm:text-sm">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("pos.items")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-3 pt-0">
          <div className="mb-2">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Nom du client"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-customer-name"
              />
            </div>
          </div>
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground py-4">
              <div>
                <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("pos.emptyCart")}</p>
                <p className="text-xs">{t("pos.addToCart")}</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={item.productId}
                    className="relative p-3 rounded-lg border bg-card hover-elevate transition-colors"
                    data-testid={`cart-item-${item.productId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate leading-tight">{item.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.unitPrice.toLocaleString()} DZD
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-1 -mr-1"
                        onClick={() => removeFromCart(item.productId)}
                        data-testid={`button-remove-${item.productId}`}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => updateQuantity(item.productId, -1)}
                          data-testid={`button-decrease-${item.productId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span 
                          className="w-10 text-center font-mono text-sm font-semibold bg-muted rounded-md py-1"
                          data-testid={`text-cart-quantity-${item.productId}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => updateQuantity(item.productId, 1)}
                          data-testid={`button-increase-${item.productId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-primary whitespace-nowrap">
                          {item.total.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">DZD</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {cart.length > 0 && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                  <span className="font-mono font-medium">{subtotal.toLocaleString()} DZD</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      {t("pos.discount")}
                      {discountPercent > 0 && ` (${discountPercent}%)`}
                      {discountPercent > 0 && discountAmount > 0 && " +"}
                      {discountAmount > 0 && ` ${discountAmount.toLocaleString()} DZD`}
                    </span>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">-{totalDiscount.toLocaleString()} DZD</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">{t("pos.total")}</span>
                  <span className="font-mono text-xl font-bold text-primary" data-testid="text-cart-total">
                    {total.toLocaleString()} DZD
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pos.discountPercent")}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    placeholder="%"
                    className="h-9"
                    data-testid="input-discount-percent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pos.discountAmount") || "Remise (DZD)"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="DZD"
                    className="h-9"
                    data-testid="input-discount-amount"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pos.reseller")}</Label>
                  <div className="flex gap-1">
                    <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                      <SelectTrigger className="h-9 flex-1" data-testid="select-reseller">
                        <SelectValue placeholder={t("pos.noReseller")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("pos.noReseller")}</SelectItem>
                        {resellers?.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            {reseller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setAddResellerDialogOpen(true)}
                          data-testid="button-add-reseller"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("pos.addNewReseller") || "Add New Reseller"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("pos.clear")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReturnDialogOpen(true);
                    setReturnTicketNumber("");
                    setReturnLookupData(null);
                    setReturnLookupError("");
                    setReturnQuantities({});
                    setReturnReason("");
                  }}
                  data-testid="button-return"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("pos.return") || "Retour"}
                </Button>
                <Button
                  onClick={handleCheckout}
                  data-testid="button-checkout"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t("pos.checkout")}
                </Button>
              </div>
            </div>
          )}

          {recentSales && recentSales.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <Collapsible open={recentSalesOpen} onOpenChange={setRecentSalesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-recent-sales">
                    <span className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      Ventes r{"\u00E9"}centes
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${recentSalesOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm" data-testid={`recent-sale-${sale.id}`}>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{sale.saleNumber}</p>
                          <p className="text-xs text-muted-foreground">{sale.date}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono font-semibold text-xs">{sale.total.toLocaleString()} DZD</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(`/public/sales/${sale.id}/ticket-pdf`, '_blank')}
                            data-testid={`button-reprint-${sale.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pos.completeSale")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("pos.checkout")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold font-mono" data-testid="text-checkout-total">
                {total.toLocaleString()} DZD
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("pos.items")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("pos.paymentMethod")}</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentMode === "CASH" ? "default" : "outline"}
                  onClick={() => setPaymentMode("CASH")}
                  className="flex-col h-auto py-3"
                  data-testid="button-payment-cash"
                >
                  <Banknote className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t("pos.cash")}</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMode === "CARD" ? "default" : "outline"}
                  onClick={() => setPaymentMode("CARD")}
                  className="flex-col h-auto py-3"
                  data-testid="button-payment-card"
                >
                  <CreditCard className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t("pos.card")}</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMode === "CREDIT" ? "default" : "outline"}
                  onClick={() => {
                    setPaymentMode("CREDIT");
                    setAmountPaidInput("0");
                  }}
                  className="flex-col h-auto py-3"
                  data-testid="button-payment-credit"
                >
                  <Clock className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t("pos.credit")}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("pos.amountPaid") || "Amount Paid"}</Label>
              <Input
                type="number"
                min="0"
                max={total}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="text-lg font-mono"
                data-testid="input-amount-paid"
              />
              {remainingBalance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("pos.remainingBalance") || "Remaining"}</span>
                  <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                    {remainingBalance.toLocaleString()} DZD
                  </span>
                </div>
              )}
              {amountPaid > 0 && amountPaid < total && (
                <Badge variant="outline" className="w-full justify-center text-orange-600 border-orange-600">
                  {t("pos.partialPayment") || "Partial Payment"}
                </Badge>
              )}
              {amountPaid <= 0 && (
                <Badge variant="outline" className="w-full justify-center text-red-600 border-red-600">
                  {t("pos.noPayment") || "No Payment (Credit)"}
                </Badge>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={completeSale}
              disabled={createSaleMutation.isPending}
              data-testid="button-complete-sale"
            >
              {createSaleMutation.isPending ? t("common.loading") : t("pos.completeSale")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogTitle className="sr-only">{t("pos.saleComplete")}</DialogTitle>
          <DialogDescription className="sr-only">{t("pos.transactionSuccess")}</DialogDescription>
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t("pos.saleComplete")}</h2>
            <p className="text-muted-foreground">
              {t("pos.transactionSuccess")}
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setSuccessDialogOpen(false)}>
              {t("pos.done")}
            </Button>
            <Button onClick={handlePrintReceipt} data-testid="button-print-receipt">
              <Printer className="h-4 w-4 mr-2" />
              {t("pos.printReceipt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addResellerDialogOpen} onOpenChange={setAddResellerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pos.addNewReseller") || "Add New Reseller"}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("pos.addNewReseller") || "Add New Reseller"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("resellers.resellerName") || "Reseller Name"}</Label>
              <Input
                value={newResellerName}
                onChange={(e) => setNewResellerName(e.target.value)}
                placeholder={t("resellers.resellerName") || "Reseller Name"}
                data-testid="input-new-reseller-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("resellers.phone") || "Phone"}</Label>
              <Input
                value={newResellerPhone}
                onChange={(e) => setNewResellerPhone(e.target.value)}
                placeholder={t("resellers.phone") || "Phone"}
                data-testid="input-new-reseller-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddResellerDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddReseller}
              disabled={createResellerMutation.isPending}
              data-testid="button-save-reseller"
            >
              {createResellerMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={(open) => {
        setReturnDialogOpen(open);
        if (!open) {
          setReturnLookupData(null);
          setReturnLookupError("");
          setReturnQuantities({});
          setReturnReason("");
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {t("pos.productReturn") || "Retour Produit"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("pos.returnDescription") || "Process a product return"}
            </DialogDescription>
          </DialogHeader>

          {!returnLookupData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("pos.ticketNumber") || "N° Ticket de Caisse"}</Label>
                <div className="flex gap-2">
                  <Input
                    value={returnTicketNumber}
                    onChange={(e) => setReturnTicketNumber(e.target.value)}
                    placeholder="POS-0001"
                    onKeyDown={(e) => { if (e.key === "Enter") lookupSaleForReturn(); }}
                    data-testid="input-return-ticket"
                  />
                  <Button
                    onClick={lookupSaleForReturn}
                    disabled={returnLookupLoading}
                    data-testid="button-lookup-sale"
                  >
                    {returnLookupLoading ? t("common.loading") : (t("pos.search") || "Rechercher")}
                  </Button>
                </div>
              </div>
              {returnLookupError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-return-error">
                  {returnLookupError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setReturnLookupData(null); setReturnQuantities({}); setReturnReason(""); }}
                data-testid="button-back-to-lookup"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("pos.backToSearch") || "Retour"}
              </Button>

              <div className="p-3 rounded-md bg-muted space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t("pos.ticketNumber") || "Ticket"}:</span>
                  <span className="font-semibold" data-testid="text-return-sale-number">{returnLookupData.saleNumber}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{returnLookupData.date?.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-semibold">{returnLookupData.total?.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t("pos.status") || "Statut"}:</span>
                  <Badge variant={returnLookupData.status === 'completed' ? 'default' : 'secondary'}>
                    {returnLookupData.status === 'completed' ? (t("pos.paid") || 'Payé') :
                     returnLookupData.status === 'partial' ? (t("pos.partialPayment") || 'Partiel') :
                     (t("pos.noPayment") || 'Crédit')}
                  </Badge>
                </div>
                {returnLookupData.customerName && (
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Client:</span>
                    <span>{returnLookupData.customerName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("pos.selectItemsToReturn") || "Sélectionner les articles à retourner"}</Label>
                <div className="space-y-2">
                  {returnLookupData.items.map((item: any) => {
                    const alreadyReturned = returnLookupData.returnedQuantities?.[item.productId] || 0;
                    const maxReturnable = item.quantity - alreadyReturned;
                    const currentReturnQty = returnQuantities[item.productId] || 0;
                    return (
                      <div key={item.productId} className="p-3 rounded-md border bg-card" data-testid={`return-item-${item.productId}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">{item.productName}</span>
                            <div className="text-xs text-muted-foreground">
                              {t("pos.soldQty") || "Vendu"}: {item.quantity}
                              {alreadyReturned > 0 && (
                                <span className="text-orange-500 ml-2">
                                  ({t("pos.alreadyReturned") || "Déjà retourné"}: {alreadyReturned})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-sm">{item.unitPrice?.toLocaleString()} DZD</span>
                        </div>
                        {maxReturnable > 0 ? (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">{t("pos.returnQty") || "Qté retour"}:</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => setReturnQuantities(prev => ({
                                  ...prev,
                                  [item.productId]: Math.max(0, currentReturnQty - 1)
                                }))}
                                disabled={currentReturnQty <= 0}
                                data-testid={`button-return-minus-${item.productId}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                max={maxReturnable}
                                value={currentReturnQty || ""}
                                onChange={(e) => {
                                  const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), maxReturnable);
                                  setReturnQuantities(prev => ({ ...prev, [item.productId]: val }));
                                }}
                                className="w-16 h-7 text-center"
                                data-testid={`input-return-qty-${item.productId}`}
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => setReturnQuantities(prev => ({
                                  ...prev,
                                  [item.productId]: Math.min(maxReturnable, currentReturnQty + 1)
                                }))}
                                disabled={currentReturnQty >= maxReturnable}
                                data-testid={`button-return-plus-${item.productId}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">/ {maxReturnable}</span>
                            {currentReturnQty > 0 && (
                              <span className="ml-auto font-mono text-sm font-semibold text-primary">
                                {(currentReturnQty * item.unitPrice).toLocaleString()} DZD
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("pos.fullyReturned") || "Entièrement retourné"}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("pos.returnReason") || "Motif du retour"}</Label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder={t("pos.returnReasonPlaceholder") || "Ex: Produit défectueux, erreur..."}
                  data-testid="input-return-reason"
                />
              </div>

              {returnRefundTotal > 0 && (
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t("pos.refundTotal") || "Total remboursement"}:</span>
                    <span className="font-mono text-xl font-bold text-primary" data-testid="text-refund-total">
                      {Math.round(returnRefundTotal * 100 / 100).toLocaleString()} DZD
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            {returnLookupData && (
              <Button
                onClick={handleProcessReturn}
                disabled={processReturnMutation.isPending || returnRefundTotal <= 0}
                data-testid="button-confirm-return"
              >
                {processReturnMutation.isPending
                  ? (t("common.loading"))
                  : (t("pos.confirmReturn") || "Confirmer le retour")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
