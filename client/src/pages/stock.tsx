import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  ArrowUpDown,
  History,
  Download,
  Upload,
  Barcode,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Printer,
  Star,
  ImagePlus,
  X,
  Flame,
  ArrowLeft,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { exportToCsv } from "@/lib/csv-export";
import type { Product, InsertProduct, StockMovementWithProduct, InventoryValuation, Category, ProductVariant } from "@shared/schema";

const fallbackCategories = ["General Products", "Food & Beverages", "Industrial Supplies", "Accessories", "Other"];

const stockReasonKeys = [
  { value: "purchase", key: "stock.reasons.purchase" },
  { value: "return", key: "stock.reasons.return" },
  { value: "damaged", key: "stock.reasons.damaged" },
  { value: "correction", key: "stock.reasons.correction" },
  { value: "transfer", key: "stock.reasons.transfer" },
  { value: "other", key: "stock.reasons.other" },
];

interface OptionRow {
  name: string;
  values: string;
}

interface VariantRow {
  variantLabel: string;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  sku: string;
  imageUrl: string | null;
  option1Name: string | null;
  option1Value: string | null;
  option2Name: string | null;
  option2Value: string | null;
  option3Name: string | null;
  option3Value: string | null;
  isActive: boolean;
}

function generateVariantCombinations(options: OptionRow[], parentPrice: number): VariantRow[] {
  const validOptions = options.filter(o => o.name.trim() && o.values.trim());
  if (validOptions.length === 0) return [];

  const optionArrays = validOptions.map(o => ({
    name: o.name.trim(),
    values: o.values.split(",").map(v => v.trim()).filter(Boolean),
  }));

  if (optionArrays.some(o => o.values.length === 0)) return [];

  let combinations: { label: string; opts: { name: string; value: string }[] }[] = [{ label: "", opts: [] }];

  for (const opt of optionArrays) {
    const newCombos: typeof combinations = [];
    for (const combo of combinations) {
      for (const val of opt.values) {
        const newLabel = combo.label ? `${combo.label} / ${val}` : val;
        newCombos.push({
          label: newLabel,
          opts: [...combo.opts, { name: opt.name, value: val }],
        });
      }
    }
    combinations = newCombos;
  }

  return combinations.map(combo => ({
    variantLabel: combo.label,
    unitPrice: parentPrice,
    costPrice: 0,
    stockQuantity: 0,
    sku: "",
    imageUrl: null,
    option1Name: combo.opts[0]?.name || null,
    option1Value: combo.opts[0]?.value || null,
    option2Name: combo.opts[1]?.name || null,
    option2Value: combo.opts[1]?.value || null,
    option3Name: combo.opts[2]?.name || null,
    option3Value: combo.opts[2]?.value || null,
    isActive: true,
  }));
}

function MediaGallerySection({
  images,
  onImagesChange,
}: {
  images: string[];
  onImagesChange: (imgs: string[]) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 6 - images.length;
    if (remaining <= 0) {
      toast({ title: "Maximum 6 images allowed", variant: "destructive" });
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remaining);
    const validFiles = filesToProcess.filter(file => {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: `${file.name} exceeds 2MB limit`, variant: "destructive" });
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    const readPromises = validFiles.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }));
    Promise.all(readPromises).then(newImages => {
      onImagesChange([...images, ...newImages].slice(0, 6));
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-md border overflow-visible" data-testid={`img-gallery-${idx}`}>
                <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover rounded-md" />
                {idx === 0 && (
                  <Badge variant="secondary" className="absolute top-1 left-1 text-[10px]">Primary</Badge>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ visibility: "visible" }}
                  data-testid={`button-remove-image-${idx}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < 6 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate transition-colors"
            data-testid="dropzone-images"
          >
            <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 2MB per image, {6 - images.length} remaining
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptionsAndVariantsSection({
  hasOptions,
  onHasOptionsChange,
  options,
  onOptionsChange,
  variants,
  onVariantsChange,
  parentPrice,
}: {
  hasOptions: boolean;
  onHasOptionsChange: (v: boolean) => void;
  options: OptionRow[];
  onOptionsChange: (opts: OptionRow[]) => void;
  variants: VariantRow[];
  onVariantsChange: (vars: VariantRow[]) => void;
  parentPrice: number;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);

  const regenerateVariants = useCallback((newOptions: OptionRow[]) => {
    const newVariants = generateVariantCombinations(newOptions, parentPrice);
    const merged = newVariants.map(nv => {
      const existing = variants.find(ev => ev.variantLabel === nv.variantLabel);
      if (existing) {
        return { ...nv, unitPrice: existing.unitPrice, costPrice: existing.costPrice, stockQuantity: existing.stockQuantity, sku: existing.sku, imageUrl: existing.imageUrl, isActive: existing.isActive };
      }
      return nv;
    });
    onVariantsChange(merged);
  }, [variants, parentPrice, onVariantsChange]);

  const handleOptionChange = (index: number, field: "name" | "values", value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onOptionsChange(newOptions);
    regenerateVariants(newOptions);
  };

  const addOption = () => {
    if (options.length >= 3) {
      toast({ title: "Maximum 3 options allowed", variant: "destructive" });
      return;
    }
    const newOptions = [...options, { name: "", values: "" }];
    onOptionsChange(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onOptionsChange(newOptions);
    regenerateVariants(newOptions);
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);
  };

  const removeVariant = (index: number) => {
    onVariantsChange(variants.filter((_, i) => i !== index));
  };

  const handleVariantImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateVariant(index, "imageUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Options & Variants</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={hasOptions}
              onCheckedChange={onHasOptionsChange}
              data-testid="switch-has-options"
            />
            <Label className="text-sm">This product has options</Label>
          </div>

          {hasOptions && (
            <>
              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-md bg-muted/20" data-testid={`option-row-${idx}`}>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Option name (e.g. Size, Color)"
                        value={opt.name}
                        onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
                        data-testid={`input-option-name-${idx}`}
                      />
                      <Input
                        placeholder="Comma-separated values (e.g. S, M, L, XL)"
                        value={opt.values}
                        onChange={(e) => handleOptionChange(idx, "values", e.target.value)}
                        data-testid={`input-option-values-${idx}`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      data-testid={`button-remove-option-${idx}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {options.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    data-testid="button-add-option"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add option
                  </Button>
                )}
              </div>

              {variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{variants.length} Variants</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }} data-testid="text-total-variant-stock">
                        <Package className="h-3 w-3" />
                        Total Stock: {variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Image</TableHead>
                          <TableHead className="min-w-[140px]">Variant</TableHead>
                          <TableHead className="w-[100px]">Price</TableHead>
                          <TableHead className="w-[100px]">Cost</TableHead>
                          <TableHead className="w-[90px]">Stock</TableHead>
                          <TableHead className="w-[120px]">SKU</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variants.map((v, idx) => (
                          <TableRow key={idx} data-testid={`variant-row-${idx}`}>
                            <TableCell>
                              {v.imageUrl ? (
                                <div className="relative w-10 h-10 group">
                                  <img src={v.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                                  <button
                                    type="button"
                                    onClick={() => updateVariant(idx, "imageUrl", null)}
                                    className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-10 h-10 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors" data-testid={`button-variant-image-${idx}`}>
                                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleVariantImageUpload(idx, e)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{v.variantLabel}</span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={v.unitPrice}
                                onChange={(e) => updateVariant(idx, "unitPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                className="h-8 text-sm"
                                data-testid={`input-variant-price-${idx}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={v.costPrice}
                                onChange={(e) => updateVariant(idx, "costPrice", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                className="h-8 text-sm"
                                data-testid={`input-variant-cost-${idx}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={v.stockQuantity}
                                onChange={(e) => updateVariant(idx, "stockQuantity", e.target.value === "" ? 0 : parseInt(e.target.value))}
                                className="h-8 text-sm"
                                data-testid={`input-variant-stock-${idx}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={v.sku}
                                onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                                placeholder="SKU"
                                className="h-8 text-sm"
                                data-testid={`input-variant-sku-${idx}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeVariant(idx)}
                                data-testid={`button-delete-variant-${idx}`}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium" style={{ background: "rgba(201,168,76,0.05)" }}>
                          <TableCell colSpan={4} className="text-right text-sm" style={{ color: "#C9A84C" }}>
                            Total Available Stock
                          </TableCell>
                          <TableCell className="text-sm font-bold" style={{ color: "#C9A84C" }} data-testid="text-variants-total-stock">
                            {variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function ProductFormPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, editParams] = useRoute("/emanager-portal/stock/:id/edit");
  const productId = editParams?.id;
  const isEditing = !!productId;

  const { data: existingProduct, isLoading: loadingProduct } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    enabled: isEditing,
  });

  const { data: existingVariants } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", productId, "variants"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/variants`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch variants");
      return res.json();
    },
    enabled: isEditing,
  });

  const { data: dynamicCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const catNames = dynamicCategories.length > 0 ? dynamicCategories.map(c => c.name) : fallbackCategories;

  const [formData, setFormData] = useState<Partial<InsertProduct>>({
    name: "",
    nameAr: "",
    nameFr: "",
    category: "",
    unitPrice: 0,
    costPrice: 0,
    purchasePrice: 0,
    shippingCost: 0,
    additionalCost: 0,
    weightPerUnit: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    unit: "pcs",
    barcode: "",
    imageUrl: null,
    images: [],
    isDealOfDay: false,
    dealDiscount: 0,
    descriptionEn: "",
    descriptionFr: "",
    descriptionAr: "",
    hasVariants: false,
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [hasOptions, setHasOptions] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  useUnsavedChanges(formDirty);

  useEffect(() => {
    if (isEditing && existingProduct && !initialized) {
      setFormData({
        name: existingProduct.name,
        nameAr: existingProduct.nameAr || "",
        nameFr: existingProduct.nameFr || "",
        category: existingProduct.category,
        unitPrice: existingProduct.unitPrice,
        costPrice: existingProduct.costPrice,
        purchasePrice: existingProduct.purchasePrice,
        shippingCost: existingProduct.shippingCost,
        additionalCost: existingProduct.additionalCost,
        weightPerUnit: existingProduct.weightPerUnit,
        stockQuantity: existingProduct.stockQuantity,
        lowStockThreshold: existingProduct.lowStockThreshold,
        unit: existingProduct.unit,
        barcode: existingProduct.barcode || "",
        imageUrl: existingProduct.imageUrl,
        images: existingProduct.images || [],
        isDealOfDay: existingProduct.isDealOfDay,
        dealDiscount: existingProduct.dealDiscount,
        descriptionEn: existingProduct.descriptionEn || "",
        descriptionFr: existingProduct.descriptionFr || "",
        descriptionAr: existingProduct.descriptionAr || "",
        hasVariants: existingProduct.hasVariants,
      });
      setProductImages(existingProduct.images || []);
      setHasOptions(existingProduct.hasVariants || false);
      setInitialized(true);
    }
  }, [isEditing, existingProduct, initialized]);

  useEffect(() => {
    if (!isEditing && dynamicCategories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: catNames[0] }));
    }
  }, [dynamicCategories, isEditing]);

  useEffect(() => {
    if (isEditing && existingVariants && existingVariants.length > 0 && initialized) {
      const optionsFromVariants: OptionRow[] = [];
      const v0 = existingVariants[0];
      if (v0.option1Name) {
        const vals = Array.from(new Set(existingVariants.map(v => v.option1Value).filter(Boolean)));
        optionsFromVariants.push({ name: v0.option1Name, values: vals.join(", ") });
      }
      if (v0.option2Name) {
        const vals = Array.from(new Set(existingVariants.map(v => v.option2Value).filter(Boolean)));
        optionsFromVariants.push({ name: v0.option2Name, values: vals.join(", ") });
      }
      if (v0.option3Name) {
        const vals = Array.from(new Set(existingVariants.map(v => v.option3Value).filter(Boolean)));
        optionsFromVariants.push({ name: v0.option3Name, values: vals.join(", ") });
      }
      if (optionsFromVariants.length > 0) {
        setOptions(optionsFromVariants);
      }
      setVariants(existingVariants.map(v => ({
        variantLabel: v.variantLabel,
        unitPrice: v.unitPrice,
        costPrice: v.costPrice,
        stockQuantity: v.stockQuantity,
        sku: v.sku || "",
        imageUrl: v.imageUrl,
        option1Name: v.option1Name,
        option1Value: v.option1Value,
        option2Name: v.option2Name,
        option2Value: v.option2Value,
        option3Name: v.option3Name,
        option3Value: v.option3Value,
        isActive: v.isActive,
      })));
    }
  }, [existingVariants, initialized, isEditing]);

  useEffect(() => {
    if (hasOptions) {
      const totalVariantStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      setFormData(prev => prev.stockQuantity !== totalVariantStock ? { ...prev, stockQuantity: totalVariantStock } : prev);
    }
  }, [hasOptions, variants]);

  useEffect(() => {
    const pp = formData.purchasePrice || 0;
    const sc = formData.shippingCost || 0;
    const ac = formData.additionalCost || 0;
    const qty = formData.stockQuantity || 1;
    const totalCost = pp + sc + ac;
    const cost = qty > 0 ? Math.round((totalCost / qty) * 100) / 100 : 0;
    setFormData(prev => ({ ...prev, costPrice: cost }));
  }, [formData.purchasePrice, formData.shippingCost, formData.additionalCost, formData.stockQuantity]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      images: productImages,
      imageUrl: productImages.length > 0 ? productImages[0] : "",
    }));
  }, [productImages]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: async (product: Product) => {
      if (hasOptions && variants.length > 0) {
        await apiRequest("POST", `/api/products/${product.id}/variants/batch`, { variants });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productAdded") });
      setFormDirty(false);
      navigate("/emanager-portal/stock");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      await apiRequest("PATCH", `/api/products/${productId}`, data);
    },
    onSuccess: async () => {
      if (hasOptions && variants.length > 0) {
        await apiRequest("POST", `/api/products/${productId}/variants/batch`, { variants });
      } else if (!hasOptions) {
        await apiRequest("POST", `/api/products/${productId}/variants/batch`, { variants: [] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productUpdated") });
      setFormDirty(false);
      navigate("/emanager-portal/stock");
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    const data = {
      ...formData,
      hasVariants: hasOptions,
    } as InsertProduct;
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData(prev => ({ ...prev, barcode: `ECM-${timestamp}-${random}` }));
  };

  const generateAiDescriptions = async () => {
    if (!formData.name?.trim()) {
      toast({ title: "Enter a product name first", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const variantLabels = hasOptions && variants.length > 0
        ? variants.map(v => v.variantLabel)
        : [];
      const res = await apiRequest("POST", "/api/ai/generate-descriptions", {
        productName: formData.name,
        category: formData.category || "General",
        variants: variantLabels,
      });
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        descriptionEn: data.descriptionEn || prev.descriptionEn,
        descriptionFr: data.descriptionFr || prev.descriptionFr,
        descriptionAr: data.descriptionAr || prev.descriptionAr,
      }));
      toast({ title: "Descriptions generated successfully" });
    } catch (error: any) {
      toast({ title: error.message || "Failed to generate descriptions", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingProduct) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} onChange={() => setFormDirty(true)} className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/emanager-portal/stock")}
            data-testid="button-back-to-stock"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-product-form-title">
              {isEditing ? t("stock.editProduct") : t("stock.addProduct")}
            </h1>
            {isEditing && existingProduct && (
              <p className="text-sm text-muted-foreground">{existingProduct.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/emanager-portal/stock")}
            data-testid="button-cancel-product"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: "#0A1628", borderColor: "#C9A84C" }}
            className="text-white border"
            data-testid="button-save-product"
          >
            {isPending ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Title & Description</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateAiDescriptions}
                  disabled={aiGenerating || !formData.name?.trim()}
                  className="gap-1.5 text-xs"
                  style={{ borderColor: "rgba(201,168,76,0.5)", color: "#C9A84C" }}
                  data-testid="button-ai-generate-descriptions"
                >
                  {aiGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiGenerating ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("stock.productName")} (EN) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name in English"
                  required
                  data-testid="input-product-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="nameFr">{t("stock.productName")} (FR)</Label>
                  <Input
                    id="nameFr"
                    value={formData.nameFr || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameFr: e.target.value }))}
                    placeholder="Nom du produit en français"
                    data-testid="input-product-name-fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAr">{t("stock.productName")} (AR)</Label>
                  <Input
                    id="nameAr"
                    value={formData.nameAr || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="اسم المنتج بالعربية"
                    dir="rtl"
                    data-testid="input-product-name-ar"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (EN)</Label>
                <Textarea
                  value={formData.descriptionEn || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  placeholder="Product description in English"
                  rows={3}
                  data-testid="input-description-en"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (FR)</Label>
                <Textarea
                  value={formData.descriptionFr || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionFr: e.target.value }))}
                  placeholder="Description du produit en français"
                  rows={3}
                  data-testid="input-description-fr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (AR)</Label>
                <Textarea
                  value={formData.descriptionAr || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                  placeholder="وصف المنتج بالعربية"
                  rows={3}
                  dir="rtl"
                  data-testid="input-description-ar"
                />
              </div>
            </CardContent>
          </Card>

          <MediaGallerySection
            images={productImages}
            onImagesChange={(imgs) => { setProductImages(imgs); setFormDirty(true); }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unitPrice">{t("stock.unitPrice")} (MRU) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                  required
                  data-testid="input-unit-price"
                />
              </div>
              <div className="rounded-md border p-4 space-y-3" style={{ borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.03)" }}>
                <p className="text-sm font-semibold text-muted-foreground">{t("stock.costBreakdown")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="purchasePrice" className="text-xs">{t("stock.purchasePrice")} (MRU)</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                      data-testid="input-purchase-price"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shippingCost" className="text-xs">{t("stock.shippingCost")} (MRU)</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shippingCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                      data-testid="input-shipping-cost"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="additionalCost" className="text-xs">{t("stock.additionalCost")} (MRU)</Label>
                    <Input
                      id="additionalCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.additionalCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalCost: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                      data-testid="input-additional-cost"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(201,168,76,0.2)" }}>
                  <span className="text-xs font-medium text-muted-foreground">{t("stock.costPrice")} (MRU)</span>
                  <span className="text-sm font-bold" style={{ color: "#C9A84C" }} data-testid="text-computed-cost">
                    {(formData.costPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">{t("stock.stockQuantity")} *</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value === "" ? 0 as any : parseInt(e.target.value) }))}
                    required
                    readOnly={hasOptions && variants.length > 0}
                    className={hasOptions && variants.length > 0 ? "bg-muted cursor-not-allowed" : ""}
                    data-testid="input-stock-quantity"
                  />
                  {hasOptions && variants.length > 0 && (
                    <p className="text-xs text-muted-foreground">Auto-calculated from variant quantities</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">{t("stock.lowStock")}</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value === "" ? 0 as any : parseInt(e.target.value) }))}
                    data-testid="input-low-stock"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightPerUnit">{t("stock.weightPerUnit")} (kg)</Label>
                  <Input
                    id="weightPerUnit"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.weightPerUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, weightPerUnit: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                    data-testid="input-weight-per-unit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">{t("stock.unit")}</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => { setFormData(prev => ({ ...prev, unit: value })); setFormDirty(true); }}
                  >
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">{t("stock.pieces")}</SelectItem>
                      <SelectItem value="box">{t("stock.box")}</SelectItem>
                      <SelectItem value="kg">{t("stock.kg")}</SelectItem>
                      <SelectItem value="palette">{t("stock.palette")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">{t("stock.barcode")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    placeholder={t("stock.barcode")}
                    data-testid="input-barcode"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={generateBarcode} data-testid="button-generate-barcode">
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <OptionsAndVariantsSection
            hasOptions={hasOptions}
            onHasOptionsChange={(v) => {
              setHasOptions(v);
              setFormDirty(true);
              if (v && options.length === 0) {
                setOptions([{ name: "", values: "" }]);
              }
            }}
            options={options}
            onOptionsChange={(opts) => { setOptions(opts); setFormDirty(true); }}
            variants={variants}
            onVariantsChange={(vars) => { setVariants(vars); setFormDirty(true); }}
            parentPrice={formData.unitPrice || 0}
          />
        </div>

        <div className="space-y-6">
          <Card style={{ borderColor: "rgba(201,168,76,0.3)" }}>
            <CardHeader>
              <CardTitle className="text-base">Category & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t("stock.category")} *</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => { setFormData(prev => ({ ...prev, category: value })); setFormDirty(true); }}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.length > 0 ? dynamicCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    )) : fallbackCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border p-4 space-y-3" style={{ borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.03)" }}>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4" style={{ color: "#C9A84C" }} />
                  {t("stock.dealOfDay")}
                </Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isDealOfDay || false}
                    onCheckedChange={(checked) => { setFormData(prev => ({ ...prev, isDealOfDay: checked })); setFormDirty(true); }}
                    data-testid="switch-deal-of-day"
                  />
                  <span className="text-sm">{t("stock.markAsDeal")}</span>
                </div>
                {formData.isDealOfDay && (
                  <div className="space-y-2">
                    <Label htmlFor="dealDiscount" className="text-xs">{t("stock.dealDiscount")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="dealDiscount"
                        type="number"
                        min="1"
                        max="99"
                        value={formData.dealDiscount || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, dealDiscount: e.target.value === "" ? 0 as any : parseFloat(e.target.value) }))}
                        className="w-24"
                        data-testid="input-deal-discount"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isEditing && existingProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{existingProduct.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Current Stock</span>
                  <span className="font-medium">{existingProduct.stockQuantity} {existingProduct.unit}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Inventory Value</span>
                  <span className="font-medium">{(existingProduct.stockQuantity * existingProduct.costPrice).toLocaleString()} MRU</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}

function VariantManagementSection({
  productId,
  t,
}: {
  productId: string;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [variantForm, setVariantForm] = useState({
    variantLabel: "",
    unitPrice: 0,
    stockQuantity: 0,
    imageUrl: "" as string | null,
  });

  const { data: variants, isLoading } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", productId, "variants"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/variants`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch variants");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof variantForm) =>
      apiRequest("POST", `/api/products/${productId}/variants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "variants"] });
      toast({ title: "Variant added" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof variantForm }) =>
      apiRequest("PATCH", `/api/product-variants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "variants"] });
      toast({ title: "Variant updated" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/product-variants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "variants"] });
      toast({ title: "Variant deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setVariantForm({ variantLabel: "", unitPrice: 0, stockQuantity: 0, imageUrl: null });
    setEditingVariant(null);
    setShowAddForm(false);
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setVariantForm({
      variantLabel: variant.variantLabel,
      unitPrice: variant.unitPrice,
      stockQuantity: variant.stockQuantity,
      imageUrl: variant.imageUrl,
    });
    setShowAddForm(true);
  };

  const handleVariantImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setVariantForm(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveVariant = () => {
    if (!variantForm.variantLabel.trim()) {
      toast({ title: "Variant label is required", variant: "destructive" });
      return;
    }
    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, data: variantForm });
    } else {
      createMutation.mutate(variantForm);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="font-semibold text-sm">Variants</Label>
        {!showAddForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(true)} data-testid="button-add-variant">
            <Plus className="h-3 w-3 mr-1" />
            Add Variant
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-8 w-full" />}

      {variants && variants.length > 0 && (
        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background" data-testid={`row-variant-${v.id}`}>
              <div className="flex items-center gap-2 min-w-0">
                {v.imageUrl && (
                  <img src={v.imageUrl} alt={v.variantLabel} className="h-8 w-8 rounded object-cover border" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{v.variantLabel}</p>
                  <p className="text-xs text-muted-foreground">{v.unitPrice} MRU &middot; Stock: {v.stockQuantity}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" variant="ghost" size="icon" onClick={() => handleEdit(v)} data-testid={`button-edit-variant-${v.id}`}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteMutation.mutate(v.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-variant-${v.id}`}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="space-y-3 border rounded-md p-3 bg-background">
          <div className="space-y-2">
            <Label className="text-xs">Variant Label *</Label>
            <Input
              value={variantForm.variantLabel}
              onChange={(e) => setVariantForm({ ...variantForm, variantLabel: e.target.value })}
              placeholder="e.g. Red / XL"
              data-testid="input-variant-label"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Unit Price (MRU) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={variantForm.unitPrice}
                onChange={(e) => setVariantForm({ ...variantForm, unitPrice: e.target.value === "" ? "" as any : parseFloat(e.target.value) })}
                data-testid="input-variant-price"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Stock Quantity *</Label>
              <Input
                type="number"
                min="0"
                value={variantForm.stockQuantity}
                onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: e.target.value === "" ? "" as any : parseInt(e.target.value) })}
                data-testid="input-variant-stock"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Image (optional)</Label>
            {variantForm.imageUrl ? (
              <div className="relative inline-block">
                <img src={variantForm.imageUrl} alt="Variant" className="h-16 w-16 object-cover rounded-md border" />
                <button type="button" onClick={() => setVariantForm(prev => ({ ...prev, imageUrl: null }))} className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center" data-testid="button-remove-variant-image">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 border-2 border-dashed rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors" data-testid="input-variant-image">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload image</span>
                <input type="file" accept="image/*" onChange={handleVariantImageUpload} className="hidden" />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm} data-testid="button-cancel-variant">
              {t("common.cancel")}
            </Button>
            <Button type="button" size="sm" onClick={handleSaveVariant} disabled={isSaving} data-testid="button-save-variant">
              {isSaving ? t("common.loading") : editingVariant ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("purchase");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) {
      setAdjustmentType("in");
      setQuantity(0);
      setReason("purchase");
      setReference("");
    }
  }, [open]);

  const adjustMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number; reason: string; reference?: string }) =>
      apiRequest("POST", "/api/stock-movements/adjust", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.stockAdjusted") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || quantity <= 0) return;
    
    const finalQuantity = adjustmentType === "out" ? -quantity : quantity;
    adjustMutation.mutate({
      productId: product.id,
      quantity: finalQuantity,
      reason,
      reference: reference || undefined,
    });
  };

  const getReasonLabel = (reasonValue: string) => {
    const reasonObj = stockReasonKeys.find(r => r.value === reasonValue);
    if (!reasonObj) return reasonValue;
    return t(reasonObj.key);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("stock.adjustStock")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("stock.adjustStock")}
          </DialogDescription>
        </DialogHeader>
        {product && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("stock.currentStock")}: {product.stockQuantity} {product.unit}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === "in" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustmentType("in")}
                data-testid="button-stock-in"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {t("stock.stockIn")}
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "out" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustmentType("out")}
                data-testid="button-stock-out"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                {t("stock.stockOut")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{t("stock.quantity")} *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" as any : parseInt(e.target.value))}
                required
                data-testid="input-adjust-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t("stock.reason")} *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue>{getReasonLabel(reason)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stockReasonKeys.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">{t("stock.reference")}</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t("stock.referencePlaceholder")}
                data-testid="input-reference"
              />
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                {t("stock.newStock")}: <span className="font-medium">
                  {adjustmentType === "in" 
                    ? product.stockQuantity + quantity 
                    : Math.max(0, product.stockQuantity - quantity)} {product.unit}
                </span>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={adjustMutation.isPending || quantity <= 0} data-testid="button-confirm-adjust">
                {adjustMutation.isPending ? t("common.loading") : t("common.confirm")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StockHistoryDialog({
  open,
  onOpenChange,
  product,
  t,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  t: (key: string) => string;
  language: string;
}) {
  const { data: movements, isLoading } = useQuery<StockMovementWithProduct[]>({
    queryKey: ["/api/stock-movements", product?.id],
    enabled: open && !!product,
  });

  const getReasonLabel = (reason: string) => {
    const reasonObj = stockReasonKeys.find(r => r.value === reason);
    if (!reasonObj) return reason;
    return t(reasonObj.key);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "ar" ? "ar-DZ" : language === "en" ? "en-US" : "fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("stock.stockHistory")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("stock.stockHistory")}
          </DialogDescription>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("stock.currentStock")}: {product.stockQuantity} {product.unit}
              </p>
            </div>
            
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : movements && movements.length > 0 ? (
                <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.id} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {movement.quantity > 0 ? (
                            <ArrowUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={movement.quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                          </span>
                        </div>
                        <Badge variant="secondary">{getReasonLabel(movement.reason)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {movement.previousStock} {"->"} {movement.newStock}
                      </div>
                      {movement.reference && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("stock.reference")}: {movement.reference}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(movement.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("stock.noMovements")}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportExportSection({ t }: { t: (key: string) => string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/products/export/csv");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: t("stock.exportSuccess") });
    } catch (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const csvData = await file.text();
      const response = await apiRequest("POST", "/api/products/import/csv", { csvData });
      const result = response as unknown as { imported: number; errors: string[] };
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      
      if (result.imported > 0) {
        toast({ title: `${t("stock.importSuccess")}: ${result.imported} ${t("stock.products")}` });
      }
      if (result.errors && result.errors.length > 0) {
        toast({ 
          title: `${result.errors.length} ${t("stock.importErrors")}`, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("common.error"), variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-csv">
        <Download className="h-4 w-4 mr-2" />
        {t("stock.export")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-import-csv">
        <Upload className="h-4 w-4 mr-2" />
        {t("stock.import")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

export default function Stock() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: inventoryValuation } = useQuery<InventoryValuation>({
    queryKey: ["/api/inventory/valuation"],
  });

  const { data: dynamicCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/products/${id}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/valuation"] });
      toast({ title: t("stock.productDeleted") });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products?.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  );

  const handleEdit = (product: Product) => {
    navigate(`/emanager-portal/stock/${product.id}/edit`);
  };

  const handleNew = () => {
    navigate("/emanager-portal/stock/new");
  };

  const printBarcodeLabels = (productsToPrint: Product[]) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const labelsHtml = productsToPrint.map((p) => `
      <div class="label">
        <div class="name">${p.name}</div>
        <div class="barcode-text">${p.barcode || p.id.slice(0, 12)}</div>
        <svg class="barcode-svg" id="bc-${p.id}"></svg>
        <div class="price">${p.unitPrice.toLocaleString()} MRU</div>
      </div>
    `).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
    <style>
      @page { margin: 5mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Roboto', Arial, sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
      .label {
        border: 1px solid #ccc; padding: 3mm; text-align: center;
        page-break-inside: avoid; height: 32mm; display: flex;
        flex-direction: column; justify-content: center; align-items: center;
      }
      .name { font-weight: bold; font-size: 9pt; margin-bottom: 1mm; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .barcode-text { font-family: monospace; font-size: 8pt; letter-spacing: 1px; margin-bottom: 1mm; }
      .barcode-svg { max-width: 55mm; height: 12mm; }
      .price { font-weight: bold; font-size: 10pt; margin-top: 1mm; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <div class="no-print" style="padding:10px;text-align:center;margin-bottom:10px;">
      <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;">
        ${t("stock.printLabels")}
      </button>
      <span style="margin-left:10px;">${productsToPrint.length} ${t("stock.labelCount")}</span>
    </div>
    <div class="grid">${labelsHtml}</div>
    <script>
      function drawBarcode(svgEl, text) {
        if (!svgEl || !text) return;
        const code128B = [
          '11011001100','11001101100','11001100110','10010011000','10010001100',
          '10001001100','10011001000','10011000100','10001100100','11001001000',
          '11001000100','11000100100','10110011100','10011011100','10011001110',
          '10111001100','10011101100','10011100110','11001110010','11001011100',
          '11001001110','11011100100','11001110100','11100101100','11100100110',
          '11101100100','11100110100','11100110010','11011011000','11011000110',
          '11000110110','10100011000','10001011000','10001000110','10110001000',
          '10001101000','10001100010','11010001000','11000101000','11000100010',
          '10110111000','10110001110','10001101110','10111011000','10111000110',
          '10001110110','11101110110','11010001110','11000101110','11011101000',
          '11011100010','11011101110','11101011000','11101000110','11100010110',
          '11101101000','11101100010','11100011010','11101111010','11001000010',
          '11110001010','10100110000','10100001100','10010110000','10010000110',
          '10000101100','10000100110','10110010000','10110000100','10011010000',
          '10011000010','10000110100','10000110010','11000010010','11001010000',
          '11110111010','11000010100','10001111010','10100111100','10010111100',
          '10010011110','10111100100','10011110100','10011110010','11110100100',
          '11110010100','11110010010','11011011110','11110110110','11110011010',
          '11000111010','11010111000','11010111110','10001111110'
        ];
        const startB = '11010010000';
        const stop = '1100011101011';
        let sum = 104;
        let pattern = startB;
        for (let i = 0; i < text.length; i++) {
          const v = text.charCodeAt(i) - 32;
          if (v >= 0 && v < code128B.length) {
            pattern += code128B[v];
            sum += v * (i + 1);
          }
        }
        pattern += code128B[sum % 103];
        pattern += stop;
        const w = pattern.length;
        svgEl.setAttribute('viewBox', '0 0 ' + w + ' 40');
        let bars = '';
        for (let i = 0; i < pattern.length; i++) {
          if (pattern[i] === '1') {
            bars += '<rect x="' + i + '" y="0" width="1" height="40" fill="black"/>';
          }
        }
        svgEl.innerHTML = bars;
      }
      document.querySelectorAll('.barcode-svg').forEach(function(svg) {
        var label = svg.closest('.label');
        var text = label ? label.querySelector('.barcode-text').textContent.trim() : '';
        drawBarcode(svg, text);
      });
    </script></body></html>`);
    win.document.close();
  };

  const handleAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustDialogOpen(true);
  };

  const handleHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-stock-title">
            {t("stock.title")}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("stock.searchProducts")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!products) return;
              exportToCsv(
                products,
                [
                  { header: t("stock.csvName"), accessor: (p) => p.name },
                  { header: t("stock.csvCategory"), accessor: (p) => p.category },
                  { header: t("stock.csvUnitPrice"), accessor: (p) => p.unitPrice },
                  { header: t("stock.purchasePrice"), accessor: (p) => p.purchasePrice },
                  { header: t("stock.shippingCost"), accessor: (p) => p.shippingCost },
                  { header: t("stock.additionalCost"), accessor: (p) => p.additionalCost },
                  { header: t("stock.csvCostPrice"), accessor: (p) => p.costPrice },
                  { header: t("stock.csvStock"), accessor: (p) => p.stockQuantity },
                  { header: t("stock.csvUnit"), accessor: (p) => p.unit },
                  { header: t("stock.csvBarcode"), accessor: (p) => p.barcode },
                ],
                "stock"
              );
            }}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("common.exportCsv")}
          </Button>
          <ImportExportSection t={t} />
          <Button
            variant="outline"
            onClick={() => {
              if (filteredProducts && filteredProducts.length > 0) {
                printBarcodeLabels(filteredProducts);
              }
            }}
            disabled={!filteredProducts || filteredProducts.length === 0}
            data-testid="button-print-all-barcodes"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("stock.printBarcodes")}
          </Button>
          <Button onClick={handleNew} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            {t("stock.addProduct")}
          </Button>
        </div>
      </div>

      {inventoryValuation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stock.totalInventoryValue")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-total-inventory-value">
                {inventoryValuation.totalInventoryValue.toLocaleString()} MRU
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("stock.perGaapIfrs")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stock.productsInStock")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-products-with-stock">
                {inventoryValuation.productsWithStock} / {inventoryValuation.totalProducts}
              </div>
            </CardContent>
          </Card>
          
          {inventoryValuation.productsWithWarnings > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {t("stock.costWarnings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-cost-warnings">
                  {inventoryValuation.productsWithWarnings}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("stock.productsCostZero")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              {t("stock.lowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge
                  key={product.id}
                  variant="secondary"
                  className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                >
                  {product.name} ({product.stockQuantity} {t("stock.left")})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("stock.searchByNameOrBarcode")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-products"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
                <SelectValue placeholder={t("stock.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.allCategories")}</SelectItem>
                {dynamicCategories.length > 0 ? dynamicCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                )) : fallbackCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      <div className="flex items-center gap-1">
                        {t("stock.product")}
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>{t("stock.category")}</TableHead>
                    <TableHead className="text-right">{t("stock.unitPrice")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.costPrice")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock.stock")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.inventoryValue")}
                    </TableHead>
                    <TableHead className="text-right">{t("stock.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                    const hasCostWarning = product.stockQuantity > 0 && product.costPrice <= 0;
                    const inventoryValue = Math.round(product.stockQuantity * product.costPrice * 100) / 100;
                    return (
                      <TableRow 
                        key={product.id} 
                        data-testid={`row-product-${product.id}`}
                        className={hasCostWarning ? "bg-red-50 dark:bg-red-950/20" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{product.name}</span>
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Barcode className="h-3 w-3" />
                                  {product.barcode}
                                </div>
                              )}
                              {hasCostWarning && (
                                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("stock.updateCostPrice")}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {product.unitPrice.toLocaleString()} MRU
                        </TableCell>
                        <TableCell className={`text-right font-mono ${hasCostWarning ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                          {product.costPrice.toLocaleString()} MRU
                          {hasCostWarning && (
                            <AlertTriangle className="inline-block ml-1 h-3 w-3 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isLowStock ? "text-orange-600 dark:text-orange-400 font-medium" : ""}>
                            {product.stockQuantity} {product.unit}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="inline-block ml-1 h-3 w-3 text-orange-500" />
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${hasCostWarning ? "text-red-600 dark:text-red-400" : ""}`} data-testid={`text-inventory-value-${product.id}`}>
                          {inventoryValue.toLocaleString()} MRU
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavoriteMutation.mutate(product.id)}
                              data-testid={`button-favorite-${product.id}`}
                              className="toggle-elevate"
                            >
                              <Star className={`h-4 w-4 ${product.isFavorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => printBarcodeLabels([product])}
                              data-testid={`button-print-barcode-${product.id}`}
                              title={t("stock.printBarcode")}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAdjust(product)}
                              data-testid={`button-adjust-${product.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleHistory(product)}
                              data-testid={`button-history-${product.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(product)}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t("common.noData")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search || categoryFilter !== "all" ? t("stock.searchProducts") : t("stock.addProduct")}
              </p>
              {!search && categoryFilter === "all" && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("stock.addProduct")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        product={adjustingProduct}
        onSuccess={() => setAdjustDialogOpen(false)}
        t={t}
      />

      <StockHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        product={historyProduct}
        t={t}
        language={language}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stock.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("stock.confirmDeleteMessage").replace("{name}", productToDelete?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
