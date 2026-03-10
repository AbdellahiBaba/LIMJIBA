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
import { FileText, Image, Settings, Save, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import type { CmsPage, CmsBanner, StoreSettings } from "@shared/schema";

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
                <input type="color" value={form.primaryColor || "#1B3A6B"} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="h-10 w-10 rounded cursor-pointer" />
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

      <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
        {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>
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
        <TabsList className="mb-6">
          <TabsTrigger value="pages" data-testid="tab-pages"><FileText className="h-4 w-4 mr-1" /> Pages</TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-banners"><Image className="h-4 w-4 mr-1" /> Banners</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings"><Settings className="h-4 w-4 mr-1" /> Store Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="pages"><PagesTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
