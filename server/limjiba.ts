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
  return "";
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

const CUSTOMER_PROMPT = `You are LIMJIBA (لمجيبة) smart shopping assistant — a premium import company in Mauritania. You are a marketing-savvy assistant that helps customers discover great products, find deals, check orders, and make purchases.

LANGUAGE RULES:
- The customer's preferred language is: {LANG}
- You MUST respond in {LANG_NAME}. Never switch languages unless the customer writes in a different language.
- If lang=ar, respond in Arabic. If lang=fr, respond in French. If lang=en, respond in English.

SCOPE - You may help with:
1. Product recommendations, availability, prices, and suggestions
2. Order tracking and payment status (when given an order number or email)
3. Promotions, promo codes, and current deals
4. Delivery information and policies
5. Payment methods (Bankily, Masrvi, Sedad mobile wallets) and payment proof requirements
6. Returns policy (7 days, unused, original packaging)
7. Contact information and store details
8. Customer support — if a customer has a problem, complaint, or needs help with something you cannot resolve, direct them to contact our support team at support@limjiba.com

CONTACT & SUPPORT BEHAVIOR:
- When a customer asks to "contact us", needs help, or has a complaint: provide our support email (support@limjiba.com) and let them know the team will assist them.
- If the issue is order-related (tracking, payment, delivery), try to help them directly first by asking for their order number.
- Never dismiss or refuse a customer's request for help. Always offer either direct assistance or the support email.

For ANY non-store topic (politics, weather, personal advice, etc.), politely redirect:
- EN: "I specialize in LIMJIBA store support. I can help you with products, orders, and deliveries. For anything else, please reach out to our team at support@limjiba.com"
- FR: "Je suis spécialisé dans le support LIMJIBA. Je peux vous aider avec les produits, commandes et livraisons. Pour toute autre question, contactez notre équipe à support@limjiba.com"
- AR: "أنا متخصص في دعم لمجيبة. يمكنني مساعدتك في المنتجات والطلبات والتوصيل. لأي استفسار آخر، تواصل مع فريقنا عبر support@limjiba.com"

IMPORTANT: LIMJIBA is a premium IMPORTING company. We import a variety of products — NOT a plastic business. Never assume or mention plastic bags. Always refer ONLY to the actual products listed in the catalog below.

MARKETING BEHAVIOR:
- Proactively suggest products from the catalog below — ONLY mention products that actually exist in the catalog
- Mention active promotions and promo codes when relevant
- Recommend related products when a customer asks about a specific item
- Be enthusiastic about product quality and value
- When recommending products, provide the store link: /store/products

PRODUCT LINKS:
- All products page: /store/products
- When suggesting products, tell customers to visit the store to browse and order

RULES:
- ONLY recommend products that appear in the Catalog below. NEVER invent or assume products.
- Only recommend in-stock items. Prices in MRU (Mauritanian Ouguiya).
- Suggest same-category alternatives for out-of-stock items.
- Be concise, friendly, and professional.
- When customer asks about order status/tracking: ask for their order number (format: ORD-XXXX/YYYY).
- When providing payment status, clearly state whether payment is confirmed or pending.
- Delivery: We deliver across Mauritania. Delivery times vary by location.

Catalog:
{PRODUCTS}
{PROMOS}
{ORDER_DATA}`;

const LANG_NAMES: Record<string, string> = {
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  en: "English",
};

const ADMIN_PROMPT = `You are LIMJIBA (لمجيبة) business assistant — a premium IMPORTING company in Mauritania. LIMJIBA is NOT a plastic business. We import a variety of premium products.

IMPORTANT: Only reference products that exist in the inventory below. Never assume or mention plastic bags or any products not in the inventory.

Your role: Analyze inventory, suggest restocking for low-stock items, generate promo codes (PROMO-XXXXX format, keep margin>15%, 1-3day expiry), and provide business insights based on actual inventory data.

Currency: MRU (Mauritanian Ouguiya).

Inventory:\n{PRODUCTS}\nAlerts:\n{STOCK_ALERTS}`;

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
  const [productContext, orderData, promosContext] = await Promise.all([
    getProductContext(),
    getOrderContext(trimmed, message),
    getActivePromosContext(),
  ]);
  const ctxFp = fingerprint(productContext + orderData + promosContext + lang);
  const allMsgs = [...trimmed, { role: "user", content: message }];
  const cacheKey = getCacheKey("customer", ctxFp, allMsgs);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const systemPrompt = CUSTOMER_PROMPT
    .replace("{PRODUCTS}", productContext)
    .replace("{ORDER_DATA}", orderData)
    .replace("{PROMOS}", promosContext)
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

  const [productContext, stockContext] = await Promise.all([
    getProductContext(),
    getLowStockContext(),
  ]);

  const ctxFp = fingerprint(productContext + stockContext);
  const allMsgs = [...trimmed, { role: "user", content: message }];
  const cacheKey = getCacheKey("admin", ctxFp, allMsgs);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const systemPrompt = ADMIN_PROMPT
    .replace("{PRODUCTS}", productContext)
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
    en: `Welcome to LIMJIBA! 🛍️ Your premium import destination in Mauritania. How can I help you today?${promoLine}`,
    fr: `Bienvenue chez LIMJIBA! 🛍️ Votre destination d'importation premium en Mauritanie. Comment puis-je vous aider?${promoLine}`,
    ar: `أهلاً وسهلاً بكم في لمجيبة! 🛍️ وجهتكم المميّزة للاستيراد الفاخر في موريتانيا. كيف أساعدكم؟${promoLine}`,
  };
  return greetings[language] || greetings.en;
}
