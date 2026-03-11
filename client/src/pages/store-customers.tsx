import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersRound, Bell, Loader2, Search, Sparkles, FileText } from "lucide-react";

interface StoreCustomer {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  createdAt: string;
}

export default function StoreCustomers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [message, setMessage] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [messageFr, setMessageFr] = useState("");

  const { data: customers, isLoading } = useQuery<StoreCustomer[]>({
    queryKey: ["/api/store-customers"],
  });

  const bulkNotify = useMutation({
    mutationFn: async (payload: {
      customerIds: string[];
      title: string;
      titleAr: string;
      titleFr: string;
      message: string;
      messageAr: string;
      messageFr: string;
    }) => {
      await apiRequest("POST", "/api/store-customers/bulk-notify", payload);
    },
    onSuccess: () => {
      toast({ title: t("common.success") || "Notification sent successfully" });
      setNotifyDialogOpen(false);
      resetNotifyForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const [aiTopic, setAiTopic] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);

  const NOTIFICATION_TEMPLATES: Record<string, { title: string; titleAr: string; titleFr: string; message: string; messageAr: string; messageFr: string }> = {
    new_arrivals: {
      title: "A New Chapter of Elegance Awaits",
      titleAr: "فصلٌ جديد من الأناقة بانتظاركم",
      titleFr: "Un Nouveau Chapitre d'Élégance Vous Attend",
      message: "The winds of distinction have carried treasures to LIMJIBA's shores. Discover our latest arrivals — each piece a story of craftsmanship, woven with threads of beauty from distant lands. Step into a world where every detail whispers luxury.",
      messageAr: "حملت رياح التميّز كنوزاً جديدة إلى شواطئ لمجيبة. اكتشفوا أحدث وصولاتنا — كل قطعة حكايةٌ من الحِرَفية، نُسِجَت بخيوط الجمال من أراضٍ بعيدة. ادخلوا عالماً تهمس فيه كل تفصيلة بالفخامة.",
      messageFr: "Les vents de la distinction ont porté des trésors jusqu'aux rivages de LIMJIBA. Découvrez nos dernières arrivées — chaque pièce est une histoire d'artisanat, tissée de fils de beauté venus de terres lointaines. Entrez dans un monde où chaque détail murmure le luxe.",
    },
    flash_sale: {
      title: "A Golden Hour of Splendor",
      titleAr: "ساعةٌ ذهبية من الروعة",
      titleFr: "Une Heure Dorée de Splendeur",
      message: "For a fleeting moment, LIMJIBA opens its golden gates wider. Exceptional prices dance alongside exquisite quality — a rare symphony of value and beauty. Seize this shimmering window before it fades like a desert sunset.",
      messageAr: "للحظةٍ عابرة، تفتح لمجيبة أبوابها الذهبية على مصراعيها. أسعارٌ استثنائية ترقص إلى جانب جودة رفيعة — سيمفونية نادرة من القيمة والجمال. اغتنموا هذه النافذة المتلألئة قبل أن تتلاشى كغروب الصحراء.",
      messageFr: "Pour un instant fugace, LIMJIBA ouvre plus grand ses portes dorées. Des prix exceptionnels dansent aux côtés d'une qualité exquise — une symphonie rare de valeur et de beauté. Saisissez cette fenêtre scintillante avant qu'elle ne s'évanouisse comme un coucher de soleil saharien.",
    },
    vip_exclusive: {
      title: "You Are Our Most Cherished Guest",
      titleAr: "أنتم ضيوفنا الأعزّ",
      titleFr: "Vous Êtes Notre Invité le Plus Précieux",
      message: "To our distinguished patrons — LIMJIBA reserves its finest moments for those who understand true elegance. An exclusive selection awaits you, curated with the devotion of an artisan preparing a masterpiece. Your loyalty is the crown we wear with pride.",
      messageAr: "إلى عملائنا المتميّزين — لمجيبة تحتفظ بأجمل لحظاتها لمن يعرفون الأناقة الحقيقية. تشكيلة حصرية بانتظاركم، أُعِدّت بإخلاص الفنّان وهو يُعدّ تحفته. ولاؤكم تاجٌ نتزيّن به بفخر.",
      messageFr: "À nos clients distingués — LIMJIBA réserve ses plus beaux moments à ceux qui comprennent la véritable élégance. Une sélection exclusive vous attend, préparée avec la dévotion d'un artisan préparant son chef-d'œuvre. Votre fidélité est la couronne que nous portons avec fierté.",
    },
    seasonal: {
      title: "The Season Blooms with New Wonders",
      titleAr: "الموسم يتفتّح بعجائب جديدة",
      titleFr: "La Saison Fleurit de Nouvelles Merveilles",
      message: "As the seasons turn their golden pages, LIMJIBA unveils a collection born of this beautiful moment. Each product carries the spirit of the season — fresh, vibrant, and irresistibly enchanting. Let the rhythm of nature guide you to something extraordinary.",
      messageAr: "مع تقليب الفصول صفحاتها الذهبية، تكشف لمجيبة عن تشكيلة وُلِدت من هذه اللحظة الجميلة. كل منتج يحمل روح الموسم — منعش ونابض وساحر بلا مقاومة. دعوا إيقاع الطبيعة يقودكم إلى شيء استثنائي.",
      messageFr: "Alors que les saisons tournent leurs pages dorées, LIMJIBA dévoile une collection née de ce bel instant. Chaque produit porte l'esprit de la saison — frais, vibrant et irrésistiblement enchanteur. Laissez le rythme de la nature vous guider vers quelque chose d'extraordinaire.",
    },
    free_shipping: {
      title: "Your Treasures Travel Free",
      titleAr: "كنوزكم تسافر مجّاناً",
      titleFr: "Vos Trésors Voyagent Gratuitement",
      message: "LIMJIBA believes beauty should arrive at your doorstep without burden. For a limited time, we carry the journey's cost — so your chosen treasures travel freely from our world to yours. Indulge without boundaries.",
      messageAr: "تؤمن لمجيبة أن الجمال يجب أن يصل إلى عتبة داركم دون عناء. لفترة محدودة، نتحمّل نحن تكلفة الرحلة — لتسافر كنوزكم المختارة بحرّية من عالمنا إلى عالمكم. تمتّعوا بلا حدود.",
      messageFr: "LIMJIBA croit que la beauté doit arriver à votre porte sans fardeau. Pour une durée limitée, nous prenons en charge le coût du voyage — pour que vos trésors choisis voyagent librement de notre monde au vôtre. Faites-vous plaisir sans limites.",
    },
    thank_you: {
      title: "A Heartfelt Thank You, Dear Friend",
      titleAr: "شكرٌ من القلب، يا صديقنا العزيز",
      titleFr: "Un Merci du Fond du Cœur, Cher Ami",
      message: "Every purchase you make is a verse in the poem LIMJIBA writes each day. Your trust is the most precious gift we receive — more valuable than any treasure we import. Thank you for being part of our journey of excellence.",
      messageAr: "كل عملية شراء تقومون بها هي بيتٌ في القصيدة التي تكتبها لمجيبة كل يوم. ثقتكم أغلى هدية نتلقّاها — أثمن من أي كنز نستورده. شكراً لكونكم جزءاً من رحلتنا نحو التميّز.",
      messageFr: "Chaque achat que vous faites est un vers dans le poème que LIMJIBA écrit chaque jour. Votre confiance est le cadeau le plus précieux que nous recevons — plus précieux que tout trésor que nous importons. Merci de faire partie de notre voyage vers l'excellence.",
    },
  };

  const aiGenerateMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/ai/generate-notification", { topic: topic || undefined });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (!data.title && !data.message) {
        toast({ title: "AI generated empty content. Try again.", variant: "destructive" });
        return;
      }
      setTitle(data.title || "");
      setTitleAr(data.titleAr || "");
      setTitleFr(data.titleFr || "");
      setMessage(data.message || "");
      setMessageAr(data.messageAr || "");
      setMessageFr(data.messageFr || "");
      setShowAiInput(false);
      setAiTopic("");
      toast({ title: "AI content generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to generate content", variant: "destructive" });
    },
  });

  const applyTemplate = (key: string) => {
    const tpl = NOTIFICATION_TEMPLATES[key];
    if (tpl) {
      setTitle(tpl.title);
      setTitleAr(tpl.titleAr);
      setTitleFr(tpl.titleFr);
      setMessage(tpl.message);
      setMessageAr(tpl.messageAr);
      setMessageFr(tpl.messageFr);
    }
  };

  const resetNotifyForm = () => {
    setTitle("");
    setTitleAr("");
    setTitleFr("");
    setMessage("");
    setMessageAr("");
    setMessageFr("");
    setShowAiInput(false);
    setAiTopic("");
  };

  const filteredCustomers = customers?.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const allIds = filteredCustomers?.map((c) => c.id) || [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSendNotification = () => {
    bulkNotify.mutate({
      customerIds: Array.from(selectedIds),
      title,
      titleAr,
      titleFr,
      message,
      messageAr,
      messageFr,
    });
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2" data-testid="text-store-customers-title">
            <UsersRound className="h-6 w-6" />
            Store Customers
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            {t("common.manage") || "Manage"} store customers and send bulk notifications
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.size > 0 && (
            <Badge variant="secondary" data-testid="badge-selected-count">
              {selectedIds.size} selected
            </Badge>
          )}
          <Button
            onClick={() => setNotifyDialogOpen(true)}
            disabled={selectedIds.size === 0}
            data-testid="button-send-notification"
          >
            <Bell className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-store-customer-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredCustomers || filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersRound className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No store customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>{t("common.name") || "Name"}</TableHead>
                    <TableHead>{t("common.email") || "Email"}</TableHead>
                    <TableHead>{t("common.phone") || "Phone"}</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Loyalty Points</TableHead>
                    <TableHead>Join Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-store-customer-${customer.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={() => toggleOne(customer.id)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.fullName || "-"}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-customer-email-${customer.id}`}>
                        {customer.email || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-customer-phone-${customer.id}`}>
                        {customer.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-customer-orders-${customer.id}`}>
                        {customer.totalOrders ?? 0}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-customer-spent-${customer.id}`}>
                        {(customer.totalSpent ?? 0).toLocaleString()} MRU
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" data-testid={`badge-loyalty-${customer.id}`}>
                          {customer.loyaltyPoints ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-customer-joined-${customer.id}`}>
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Notification to {selectedIds.size} Customer{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Quick Template
                </Label>
                <Select onValueChange={applyTemplate} data-testid="select-notify-template">
                  <SelectTrigger data-testid="select-trigger-notify-template">
                    <SelectValue placeholder="Choose a pre-made marketing template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_arrivals">New Arrivals</SelectItem>
                    <SelectItem value="flash_sale">Flash Sale</SelectItem>
                    <SelectItem value="vip_exclusive">Exclusive VIP</SelectItem>
                    <SelectItem value="seasonal">Seasonal Collection</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="thank_you">Thank You</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {!showAiInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAiInput(true)}
                  data-testid="button-show-ai-generate"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                  Generate with AI Agent
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Topic (optional, e.g. Ramadan, Summer...)"
                    className="flex-1 text-sm"
                    data-testid="input-ai-topic"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !aiGenerateMutation.isPending) {
                        e.preventDefault();
                        aiGenerateMutation.mutate(aiTopic);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => aiGenerateMutation.mutate(aiTopic)}
                    disabled={aiGenerateMutation.isPending}
                    data-testid="button-ai-generate"
                  >
                    {aiGenerateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify-title">Title (EN)</Label>
              <Input
                id="notify-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                data-testid="input-notify-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-title-ar">Title AR</Label>
              <Input
                id="notify-title-ar"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="عنوان الإشعار"
                dir="rtl"
                data-testid="input-notify-title-ar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-title-fr">Title FR</Label>
              <Input
                id="notify-title-fr"
                value={titleFr}
                onChange={(e) => setTitleFr(e.target.value)}
                placeholder="Titre de la notification"
                data-testid="input-notify-title-fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message">Message (EN)</Label>
              <Textarea
                id="notify-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
                data-testid="input-notify-message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message-ar">Message AR</Label>
              <Textarea
                id="notify-message-ar"
                value={messageAr}
                onChange={(e) => setMessageAr(e.target.value)}
                placeholder="رسالة الإشعار"
                dir="rtl"
                rows={3}
                data-testid="input-notify-message-ar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message-fr">Message FR</Label>
              <Textarea
                id="notify-message-fr"
                value={messageFr}
                onChange={(e) => setMessageFr(e.target.value)}
                placeholder="Message de notification"
                rows={3}
                data-testid="input-notify-message-fr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)} data-testid="button-cancel-notify">
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={bulkNotify.isPending || !title || !message}
              data-testid="button-confirm-send-notification"
            >
              {bulkNotify.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Send In-Store Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}