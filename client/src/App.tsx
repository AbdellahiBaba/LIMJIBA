import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
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
      <Route path="/resellers" component={Resellers} />
      <Route path="/salaries" component={Salaries} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/branding" component={Branding} />
      <Route path="/profit" component={ProfitCalculator} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { t, branding } = useLanguage();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              {branding.logo && (
                <img 
                  src={branding.logo} 
                  alt={t("company.name")} 
                  className="h-6 w-auto hidden sm:block"
                />
              )}
              <span className="text-xs text-muted-foreground hidden sm:block">
                {t("company.name")}
              </span>
              <LanguageSwitcher />
              <ThemeToggle />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AppContent />
          <Toaster />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
