import { useEffect, useState, useCallback } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CommandBar } from "@/components/command-bar";
import { NotificationCenter } from "@/components/notification-center";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, Search } from "lucide-react";
import { lazy, Suspense } from "react";
import Dashboard from "@/pages/dashboard";
import Stock from "@/pages/stock";
import Invoices from "@/pages/invoices";
import InvoiceForm from "@/pages/invoice-form";
import InvoiceView from "@/pages/invoice-view";
import POS from "@/pages/pos";
import Resellers from "@/pages/resellers";
import Salaries from "@/pages/salaries";
import Expenses from "@/pages/expenses";
import Branding from "@/pages/branding";
import ProfitCalculator from "@/pages/profit-calculator";
import FabricationInvoice from "@/pages/fabrication-invoice";
import Sales from "@/pages/sales";
import Customers from "@/pages/customers";
import Settings from "@/pages/settings";
import QuickInvoice from "@/pages/quick-invoice";
import CustomerPortal from "@/pages/customer-portal";
import Suppliers from "@/pages/suppliers";
import PurchaseOrders from "@/pages/purchase-orders";
import Reports from "@/pages/reports";
import AuditLog from "@/pages/audit-log";
import TransportationInvoice from "@/pages/transportation-invoice";
import CmsManagement from "@/pages/cms";
import PromoCodesPage from "@/pages/promo-codes";
import StoreOrdersAdmin from "@/pages/store-orders";
import LimjibaAdmin from "@/components/limjiba-admin";
import StoreLayout, { StoreLanguageProvider } from "@/components/store-layout";
import { StoreAuthProvider } from "@/contexts/store-auth-context";
import LimjibaChat from "@/components/limjiba-chat";
import StoreHome from "@/pages/store/home";
import StoreProducts from "@/pages/store/products";
import StoreProductDetail from "@/pages/store/product-detail";
import StoreCart from "@/pages/store/cart";
import StoreCheckout from "@/pages/store/checkout";
import StoreOrders from "@/pages/store/orders";
import StoreAbout from "@/pages/store/about";
import StoreContact from "@/pages/store/contact";
import StoreTerms from "@/pages/store/terms";
import StoreLogin from "@/pages/store/login";
import StoreSignup from "@/pages/store/signup";
import StoreProfile from "@/pages/store/profile";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/emanager-portal" component={Dashboard} />
      <Route path="/emanager-portal/stock" component={Stock} />
      <Route path="/emanager-portal/invoices" component={Invoices} />
      <Route path="/emanager-portal/invoices/new" component={InvoiceForm} />
      <Route path="/emanager-portal/invoices/fabrication" component={FabricationInvoice} />
      <Route path="/emanager-portal/invoices/:id" component={InvoiceView} />
      <Route path="/emanager-portal/pos" component={POS} />
      <Route path="/emanager-portal/sales" component={Sales} />
      <Route path="/emanager-portal/resellers" component={Resellers} />
      <Route path="/emanager-portal/customers" component={Customers} />
      <Route path="/emanager-portal/suppliers" component={Suppliers} />
      <Route path="/emanager-portal/purchase-orders" component={PurchaseOrders} />
      <Route path="/emanager-portal/transportation" component={TransportationInvoice} />
      <Route path="/emanager-portal/salaries" component={Salaries} />
      <Route path="/emanager-portal/expenses" component={Expenses} />
      <Route path="/emanager-portal/branding" component={Branding} />
      <Route path="/emanager-portal/profit" component={ProfitCalculator} />
      <Route path="/emanager-portal/reports" component={Reports} />
      <Route path="/emanager-portal/audit-log" component={AuditLog} />
      <Route path="/emanager-portal/settings" component={Settings} />
      <Route path="/emanager-portal/quick-invoice" component={QuickInvoice} />
      <Route path="/emanager-portal/cms" component={CmsManagement} />
      <Route path="/emanager-portal/promo-codes" component={PromoCodesPage} />
      <Route path="/emanager-portal/store-orders" component={StoreOrdersAdmin} />
      <Route path="/emanager-portal/limjiba" component={LimjibaAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StoreRouter() {
  return (
    <StoreLanguageProvider>
      <StoreAuthProvider>
        <CartProvider>
          <StoreLayout>
            <Switch>
              <Route path="/" component={StoreHome} />
              <Route path="/store" component={StoreHome} />
              <Route path="/store/products/:id" component={StoreProductDetail} />
              <Route path="/store/products" component={StoreProducts} />
              <Route path="/store/cart" component={StoreCart} />
              <Route path="/store/checkout" component={StoreCheckout} />
              <Route path="/store/orders" component={StoreOrders} />
              <Route path="/store/about" component={StoreAbout} />
              <Route path="/store/contact" component={StoreContact} />
              <Route path="/store/terms" component={StoreTerms} />
              <Route path="/store/login" component={StoreLogin} />
              <Route path="/store/signup" component={StoreSignup} />
              <Route path="/store/profile" component={StoreProfile} />
              <Route path="/products/:id" component={StoreProductDetail} />
              <Route path="/products" component={StoreProducts} />
              <Route path="/cart" component={StoreCart} />
              <Route path="/checkout" component={StoreCheckout} />
              <Route path="/orders" component={StoreOrders} />
              <Route path="/about" component={StoreAbout} />
              <Route path="/contact" component={StoreContact} />
              <Route path="/terms" component={StoreTerms} />
              <Route path="/login" component={StoreLogin} />
              <Route path="/signup" component={StoreSignup} />
              <Route path="/profile" component={StoreProfile} />
              <Route>
                <div className="text-center py-20">
                  <h2 className="text-2xl font-bold text-gray-500">Page Not Found</h2>
                </div>
              </Route>
            </Switch>
          </StoreLayout>
          <LimjibaChat />
        </CartProvider>
      </StoreAuthProvider>
    </StoreLanguageProvider>
  );
}


function AuthenticatedApp() {
  const { t, branding } = useLanguage();
  const { logout, user } = useAuth();
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  useEffect(() => {
    if (branding.logo) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) {
        link.href = branding.logo;
      }
    }
  }, [branding.logo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 sm:gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1 sm:gap-2">
              {branding.logo && (
                <img 
                  src={branding.logo} 
                  alt={t("company.name")} 
                  className="h-5 sm:h-6 w-auto hidden sm:block"
                />
              )}
              <span className="text-xs text-muted-foreground hidden lg:block">
                {t("company.name")}
              </span>
              <span className="text-xs font-medium hidden lg:block">
                {user?.username}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommandBarOpen(true)}
                title="Search (Ctrl+K)"
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
              <NotificationCenter />
              <LanguageSwitcher />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                title="Logout"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <Router />
          </main>
        </div>
      </div>
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/emanager-portal")) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!isAuthenticated) {
      return <Login />;
    }
    return <AuthenticatedApp />;
  }

  if (location.startsWith("/portal/")) {
    return <CustomerPortal />;
  }

  return <StoreRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
