import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Package } from "lucide-react";
import type { Product, StoreSettings } from "@shared/schema";

export default function StoreProducts() {
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";

  const categories = products ? [...new Set(products.map(p => p.category))].sort() : [];

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || p.category === category;
    return matchSearch && matchCategory;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-products-title">
          <Package className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
          Our Products
        </h1>
        <p className="text-gray-600">Browse our collection of premium products</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-full"
            data-testid="input-search-products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48 rounded-full" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No products found</h3>
          <p className="text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(product => (
            <div key={product.id} className="group rounded-2xl border bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden" data-testid={`card-product-${product.id}`}>
              <div className="h-44 flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
                <span className="text-6xl group-hover:scale-110 transition-transform">📦</span>
                <Badge className="absolute top-3 left-3 text-xs" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>{product.category}</Badge>
                {product.stockQuantity <= 5 && (
                  <Badge variant="destructive" className="absolute top-3 right-3 text-xs">Low Stock</Badge>
                )}
              </div>
              <div className="p-4">
                <Link href={`/store/products/${product.id}`}>
                  <h3 className="font-semibold mb-1 hover:underline cursor-pointer line-clamp-2" data-testid={`link-product-${product.id}`}>{product.name}</h3>
                </Link>
                <p className="text-xs text-gray-500 mb-3">{product.stockQuantity} available</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>{product.unitPrice.toFixed(2)} <span className="text-xs font-normal">DZD</span></span>
                  <Button
                    size="sm"
                    className="rounded-full"
                    style={{ backgroundColor: accentColor, color: primaryColor }}
                    onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category })}
                    data-testid={`button-add-cart-${product.id}`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
