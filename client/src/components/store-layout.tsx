import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { ShoppingCart, Menu, X, Crown, Home, Package, Phone, Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoreSettings } from "@shared/schema";

const NAV_ITEMS = [
  { path: "/store", label: "Home", icon: Home },
  { path: "/store/products", label: "Products", icon: Package },
  { path: "/store/about", label: "About", icon: Info },
  { path: "/store/contact", label: "Contact", icon: Phone },
  { path: "/store/terms", label: "Terms", icon: FileText },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const storeName = settings?.storeName || "LEMJIBA";
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";

  return (
    <div className="min-h-screen flex flex-col store-theme" style={{ "--store-primary": primaryColor, "--store-accent": accentColor } as React.CSSProperties}>
      <header className="store-header sticky top-0 z-50 border-b border-black/20" style={{ background: `linear-gradient(135deg, ${primaryColor}, #0A1628)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/store" className="flex items-center gap-3 text-white no-underline" data-testid="link-store-home">
              <Crown className="h-7 w-7" style={{ color: accentColor }} />
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-extrabold tracking-widest uppercase brand-name">{storeName}</span>
                <span className="text-[10px] font-medium tracking-wide opacity-70 brand-name-ar">لمجيبه</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1" data-testid="nav-store-desktop">
              {NAV_ITEMS.map(item => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white/80 hover:text-white hover:bg-white/10 ${location === item.path ? "bg-white/15 text-white" : ""}`}
                    data-testid={`link-store-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/store/cart">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative" data-testid="link-store-cart">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce-once" style={{ backgroundColor: accentColor, color: primaryColor }}>
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-store-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10" data-testid="nav-store-mobile">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map(item => (
                <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-white/80 hover:text-white hover:bg-white/10 ${location === item.path ? "bg-white/15 text-white" : ""}`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t text-gray-300" style={{ background: "#0A1628" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5" style={{ color: accentColor }} />
                <h3 className="text-lg font-extrabold tracking-widest uppercase brand-name" style={{ color: accentColor }}>{storeName}</h3>
              </div>
              <p className="text-xs tracking-wide opacity-60 brand-name-ar mb-2">لمجيبه</p>
              <p className="text-sm text-gray-400">{settings?.storeDescription || "Your premium e-commerce destination."}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
              <div className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <Link key={item.path} href={item.path} className="block text-sm text-gray-400 hover:text-white no-underline">
                    {item.label}
                  </Link>
                ))}
                <Link href="/store/orders" className="block text-sm text-gray-400 hover:text-white no-underline">Track Order</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Contact</h4>
              {settings?.contactEmail && <p className="text-sm text-gray-400">{settings.contactEmail}</p>}
              {settings?.contactPhone && <p className="text-sm text-gray-400">{settings.contactPhone}</p>}
              {settings?.contactAddress && <p className="text-sm text-gray-400">{settings.contactAddress}</p>}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700/50 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {storeName} / لمجيبه. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
