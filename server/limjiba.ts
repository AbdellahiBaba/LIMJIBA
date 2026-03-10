import OpenAI from "openai";
import { createHash } from "crypto";
import { storage } from "./storage";
import type { Product } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 200;
const HISTORY_LIMIT = 10;
const ASSISTANT_TRUNCATE = 2000;

interface CacheEntry {
  response: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();

function getCacheKey(mode: "customer" | "admin", contextFingerprint: string, messages: { role: string; content: string }[]): string {
  const last3 = messages.slice(-3);
  const raw = mode + "|" + contextFingerprint + "|" + JSON.stringify(last3);
  return createHash("sha256").update(raw).digest("hex");
}

function fingerprint(context: string): string {
  return createHash("sha256").update(context).digest("hex").substring(0, 12);
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return entry.response;
}

function setCache(key: string, response: string): void {
  if (responseCache.size >= CACHE_MAX) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [k, v] of responseCache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { response, timestamp: Date.now() });
}

function trimHistory(history: { role: string; content: string }[]): { role: string; content: string }[] {
  return history.slice(-HISTORY_LIMIT).map(m => ({
    role: m.role,
    content: m.role === "assistant" && m.content.length > ASSISTANT_TRUNCATE
      ? m.content.substring(0, ASSISTANT_TRUNCATE) + "..."
      : m.content,
  }));
}

async function getProductContext(): Promise<string> {
  const products = await storage.getProducts();
  const inStock = products.filter(p => p.stockQuantity > 0);
  return inStock.length > 0
    ? inStock.map(p => `${p.name}|${p.category}|${p.unitPrice}MRU|qty:${p.stockQuantity}|${p.unit}`).join("\n")
    : "No products in stock.";
}

async function getSalesContext(): Promise<string> {
  const allSales = await storage.getSales();
  const ps: Record<string, { name: string; qty: number; rev: number }> = {};
  for (const sale of allSales.slice(-200)) {
    try {
      const s = await storage.getSaleWithItems(sale.id);
      if (s) for (const item of s.items) {
        const k = item.productId;
        if (!ps[k]) ps[k] = { name: item.productName, qty: 0, rev: 0 };
        ps[k].qty += item.quantity;
        ps[k].rev += item.total;
      }
    } catch {}
  }
  return Object.values(ps).sort((a, b) => b.rev - a.rev).slice(0, 10)
    .map((p, i) => `${i + 1}.${p.name}:${p.qty}sold,${p.rev.toFixed(0)}MRU`).join("\n");
}

async function getLowStockContext(): Promise<string> {
  const products = await storage.getProducts();
  const low = products.filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0);
  const out = products.filter(p => p.stockQuantity === 0);
  const lines: string[] = [];
  if (low.length > 0) lines.push("LOW:" + low.map(p => `${p.name}(${p.stockQuantity}left)`).join(","));
  if (out.length > 0) lines.push("OUT:" + out.map(p => p.name).join(","));
  return lines.length > 0 ? lines.join("\n") : "All stocked.";
}

async function getActivePromosContext(): Promise<string> {
  try {
    const promos = await storage.getPromoCodes();
    const active = promos.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date()));
    if (active.length === 0) return "";
    return "\nActive Promotions:\n" + active.map(p =>
      `Code: ${p.code} | ${p.discountType === "percentage" ? p.discountValue + "% off" : p.discountValue + " MRU off"} | Min order: ${p.minOrderAmount || 0} MRU${p.expiresAt ? ` | Expires: ${new Date(p.expiresAt).toLocaleDateString()}` : ""}`
    ).join("\n");
  } catch {
    return "";
  }
}

async function getBestSellersContext(): Promise<string> {
  const salesCtx = await getSalesContext();
  if (!salesCtx || salesCtx === "") return "";
  return "\nBest Sellers:\n" + salesCtx;
}

const CUSTOMER_PROMPT = `You are LIMJIBA (لمجيبة) smart shopping assistant — a premium import company in Mauritania. You are a marketing-savvy assistant that helps customers discover great products, find deals, check orders, and make purchases.

LANGUAGE RULES:
- The customer's preferred language is: {LANG}
- You MUST respond in {LANG_NAME}. Never switch languages unless the customer writes in a different language.
- If lang=ar, respond in Arabic. If lang=fr, respond in French. If lang=en, respond in English.

SCOPE - You may ONLY help with:
1. Product recommendations, availability, prices, and suggestions
2. Order tracking and payment status (when given an order number)
3. Promotions, promo codes, and current deals
4. Delivery information and policies
5. Payment methods (Bankily, Masrvi, Sedad mobile wallets) and payment proof requirements
6. Returns policy (7 days, unused, original packaging)
7. Contact information and store details

For ANY other topic (politics, weather, personal advice, etc.), politely redirect:
- EN: "I can only help with LIMJIBA store matters. Would you like to see our products or check an order?"
- FR: "Je ne peux vous aider qu'avec les affaires de LIMJIBA. Voulez-vous voir nos produits ou suivre une commande?"
- AR: "يمكنني مساعدتك فقط في شؤون لمجيبة. هل تريد رؤية منتجاتنا أو تتبع طلب؟"

MARKETING BEHAVIOR:
- Proactively suggest popular products and best sellers
- Mention active promotions and promo codes when relevant
- Recommend related products when a customer asks about a specific item
- Be enthusiastic about product quality and value
- Use the best sellers data to recommend trending items

RULES:
- Only recommend in-stock items. Prices in MRU (Mauritanian Ouguiya).
- Suggest same-category alternatives for out-of-stock items.
- Be concise, friendly, and professional.
- When customer asks about order status/tracking: ask for their order number (format: ORD-XXXX/YYYY).
- When providing payment status, clearly state whether payment is confirmed or pending.
- Delivery: We deliver across Mauritania. Delivery times vary by location.

Catalog:
{PRODUCTS}
{PROMOS}
{BEST_SELLERS}
{ORDER_DATA}`;

const LANG_NAMES: Record<string, string> = {
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  en: "English",
};

const ADMIN_PROMPT = `LIMJIBA business assistant (Mauritania). Analyze sales in MRU (Mauritanian Ouguiya), suggest restocking, generate promo codes (PROMO-XXXXX format, keep margin>15%, 1-3day expiry), provide insights.
Inventory:\n{PRODUCTS}\nTop sellers:\n{SALES}\nAlerts:\n{STOCK_ALERTS}`;

function extractOrderNumbers(text: string): string[] {
  const matches = text.match(/ORD-\d{4}\/\d{4}/gi);
  return matches || [];
}

async function getOrderContext(messages: { role: string; content: string }[], currentMessage: string): Promise<string> {
  const allText = [...messages.map(m => m.content), currentMessage].join(" ");
  const orderNums = extractOrderNumbers(allText);
  if (orderNums.length === 0) return "";

  const results: string[] = [];
  for (const num of orderNums.slice(0, 3)) {
    const order = await storage.getStoreOrderByNumber(num);
    if (order) {
      const statusMap: Record<string, string> = {
        pending: "Pending (قيد الانتظار)",
        confirmed: "Confirmed (مؤكد)",
        shipped: "Shipped (تم الشحن)",
        delivered: "Delivered (تم التوصيل)",
        cancelled: "Cancelled (ملغي)",
      };
      const items = JSON.parse(order.items);
      const itemList = items.map((i: any) => `${i.productName}×${i.quantity}`).join(", ");
      const paymentStatus = order.paymentConfirmed
        ? "Payment CONFIRMED ✓"
        : "Payment PENDING (not yet confirmed by admin)";
      results.push(
        `Order ${order.orderNumber}: Status=${statusMap[order.status] || order.status}, ${paymentStatus}, Total=${order.total}MRU, Items=[${itemList}], Date=${order.createdAt}, Payment=${order.paymentMethod || "N/A"}`
      );
    } else {
      results.push(`Order ${num}: NOT FOUND`);
    }
  }
  return results.length > 0 ? "\nOrder Data:\n" + results.join("\n") : "";
}

export async function handleCustomerChat(
  message: string,
  conversationHistory: { role: string; content: string }[] = [],
  lang: string = "en"
): Promise<string> {
  const trimmed = trimHistory(conversationHistory);
  const [productContext, orderData, promosContext, bestSellers] = await Promise.all([
    getProductContext(),
    getOrderContext(trimmed, message),
    getActivePromosContext(),
    getBestSellersContext(),
  ]);
  const ctxFp = fingerprint(productContext + orderData + promosContext + bestSellers + lang);
  const allMsgs = [...trimmed, { role: "user", content: message }];
  const cacheKey = getCacheKey("customer", ctxFp, allMsgs);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const systemPrompt = CUSTOMER_PROMPT
    .replace("{PRODUCTS}", productContext)
    .replace("{ORDER_DATA}", orderData)
    .replace("{PROMOS}", promosContext)
    .replace("{BEST_SELLERS}", bestSellers)
    .replace(/{LANG}/g, lang)
    .replace("{LANG_NAME}", LANG_NAMES[lang] || "English");

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const result = response.choices[0]?.message?.content || "Sorry, please try again.";
  setCache(cacheKey, result);
  return result;
}

export async function handleAdminChat(
  message: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const trimmed = trimHistory(conversationHistory);

  const [productContext, salesContext, stockContext] = await Promise.all([
    getProductContext(),
    getSalesContext(),
    getLowStockContext(),
  ]);

  const ctxFp = fingerprint(productContext + salesContext + stockContext);
  const allMsgs = [...trimmed, { role: "user", content: message }];
  const cacheKey = getCacheKey("admin", ctxFp, allMsgs);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const systemPrompt = ADMIN_PROMPT
    .replace("{PRODUCTS}", productContext)
    .replace("{SALES}", salesContext)
    .replace("{STOCK_ALERTS}", stockContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  const result = response.choices[0]?.message?.content || "Sorry, please try again.";
  setCache(cacheKey, result);
  return result;
}

export async function generatePromoCode(margin?: number): Promise<{
  code: string;
  discountType: string;
  discountValue: number;
  expiresAt: string;
}> {
  const products = await storage.getProducts();
  const inStock = products.filter(p => p.stockQuantity > 0 && p.costPrice > 0);

  if (inStock.length === 0) {
    return {
      code: `PROMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      discountType: "percentage",
      discountValue: 5,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const avgMargin = inStock.reduce((sum, p) => {
    const m = p.unitPrice > 0 ? ((p.unitPrice - p.costPrice) / p.unitPrice) * 100 : 0;
    return sum + m;
  }, 0) / inStock.length;

  const safeDiscount = Math.max(3, Math.min(Math.floor((avgMargin - 15) / 2), 25));

  return {
    code: `PROMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    discountType: "percentage",
    discountValue: safeDiscount,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getCustomerGreeting(language: string = "en"): Promise<string> {
  const products = await storage.getStoreProducts();
  const cats = [...new Set(products.map(p => p.category))].length;

  let promoLine = "";
  try {
    const promos = await storage.getPromoCodes();
    const active = promos.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date()));
    if (active.length > 0) {
      const best = active[0];
      const discount = best.discountType === "percentage" ? `${best.discountValue}%` : `${best.discountValue} MRU`;
      promoLine = language === "ar"
        ? `\n🏷️ عرض خاص: استخدم الكود ${best.code} للحصول على خصم ${discount}!`
        : language === "fr"
        ? `\n🏷️ Offre spéciale: Utilisez le code ${best.code} pour ${discount} de réduction!`
        : `\n🏷️ Special offer: Use code ${best.code} for ${discount} off!`;
    }
  } catch {}

  const greetings: Record<string, string> = {
    en: `Welcome to LIMJIBA! 🛍️ We have ${products.length} products in ${cats} categories. How can I help you today?${promoLine}`,
    fr: `Bienvenue chez LIMJIBA! 🛍️ ${products.length} produits dans ${cats} catégories. Comment puis-je vous aider?${promoLine}`,
    ar: `مرحباً بكم في لمجيبة! 🛍️ لدينا ${products.length} منتج في ${cats} فئات. كيف أساعدك؟${promoLine}`,
  };
  return greetings[language] || greetings.en;
}
