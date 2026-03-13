import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Users, TrendingUp, Gift, Settings, ChevronUp, ChevronDown, Loader2, Save, Plus, Minus, Clock } from "lucide-react";

const PRIMARY = "#0A1628";
const ACCENT = "#C9A84C";

interface LoyaltyCustomer {
  id: string;
  email: string;
  fullName: string;
  loyaltyPoints: number;
  phone?: string | null;
  createdAt?: string | null;
}

interface LoyaltyTransaction {
  id: string;
  customerId?: string | null;
  customerEmail: string;
  customerName?: string | null;
  type: string;
  points: number;
  orderNumber?: string | null;
  note?: string | null;
  createdAt?: string | null;
}

interface LoyaltySettings {
  pointsRate: number;
  pointsValue: number;
}

const TX_TYPE_COLORS: Record<string, string> = {
  earned: "#16a34a",
  redeemed: "#dc2626",
  manual: "#2563eb",
  refund: "#ca8a04",
};

const TX_TYPE_LABELS: Record<string, string> = {
  earned: "Earned",
  redeemed: "Redeemed",
  manual: "Manual",
  refund: "Refund",
};

export default function LoyaltyDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "customers" | "transactions" | "settings">("overview");
  const [adjustTarget, setAdjustTarget] = useState<LoyaltyCustomer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [rateInput, setRateInput] = useState<string>("");
  const [valueInput, setValueInput] = useState<string>("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<LoyaltyCustomer[]>({
    queryKey: ["/api/admin/loyalty/customers"],
  });

  const { data: transactions = [], isLoading: loadingTx } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/admin/loyalty/transactions"],
  });

  const { data: loyaltySettings, isLoading: loadingSettings } = useQuery<LoyaltySettings>({
    queryKey: ["/api/admin/loyalty/settings"],
  });

  useEffect(() => {
    if (loyaltySettings) {
      setRateInput(String(loyaltySettings.pointsRate));
      setValueInput(String(loyaltySettings.pointsValue));
    }
  }, [loyaltySettings]);

  const totalIssued = transactions.filter(t => t.type === "earned" || (t.type === "manual" && t.points > 0)).reduce((s, t) => s + Math.max(0, t.points), 0);
  const totalRedeemed = transactions.filter(t => t.type === "redeemed").reduce((s, t) => s + Math.abs(t.points), 0);
  const membersWithPoints = customers.filter(c => c.loyaltyPoints > 0).length;

  const adjustMutation = useMutation({
    mutationFn: (vars: { id: string; points: number; note: string }) =>
      apiRequest("POST", `/api/admin/loyalty/customers/${vars.id}/adjust`, { points: vars.points, note: vars.note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/loyalty/customers"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/loyalty/transactions"] });
      setAdjustTarget(null);
      setAdjustAmount(0);
      setAdjustNote("");
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (vars: { pointsRate: number; pointsValue: number }) =>
      apiRequest("PATCH", "/api/admin/loyalty/settings", vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/loyalty/settings"] });
    },
  });

  const filteredCustomers = customers
    .filter(c => search === "" || c.email.toLowerCase().includes(search.toLowerCase()) || (c.fullName || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDir === "desc" ? b.loyaltyPoints - a.loyaltyPoints : a.loyaltyPoints - b.loyaltyPoints);

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "customers", label: "Customers", icon: Users },
    { id: "transactions", label: "Transactions", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ACCENT}20` }}>
          <Award className="h-5 w-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Loyalty Dashboard</h1>
          <p className="text-sm text-gray-400">Manage customer rewards & points</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={activeTab === tab.id ? { color: PRIMARY } : {}}
            data-testid={`tab-loyalty-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Loyalty Members", value: membersWithPoints, icon: Users, color: "#2563eb" },
              { label: "Points Issued", value: totalIssued.toLocaleString(), icon: TrendingUp, color: "#16a34a" },
              { label: "Points Redeemed", value: totalRedeemed.toLocaleString(), icon: Gift, color: "#dc2626" },
            ].map((card, i) => (
              <div key={i} className="rounded-xl border bg-white shadow-sm p-5" data-testid={`card-loyalty-stat-${i}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                    <card.icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: PRIMARY }}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-5">
            <h3 className="font-semibold mb-4" style={{ color: PRIMARY }}>Top Loyalty Members</h3>
            {loadingCustomers ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
            ) : customers.filter(c => c.loyaltyPoints > 0).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No loyalty members yet</p>
            ) : (
              <div className="space-y-2">
                {customers.filter(c => c.loyaltyPoints > 0).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: i === 0 ? `${ACCENT}08` : "#f9fafb" }}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: i === 0 ? ACCENT : PRIMARY }}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>{c.fullName || c.email}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: ACCENT }}>
                      <Award className="h-4 w-4" />
                      <span className="font-bold">{c.loyaltyPoints}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-5">
            <h3 className="font-semibold mb-4" style={{ color: PRIMARY }}>Recent Transactions</h3>
            {loadingTx ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 8).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${TX_TYPE_COLORS[tx.type] || "#888"}20` }}>
                        {tx.type === "earned" ? <TrendingUp className="h-3 w-3" style={{ color: TX_TYPE_COLORS[tx.type] }} /> : <Gift className="h-3 w-3" style={{ color: TX_TYPE_COLORS[tx.type] || "#888" }} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: PRIMARY }}>{tx.customerName || tx.customerEmail}</p>
                        <p className="text-xs text-gray-400">{tx.note || TX_TYPE_LABELS[tx.type]}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: tx.points >= 0 ? "#16a34a" : "#dc2626" }}>
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs rounded-lg"
              data-testid="input-search-loyalty"
            />
            <button
              onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              data-testid="button-sort-points"
            >
              Points {sortDir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
          {loadingCustomers ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No customers found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left p-3 font-semibold text-gray-600">Email</th>
                  <th className="text-right p-3 font-semibold text-gray-600">Points</th>
                  <th className="text-right p-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors" data-testid={`row-loyalty-customer-${c.id}`}>
                    <td className="p-3">
                      <p className="font-medium" style={{ color: PRIMARY }}>{c.fullName || "—"}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="p-3 text-gray-500">{c.email}</td>
                    <td className="p-3 text-right">
                      <span className="font-bold flex items-center justify-end gap-1" style={{ color: ACCENT }}>
                        <Award className="h-3 w-3" /> {c.loyaltyPoints}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs h-7"
                        onClick={() => { setAdjustTarget(c); setAdjustAmount(0); setAdjustNote(""); }}
                        data-testid={`button-adjust-${c.id}`}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold" style={{ color: PRIMARY }}>All Transactions</h3>
          </div>
          {loadingTx ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No transactions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left p-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left p-3 font-semibold text-gray-600">Order</th>
                  <th className="text-left p-3 font-semibold text-gray-600">Note</th>
                  <th className="text-right p-3 font-semibold text-gray-600">Points</th>
                  <th className="text-right p-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50 transition-colors" data-testid={`row-loyalty-tx-${tx.id}`}>
                    <td className="p-3">
                      <p className="font-medium" style={{ color: PRIMARY }}>{tx.customerName || "—"}</p>
                      <p className="text-xs text-gray-400">{tx.customerEmail}</p>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: TX_TYPE_COLORS[tx.type] || "#888" }}>
                        {TX_TYPE_LABELS[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{tx.orderNumber || "—"}</td>
                    <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{tx.note || "—"}</td>
                    <td className="p-3 text-right font-bold" style={{ color: tx.points >= 0 ? "#16a34a" : "#dc2626" }}>
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </td>
                    <td className="p-3 text-right text-xs text-gray-400">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="max-w-lg space-y-6">
          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h3 className="font-semibold mb-1" style={{ color: PRIMARY }}>Points Configuration</h3>
            <p className="text-sm text-gray-400 mb-5">Configure how points are earned and redeemed</p>

            {loadingSettings ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
            ) : (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-semibold mb-1 block" style={{ color: PRIMARY }}>
                    Points Rate
                    <span className="text-xs font-normal text-gray-400 ml-2">Points earned per MRU spent</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={rateInput}
                    onChange={e => setRateInput(e.target.value)}
                    className="rounded-lg"
                    placeholder={String(loyaltySettings?.pointsRate ?? 0.1)}
                    data-testid="input-points-rate"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Current: <strong>0.1</strong> = 50 points per 500 MRU spent
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1 block" style={{ color: PRIMARY }}>
                    Point Value
                    <span className="text-xs font-normal text-gray-400 ml-2">MRU discount per point redeemed</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000"
                    value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    className="rounded-lg"
                    placeholder={String(loyaltySettings?.pointsValue ?? 0.2)}
                    data-testid="input-points-value"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Current: <strong>0.2</strong> = 500 points = 100 MRU discount
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: `${ACCENT}08`, border: `1px solid ${ACCENT}30` }}>
                  <p className="text-sm font-medium mb-2" style={{ color: PRIMARY }}>Live Preview</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-white border">
                      <p className="text-xs text-gray-400">500 MRU order earns</p>
                      <p className="text-lg font-bold" style={{ color: ACCENT }}>{Math.floor(500 * Number(rateInput || 0.1))} pts</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white border">
                      <p className="text-xs text-gray-400">500 pts worth</p>
                      <p className="text-lg font-bold" style={{ color: PRIMARY }}>{(500 * Number(valueInput || 0.2)).toFixed(0)} MRU</p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full rounded-xl font-semibold"
                  style={{ backgroundColor: ACCENT, color: PRIMARY }}
                  onClick={() => settingsMutation.mutate({ pointsRate: Number(rateInput), pointsValue: Number(valueInput) })}
                  disabled={settingsMutation.isPending}
                  data-testid="button-save-loyalty-settings"
                >
                  {settingsMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Settings</>}
                </Button>
                {settingsMutation.isSuccess && <p className="text-xs text-center text-green-600">Settings saved successfully</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1" style={{ color: PRIMARY }}>Adjust Points</h3>
            <p className="text-sm text-gray-400 mb-5">
              {adjustTarget.fullName || adjustTarget.email} — Current: <strong style={{ color: ACCENT }}>{adjustTarget.loyaltyPoints} pts</strong>
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-1 block">Points to add / subtract</Label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdjustAmount(a => a - 10)} className="h-9 w-9 rounded-lg border flex items-center justify-center hover:bg-gray-50">
                    <Minus className="h-4 w-4" />
                  </button>
                  <Input
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(Number(e.target.value))}
                    className="rounded-lg text-center"
                    data-testid="input-adjust-amount"
                  />
                  <button onClick={() => setAdjustAmount(a => a + 10)} className="h-9 w-9 rounded-lg border flex items-center justify-center hover:bg-gray-50">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {adjustAmount !== 0 && (
                  <p className="text-xs mt-1" style={{ color: adjustAmount > 0 ? "#16a34a" : "#dc2626" }}>
                    New balance: {Math.max(0, adjustTarget.loyaltyPoints + adjustAmount)} pts
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold mb-1 block">Note (optional)</Label>
                <Input
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="rounded-lg"
                  data-testid="input-adjust-note"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAdjustTarget(null)}>Cancel</Button>
                <Button
                  className="flex-1 rounded-xl font-semibold"
                  style={{ backgroundColor: ACCENT, color: PRIMARY }}
                  disabled={adjustAmount === 0 || adjustMutation.isPending}
                  onClick={() => adjustMutation.mutate({ id: adjustTarget.id, points: adjustAmount, note: adjustNote })}
                  data-testid="button-confirm-adjust"
                >
                  {adjustMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
