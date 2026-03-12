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
  PauseCircle,
  PlayCircle,
  Layers,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Wallet } from "lucide-react";
import type { Product, ProductVariant, CartItem, Reseller, Sale, InsertSale, InsertSaleItem, InsertReseller, ParkedSale, PaymentWallet } from "@shared/schema";

export default function POS() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
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
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [recentSalesOpen, setRecentSalesOpen] = useState(false);
  const [parkDialogOpen, setParkDialogOpen] = useState(false);
  const [parkLabel, setParkLabel] = useState("");
  const [parkedSalesOpen, setParkedSalesOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantPickerVariants, setVariantPickerVariants] = useState<ProductVariant[]>([]);
  const [variantPickerLoading, setVariantPickerLoading] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: resellers } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

  const { data: parkedSales } = useQuery<ParkedSale[]>({
    queryKey: ["/api/parked-sales"],
  });

  const { data: paymentWallets } = useQuery<PaymentWallet[]>({
    queryKey: ["/api/payment-wallets"],
  });
  const activeWallets = paymentWallets?.filter(w => w.isActive) || [];

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
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/balance-sheet"] });
      setLastSaleId(response.id);
      setCheckoutDialogOpen(false);
      setSuccessDialogOpen(true);
      setCart([]);
      setDiscountPercent(0);
      setDiscountAmount(0);
      setDeliveryCost(0);
      setSelectedReseller("none");
      setCustomerName("");
      setCustomerEmail("");
      setSelectedWalletId("");
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
      toast({ title: t("pos.resellerAdded") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const parkSaleMutation = useMutation({
    mutationFn: async (data: { label: string; customerName: string | null; items: string; discount: number }) => {
      const response = await apiRequest("POST", "/api/parked-sales", {
        ...data,
        createdAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parked-sales"] });
      setParkDialogOpen(false);
      setParkLabel("");
      clearCart();
      toast({ title: t("pos.saleParked") });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deleteParkedMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/parked-sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parked-sales"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleParkSale = () => {
    if (cart.length === 0) {
      toast({ title: t("pos.cartEmpty"), variant: "destructive" });
      return;
    }
    parkSaleMutation.mutate({
      label: parkLabel.trim() || `${t("pos.parkSaleDefault")} ${new Date().toLocaleTimeString()}`,
      customerName: customerName.trim() || null,
      items: JSON.stringify(cart),
      discount: totalDiscount,
    });
  };

  const handleResumeSale = (parkedSale: ParkedSale) => {
    try {
      const items: CartItem[] = JSON.parse(parkedSale.items);
      setCart(items);
      setCustomerName(parkedSale.customerName || "");
      setDiscountAmount(parkedSale.discount || 0);
      setDiscountPercent(0);
      deleteParkedMutation.mutate(parkedSale.id);
      toast({ title: t("pos.saleResumed") });
    } catch {
      toast({ title: t("pos.resumeError"), variant: "destructive" });
    }
  };

  const lookupSaleForReturn = async () => {
    if (!returnTicketNumber.trim()) {
      setReturnLookupError(t("pos.enterTicketNumber"));
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
        setReturnLookupError(err.error || t("pos.saleNotFound"));
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
      toast({ title: t("pos.returnProcessed") });
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
      toast({ title: t("pos.selectItemsToReturn"), variant: "destructive" });
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
      toast({ title: t("resellers.nameRequired"), variant: "destructive" });
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

  const openVariantPicker = async (product: Product) => {
    setVariantPickerProduct(product);
    setVariantPickerLoading(true);
    setVariantPickerOpen(true);
    try {
      const res = await fetch(`/api/products/${product.id}/variants`);
      const variants: ProductVariant[] = await res.json();
      setVariantPickerVariants(variants.filter(v => v.isActive && v.stockQuantity > 0));
    } catch {
      setVariantPickerVariants([]);
    }
    setVariantPickerLoading(false);
  };

  const addVariantToCart = (product: Product, variant: ProductVariant) => {
    if (variant.stockQuantity <= 0) {
      toast({ title: t("pos.outOfStock"), variant: "destructive" });
      return;
    }
    const matchKey = (item: CartItem) => item.productId === product.id && item.variantId === variant.id;
    const existingItem = cart.find(matchKey);
    if (existingItem) {
      if (existingItem.quantity >= variant.stockQuantity) {
        toast({ title: t("pos.cannotExceedStock"), variant: "destructive" });
        return;
      }
      setCart(cart.map(item => matchKey(item) ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: `${product.name} (${variant.variantLabel})`,
        quantity: 1,
        unitPrice: variant.unitPrice,
        total: variant.unitPrice,
        variantId: variant.id,
        variantLabel: variant.variantLabel,
        stockQuantity: variant.stockQuantity,
      }]);
    }
    setVariantPickerOpen(false);
  };

  const addToCart = (product: Product) => {
    if (product.hasVariants) {
      openVariantPicker(product);
      return;
    }

    if (product.stockQuantity <= 0) {
      toast({ title: t("pos.outOfStock"), variant: "destructive" });
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id && !item.variantId);
    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast({ title: t("pos.cannotExceedStock"), variant: "destructive" });
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === product.id && !item.variantId
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
          stockQuantity: product.stockQuantity,
        },
      ]);
    }
  };

  const cartItemKey = (item: CartItem) => item.variantId ? `${item.productId}::${item.variantId}` : item.productId;

  const updateQuantity = (productId: string, delta: number, variantId?: string) => {
    const key = variantId ? `${productId}::${variantId}` : productId;
    setCart(
      cart
        .map((item) => {
          if (cartItemKey(item) === key) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const maxStock = item.stockQuantity;
            if (maxStock !== undefined && newQty > maxStock) {
              toast({ title: t("pos.cannotExceedStock"), variant: "destructive" });
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

  const removeFromCart = (productId: string, variantId?: string) => {
    const key = variantId ? `${productId}::${variantId}` : productId;
    setCart(cart.filter((item) => cartItemKey(item) !== key));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setDeliveryCost(0);
    setSelectedReseller("none");
    setCustomerName("");
    setSelectedWalletId("");
    setPaymentMode("CASH");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const percentDiscount = (subtotal * discountPercent) / 100;
  const totalDiscount = percentDiscount + discountAmount;
  const total = Math.max(0, subtotal - totalDiscount + deliveryCost);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: t("pos.cartEmpty"), variant: "destructive" });
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
        deliveryCost: deliveryCost || 0,
        amountPaid: Math.round(amountPaid * 100) / 100,
        resellerId: selectedReseller !== "none" ? selectedReseller : null,
        status,
        customerName: customerName.trim() || null,
        customerEmail: customerEmail.trim() || null,
        walletId: (paymentMode === "CASH" || paymentMode === "WALLET") && selectedWalletId ? selectedWalletId : null,
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
        toast({ title: t("pos.cartCleared") });
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

    // F3: Park sale
    if (e.key === "F3") {
      e.preventDefault();
      if (cart.length > 0) {
        setParkDialogOpen(true);
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
      removeFromCart(lastItem.productId, lastItem.variantId);
      return;
    }
  }, [cart, checkoutDialogOpen, successDialogOpen, filteredProducts, toast]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
                const favoriteProducts = filteredProducts.filter(p => p.isFavorite && p.stockQuantity > 0);
                if (favoriteProducts.length === 0) return null;
                return (
                  <div data-testid="section-favorites">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">{t("pos.favorites")}</span>
                    </div>
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-3">
                      {favoriteProducts.map((product) => {
                        const inCartQty = cart.filter((item) => item.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
                        return (
                          <div
                            key={product.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => addToCart(product)}
                            onKeyDown={(e) => e.key === "Enter" && addToCart(product)}
                            className={`relative p-2 sm:p-4 rounded-md border-2 border-yellow-400/50 text-left hover-elevate active-elevate-2 min-h-[80px] cursor-pointer select-none ${
                              inCartQty > 0 ? "border-primary bg-primary/5" : "bg-card"
                            }`}
                            data-testid={`button-favorite-product-${product.id}`}
                          >
                            <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] sm:text-xs px-1 sm:px-2" data-testid={`badge-stock-${product.id}`}>
                              {product.stockQuantity}
                            </Badge>
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 absolute top-1 left-1" />
                            {product.hasVariants && <Layers className="h-3 w-3 text-primary/60 absolute bottom-1 left-1" />}
                            <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded overflow-hidden bg-muted mx-auto mb-1 sm:mb-2">
                              {(product.imageUrl || (product.images && product.images[0])) ? (
                                <img
                                  src={product.imageUrl || product.images![0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextSibling as HTMLElement).style.display = "flex"; }}
                                />
                              ) : null}
                              <span className={`items-center justify-center w-full h-full ${(product.imageUrl || (product.images && product.images[0])) ? "hidden" : "flex"}`}>
                                <Package className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                              </span>
                            </div>
                            <h3 className="font-medium text-[10px] sm:text-sm text-center line-clamp-2 mb-0.5 sm:mb-1">
                              {product.name}
                            </h3>
                            <p className="text-center font-mono text-[10px] sm:text-sm text-primary font-semibold">
                              {product.unitPrice.toLocaleString()} MRU
                            </p>
                            {inCartQty > 0 && !product.hasVariants ? (
                              <div className="flex items-center justify-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                                  className="w-6 h-6 rounded-full border border-primary/40 bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all"
                                  data-testid={`button-fav-decrease-${product.id}`}
                                ><Minus className="h-2.5 w-2.5" /></button>
                                <span className="font-mono text-[10px] sm:text-xs font-bold text-primary min-w-[14px] text-center">{inCartQty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, 1); }}
                                  className="w-6 h-6 rounded-full border border-primary/40 bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all"
                                  data-testid={`button-fav-increase-${product.id}`}
                                ><Plus className="h-2.5 w-2.5" /></button>
                              </div>
                            ) : inCartQty > 0 ? (
                              <div className="flex justify-center mt-1">
                                <Badge className="text-[8px] sm:text-xs px-1 sm:px-2">{inCartQty}</Badge>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="mb-3" />
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {filteredProducts.filter(p => p.stockQuantity > 0 || p.hasVariants).map((product) => {
                  const inCartQty = cart.filter((item) => item.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <div
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => addToCart(product)}
                      onKeyDown={(e) => e.key === "Enter" && addToCart(product)}
                      className={`relative p-2 sm:p-4 rounded-md border text-left hover-elevate active-elevate-2 min-h-[80px] cursor-pointer select-none ${
                        inCartQty > 0 ? "border-primary bg-primary/5" : "bg-card"
                      }`}
                      data-testid={`button-product-${product.id}`}
                    >
                      <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] sm:text-xs px-1 sm:px-2" data-testid={`badge-stock-${product.id}`}>
                        {product.stockQuantity}
                      </Badge>
                      {product.hasVariants && <Layers className="h-3 w-3 text-primary/60 absolute bottom-1 left-1" />}
                      <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded overflow-hidden bg-muted mx-auto mb-1 sm:mb-2">
                        {(product.imageUrl || (product.images && product.images[0])) ? (
                          <img
                            src={product.imageUrl || product.images![0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextSibling as HTMLElement).style.display = "flex"; }}
                          />
                        ) : null}
                        <span className={`items-center justify-center w-full h-full ${(product.imageUrl || (product.images && product.images[0])) ? "hidden" : "flex"}`}>
                          <Package className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                        </span>
                      </div>
                      <h3 className="font-medium text-[10px] sm:text-sm text-center line-clamp-2 mb-0.5 sm:mb-1">
                        {product.name}
                      </h3>
                      <p className="text-center font-mono text-[10px] sm:text-sm text-primary font-semibold">
                        {product.unitPrice.toLocaleString()} MRU
                      </p>
                      {inCartQty > 0 && !product.hasVariants ? (
                        <div className="flex items-center justify-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                            className="w-6 h-6 rounded-full border border-primary/40 bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all"
                            data-testid={`button-decrease-${product.id}`}
                          ><Minus className="h-2.5 w-2.5" /></button>
                          <span className="font-mono text-[10px] sm:text-xs font-bold text-primary min-w-[14px] text-center">{inCartQty}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, 1); }}
                            className="w-6 h-6 rounded-full border border-primary/40 bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all"
                            data-testid={`button-increase-${product.id}`}
                          ><Plus className="h-2.5 w-2.5" /></button>
                        </div>
                      ) : inCartQty > 0 ? (
                        <div className="flex justify-center mt-1">
                          <Badge className="text-[8px] sm:text-xs px-1 sm:px-2">{inCartQty}</Badge>
                        </div>
                      ) : null}
                    </div>
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

      <Card className="lg:w-96 flex flex-col shrink-0 h-[58vh] lg:h-auto overflow-hidden">
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
                  <p className="font-semibold mb-2">{t("pos.keyboardShortcuts")}</p>
                  <p><kbd className="bg-muted px-1 rounded">1-9</kbd> {t("pos.kbAddProduct")}</p>
                  <p><kbd className="bg-muted px-1 rounded">F2</kbd> {t("pos.kbPayment")}</p>
                  <p><kbd className="bg-muted px-1 rounded">F3</kbd> {t("pos.kbHoldSale")}</p>
                  <p><kbd className="bg-muted px-1 rounded">F4</kbd> {t("pos.kbConfirmSale")}</p>
                  <p><kbd className="bg-muted px-1 rounded">Suppr</kbd> {t("pos.kbRemoveLast")}</p>
                  <p><kbd className="bg-muted px-1 rounded">Esc</kbd> {t("pos.kbClearCart")}</p>
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
        <CardContent className="flex-1 flex flex-col min-h-0 p-3 pt-0 overflow-hidden">
          <div className="mb-2 shrink-0">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("pos.customerName")}
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
            <div className="flex-1 overflow-y-auto -mx-3 px-3 pb-2">
              <div className="space-y-2 mb-4">
                {cart.map((item) => (
                  <div
                    key={cartItemKey(item)}
                    className="relative p-3 rounded-lg border bg-card hover-elevate transition-colors"
                    data-testid={`cart-item-${cartItemKey(item)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate leading-tight">{item.productName}</p>
                        {item.variantLabel && (
                          <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5" />{item.variantLabel}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.unitPrice.toLocaleString()} MRU
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-1 -mr-1"
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        data-testid={`button-remove-${cartItemKey(item)}`}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full shrink-0"
                          onClick={() => updateQuantity(item.productId, -1, item.variantId)}
                          data-testid={`button-decrease-${cartItemKey(item)}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span
                          className="w-10 text-center font-mono text-sm font-semibold bg-muted rounded-md py-1"
                          data-testid={`text-cart-quantity-${cartItemKey(item)}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full shrink-0"
                          onClick={() => updateQuantity(item.productId, 1, item.variantId)}
                          data-testid={`button-increase-${cartItemKey(item)}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-primary whitespace-nowrap">
                          {item.total.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">MRU</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                  <span className="font-mono font-medium">{subtotal.toLocaleString()} MRU</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      {t("pos.discount")}
                      {discountPercent > 0 && ` (${discountPercent}%)`}
                      {discountPercent > 0 && discountAmount > 0 && " +"}
                      {discountAmount > 0 && ` ${discountAmount.toLocaleString()} MRU`}
                    </span>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">-{totalDiscount.toLocaleString()} MRU</span>
                  </div>
                )}
                {deliveryCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("transportation.deliveryCost")}</span>
                    <span className="font-mono font-medium">+{deliveryCost.toLocaleString()} MRU</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">{t("pos.total")}</span>
                  <span className="font-mono text-xl font-bold text-primary" data-testid="text-cart-total">
                    {total.toLocaleString()} MRU
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pos.discountPercent")}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(e.target.value === "" ? "" as any : parseFloat(e.target.value))}
                    placeholder="%"
                    className="h-9"
                    data-testid="input-discount-percent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pos.discountAmount")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(e.target.value === "" ? "" as any : parseFloat(e.target.value))}
                    placeholder="MRU"
                    className="h-9"
                    data-testid="input-discount-amount"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("transportation.deliveryCost")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={deliveryCost || ""}
                    onChange={(e) => setDeliveryCost(e.target.value === "" ? "" as any : parseFloat(e.target.value))}
                    placeholder="MRU"
                    className="h-9"
                    data-testid="input-delivery-cost"
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
                        {t("pos.addNewReseller")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="text-xs sm:text-sm"
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">{t("pos.clear")}</span>
                </Button>
                <Button
                  variant="outline"
                  className="text-xs sm:text-sm"
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
                  <RotateCcw className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">{t("pos.return")}</span>
                </Button>
                <Button
                  variant="outline"
                  className="text-xs sm:text-sm"
                  onClick={() => setParkDialogOpen(true)}
                  disabled={cart.length === 0}
                  data-testid="button-park-sale"
                >
                  <PauseCircle className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">{t("pos.holdSaleBtn")}</span>
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="text-xs sm:text-sm"
                  data-testid="button-checkout"
                >
                  <CreditCard className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">{t("pos.checkout")}</span>
                </Button>
              </div>
            </div>
              {parkedSales && parkedSales.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <Collapsible open={parkedSalesOpen} onOpenChange={setParkedSalesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-parked-sales">
                    <span className="flex items-center gap-2 text-sm">
                      <PauseCircle className="h-4 w-4" />
                      {t("pos.parkedSales")}
                      <Badge variant="secondary" className="ml-1">{parkedSales.length}</Badge>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${parkedSalesOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {parkedSales.map((ps) => {
                      let itemCount = 0;
                      try { itemCount = JSON.parse(ps.items).length; } catch {}
                      return (
                        <div key={ps.id} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm" data-testid={`parked-sale-${ps.id}`}>
                          <div className="min-w-0">
                            <p className="font-medium truncate" data-testid={`text-parked-label-${ps.id}`}>{ps.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {itemCount} {t("pos.article")}
                              {ps.customerName && ` - ${ps.customerName}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleResumeSale(ps)}
                              data-testid={`button-resume-sale-${ps.id}`}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteParkedMutation.mutate(ps.id)}
                              data-testid={`button-delete-parked-${ps.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {recentSales && recentSales.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <Collapsible open={recentSalesOpen} onOpenChange={setRecentSalesOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-recent-sales">
                        <span className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {t("pos.recentSales")}
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
                              <span className="font-mono font-semibold text-xs">{sale.total.toLocaleString()} MRU</span>
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
                {total.toLocaleString()} MRU
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("pos.items")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("pos.paymentMethod")}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  variant={paymentMode === "WALLET" ? "default" : "outline"}
                  onClick={() => setPaymentMode("WALLET")}
                  className="flex-col h-auto py-3"
                  data-testid="button-payment-wallet"
                >
                  <Wallet className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t("pos.wallet") || "Wallet"}</span>
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
              {(paymentMode === "CASH" || paymentMode === "WALLET") && activeWallets.length > 0 && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {paymentMode === "CASH" ? (t("pos.depositTo") || "Deposit cash to") : (t("pos.selectWallet") || "Select wallet")}
                  </Label>
                  <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                    <SelectTrigger data-testid="select-wallet">
                      <SelectValue placeholder={t("pos.chooseWallet") || "Choose wallet..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWallets.map(w => (
                        <SelectItem key={w.id} value={w.id} data-testid={`wallet-option-${w.id}`}>
                          {w.name} {w.walletNumber ? `(${w.walletNumber})` : ""} — {(w.balance || 0).toLocaleString()} MRU
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t("pos.customerEmail") || "Customer Email"}
                <span className="text-xs text-muted-foreground font-normal">({t("common.optional") || "optional"})</span>
              </Label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                data-testid="input-customer-email"
              />
              {customerEmail.trim() && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  {t("pos.emailConfirmationWillBeSent") || "Receipt & account confirmation will be emailed"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("pos.amountPaid")}</Label>
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
                  <span className="text-muted-foreground">{t("pos.remainingBalance")}</span>
                  <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                    {remainingBalance.toLocaleString()} MRU
                  </span>
                </div>
              )}
              {amountPaid > 0 && amountPaid < total && (
                <Badge variant="outline" className="w-full justify-center text-orange-600 border-orange-600">
                  {t("pos.partialPayment")}
                </Badge>
              )}
              {amountPaid <= 0 && (
                <Badge variant="outline" className="w-full justify-center text-red-600 border-red-600">
                  {t("pos.noPayment")}
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
            <DialogTitle>{t("pos.addNewReseller")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("pos.addNewReseller")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("resellers.resellerName")}</Label>
              <Input
                value={newResellerName}
                onChange={(e) => setNewResellerName(e.target.value)}
                placeholder={t("resellers.resellerName")}
                data-testid="input-new-reseller-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("resellers.phone")}</Label>
              <Input
                value={newResellerPhone}
                onChange={(e) => setNewResellerPhone(e.target.value)}
                placeholder={t("resellers.phone")}
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

      <Dialog open={parkDialogOpen} onOpenChange={setParkDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5" />
              {t("pos.parkSale")}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("pos.parkSale")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("pos.parkSaleLabel")}</Label>
              <Input
                value={parkLabel}
                onChange={(e) => setParkLabel(e.target.value)}
                placeholder="Ex: Client Ahmed, Table 3..."
                onKeyDown={(e) => { if (e.key === "Enter") handleParkSale(); }}
                data-testid="input-park-label"
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("pos.article")} - {total.toLocaleString()} MRU
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParkDialogOpen(false)} data-testid="button-cancel-park">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleParkSale}
              disabled={parkSaleMutation.isPending}
              data-testid="button-confirm-park"
            >
              {parkSaleMutation.isPending ? t("common.loading") : t("pos.parkSale")}
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
              {t("pos.productReturn")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("pos.returnDescription")}
            </DialogDescription>
          </DialogHeader>

          {!returnLookupData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("pos.ticketNumber")}</Label>
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
                    {returnLookupLoading ? t("common.loading") : (t("pos.search"))}
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
                {t("pos.backToSearch")}
              </Button>

              <div className="p-3 rounded-md bg-muted space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t("pos.ticketNumber")}:</span>
                  <span className="font-semibold" data-testid="text-return-sale-number">{returnLookupData.saleNumber}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{returnLookupData.date?.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-semibold">{returnLookupData.total?.toLocaleString()} MRU</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t("pos.status")}:</span>
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
                <Label className="text-sm font-semibold">{t("pos.selectItemsToReturn")}</Label>
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
                              {t("pos.soldQty")}: {item.quantity}
                              {alreadyReturned > 0 && (
                                <span className="text-orange-500 ml-2">
                                  ({t("pos.alreadyReturned")}: {alreadyReturned})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-sm">{item.unitPrice?.toLocaleString()} MRU</span>
                        </div>
                        {maxReturnable > 0 ? (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">{t("pos.returnQty")}:</Label>
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
                                  const val = Math.min(Math.max(0, e.target.value === "" ? 0 : parseInt(e.target.value)), maxReturnable);
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
                                {(currentReturnQty * item.unitPrice).toLocaleString()} MRU
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("pos.fullyReturned")}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("pos.returnReason")}</Label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder={t("pos.returnReasonPlaceholder")}
                  data-testid="input-return-reason"
                />
              </div>

              {returnRefundTotal > 0 && (
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t("pos.refundTotal")}:</span>
                    <span className="font-mono text-xl font-bold text-primary" data-testid="text-refund-total">
                      {Math.round(returnRefundTotal * 100 / 100).toLocaleString()} MRU
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
                  : (t("pos.confirmReturn"))}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={variantPickerOpen} onOpenChange={setVariantPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {variantPickerProduct?.name}
            </DialogTitle>
            <DialogDescription>{t("pos.selectVariant")}</DialogDescription>
          </DialogHeader>
          {variantPickerLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : variantPickerVariants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {t("pos.noVariantsAvailable")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
              {variantPickerVariants.map((variant) => {
                const inCart = cart.find(i => i.productId === variantPickerProduct?.id && i.variantId === variant.id);
                return (
                  <button
                    key={variant.id}
                    onClick={() => variantPickerProduct && addVariantToCart(variantPickerProduct, variant)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      inCart ? "border-primary bg-primary/5 hover:bg-primary/10" : "bg-card hover:bg-accent"
                    }`}
                    data-testid={`button-variant-${variant.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{variant.variantLabel}</p>
                      {variant.sku && <p className="text-[10px] text-muted-foreground">SKU: {variant.sku}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="text-xs">{variant.stockQuantity}</Badge>
                      <span className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
                        {variant.unitPrice.toLocaleString()} MRU
                      </span>
                      {inCart && <Badge className="text-xs">{inCart.quantity}</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
