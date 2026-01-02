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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { Product, CartItem, Reseller, InsertSale, InsertSaleItem } from "@shared/schema";

export default function POS() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [selectedReseller, setSelectedReseller] = useState<string>("none");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: resellers } = useQuery<Reseller[]>({
    queryKey: ["/api/resellers"],
  });

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
      setDiscount(0);
      setSelectedReseller("none");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

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
    setDiscount(0);
    setSelectedReseller("none");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setCheckoutDialogOpen(true);
  };

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

    createSaleMutation.mutate({
      sale: {
        saleNumber,
        date: today,
        paymentMode,
        total,
        discount: discountAmount,
        resellerId: selectedReseller !== "none" ? selectedReseller : null,
        status: paymentMode === "CREDIT" ? "credit" : "completed",
      },
      items: saleItems,
    });
  };

  const handlePrintReceipt = () => {
    if (lastSaleId) {
      const params = new URLSearchParams({
        primaryColor: branding.primaryColor,
      });
      if (branding.logo) {
        params.set("logo", branding.logo);
      }
      window.open(`/api/sales/${lastSaleId}/receipt?${params.toString()}`, "_blank");
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
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-md" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.productId === product.id);
                const isOutOfStock = product.stockQuantity <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`p-4 rounded-md border text-left hover-elevate active-elevate-2 ${
                      inCart ? "border-primary bg-primary/5" : "bg-card"
                    } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`button-product-${product.id}`}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded bg-muted mx-auto mb-2">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-sm text-center line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-center font-mono text-sm text-primary font-semibold">
                      {product.unitPrice.toLocaleString()} DZD
                    </p>
                    <div className="flex justify-center gap-2 mt-2">
                      <Badge
                        variant={isOutOfStock ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {isOutOfStock ? t("pos.outOfStock") : `${product.stockQuantity} ${t("stock.inStock")}`}
                      </Badge>
                      {inCart && (
                        <Badge className="text-xs">{inCart.quantity} {t("pos.cart")}</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t("stock.noProducts")}</h3>
              <p className="text-muted-foreground text-sm">
                {search ? t("pos.searchProducts") : t("stock.addProduct")}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <Card className="lg:w-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            {t("pos.cart")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" data-testid="button-keyboard-help">
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
              <Badge variant="secondary" className="ml-auto">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("pos.items")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("pos.emptyCart")}</p>
                <p className="text-xs">{t("pos.addToCart")}</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                    data-testid={`cart-item-${item.productId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.unitPrice.toLocaleString()} DZD each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, -1)}
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-mono text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, 1)}
                        data-testid={`button-increase-${item.productId}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">
                        {item.total.toLocaleString()}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.productId)}
                        data-testid={`button-remove-${item.productId}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {cart.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                  <span className="font-mono">{subtotal.toLocaleString()} DZD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t("pos.discount")} ({discount}%)</span>
                    <span className="font-mono">-{discountAmount.toLocaleString()} DZD</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t("pos.total")}</span>
                  <span className="font-mono" data-testid="text-cart-total">
                    {total.toLocaleString()} DZD
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("pos.discountPercent")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      data-testid="input-discount"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("pos.reseller")}</Label>
                    <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                      <SelectTrigger data-testid="select-reseller">
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
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearCart}
                    data-testid="button-clear-cart"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("pos.clear")}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCheckout}
                    data-testid="button-checkout"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    {t("pos.checkout")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pos.completeSale")}</DialogTitle>
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
                  onClick={() => setPaymentMode("CREDIT")}
                  className="flex-col h-auto py-3"
                  data-testid="button-payment-credit"
                >
                  <Clock className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t("pos.credit")}</span>
                </Button>
              </div>
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
    </div>
  );
}
