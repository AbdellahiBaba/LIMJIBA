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
    ? inStock.map(p => `${p.name}|${p.category}|${p.unitPrice}DZD|qty:${p.stockQuantity}|${p.unit}`).join("\n")
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
    .map((p, i) => `${i + 1}.${p.name}:${p.qty}sold,${p.rev.toFixed(0)}DZD`).join("\n");
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

const CUSTOMER_PROMPT = `LEMJIBA store assistant. Help customers find products, check stock/prices, suggest alternatives. Rules: only recommend in-stock items, prices in DZD, suggest same-category alternatives for out-of-stock, be concise, respond in customer's language (AR/FR/EN), redirect off-topic questions to store.
Catalog:\n{PRODUCTS}`;

const ADMIN_PROMPT = `LEMJIBA business assistant. Analyze sales, suggest restocking, generate promo codes (PROMO-XXXXX format, keep margin>15%, 1-3day expiry), provide insights.
Inventory:\n{PRODUCTS}\nTop sellers:\n{SALES}\nAlerts:\n{STOCK_ALERTS}`;

export async function handleCustomerChat(
  message: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const trimmed = trimHistory(conversationHistory);
  const productContext = await getProductContext();
  const ctxFp = fingerprint(productContext);
  const allMsgs = [...trimmed, { role: "user", content: message }];
  const cacheKey = getCacheKey("customer", ctxFp, allMsgs);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const systemPrompt = CUSTOMER_PROMPT.replace("{PRODUCTS}", productContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 400,
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
  const greetings: Record<string, string> = {
    en: `Welcome! We have ${products.length} products in ${cats} categories. How can I help?`,
    fr: `Bienvenue! ${products.length} produits dans ${cats} catégories. Comment puis-je vous aider?`,
    ar: `مرحباً! لدينا ${products.length} منتج في ${cats} فئات. كيف أساعدك؟`,
  };
  return greetings[language] || greetings.en;
}
