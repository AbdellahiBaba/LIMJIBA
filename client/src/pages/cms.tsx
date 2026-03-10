import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Image, Settings, Save, Plus, Trash2, Edit, Loader2, Wallet, Upload, X, Palette, Truck, Shield, Award, Star, Heart, Zap, CheckCircle, Globe, Crown, Diamond, Gift, ThumbsUp, Lock, Medal, Gem, Package, Sparkles, Eye, Flame } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiSnapchat, SiTiktok } from "react-icons/si";
import type { CmsPage, CmsBanner, StoreSettings, PaymentWallet, Category, InsertCategory } from "@shared/schema";

function PagesTab() {
  const { toast } = useToast();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const slugs = ["home", "about", "contact", "terms"];

  const pages = slugs.map(slug => {
    const { data } = useQuery<CmsPage>({ queryKey: ["/api/store/pages", slug], queryFn: async () => { const r = await fetch(`/api/store/pages/${slug}`); return r.json(); } });
    return data;
  }).filter(Boolean) as CmsPage[];

  const updatePage = useMutation({
    mutationFn: async ({ slug, title, content }: { slug: string; title: string; content: string }) => {
      await apiRequest("PUT", `/api/cms/pages/${slug}`, { title, content, isPublished: true });
    },
    onSuccess: () => {
      toast({ title: "Page updated" });
      setEditingSlug(null);
      slugs.forEach(s => queryClient.invalidateQueries({ queryKey: ["/api/store/pages", s] }));
    },
  });

  const startEdit = (page: CmsPage) => {
    setEditingSlug(page.slug);
    setEditTitle(page.title);
    try {
      const c = JSON.parse(page.content);
      setEditBody(c.body || "");
    } catch { setEditBody(""); }
  };

  return (
    <div className="space-y-4">
      {pages.map(page => (
        <Card key={page.slug}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {page.title}
                <Badge variant="secondary" className="text-xs">/{page.slug}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => startEdit(page)} data-testid={`button-edit-page-${page.slug}`}>
                <Edit className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
          </CardHeader>
          {editingSlug === page.slug && (
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1" data-testid={`input-page-title-${page.slug}`} />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={8} className="mt-1" data-testid={`input-page-content-${page.slug}`} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updatePage.mutate({ slug: page.slug, title: editTitle, content: JSON.stringify({ body: editBody }) })} disabled={updatePage.isPending} data-testid={`button-save-page-${page.slug}`}>
                  {updatePage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
                </Button>
                <Button variant="outline" onClick={() => setEditingSlug(null)}>Cancel</Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function BannersTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", linkUrl: "", position: 0 });

  const { data: banners, isLoading } = useQuery<CmsBanner[]>({ queryKey: ["/api/cms/banners"] });

  const createBanner = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/cms/banners", { ...form, isActive: true }); },
    onSuccess: () => {
      toast({ title: "Banner created" });
      setShowForm(false);
      setForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", position: 0 });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/banners"] });
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/cms/banners/${id}`); },
    onSuccess: () => {
      toast({ title: "Banner deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/banners"] });
    },
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/cms/banners/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cms/banners"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Banners</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-banner">
          <Plus className="h-4 w-4 mr-1" /> Add Banner
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" data-testid="input-banner-title" />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="mt-1" data-testid="input-banner-subtitle" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Link URL</Label>
                <Input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createBanner.mutate()} disabled={!form.title || createBanner.isPending} data-testid="button-save-banner">
                {createBanner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {banners?.map(banner => (
        <Card key={banner.id}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{banner.title}</p>
              {banner.subtitle && <p className="text-sm text-muted-foreground">{banner.subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={banner.isActive} onCheckedChange={v => toggleBanner.mutate({ id: banner.id, isActive: v })} data-testid={`switch-banner-${banner.id}`} />
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteBanner.mutate(banner.id)} data-testid={`button-delete-banner-${banner.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!isLoading && (!banners || banners.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">No banners yet</div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<StoreSettings>({ queryKey: ["/api/store-settings"] });
  const [form, setForm] = useState<Partial<StoreSettings>>({});

  const loaded = !isLoading && settings && Object.keys(form).length === 0;
  if (loaded) {
    setForm({ ...settings });
  }

  const updateSettings = useMutation({
    mutationFn: async () => { await apiRequest("PUT", "/api/store-settings", form); },
    onSuccess: () => {
      toast({ title: "Store settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/settings"] });
    },
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Store Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Store Name</Label>
              <Input value={form.storeName || ""} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} className="mt-1" data-testid="input-store-name" />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl || ""} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Store Description</Label>
            <Textarea value={form.storeDescription || ""} onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))} className="mt-1" data-testid="input-store-description" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Hero Title</Label>
            <Input value={form.heroTitle || ""} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))} className="mt-1" data-testid="input-hero-title" />
          </div>
          <div>
            <Label>Hero Subtitle</Label>
            <Input value={form.heroSubtitle || ""} onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))} className="mt-1" data-testid="input-hero-subtitle" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Colors</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={form.primaryColor || "#0A1628"} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="h-10 w-10 rounded cursor-pointer" />
                <Input value={form.primaryColor || ""} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} data-testid="input-primary-color" />
              </div>
            </div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={form.accentColor || "#C9A84C"} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} className="h-10 w-10 rounded cursor-pointer" />
                <Input value={form.accentColor || ""} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))} data-testid="input-accent-color" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Contact Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input value={form.contactEmail || ""} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="mt-1" data-testid="input-contact-email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.contactPhone || ""} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="mt-1" data-testid="input-contact-phone" />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.contactAddress || ""} onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))} className="mt-1" data-testid="input-contact-address" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><SiInstagram className="h-4 w-4" /> Social Media Links</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            let socialLinks: Record<string, string> = {};
            try { socialLinks = JSON.parse(form.socialLinks || "{}"); } catch { socialLinks = {}; }
            const updateSocial = (key: string, value: string) => {
              const updated = { ...socialLinks, [key]: value };
              setForm(f => ({ ...f, socialLinks: JSON.stringify(updated) }));
            };
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><SiWhatsapp className="h-4 w-4 text-green-500" /> WhatsApp</Label>
                  <Input value={socialLinks.whatsapp || ""} onChange={e => updateSocial("whatsapp", e.target.value)} placeholder="https://wa.me/1234567890" className="mt-1" data-testid="input-social-whatsapp" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><SiInstagram className="h-4 w-4 text-pink-500" /> Instagram</Label>
                  <Input value={socialLinks.instagram || ""} onChange={e => updateSocial("instagram", e.target.value)} placeholder="https://instagram.com/yourpage" className="mt-1" data-testid="input-social-instagram" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><SiFacebook className="h-4 w-4 text-blue-600" /> Facebook</Label>
                  <Input value={socialLinks.facebook || ""} onChange={e => updateSocial("facebook", e.target.value)} placeholder="https://facebook.com/yourpage" className="mt-1" data-testid="input-social-facebook" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><SiSnapchat className="h-4 w-4 text-yellow-400" /> Snapchat</Label>
                  <Input value={socialLinks.snapchat || ""} onChange={e => updateSocial("snapchat", e.target.value)} placeholder="https://snapchat.com/add/yourname" className="mt-1" data-testid="input-social-snapchat" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><SiTiktok className="h-4 w-4" /> TikTok</Label>
                  <Input value={socialLinks.tiktok || ""} onChange={e => updateSocial("tiktok", e.target.value)} placeholder="https://tiktok.com/@yourname" className="mt-1" data-testid="input-social-tiktok" />
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
        {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}

function PaymentWalletsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameAr: "", nameFr: "", walletNumber: "", iconType: "wallet", iconUrl: "", sortOrder: 0, isActive: true });

  const { data: wallets, isLoading } = useQuery<PaymentWallet[]>({ queryKey: ["/api/payment-wallets"] });

  const resetForm = () => {
    setForm({ name: "", nameAr: "", nameFr: "", walletNumber: "", iconType: "wallet", iconUrl: "", sortOrder: 0, isActive: true });
    setShowForm(false);
    setEditingId(null);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, iconUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const createWallet = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/payment-wallets", form);
    },
    onSuccess: () => {
      toast({ title: "Wallet created" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
    },
  });

  const updateWallet = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/payment-wallets/${editingId}`, form);
    },
    onSuccess: () => {
      toast({ title: "Wallet updated" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
    },
  });

  const deleteWallet = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payment-wallets/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Wallet deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] });
    },
  });

  const toggleWallet = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/api/payment-wallets/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payment-wallets"] }),
  });

  const startEdit = (wallet: PaymentWallet) => {
    setEditingId(wallet.id);
    setForm({
      name: wallet.name,
      nameAr: wallet.nameAr || "",
      nameFr: wallet.nameFr || "",
      walletNumber: wallet.walletNumber,
      iconType: wallet.iconType,
      iconUrl: wallet.iconUrl || "",
      sortOrder: wallet.sortOrder,
      isActive: wallet.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateWallet.mutate();
    } else {
      createWallet.mutate();
    }
  };

  const isSaving = createWallet.isPending || updateWallet.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Payment Wallets</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }} data-testid="button-add-wallet">
          <Plus className="h-4 w-4 mr-1" /> Add Wallet
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? "Edit Wallet" : "New Wallet"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Name (EN) *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" data-testid="input-wallet-name" />
              </div>
              <div>
                <Label>Name (AR)</Label>
                <Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="mt-1" dir="rtl" data-testid="input-wallet-name-ar" />
              </div>
              <div>
                <Label>Name (FR)</Label>
                <Input value={form.nameFr} onChange={e => setForm(f => ({ ...f, nameFr: e.target.value }))} className="mt-1" data-testid="input-wallet-name-fr" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Wallet Number *</Label>
                <Input value={form.walletNumber} onChange={e => setForm(f => ({ ...f, walletNumber: e.target.value }))} className="mt-1" data-testid="input-wallet-number" />
              </div>
              <div>
                <Label>Icon Type</Label>
                <Input value={form.iconType} onChange={e => setForm(f => ({ ...f, iconType: e.target.value }))} placeholder="wallet" className="mt-1" data-testid="input-wallet-icon-type" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value === "" ? "" as any : parseInt(e.target.value) }))} className="mt-1" data-testid="input-wallet-sort-order" />
              </div>
            </div>

            <div>
              <Label>Icon Image</Label>
              <div className="mt-1 flex items-center gap-4">
                {form.iconUrl ? (
                  <div className="relative">
                    <img src={form.iconUrl} alt="Wallet icon" className="h-16 w-16 object-contain rounded-lg border" data-testid="img-wallet-icon-preview" />
                    <button
                      onClick={() => setForm(f => ({ ...f, iconUrl: "" }))}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                      data-testid="button-remove-wallet-icon"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 px-4 py-3 transition-colors" data-testid="button-upload-wallet-icon">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Upload icon</span>
                    <input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-wallet-active" />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!form.name || !form.walletNumber || isSaving} data-testid="button-save-wallet">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editingId ? "Update" : "Save"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wallets?.sort((a, b) => a.sortOrder - b.sortOrder).map(wallet => (
        <Card key={wallet.id}>
          <CardContent className="pt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden flex-shrink-0">
                {wallet.iconUrl ? (
                  <img src={wallet.iconUrl} alt={wallet.name} className="h-8 w-8 object-contain" data-testid={`img-wallet-icon-${wallet.id}`} />
                ) : (
                  <Wallet className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-semibold" data-testid={`text-wallet-name-${wallet.id}`}>{wallet.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground font-mono" data-testid={`text-wallet-number-${wallet.id}`}>{wallet.walletNumber}</span>
                  {wallet.nameAr && <Badge variant="secondary" className="text-xs">AR: {wallet.nameAr}</Badge>}
                  {wallet.nameFr && <Badge variant="secondary" className="text-xs">FR: {wallet.nameFr}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={wallet.isActive ? "default" : "secondary"} data-testid={`badge-wallet-status-${wallet.id}`}>
                {wallet.isActive ? "Active" : "Inactive"}
              </Badge>
              <Switch
                checked={wallet.isActive}
                onCheckedChange={v => toggleWallet.mutate({ id: wallet.id, isActive: v })}
                data-testid={`switch-wallet-toggle-${wallet.id}`}
              />
              <Button variant="ghost" size="icon" onClick={() => startEdit(wallet)} data-testid={`button-edit-wallet-${wallet.id}`}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={() => { if (confirm("Delete this wallet?")) deleteWallet.mutate(wallet.id); }}
                data-testid={`button-delete-wallet-${wallet.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!isLoading && (!wallets || wallets.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">No payment wallets yet</div>
      )}
    </div>
  );
}

const ICON_OPTIONS = [
  { value: "Truck", label: "Truck", icon: Truck },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Award", label: "Award", icon: Award },
  { value: "Star", label: "Star", icon: Star },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "CheckCircle", label: "Check Circle", icon: CheckCircle },
  { value: "Globe", label: "Globe", icon: Globe },
  { value: "Crown", label: "Crown", icon: Crown },
  { value: "Diamond", label: "Diamond", icon: Diamond },
  { value: "Gift", label: "Gift", icon: Gift },
  { value: "ThumbsUp", label: "Thumbs Up", icon: ThumbsUp },
  { value: "Lock", label: "Lock", icon: Lock },
  { value: "Medal", label: "Medal", icon: Medal },
  { value: "Gem", label: "Gem", icon: Gem },
  { value: "Package", label: "Package", icon: Package },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "Eye", label: "Eye", icon: Eye },
  { value: "Flame", label: "Flame", icon: Flame },
];

function getIconComponent(iconName: string) {
  const found = ICON_OPTIONS.find(o => o.value === iconName);
  return found ? found.icon : Package;
}

function StoreContentTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<StoreSettings>({ queryKey: ["/api/store-settings"] });

  const [trustBadges, setTrustBadges] = useState<Array<{ icon: string; en: string; fr: string; ar: string }>>([
    { icon: "Truck", en: "Free Delivery", fr: "Livraison Gratuite", ar: "توصيل مجاني" },
    { icon: "Shield", en: "Secure Payment", fr: "Paiement Sécurisé", ar: "دفع آمن" },
    { icon: "Award", en: "Premium Quality", fr: "Qualité Premium", ar: "جودة عالية" },
  ]);
  const [categorySectionTitle, setCategorySectionTitle] = useState({ en: "Shop by Category", fr: "Acheter par Catégorie", ar: "تسوق حسب الفئة" });
  const [ctaText, setCtaText] = useState({ en: "Unmatched quality, unparalleled service", fr: "Qualité inégalée, service incomparable", ar: "جودة لا تُضاهى، خدمة لا مثيل لها" });
  const [footerDescription, setFooterDescription] = useState({ en: "Your premium e-commerce destination", fr: "Votre destination premium pour le shopping en ligne", ar: "وجهتكم المتميّزة للتسوّق الفاخر" });
  const [loaded, setLoaded] = useState(false);

  if (!isLoading && settings && !loaded) {
    try {
      if (settings.trustBadges) {
        const parsed = JSON.parse(settings.trustBadges);
        if (Array.isArray(parsed) && parsed.length > 0) setTrustBadges(parsed);
      }
    } catch {}
    try {
      if (settings.categorySectionTitle) {
        const parsed = JSON.parse(settings.categorySectionTitle);
        if (parsed.en || parsed.fr || parsed.ar) setCategorySectionTitle(parsed);
      }
    } catch {}
    try {
      if (settings.ctaText) {
        const parsed = JSON.parse(settings.ctaText);
        if (parsed.en || parsed.fr || parsed.ar) setCtaText(parsed);
      }
    } catch {}
    try {
      if (settings.footerDescription) {
        const parsed = JSON.parse(settings.footerDescription);
        if (parsed.en || parsed.fr || parsed.ar) setFooterDescription(parsed);
      }
    } catch {}
    setLoaded(true);
  }

  const updateSettings = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/store-settings", {
        trustBadges: JSON.stringify(trustBadges),
        categorySectionTitle: JSON.stringify(categorySectionTitle),
        ctaText: JSON.stringify(ctaText),
        footerDescription: JSON.stringify(footerDescription),
      });
    },
    onSuccess: () => {
      toast({ title: "Store content updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/settings"] });
    },
  });

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  const updateBadge = (index: number, field: string, value: string) => {
    setTrustBadges(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {trustBadges.map((badge, index) => {
            const IconComp = getIconComponent(badge.icon);
            return (
              <div key={index} className="p-4 rounded-lg border space-y-3" data-testid={`trust-badge-${index}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <IconComp className="h-5 w-5 text-muted-foreground" />
                    <Label>Badge {index + 1} Icon</Label>
                  </div>
                  <Select value={badge.icon} onValueChange={(v) => updateBadge(index, "icon", v)}>
                    <SelectTrigger className="w-[180px]" data-testid={`select-badge-icon-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => {
                        const OptIcon = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <OptIcon className="h-4 w-4" />
                              {opt.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>English</Label>
                    <Input value={badge.en} onChange={e => updateBadge(index, "en", e.target.value)} className="mt-1" data-testid={`input-badge-en-${index}`} />
                  </div>
                  <div>
                    <Label>Français</Label>
                    <Input value={badge.fr} onChange={e => updateBadge(index, "fr", e.target.value)} className="mt-1" data-testid={`input-badge-fr-${index}`} />
                  </div>
                  <div>
                    <Label>العربية</Label>
                    <Input value={badge.ar} onChange={e => updateBadge(index, "ar", e.target.value)} className="mt-1" dir="rtl" data-testid={`input-badge-ar-${index}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Category Section Title
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>English</Label>
              <Input value={categorySectionTitle.en} onChange={e => setCategorySectionTitle(p => ({ ...p, en: e.target.value }))} className="mt-1" data-testid="input-category-title-en" />
            </div>
            <div>
              <Label>Français</Label>
              <Input value={categorySectionTitle.fr} onChange={e => setCategorySectionTitle(p => ({ ...p, fr: e.target.value }))} className="mt-1" data-testid="input-category-title-fr" />
            </div>
            <div>
              <Label>العربية</Label>
              <Input value={categorySectionTitle.ar} onChange={e => setCategorySectionTitle(p => ({ ...p, ar: e.target.value }))} className="mt-1" dir="rtl" data-testid="input-category-title-ar" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            CTA Section Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>English</Label>
              <Input value={ctaText.en} onChange={e => setCtaText(p => ({ ...p, en: e.target.value }))} className="mt-1" data-testid="input-cta-text-en" />
            </div>
            <div>
              <Label>Français</Label>
              <Input value={ctaText.fr} onChange={e => setCtaText(p => ({ ...p, fr: e.target.value }))} className="mt-1" data-testid="input-cta-text-fr" />
            </div>
            <div>
              <Label>العربية</Label>
              <Input value={ctaText.ar} onChange={e => setCtaText(p => ({ ...p, ar: e.target.value }))} className="mt-1" dir="rtl" data-testid="input-cta-text-ar" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Footer Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>English</Label>
              <Input value={footerDescription.en} onChange={e => setFooterDescription(p => ({ ...p, en: e.target.value }))} className="mt-1" data-testid="input-footer-desc-en" />
            </div>
            <div>
              <Label>Français</Label>
              <Input value={footerDescription.fr} onChange={e => setFooterDescription(p => ({ ...p, fr: e.target.value }))} className="mt-1" data-testid="input-footer-desc-fr" />
            </div>
            <div>
              <Label>العربية</Label>
              <Input value={footerDescription.ar} onChange={e => setFooterDescription(p => ({ ...p, ar: e.target.value }))} className="mt-1" dir="rtl" data-testid="input-footer-desc-ar" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-store-content">
        {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Store Content
      </Button>
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", nameAr: "", nameFr: "", icon: "", imageUrl: "", sortOrder: 0, isActive: true });

  const { data: categories = [], isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertCategory>) => {
      await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/categories"] });
      toast({ title: "Category created" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCategory> }) => {
      await apiRequest("PUT", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/categories"] });
      toast({ title: "Category updated" });
      setEditingId(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ name: "", nameAr: "", nameFr: "", icon: "", imageUrl: "", sortOrder: 0, isActive: true });
    setShowAdd(false);
    setEditingId(null);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      nameAr: cat.nameAr || "",
      nameFr: cat.nameFr || "",
      icon: cat.icon || "",
      imageUrl: cat.imageUrl || "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setShowAdd(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    const data = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || null,
      nameFr: form.nameFr.trim() || null,
      icon: form.icon.trim() || null,
      imageUrl: form.imageUrl || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formCard = (showAdd || editingId) && (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">{editingId ? "Edit Category" : "Add Category"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Name (English) *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-category-name" />
          </div>
          <div>
            <Label>Nom (Français)</Label>
            <Input value={form.nameFr} onChange={e => setForm(p => ({ ...p, nameFr: e.target.value }))} data-testid="input-category-name-fr" />
          </div>
          <div>
            <Label>الاسم (العربية)</Label>
            <Input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} dir="rtl" data-testid="input-category-name-ar" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Sort Order</Label>
            <Input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} data-testid="input-category-sort" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} data-testid="switch-category-active" />
              <Label>Active</Label>
            </div>
          </div>
        </div>

        <div>
          <Label>Category Image</Label>
          <div className="flex items-start gap-4 mt-1">
            {form.imageUrl ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={form.imageUrl} alt="Category" className="w-full h-full object-cover" />
                <button onClick={() => setForm(p => ({ ...p, imageUrl: "" }))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5" data-testid="button-remove-category-image">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} data-testid="input-category-image" />
              </label>
            )}
            <p className="text-xs text-gray-500 mt-2">Max 2MB. Displayed on the store category section.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-category">
            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {editingId ? "Update" : "Create"}
          </Button>
          <Button variant="outline" onClick={resetForm} data-testid="button-cancel-category">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Categories ({categories.length})</h2>
        {!showAdd && !editingId && (
          <Button onClick={() => { resetForm(); setShowAdd(true); }} size="sm" data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        )}
      </div>

      {formCard}

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {categories.sort((a, b) => a.sortOrder - b.sortOrder).map(cat => (
            <Card key={cat.id} className={!cat.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded-lg object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium" data-testid={`text-category-name-${cat.id}`}>{cat.name}</div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    {cat.nameFr && <span>FR: {cat.nameFr}</span>}
                    {cat.nameAr && <span>AR: {cat.nameAr}</span>}
                  </div>
                </div>
                <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                <span className="text-xs text-gray-400">#{cat.sortOrder}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this category?")) deleteMutation.mutate(cat.id); }} data-testid={`button-delete-category-${cat.id}`}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CmsManagement() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" data-testid="text-cms-title">
        <Settings className="h-7 w-7" />
        Content Management
      </h1>

      <Tabs defaultValue="pages">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="pages" data-testid="tab-pages"><FileText className="h-4 w-4 mr-1" /> Pages</TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-banners"><Image className="h-4 w-4 mr-1" /> Banners</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories"><Package className="h-4 w-4 mr-1" /> Categories</TabsTrigger>
          <TabsTrigger value="wallets" data-testid="tab-wallets"><Wallet className="h-4 w-4 mr-1" /> Payment Wallets</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings"><Settings className="h-4 w-4 mr-1" /> Store Settings</TabsTrigger>
          <TabsTrigger value="store-content" data-testid="tab-store-content"><Palette className="h-4 w-4 mr-1" /> Store Content</TabsTrigger>
        </TabsList>
        <TabsContent value="pages"><PagesTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="wallets"><PaymentWalletsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="store-content"><StoreContentTab /></TabsContent>
      </Tabs>
    </div>
  );
}
