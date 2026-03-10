import OpenAI from "openai";
import { storage } from "./storage";
import type { Product } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function getProductContext(): Promise<string> {
  const products = await storage.getProducts();
  const inStock = products.filter(p => p.stockQuantity > 0);
  const lines = inStock.map(p =>
    `- ${p.name} (${p.category}): ${p.unitPrice} DZD, ${p.stockQuantity} in stock, unit: ${p.unit}`
  );
  return lines.length > 0 ? lines.join("\n") : "No products currently in stock.";
}

async function getSalesContext(): Promise<string> {
  const allSales = await storage.getSales();
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const sale of allSales.slice(-200)) {
    try {
      const saleWithItems = await storage.getSaleWithItems(sale.id);
      if (saleWithItems) {
        for (const item of saleWithItems.items) {
          const key = item.productId;
          if (!productSales[key]) {
            productSales[key] = { name: item.productName, qty: 0, revenue: 0 };
          }
          productSales[key].qty += item.quantity;
          productSales[key].revenue += item.total;
        }
      }
    } catch {}
  }
  const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
  const top10 = sorted.slice(0, 10);
  return top10.map((p, i) => `${i + 1}. ${p.name}: ${p.qty} units sold, ${p.revenue.toFixed(2)} DZD revenue`).join("\n");
}

async function getLowStockContext(): Promise<string> {
  const products = await storage.getProducts();
  const lowStock = products.filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0);
  const outOfStock = products.filter(p => p.stockQuantity === 0);
  const lines: string[] = [];
  if (lowStock.length > 0) {
    lines.push("LOW STOCK items:");
    lowStock.forEach(p => lines.push(`  - ${p.name}: ${p.stockQuantity} left (threshold: ${p.lowStockThreshold})`));
  }
  if (outOfStock.length > 0) {
    lines.push("OUT OF STOCK items:");
    outOfStock.forEach(p => lines.push(`  - ${p.name}`));
  }
  return lines.length > 0 ? lines.join("\n") : "All products are well-stocked.";
}

const CUSTOMER_SYSTEM_PROMPT = `You are LEMJIBA, an intelligent and friendly e-commerce sales assistant for the LEMJIBA premium store.

Your responsibilities:
- Answer customer questions about products, availability, pricing, and stock
- Suggest products and recommend alternatives
- Promote best-selling items and encourage purchases
- Be professional, helpful, and enthusiastic about the products
- Greet customers warmly

Rules:
- ONLY recommend products that are IN STOCK (stockQuantity > 0)
- Always mention prices in DZD
- If a product is out of stock, suggest alternatives from the same category
- Keep responses concise but informative
- You speak Arabic, French, and English fluently - respond in the same language the customer uses
- If the customer asks about something unrelated to the store, politely redirect them

Current product catalog:
{PRODUCTS}`;

const ADMIN_SYSTEM_PROMPT = `You are LEMJIBA, an AI business assistant for the admin/owner of the LEMJIBA premium store.

Your capabilities:
- Analyze sales data and identify best-selling products
- Recommend which products need restocking based on current stock levels
- Suggest promo codes with safe discount values based on product margins
- Provide business insights and suggestions
- Help with inventory management decisions

When suggesting promo codes:
- Calculate safe discounts: ensure profit margin stays above 15%
- Format: PROMO-XXXXX (random 5 chars)
- Suggest expiry of 1-3 days for urgency
- Consider product cost price and selling price

Current inventory status:
{PRODUCTS}

Sales performance (top sellers):
{SALES}

Stock alerts:
{STOCK_ALERTS}`;

export async function handleCustomerChat(
  message: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const productContext = await getProductContext();
  const systemPrompt = CUSTOMER_SYSTEM_PROMPT.replace("{PRODUCTS}", productContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I apologize, I'm having trouble responding right now. Please try again.";
}

export async function handleAdminChat(
  message: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const [productContext, salesContext, stockContext] = await Promise.all([
    getProductContext(),
    getSalesContext(),
    getLowStockContext(),
  ]);

  const systemPrompt = ADMIN_SYSTEM_PROMPT
    .replace("{PRODUCTS}", productContext)
    .replace("{SALES}", salesContext)
    .replace("{STOCK_ALERTS}", stockContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 800,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I apologize, I'm having trouble responding right now. Please try again.";
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

  const code = `PROMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    code,
    discountType: "percentage",
    discountValue: safeDiscount,
    expiresAt,
  };
}

export async function getCustomerGreeting(language: string = "en"): Promise<string> {
  const products = await storage.getStoreProducts();
  const categories = [...new Set(products.map(p => p.category))];

  const greetings: Record<string, string> = {
    en: `Welcome to our store! 👋 We have ${products.length} products available across ${categories.length} categories. How can I help you today?`,
    fr: `Bienvenue dans notre boutique ! 👋 Nous avons ${products.length} produits disponibles dans ${categories.length} catégories. Comment puis-je vous aider ?`,
    ar: `مرحباً بكم في متجرنا! 👋 لدينا ${products.length} منتج متاح في ${categories.length} فئات. كيف يمكنني مساعدتك اليوم؟`,
  };

  return greetings[language] || greetings.en;
}
