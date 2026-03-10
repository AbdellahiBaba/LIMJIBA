import { Link } from "wouter";
import { useComparison } from "@/contexts/comparison-context";
import { useStoreLanguage } from "@/components/store-layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Package, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import type { StoreSettings } from "@shared/schema";

export default function StoreCompare() {
  const { compareItems, removeFromCompare, clearCompare } = useComparison();
  const { addItem } = useCart();
  const { t } = useStoreLanguage();

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
  });

  const primaryColor = settings?.primaryColor || "#0A1628";
  const accentColor = settings?.accentColor || "#C9A84C";

  if (compareItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>{t("compare.title")}</h2>
        <p className="text-gray-500 mb-6">{t("compare.noProducts")}</p>
        <Link href="/store/products">
          <Button variant="outline" className="rounded-full" data-testid="button-back-products">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("detail.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const rows = [
    { key: "image", label: "" },
    { key: "name", label: "" },
    { key: "price", label: t("compare.price") },
    { key: "category", label: t("compare.category") },
    { key: "stock", label: t("compare.stock") },
    { key: "weight", label: t("compare.weight") },
    { key: "action", label: "" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/store/products">
            <Button variant="ghost" size="sm" className="rounded-full text-gray-500 mb-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("detail.back")}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: primaryColor }} data-testid="text-compare-title">{t("compare.title")}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={clearCompare} className="rounded-full" data-testid="button-clear-compare">
          {t("compare.clear")}
        </Button>
      </div>
      <div className="gold-divider w-24 mb-8" />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="w-32" />
              {compareItems.map(product => (
                <th key={product.id} className="p-3 text-center relative" data-testid={`compare-col-${product.id}`}>
                  <button onClick={() => removeFromCompare(product.id)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-100" data-testid={`button-remove-compare-${product.id}`}>
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td />
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <Link href={`/store/products/${product.id}`}>
                    <div className="h-40 rounded-xl overflow-hidden store-card-premium cursor-pointer" style={{ background: `linear-gradient(135deg, ${primaryColor}05, ${accentColor}08)` }}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover card-image" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><Package className="h-10 w-10 text-gray-300" /></div>
                      )}
                    </div>
                  </Link>
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td className="p-3 font-medium text-sm text-gray-500" />
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <Link href={`/store/products/${product.id}`}>
                    <h3 className="font-semibold text-sm hover:underline cursor-pointer" style={{ color: primaryColor }} data-testid={`text-compare-name-${product.id}`}>{product.name}</h3>
                  </Link>
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td className="p-3 font-medium text-sm text-gray-500">{t("compare.price")}</td>
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <span className="text-xl font-bold gold-text">{product.unitPrice.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 ml-1">{t("currency")}</span>
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td className="p-3 font-medium text-sm text-gray-500">{t("compare.category")}</td>
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full premium-badge">{product.category}</span>
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td className="p-3 font-medium text-sm text-gray-500">{t("compare.stock")}</td>
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <span className={`text-sm font-medium ${product.stockQuantity > 0 ? "text-green-600" : "text-red-500"}`}>
                    {product.stockQuantity > 0 ? `${product.stockQuantity} ${t("detail.available")}` : t("products.outOfStock")}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td className="p-3 font-medium text-sm text-gray-500">{t("compare.weight")}</td>
              {compareItems.map(product => (
                <td key={product.id} className="p-3 text-sm text-gray-600">
                  {product.weightPerUnit > 0 ? `${product.weightPerUnit} kg` : "—"}
                </td>
              ))}
            </tr>
            <tr className="border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <td />
              {compareItems.map(product => (
                <td key={product.id} className="p-3">
                  <Button
                    size="sm"
                    className="rounded-full store-btn-gold w-full"
                    style={{ color: primaryColor }}
                    onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: product.unitPrice, category: product.category, imageUrl: product.imageUrl }, 1, product.stockQuantity)}
                    disabled={product.stockQuantity === 0}
                    data-testid={`button-add-compare-${product.id}`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                    {t("detail.addToCart")}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
