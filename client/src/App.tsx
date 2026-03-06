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
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/stock" component={Stock} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/new" component={InvoiceForm} />
      <Route path="/invoices/fabrication" component={FabricationInvoice} />
      <Route path="/invoices/:id" component={InvoiceView} />
      <Route path="/pos" component={POS} />
      <Route path="/sales" component={Sales} />
      <Route path="/resellers" component={Resellers} />
      <Route path="/customers" component={Customers} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/salaries" component={Salaries} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/branding" component={Branding} />
      <Route path="/profit" component={ProfitCalculator} />
      <Route path="/reports" component={Reports} />
      <Route path="/audit-log" component={AuditLog} />
      <Route path="/settings" component={Settings} />
      <Route path="/quick-invoice" component={QuickInvoice} />
      <Route path="/portal/:customerId" component={CustomerPortal} />
      <Route component={NotFound} />
    </Switch>
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
                title="Recherche (Ctrl+K)"
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
                title="Déconnexion"
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

  if (location.startsWith("/portal/")) {
    return <CustomerPortal />;
  }

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
