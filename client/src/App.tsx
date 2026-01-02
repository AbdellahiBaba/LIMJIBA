import { useEffect } from "react";
import { Switch, Route, Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Loader2, Bell, AlertTriangle, Package } from "lucide-react";
import type { Product } from "@shared/schema";
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
      <Route path="/salaries" component={Salaries} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/branding" component={Branding} />
      <Route path="/profit" component={ProfitCalculator} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LowStockNotifications() {
  const { data: lowStockProducts = [] } = useQuery<{ id: string; name: string; stockQuantity: number; lowStockThreshold: number }[]>({
    queryKey: ["/api/dashboard/low-stock"],
    refetchInterval: 120000, // Check every 2 minutes
  });

  const alertCount = lowStockProducts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
              {alertCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Alertes stock bas
          </h4>
        </div>
        <ScrollArea className="max-h-64">
          {alertCount === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucune alerte de stock
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {lowStockProducts.map((product) => (
                <Link key={product.id} href="/stock">
                  <div className="flex items-center gap-2 p-2 rounded hover-elevate text-sm cursor-pointer">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: <span className="text-destructive font-medium">{product.stockQuantity}</span> / Seuil: {product.lowStockThreshold}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        {alertCount > 0 && (
          <div className="p-2 border-t">
            <Link href="/stock">
              <Button variant="outline" size="sm" className="w-full" data-testid="button-view-stock">
                Voir le stock
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AuthenticatedApp() {
  const { t, branding } = useLanguage();
  const { logout, user } = useAuth();
  
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
              <LowStockNotifications />
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
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

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
