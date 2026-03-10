import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Loader2, Sparkles, Copy, Check } from "lucide-react";
import type { PromoCode } from "@shared/schema";

export default function PromoCodesPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: promos, isLoading } = useQuery<PromoCode[]>({ queryKey: ["/api/promo-codes"] });

  const createPromo = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/promo-codes", {
        ...form,
        expiresAt: new Date(form.expiresAt).toISOString(),
        createdBy: "admin",
        isActive: true,
      });
    },
    onSuccess: () => {
      toast({ title: "Promo code created" });
      setShowForm(false);
      setForm({ code: "", discountType: "percentage", discountValue: 10, minOrderAmount: 0, maxUses: 0, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const togglePromo = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/promo-codes/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] }),
  });

  const generateAI = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/promo-codes/generate");
      return res.json();
    },
    onSuccess: (data) => {
      setForm(f => ({
        ...f,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        expiresAt: new Date(data.expiresAt).toISOString().split("T")[0],
      }));
      setShowForm(true);
      toast({ title: "AI-generated promo code ready", description: `Code: ${data.code}` });
    },
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const now = new Date();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-promo-title">
          <Tag className="h-7 w-7" />
          Promo Codes
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateAI.mutate()} disabled={generateAI.isPending} data-testid="button-ai-generate">
            {generateAI.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            AI Generate
          </Button>
          <Button onClick={() => setShowForm(!showForm)} data-testid="button-add-promo">
            <Plus className="h-4 w-4 mr-1" /> New Code
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Create Promo Code</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PROMO-XXXXX" className="mt-1" data-testid="input-promo-code" />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="mt-1" data-testid="select-discount-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (MRU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} className="mt-1" data-testid="input-discount-value" />
              </div>
              <div>
                <Label>Min Order Amount</Label>
                <Input type="number" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Max Uses (0 = unlimited)</Label>
                <Input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Expires At</Label>
                <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="mt-1" data-testid="input-promo-expiry" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createPromo.mutate()} disabled={!form.code || createPromo.isPending} data-testid="button-save-promo">
                {createPromo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : !promos || promos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No promo codes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(promo => {
            const isExpired = new Date(promo.expiresAt) < now;
            const isExhausted = promo.maxUses && promo.maxUses > 0 && promo.currentUses >= promo.maxUses;
            return (
              <Card key={promo.id} className={`${!promo.isActive || isExpired ? "opacity-60" : ""}`} data-testid={`promo-card-${promo.id}`}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{promo.code}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(promo.code, promo.id)}>
                          {copiedId === promo.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{promo.discountType === "percentage" ? `${promo.discountValue}%` : `${promo.discountValue} MRU`} off</span>
                        <span>•</span>
                        <span>{promo.currentUses}/{promo.maxUses || "∞"} uses</span>
                        <span>•</span>
                        <span>Expires: {new Date(promo.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {promo.createdBy === "ai" && <Badge variant="secondary" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> AI</Badge>}
                    {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                    {isExhausted && <Badge variant="destructive" className="text-xs">Used Up</Badge>}
                    <Switch checked={promo.isActive} onCheckedChange={v => togglePromo.mutate({ id: promo.id, isActive: v })} data-testid={`switch-promo-${promo.id}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
