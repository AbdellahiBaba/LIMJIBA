import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcrypt";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { isTransientError, isCapacityLimitError, checkDatabaseHealth, getPoolStats, db } from "./db";
import { storeOrders, storeNotifications, productReviews, storeReviews } from "@shared/schema";
import { eq } from "drizzle-orm";
import { cache } from "./cache";
import { 
  insertProductSchema, 
  insertInvoiceSchema, 
  insertInvoiceItemSchema,
  insertInvoicePaymentSchema,
  insertSaleSchema, 
  insertSaleItemSchema, 
  insertResellerSchema,
  insertEmployeeSchema,
  insertSalaryPaymentSchema,
  insertExpenseSchema,
  insertFabricationInvoiceSchema,
  insertFabricationItemSchema,
  insertStockMovementSchema,
  insertCustomerSchema,
  insertPromoCodeSchema,
  insertCmsBannerSchema,
  insertCategorySchema,
  insertStoreCustomerSchema,
  insertPaymentWalletSchema,
  insertCmsPageSchema,
  insertStoreSettingsSchema,
  insertProductVariantSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
} from "@shared/schema";
import { z } from "zod";
import { handleCustomerChat, handleAdminChat, generatePromoCode, getCustomerGreeting, generateProductDescriptions, generateNotificationContent } from "./limjiba";
import { sendOrderStatusEmail, sendOrderInvoiceEmail, sendPaymentConfirmedEmail, sendWelcomeEmail, sendPasswordResetEmail, sendMarketingEmail, sendProductMarketingEmail } from "./email";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeColor(color: string, fallback: string = "#C9A84C"): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
    return color;
  }
  return fallback;
}

function sanitizeUrl(url: string): string {
  if (/^https:\/\//i.test(url)) {
    return url;
  }
  return '';
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAuthenticated && req.session?.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}

function requirePermission(module: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.session?.isAdmin) {
      return next();
    }
    try {
      const permissions: string[] = JSON.parse(req.session?.permissions || "[]");
      if (permissions.includes(module)) {
        return next();
      }
    } catch {}
    res.status(403).json({ error: `Permission '${module}' required` });
  };
}

function logError(context: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  console.error(`[${context}] Error:`, errorMessage);
  if (errorStack) {
    console.error(`[${context}] Stack:`, errorStack);
  }
  return errorMessage;
}

const isProd = process.env.NODE_ENV === "production";

function handleError(res: any, context: string, error: unknown, defaultStatus: number = 500) {
  const errorMessage = logError(context, error);
  
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      error: "Validation failed", 
      details: error.errors,
      message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
  }
  
  if (isCapacityLimitError(error)) {
    return res.status(503).json({ 
      error: "Service temporarily unavailable", 
      details: "The service is experiencing capacity limits. Please try again later.",
      retryable: false
    });
  }

  if (isTransientError(error)) {
    return res.status(500).json({ 
      error: "Database operation failed", 
      details: "The operation could not be completed. Please try again.",
      retryable: true
    });
  }
  
  const pgError = error as any;
  if (pgError?.code === '23505') {
    return res.status(409).json({
      error: "Duplicate entry",
      details: isProd ? "A record with this value already exists." : (pgError?.detail || errorMessage)
    });
  }
  if (pgError?.code === '23503') {
    return res.status(400).json({
      error: "Referenced record not found",
      details: isProd ? "A referenced record could not be found." : (pgError?.detail || errorMessage)
    });
  }
  if (pgError?.code === '23502') {
    return res.status(400).json({
      error: "Required field missing",
      details: isProd ? "A required field was not provided." : (pgError?.detail || errorMessage)
    });
  }
  
  return res.status(defaultStatus).json({ 
    error: `Failed to ${context}`, 
    details: isProd ? "An unexpected error occurred." : errorMessage 
  });
}

const statusSchema = z.object({
  status: z.enum(["pending", "unpaid", "paid", "cancelled"])
});

const saleStatusSchema = z.object({
  status: z.enum(["completed", "partial", "credit", "pending"])
});

const purchaseOrderStatusSchema = z.object({
  status: z.enum(["draft", "ordered", "received", "cancelled"])
});

const storeOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"])
});

const supportConversationStatusSchema = z.object({
  status: z.enum(["open", "resolved", "closed"])
});

const deliveryStatusSchema = z.object({
  status: z.enum(["none", "prepared", "shipped", "delivered"])
});

const transportationStatusSchema = z.object({
  status: z.enum(["pending", "in_transit", "completed", "cancelled"])
});

const quickInvoiceInputSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  date: z.string().min(1).max(50),
  responsible: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  paymentMode: z.string().min(1).max(100),
  dueDate: z.string().max(50).nullable().optional(),
  clientName: z.string().max(200).nullable().optional(),
  clientAddress: z.string().max(500).nullable().optional(),
  clientPhone: z.string().max(50).nullable().optional(),
  applyTva: z.boolean().optional(),
  tvaRate: z.number().min(0).max(1).optional(),
  totalHT: z.number().min(0).optional(),
  tvaAmount: z.number().min(0).optional(),
  totalTTC: z.number().min(0).optional(),
  totalWeight: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.string().min(1),
  createdAt: z.string().min(1),
});

const createUserInputSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(4).max(200),
  isAdmin: z.boolean().optional(),
  displayName: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  permissions: z.string().max(5000).optional(),
  isActive: z.boolean().optional(),
});

const updateUserInputSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(200).optional(),
  isAdmin: z.boolean().optional(),
  displayName: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  permissions: z.string().max(5000).optional(),
  isActive: z.boolean().optional(),
});

const supplierInputSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  createdAt: z.string().optional(),
});

const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int(),
  reason: z.string().min(1).max(200),
  reference: z.string().max(200).nullable().optional(),
  createdBy: z.string().max(200).nullable().optional(),
});

const salePaymentInputSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform(val => {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(parsed) || parsed <= 0) throw new Error("Invalid payment amount");
    return parsed;
  }),
  paymentMethod: z.string().max(100).optional(),
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const saleEditSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1).max(500),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  discount: z.number().min(0).optional(),
  deliveryCost: z.number().min(0).optional(),
  customerName: z.string().max(200).nullable().optional(),
  customerPhone: z.string().max(50).nullable().optional(),
});

const saleUpdateSchema = insertSaleSchema.partial();

const parkedSaleInputSchema = z.object({
  label: z.string().min(1).max(200),
  customerName: z.string().max(200).nullable().optional(),
  items: z.string().min(1),
  discount: z.number().min(0).optional(),
});

const customerBalanceSchema = z.object({
  amount: z.number(),
});

const walletTransferSchema = z.object({
  fromWalletId: z.string().min(1),
  toWalletId: z.string().min(1),
  amount: z.union([z.number(), z.string()]).transform(val => {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Amount must be a positive number");
    return parsed;
  }),
});

const walletCreditSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform(val => {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Amount must be a positive number");
    return parsed;
  }),
  method: z.enum(["cash", "bank_transfer", "check_deposit", "mobile_wallet", "other"]),
  note: z.string().max(500).optional(),
});

const openingBalanceSchema = z.object({
  openingBalance: z.union([z.number(), z.string()]).transform(val => {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    if (!Number.isFinite(parsed)) throw new Error("Opening balance must be a number");
    return parsed;
  }),
});

const storeSignupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(4).max(200),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  language: z.string().max(10).optional(),
});

const storeLoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

const storeProfileUpdateSchema = z.object({
  email: z.string().email().max(200).optional(),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  language: z.string().max(10).optional(),
});

const storeChatSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.any()).optional(),
  lang: z.string().max(10).optional(),
});

const adminChatSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.any()).optional(),
});

const promoValidateSchema = z.object({
  code: z.string().min(1).max(100),
  orderAmount: z.number().min(0).optional(),
});

const settingValueSchema = z.object({
  value: z.string(),
});

const csvImportSchema = z.object({
  csvData: z.string().min(1),
});

const shippingSchema = z.object({
  shippingCost: z.number().positive(),
  distributionMethod: z.enum(["by_quantity", "by_value"]),
});

const bulkNotifySchema = z.object({
  customerIds: z.array(z.string()).min(1),
  title: z.string().max(500).optional(),
  titleAr: z.string().max(500).optional(),
  titleFr: z.string().max(500).optional(),
  message: z.string().max(5000).optional(),
  messageAr: z.string().max(5000).optional(),
  messageFr: z.string().max(5000).optional(),
  sendEmail: z.boolean().optional(),
});

const productReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).nullable().optional(),
});

const supportMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

async function notifyAllCustomers_NewArrival(product: any) {
  try {
    const customers = await storage.getAllStoreCustomers();
    const active = customers.filter((c: any) => c.isActive !== false);
    console.log(`[AUTO-NOTIFY] New arrival "${product.name}" — notifying ${active.length} customers`);

    const titles: Record<string, string> = {
      en: "✨ New Arrival at LIMJIBA",
      fr: "✨ Nouvelle Arrivée chez LIMJIBA",
      ar: "✨ وصول جديد في لمجيبة"
    };
    const pNameEn = product.name;
    const pNameFr = product.nameFr || product.name;
    const pNameAr = product.nameAr || product.name;
    const price = `${product.unitPrice?.toLocaleString() || "0"} MRU`;

    const messages: Record<string, string> = {
      en: `A new treasure has arrived — ${pNameEn} (${price}). Handpicked with devotion, destined for those who appreciate elegance. Discover it now!`,
      fr: `Un nouveau trésor est arrivé — ${pNameFr} (${price}). Sélectionné avec passion, destiné à ceux qui savourent l'élégance. Découvrez-le maintenant !`,
      ar: `كنزٌ جديد قد وصل — ${pNameAr} (${price}). مُنتقى بعناية فائقة لمن يُقدّرون الأناقة. اكتشفوه الآن!`
    };

    const BATCH_SIZE = 5;
    for (let i = 0; i < active.length; i += BATCH_SIZE) {
      const batch = active.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(async (c: any) => {
        try {
          const lang = (c.language === "ar" || c.language === "fr") ? c.language : "en";
          await storage.createStoreNotification({
            customerId: c.id,
            customerEmail: c.email,
            type: "promotion",
            title: titles.en,
            titleAr: titles.ar,
            titleFr: titles.fr,
            message: messages.en,
            messageAr: messages.ar,
            messageFr: messages.fr,
            isRead: false,
          });
          await sendProductMarketingEmail(c.email, c.fullName || "Valued Customer", lang, product, "new_arrival");
        } catch (err: any) {
          console.error(`[AUTO-NOTIFY] Failed for customer ${c.email}:`, err.message);
        }
      }));
    }
    console.log(`[AUTO-NOTIFY] New arrival notifications dispatched for "${product.name}"`);
  } catch (err: any) {
    console.error("[AUTO-NOTIFY] notifyAllCustomers_NewArrival error:", err.message);
  }
}

async function notifyAllCustomers_FlashSale(product: any) {
  try {
    const customers = await storage.getAllStoreCustomers();
    const active = customers.filter((c: any) => c.isActive !== false);
    const discount = product.dealDiscount ? `${product.dealDiscount}%` : "";
    console.log(`[AUTO-NOTIFY] Flash sale "${product.name}" ${discount} OFF — notifying ${active.length} customers`);

    const pNameEn = product.name;
    const pNameFr = product.nameFr || product.name;
    const pNameAr = product.nameAr || product.name;
    const discountedPrice = product.dealDiscount
      ? `${Math.round(product.unitPrice * (1 - product.dealDiscount / 100)).toLocaleString()} MRU`
      : `${product.unitPrice?.toLocaleString() || "0"} MRU`;

    const titles: Record<string, string> = {
      en: `🔥 Flash Sale — ${discount} OFF`,
      fr: `🔥 Vente Flash — ${discount} de remise`,
      ar: `🔥 تخفيض خاطف — خصم ${discount}`
    };

    const messages: Record<string, string> = {
      en: `The golden hour has arrived! ${pNameEn} is now ${discountedPrice} (${discount} OFF). A rare moment where luxury meets opportunity — seize it before the curtain falls!`,
      fr: `L'heure dorée est arrivée ! ${pNameFr} est maintenant à ${discountedPrice} (${discount} de remise). Un moment rare où le luxe rencontre l'opportunité — saisissez-la !`,
      ar: `حانت الساعة الذهبية! ${pNameAr} الآن بسعر ${discountedPrice} (خصم ${discount}). لحظة نادرة يلتقي فيها الفخامة بالفرصة — اغتنموها!`
    };

    const BATCH_SIZE = 5;
    for (let i = 0; i < active.length; i += BATCH_SIZE) {
      const batch = active.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(async (c: any) => {
        try {
          const lang = (c.language === "ar" || c.language === "fr") ? c.language : "en";
          await storage.createStoreNotification({
            customerId: c.id,
            customerEmail: c.email,
            type: "promotion",
            title: titles.en,
            titleAr: titles.ar,
            titleFr: titles.fr,
            message: messages.en,
            messageAr: messages.ar,
            messageFr: messages.fr,
            isRead: false,
          });
          await sendProductMarketingEmail(c.email, c.fullName || "Valued Customer", lang, product, "flash_sale");
        } catch (err: any) {
          console.error(`[AUTO-NOTIFY] Failed for customer ${c.email}:`, err.message);
        }
      }));
    }
    console.log(`[AUTO-NOTIFY] Flash sale notifications dispatched for "${product.name}"`);
  } catch (err: any) {
    console.error("[AUTO-NOTIFY] notifyAllCustomers_FlashSale error:", err.message);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health check endpoint for monitoring - ALWAYS returns 200
  // Reports DB status in body but never affects server availability
  app.get("/api/health", async (req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const poolStats = getPoolStats();
      const cacheStats = cache.getStats();
      
      // Always return 200 - status is in the response body
      res.status(200).json({
        status: dbHealth.healthy ? "healthy" : "degraded",
        database: {
          connected: dbHealth.healthy,
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error || null,
        },
        pool: poolStats,
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Even on error, return 200 with error details in body
      res.status(200).json({
        status: "degraded",
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ===================== AUTH ROUTES =====================
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      if (user.isActive === false) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      const setSessionAndRespond = () => {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.isAdmin;
        req.session.isAuthenticated = true;
        req.session.permissions = user.permissions || "[]";
        req.session.role = user.role || "staff";
        req.session.displayName = user.displayName || user.username;
        
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.error("[auth] Session save error:", saveErr.message);
            return res.status(500).json({ error: "Session save error" });
          }

          try {
            await storage.createAuditLog({
              userId: user.id,
              username: user.username,
              action: "login",
              entity: "auth",
              entityId: user.id,
              details: JSON.stringify({ ip: req.ip }),
              ipAddress: req.ip || null,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {}
          
          res.json({ 
            success: true, 
            user: { 
              id: user.id, 
              username: user.username, 
              isAdmin: user.isAdmin,
              displayName: user.displayName || user.username,
              role: user.role || "staff",
              permissions: user.permissions || "[]",
            } 
          });
        });
      };

      req.session.regenerate((err) => {
        if (err) {
          console.warn("[auth] Session regenerate failed, using direct session:", err.message);
          setSessionAndRespond();
          return;
        }
        setSessionAndRespond();
      });
    } catch (error) {
      handleError(res, "login", error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.session?.isAuthenticated) {
      res.json({
        isAuthenticated: true,
        user: {
          id: req.session.userId,
          username: req.session.username,
          isAdmin: req.session.isAdmin,
          displayName: req.session.displayName || req.session.username,
          role: req.session.role || "staff",
          permissions: req.session.permissions || "[]",
        },
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // ===================== QUICK INVOICES ROUTES =====================

  app.get("/api/quick-invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getQuickInvoices();
      res.json(invoices);
    } catch (error) {
      handleError(res, "getQuickInvoices", error);
    }
  });

  app.get("/api/quick-invoices/next-number", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getQuickInvoices();
      const currentYear = new Date().getFullYear();
      let maxNum = 0;
      for (const inv of invoices) {
        const match = inv.invoiceNumber.match(/^FR-(\d+)\/(\d{4})$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const year = parseInt(match[2], 10);
          if (year === currentYear && num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      const nextNumber = `FR-${String(nextNum).padStart(4, "0")}/${currentYear}`;
      res.json({ nextNumber });
    } catch (error) {
      handleError(res, "getNextQuickInvoiceNumber", error);
    }
  });

  app.get("/api/quick-invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getQuickInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Quick invoice not found" });
      res.json(invoice);
    } catch (error) {
      handleError(res, "getQuickInvoice", error);
    }
  });

  app.post("/api/quick-invoices", requireAuth, async (req, res) => {
    try {
      const data = quickInvoiceInputSchema.parse(req.body);
      const invoice = await storage.createQuickInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      handleError(res, "createQuickInvoice", error);
    }
  });

  app.delete("/api/quick-invoices/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteQuickInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteQuickInvoice", error);
    }
  });

  // ===================== USER MANAGEMENT ROUTES (Admin Only) =====================

  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const safeUsers = allUsers.map(u => ({ ...u, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      handleError(res, "getUsers", error);
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, isAdmin, displayName, role, permissions } = createUserInputSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        isAdmin: isAdmin || false,
        displayName: displayName || username,
        role: role || "staff",
        permissions: permissions || "[]",
        isActive: true,
      });
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "create",
        entity: "user",
        entityId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      handleError(res, "createUser", error);
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const validated = updateUserInputSchema.parse(req.body);
      const { password, ...rest } = validated;
      const updateData: any = { ...rest };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "user",
        entityId: req.params.id,
        details: JSON.stringify({ fields: Object.keys(rest) }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ ...user, password: undefined });
    } catch (error) {
      handleError(res, "updateUser", error);
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      if (req.params.id === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id);
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "delete",
        entity: "user",
        entityId: req.params.id,
        details: null,
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteUser", error);
    }
  });

  // ===================== SUPPLIER ROUTES =====================

  app.get("/api/suppliers", requirePermission("suppliers"), async (req, res) => {
    try {
      const allSuppliers = await storage.getSuppliers();
      res.json(allSuppliers);
    } catch (error) {
      handleError(res, "getSuppliers", error);
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      handleError(res, "getSupplier", error);
    }
  });

  app.post("/api/suppliers", requirePermission("suppliers"), async (req, res) => {
    try {
      const data = supplierInputSchema.parse(req.body);
      const supplier = await storage.createSupplier({
        ...data,
        createdAt: new Date().toISOString(),
      });
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "create",
        entity: "supplier",
        entityId: supplier.id,
        details: JSON.stringify({ name: supplier.name }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(supplier);
    } catch (error) {
      handleError(res, "createSupplier", error);
    }
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const data = supplierInputSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, data);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      handleError(res, "updateSupplier", error);
    }
  });

  app.delete("/api/suppliers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteSupplier", error);
    }
  });

  // ===================== PURCHASE ORDER ROUTES =====================

  app.get("/api/purchase-orders/next-number", requireAuth, async (req, res) => {
    try {
      const nextNumber = await storage.getNextPONumber();
      res.json({ nextNumber });
    } catch (error) {
      handleError(res, "getNextPONumber", error);
    }
  });

  app.get("/api/purchase-orders", requirePermission("suppliers"), async (req, res) => {
    try {
      const pos = await storage.getPurchaseOrders();
      res.json(pos);
    } catch (error) {
      handleError(res, "getPurchaseOrders", error);
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      res.json(po);
    } catch (error) {
      handleError(res, "getPurchaseOrder", error);
    }
  });

  app.post("/api/purchase-orders", requirePermission("suppliers"), async (req, res) => {
    try {
      const body = z.object({
        items: z.array(insertPurchaseOrderItemSchema).optional(),
      }).passthrough().parse(req.body);
      const { items, ...rawPoData } = body;
      const poData = insertPurchaseOrderSchema.parse({ ...rawPoData, createdAt: new Date().toISOString() });
      const po = await storage.createPurchaseOrder(
        poData,
        items || []
      );
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "create",
        entity: "purchase_order",
        entityId: po.id,
        details: JSON.stringify({ orderNumber: po.orderNumber }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(po);
    } catch (error) {
      handleError(res, "createPurchaseOrder", error);
    }
  });

  app.post("/api/purchase-orders/:id/receive", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getPurchaseOrder(req.params.id);
      if (!existing) return res.status(404).json({ error: "Purchase order not found" });
      if (existing.status === "received") return res.status(409).json({ error: "Purchase order already received" });

      if (existing.paymentWalletId && existing.totalAmount) {
        const balance = await storage.getWalletBalance(existing.paymentWalletId);
        if (balance < existing.totalAmount) {
          return res.status(400).json({ error: `Insufficient wallet balance. Available: ${balance.toLocaleString()} MRU, Required: ${existing.totalAmount.toLocaleString()} MRU` });
        }
      }

      const receivedBy = req.session.username || "unknown";
      const po = await storage.receivePurchaseOrder(req.params.id, receivedBy);
      if (!po) return res.status(500).json({ error: "Failed to receive purchase order" });

      let walletDebited = false;
      let newWalletBalance: number | null = null;
      let walletName: string | null = null;
      if (po.paymentWalletId && po.totalAmount) {
        await storage.debitWalletBalance(po.paymentWalletId, po.totalAmount);
        walletDebited = true;
        newWalletBalance = await storage.getWalletBalance(po.paymentWalletId);
        const wallets = await storage.getPaymentWallets();
        const w = wallets.find(w => w.id === po.paymentWalletId);
        if (w) walletName = w.name;
      }

      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "purchase_order",
        entityId: po.id,
        details: JSON.stringify({ action: "received", orderNumber: po.orderNumber, walletDebited: walletDebited ? po.paymentWalletId : null, amount: walletDebited ? po.totalAmount : 0, newWalletBalance }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ ...po, walletDebited, debitedAmount: walletDebited ? po.totalAmount : 0, newWalletBalance, walletName });
    } catch (error) {
      handleError(res, "receivePurchaseOrder", error);
    }
  });

  app.patch("/api/purchase-orders/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = purchaseOrderStatusSchema.parse(req.body);
      const po = await storage.updatePurchaseOrderStatus(req.params.id, status);
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      res.json(po);
    } catch (error) {
      handleError(res, "updatePOStatus", error);
    }
  });

  app.delete("/api/purchase-orders/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePurchaseOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deletePurchaseOrder", error);
    }
  });

  app.post("/api/purchase-orders/:id/shipping", requireAuth, async (req, res) => {
    try {
      const { shippingCost, distributionMethod } = shippingSchema.parse(req.body);
      const po = await storage.addShippingToPurchaseOrder(req.params.id, shippingCost, distributionMethod);
      if (!po) return res.status(404).json({ error: "Purchase order not found or not received" });
      try {
        await storage.createAuditLog({
          userId: req.session.userId,
          username: req.session.username || "system",
          action: "update",
          entity: "purchase_order",
          entityId: po.id,
          details: JSON.stringify({ action: "shipping_added", shippingCost, distributionMethod, orderNumber: po.orderNumber }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch {}
      res.json(po);
    } catch (error) {
      handleError(res, "addShippingToPurchaseOrder", error);
    }
  });

  app.get("/api/purchase-orders/:id/profitability", requireAuth, async (req, res) => {
    try {
      const result = await storage.getBatchProfitability(req.params.id);
      if (!result) return res.status(404).json({ error: "Purchase order not found" });
      res.json(result);
    } catch (error) {
      handleError(res, "getBatchProfitability", error);
    }
  });

  app.get("/api/products/:id/profitability", requireAuth, async (req, res) => {
    try {
      const result = await storage.getProductProfitability(req.params.id);
      if (!result) return res.status(404).json({ error: "Product not found" });
      res.json(result);
    } catch (error) {
      handleError(res, "getProductProfitability", error);
    }
  });

  app.get("/api/reports/profitability", requireAuth, async (req, res) => {
    try {
      const allProducts = await storage.getProducts();
      const profitabilities = [];
      for (const product of allProducts) {
        const profitability = await storage.getProductProfitability(product.id);
        if (profitability) {
          profitabilities.push(profitability);
        }
      }
      res.json(profitabilities);
    } catch (error) {
      handleError(res, "getReportsProfitability", error);
    }
  });

  // ===================== TRANSPORTATION INVOICE ROUTES =====================

  app.get("/api/transportation-invoices/next-number", requireAuth, async (req, res) => {
    try {
      const nextNumber = await storage.getNextTransportationNumber();
      res.json({ nextNumber });
    } catch (error) {
      handleError(res, "getNextTransportationNumber", error);
    }
  });

  app.get("/api/transportation-invoices", requirePermission("transportation"), async (req, res) => {
    try {
      const invoicesList = await storage.getTransportationInvoices();
      res.json(invoicesList);
    } catch (error) {
      handleError(res, "getTransportationInvoices", error);
    }
  });

  app.get("/api/transportation-invoices/:id", requirePermission("transportation"), async (req, res) => {
    try {
      const invoice = await storage.getTransportationInvoiceWithItems(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Transportation invoice not found" });
      res.json(invoice);
    } catch (error) {
      handleError(res, "getTransportationInvoice", error);
    }
  });

  app.post("/api/transportation-invoices", requirePermission("transportation"), async (req, res) => {
    try {
      const body = z.object({
        invoice: z.record(z.any()),
        items: z.array(z.record(z.any())).optional(),
      }).parse(req.body);
      const { invoice, items } = body;
      const created = await storage.createTransportationInvoice(invoice, items || []);
      try {
        await storage.createAuditLog({
          userId: (req as any).user?.id || "system",
          username: req.session.username || "System",
          action: "create",
          entity: "transportation_invoice",
          entityId: created.id,
          details: `Created transportation invoice ${created.invoiceNumber} (${created.direction})`,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(201).json(created);
    } catch (error) {
      handleError(res, "createTransportationInvoice", error);
    }
  });

  app.patch("/api/transportation-invoices/:id/status", requirePermission("transportation"), async (req, res) => {
    try {
      const { status } = transportationStatusSchema.parse(req.body);

      const existing = await storage.getTransportationInvoiceWithItems(req.params.id);
      if (!existing) return res.status(404).json({ error: "Transportation invoice not found" });

      if (existing.status === "completed" && status === "completed") {
        return res.status(400).json({ error: "Invoice already completed" });
      }

      const updated = await storage.updateTransportationInvoiceStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ error: "Transportation invoice not found" });

      try {
        await storage.createAuditLog({
          userId: (req as any).user?.id || "system",
          username: req.session.username || "System",
          action: "update",
          entity: "transportation_invoice",
          entityId: req.params.id,
          details: `Updated transportation invoice status to ${status}`,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.json(updated);
    } catch (error) {
      handleError(res, "updateTransportationInvoiceStatus", error);
    }
  });

  app.delete("/api/transportation-invoices/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTransportationInvoice(req.params.id);
      try {
        await storage.createAuditLog({
          userId: (req as any).user?.id || "system",
          username: req.session.username || "System",
          action: "delete",
          entity: "transportation_invoice",
          entityId: req.params.id,
          details: `Deleted transportation invoice`,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteTransportationInvoice", error);
    }
  });

  // ===================== PARKED SALES ROUTES =====================

  app.get("/api/parked-sales", requireAuth, async (req, res) => {
    try {
      const parked = await storage.getParkedSales();
      res.json(parked);
    } catch (error) {
      handleError(res, "getParkedSales", error);
    }
  });

  app.post("/api/parked-sales", requireAuth, async (req, res) => {
    try {
      const data = parkedSaleInputSchema.parse(req.body);
      const parked = await storage.createParkedSale({
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: req.session.username || "unknown",
      });
      res.status(201).json(parked);
    } catch (error) {
      handleError(res, "createParkedSale", error);
    }
  });

  app.delete("/api/parked-sales/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteParkedSale(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteParkedSale", error);
    }
  });

  // ===================== AUDIT LOG ROUTES =====================

  app.get("/api/audit-logs", requireAdmin, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.action) filters.action = req.query.action;
      if (req.query.entity) filters.entity = req.query.entity;
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;
      const logs = await storage.getAuditLogs(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(logs);
    } catch (error) {
      handleError(res, "getAuditLogs", error);
    }
  });

  // ===================== DELIVERY STATUS ROUTES =====================

  app.patch("/api/invoices/:id/delivery-status", requireAuth, async (req, res) => {
    try {
      const { status } = deliveryStatusSchema.parse(req.body);
      const invoice = await storage.updateInvoiceDeliveryStatus(req.params.id, status);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "invoice",
        entityId: req.params.id,
        details: JSON.stringify({ field: "deliveryStatus", value: status }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json(invoice);
    } catch (error) {
      handleError(res, "updateDeliveryStatus", error);
    }
  });

  // ===================== REPORTS ROUTES =====================

  app.get("/api/reports/pnl", requirePermission("reports"), async (req, res) => {
    try {
      const start = (req.query.start as string) || "2020-01-01";
      const end = (req.query.end as string) || new Date().toISOString().split("T")[0];
      const profitStats = await storage.getProfitStats(start, end);
      res.json(profitStats);
    } catch (error) {
      handleError(res, "getPnLReport", error);
    }
  });

  app.get("/api/reports/sales-analysis", requirePermission("reports"), async (req, res) => {
    try {
      const allSales = await storage.getSales();
      const allProducts = await storage.getProducts();
      const allCustomers = await storage.getCustomers();
      
      const salesByMonth: Record<string, number> = {};
      const salesByCustomer: Record<string, { name: string; total: number; count: number }> = {};
      
      for (const sale of allSales) {
        const month = sale.date.substring(0, 7);
        salesByMonth[month] = (salesByMonth[month] || 0) + sale.total;
        
        const custName = sale.customerName || "Walk-in";
        if (!salesByCustomer[custName]) salesByCustomer[custName] = { name: custName, total: 0, count: 0 };
        salesByCustomer[custName].total += sale.total;
        salesByCustomer[custName].count += 1;
      }
      
      const topCustomers = Object.values(salesByCustomer)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      res.json({
        totalSales: allSales.length,
        totalRevenue: allSales.reduce((sum, s) => sum + s.total, 0),
        salesByMonth,
        topCustomers,
        averageOrderValue: allSales.length > 0 ? allSales.reduce((sum, s) => sum + s.total, 0) / allSales.length : 0,
      });
    } catch (error) {
      handleError(res, "getSalesAnalysis", error);
    }
  });

  app.get("/api/reports/product-performance", requirePermission("reports"), async (req, res) => {
    try {
      const allSales = await storage.getSales();
      const allProducts = await storage.getProducts();
      const productPerformance: Record<string, { name: string; revenue: number; cost: number; quantity: number; margin: number }> = {};
      
      for (const sale of allSales) {
        const saleWithItems = await storage.getSaleWithItems(sale.id);
        if (saleWithItems?.items) {
          for (const item of saleWithItems.items) {
            if (!productPerformance[item.productId]) {
              productPerformance[item.productId] = { name: item.productName, revenue: 0, cost: 0, quantity: 0, margin: 0 };
            }
            productPerformance[item.productId].revenue += item.total;
            productPerformance[item.productId].cost += (item.costPrice || 0) * item.quantity;
            productPerformance[item.productId].quantity += item.quantity;
          }
        }
      }
      
      for (const key of Object.keys(productPerformance)) {
        const p = productPerformance[key];
        p.margin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
      }
      
      const sorted = Object.entries(productPerformance)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
      
      res.json({
        products: sorted,
        bestPerformers: sorted.slice(0, 5),
        worstPerformers: sorted.slice(-5).reverse(),
      });
    } catch (error) {
      handleError(res, "getProductPerformance", error);
    }
  });

  // ===================== SETTINGS ROUTES =====================
  
  app.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      res.json({ key: req.params.key, value: value || null });
    } catch (error) {
      handleError(res, "getSetting", error);
    }
  });

  app.put("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const { value } = settingValueSchema.parse(req.body);
      const setting = await storage.setSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      handleError(res, "setSetting", error);
    }
  });

  // ===================== PUBLIC PDF ROUTES (outside /api/invoices prefix) =====================
  
  app.get("/public/invoices/:id/pdf", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }

      const logoPositionRaw = (req.query.logoPosition as string) || "left";
      const validPositions = ["left", "center", "right"];
      const invoiceLangRaw = (req.query.invoiceLanguage as string) || "fr";
      const validLangs = ["fr", "ar", "bilingual"];

      const branding = {
        logo: req.query.logo ? sanitizeUrl(req.query.logo as string) : undefined,
        watermark: req.query.watermark ? sanitizeUrl(req.query.watermark as string) : undefined,
        enableWatermark: req.query.enableWatermark === "true",
        watermarkOpacity: Math.min(Math.max(parseFloat(req.query.watermarkOpacity as string) || 0.12, 0), 1),
        logoPosition: (validPositions.includes(logoPositionRaw) ? logoPositionRaw : "left") as "left" | "center" | "right",
        primaryColor: sanitizeColor((req.query.primaryColor as string) || "#1976D2"),
        accentColor: sanitizeColor((req.query.accentColor as string) || "#42A5F5", "#42A5F5"),
        invoiceLanguage: (validLangs.includes(invoiceLangRaw) ? invoiceLangRaw : "fr") as "fr" | "ar" | "bilingual",
      };

      const html = generateInvoicePDF(invoice, branding);
      
      // Generate actual PDF using Puppeteer
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-extensions', '--disable-gpu', '--disable-software-rasterizer'],
          timeout: 30000
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const pdfUint8Array = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          timeout: 30000
        });
        
        // Convert Uint8Array to Buffer for proper response handling
        const pdfBuffer = Buffer.from(pdfUint8Array);
        
        // Send PDF with download headers
        const filename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    } catch (error) {
      handleError(res, "generate PDF", error);
    }
  });

  
  // Public delivery note PDF route
  app.get("/public/invoices/:id/delivery-note", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }

      const branding = {
        logo: req.query.logo ? sanitizeUrl(req.query.logo as string) : undefined,
        primaryColor: sanitizeColor((req.query.primaryColor as string) || "#1976D2"),
      };

      const html = generateDeliveryNotePDF(invoice, branding);
      
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-extensions', '--disable-gpu', '--disable-software-rasterizer'],
          timeout: 30000
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const pdfUint8Array = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          timeout: 30000
        });
        
        // Convert Uint8Array to Buffer for proper response handling
        const pdfBuffer = Buffer.from(pdfUint8Array);
        
        const blNum = invoice.invoiceNumber.includes('-') ? 
          'BL-' + invoice.invoiceNumber.split('-')[1] : 
          'BL-' + invoice.invoiceNumber;
        const filename = `${blNum.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    } catch (error) {
      handleError(res, "generate delivery note PDF", error);
    }
  });

  // Public branding endpoint (no auth required for receipts)
  app.get("/public/branding", async (req, res) => {
    try {
      const brandingJson = await storage.getSetting("branding");
      if (brandingJson) {
        res.json(JSON.parse(brandingJson));
      } else {
        res.json({ primaryColor: "#C9A84C", accentColor: "#C9A84C" });
      }
    } catch (error) {
      res.json({ primaryColor: "#C9A84C", accentColor: "#C9A84C" });
    }
  });

  // Public ticket PDF route (for POS receipt printing)
  app.get("/public/sales/:id/ticket-pdf", async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }

      // Fetch reseller info if sale has a resellerId
      let reseller = null;
      if (sale.resellerId) {
        reseller = await storage.getReseller(sale.resellerId);
      }

      let branding: any = { primaryColor: "#C9A84C" };
      try {
        const brandingJson = await storage.getSetting("branding");
        if (brandingJson) {
          branding = JSON.parse(brandingJson);
        }
      } catch (e) {
        // Use defaults
      }

      let storeSettings: any = null;
      try {
        storeSettings = await storage.getStoreSettings();
      } catch (e) {}

      let logoDataUrl = '';
      if (req.query.logo) {
        logoDataUrl = sanitizeUrl(req.query.logo as string);
      } else if (storeSettings?.logoUrl) {
        const sUrl = storeSettings.logoUrl;
        if (/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/i.test(sUrl) || /^https:\/\//i.test(sUrl)) {
          logoDataUrl = sUrl;
        }
      } else if (branding.logo) {
        logoDataUrl = sanitizeUrl(branding.logo);
      } else {
        try {
          const logoPath = path.resolve('attached_assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png');
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          }
        } catch (e) {}
      }

      const queryParams = {
        logo: logoDataUrl,
        primaryColor: sanitizeColor((req.query.primaryColor as string) || branding.primaryColor || '#C9A84C'),
      };

      const html = generateReceiptHTML(sale, queryParams, reseller, storeSettings);

      let browser: any = null;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-extensions', '--disable-gpu', '--disable-software-rasterizer'],
          timeout: 30000
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const pdfUint8Array = await page.pdf({
          width: '80mm',
          height: '297mm',
          printBackground: true,
          preferCSSPageSize: false,
          margin: { top: '5mm', bottom: '5mm', left: '3mm', right: '3mm' },
          timeout: 30000
        });

        // Convert Uint8Array to Buffer for proper response handling
        const pdfBuffer = Buffer.from(pdfUint8Array);
        
        const filename = `Ticket_${sale.saleNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    } catch (error) {
      handleError(res, "generate ticket PDF", error);
    }
  });

  // ===================== PROTECTED ROUTES =====================
  
  // Apply authentication middleware to all data routes
  app.use("/api/products", requireAuth);
  app.use("/api/invoices", requireAuth);
  app.use("/api/sales", requireAuth);
  app.use("/api/resellers", requireAuth);
  app.use("/api/employees", requireAuth);
  app.use("/api/salary-payments", requireAuth);
  app.use("/api/expenses", requireAuth);
  app.use("/api/customers", requireAuth);
  app.use("/api/fabrication-invoices", requireAuth);
  app.use("/api/stock-movements", requireAuth);
  app.use("/api/profit-stats", requireAuth);
  app.use("/api/dashboard", requireAuth);

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      handleError(res, "get dashboard stats", error);
    }
  });

  app.get("/api/dashboard/sales-trends", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const months: Record<string, { month: string; sales: number; revenue: number }> = {};
      
      // Get last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
        months[key] = { month: monthNames[date.getMonth()], sales: 0, revenue: 0 };
      }
      
      // Aggregate sales by month
      sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) {
          months[key].sales++;
          months[key].revenue += Number(sale.total) || 0;
        }
      });
      
      res.json(Object.values(months));
    } catch (error) {
      handleError(res, "get sales trends", error);
    }
  });

  app.get("/api/dashboard/top-products", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      for (const sale of sales) {
        const saleWithItems = await storage.getSaleWithItems(sale.id);
        if (saleWithItems?.items) {
          saleWithItems.items.forEach(item => {
            if (!productStats[item.productId]) {
              productStats[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
            }
            productStats[item.productId].quantity += item.quantity;
            productStats[item.productId].revenue += Number(item.total) || 0;
          });
        }
      }
      
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      
      res.json(topProducts);
    } catch (error) {
      handleError(res, "get top products", error);
    }
  });

  app.get("/api/dashboard/recent-activity", requireAuth, async (req, res) => {
    try {
      const [allSales, allInvoices, allExpenses, allQuickInvoices, allStoreOrders] = await Promise.all([
        storage.getSales(),
        storage.getInvoices(),
        storage.getExpenses(),
        storage.getQuickInvoices(),
        storage.getStoreOrders(),
      ]);

      type ActivityItem = { id: string; type: "sale" | "invoice" | "expense" | "quick_invoice" | "store_order"; description: string; amount: number; date: string; reference: string };
      const activities: ActivityItem[] = [];

      allSales.slice(0, 10).forEach(s => {
        activities.push({
          id: s.id,
          type: "sale",
          description: s.customerName || "POS Sale",
          amount: s.total || 0,
          date: s.date,
          reference: s.saleNumber,
        });
      });

      allInvoices.slice(0, 10).forEach(inv => {
        activities.push({
          id: inv.id,
          type: "invoice",
          description: inv.clientName || "Invoice",
          amount: inv.totalTTC || 0,
          date: inv.date,
          reference: inv.invoiceNumber,
        });
      });

      allExpenses.slice(0, 10).forEach(exp => {
        activities.push({
          id: exp.id,
          type: "expense",
          description: exp.name,
          amount: exp.amount || 0,
          date: exp.date,
          reference: exp.category,
        });
      });

      allQuickInvoices.slice(0, 10).forEach(qi => {
        activities.push({
          id: qi.id,
          type: "quick_invoice",
          description: qi.clientName || "Quick Invoice",
          amount: qi.totalTTC || 0,
          date: qi.date,
          reference: qi.invoiceNumber,
        });
      });

      allStoreOrders.slice(0, 10).forEach(so => {
        activities.push({
          id: so.id,
          type: "store_order",
          description: so.customerName || "Store Order",
          amount: so.total || 0,
          date: so.createdAt || "",
          reference: so.orderNumber,
        });
      });

      activities.sort((a, b) => b.date.localeCompare(a.date));

      res.json(activities.slice(0, 5));
    } catch (error) {
      handleError(res, "get recent activity", error);
    }
  });

  // Low stock alerts endpoint - server-side filtering
  app.get("/api/dashboard/low-stock", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const lowStockProducts = products
        .filter(p => p.stockQuantity <= p.lowStockThreshold)
        .slice(0, 20) // Limit to 20 items
        .map(p => ({
          id: p.id,
          name: p.name,
          stockQuantity: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
        }));
      res.json(lowStockProducts);
    } catch (error) {
      handleError(res, "get low stock products", error);
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      handleError(res, "get products", error);
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found", id: req.params.id });
      }
      res.json(product);
    } catch (error) {
      handleError(res, "get product", error);
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      console.log("[POST /api/products] Received:", JSON.stringify(req.body));
      const data = insertProductSchema.parse(req.body);
      console.log("[POST /api/products] Validated:", JSON.stringify(data));
      const product = await storage.createProduct(data);
      console.log("[POST /api/products] Created:", JSON.stringify(product));
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "create",
          entity: "product",
          entityId: product.id,
          details: JSON.stringify({ name: product.name }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      notifyAllCustomers_NewArrival(product).catch(console.error);
      res.status(201).json(product);
    } catch (error) {
      handleError(res, "create product", error);
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      console.log("[PATCH /api/products] Received:", JSON.stringify(req.body));
      const oldProduct = await storage.getProduct(req.params.id);
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, data);
      if (!product) {
        return res.status(404).json({ error: "Product not found", id: req.params.id });
      }
      if (oldProduct && product.isDealOfDay && product.dealDiscount && product.dealDiscount > 0) {
        const wasDeal = oldProduct.isDealOfDay && oldProduct.dealDiscount && oldProduct.dealDiscount > 0;
        const discountChanged = wasDeal && oldProduct.dealDiscount !== product.dealDiscount;
        if (!wasDeal || discountChanged) {
          notifyAllCustomers_FlashSale(product).catch(console.error);
        }
      }
      res.json(product);
    } catch (error) {
      handleError(res, "update product", error);
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found", id: req.params.id });
      }
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "delete",
          entity: "product",
          entityId: req.params.id,
          details: null,
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete product", error);
    }
  });

  // Stock Movements API
  app.get("/api/stock-movements", async (req, res) => {
    try {
      const productId = req.query.productId as string | undefined;
      const movements = await storage.getStockMovements(productId);
      res.json(movements);
    } catch (error) {
      handleError(res, "get stock movements", error);
    }
  });

  app.post("/api/stock-movements/adjust", async (req, res) => {
    try {
      const { productId, quantity, reason, reference, createdBy } = stockAdjustSchema.parse(req.body);
      const result = await storage.adjustStock(productId, quantity, reason, reference || undefined, createdBy || undefined);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, "adjust stock", error);
    }
  });

  app.get("/api/products/barcode/:barcode", async (req, res) => {
    try {
      const product = await storage.getProductByBarcode(req.params.barcode);
      if (!product) {
        return res.status(404).json({ error: "Product not found with this barcode" });
      }
      res.json(product);
    } catch (error) {
      handleError(res, "get product by barcode", error);
    }
  });

  /**
   * GAAP/IFRS Inventory Valuation API
   * 
   * Returns the total inventory value calculated as:
   * Sum of (stockQuantity × costPrice) for all products
   * 
   * This aligns with:
   * - GAAP ASC 330: Inventory valued at cost
   * - IFRS IAS 2: Inventories measured at lower of cost and NRV
   * 
   * Includes warnings for products with stock but no cost price.
   */
  app.get("/api/inventory/valuation", async (req, res) => {
    try {
      const valuation = await storage.getInventoryValuation();
      res.json(valuation);
    } catch (error) {
      handleError(res, "get inventory valuation", error);
    }
  });

  // CSV Export for products
  app.get("/api/products/export/csv", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const headers = ["id", "name", "category", "unitPrice", "costPrice", "weightPerUnit", "stockQuantity", "lowStockThreshold", "unit", "barcode"];
      const csvRows = [headers.join(",")];
      
      for (const product of products) {
        const row = headers.map(header => {
          const value = product[header as keyof typeof product];
          if (value === null || value === undefined) return "";
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        });
        csvRows.push(row.join(","));
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=products.csv");
      res.send(csvRows.join("\n"));
    } catch (error) {
      handleError(res, "export products", error);
    }
  });

  // CSV Import for products
  app.post("/api/products/import/csv", async (req, res) => {
    try {
      const { csvData } = csvImportSchema.parse(req.body);

      const lines = csvData.split("\n").filter((line: string) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have headers and at least one data row" });
      }

      const headers = lines[0].split(",").map((h: string) => h.trim());
      const results = { imported: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
          const productData: Record<string, any> = {};
          
          headers.forEach((header: string, index: number) => {
            if (header === "id") return; // Skip id for new products
            const value = values[index];
            if (header === "unitPrice" || header === "costPrice" || header === "weightPerUnit") {
              productData[header] = parseFloat(value) || 0;
            } else if (header === "stockQuantity" || header === "lowStockThreshold") {
              productData[header] = parseInt(value) || 0;
            } else if (value) {
              productData[header] = value;
            }
          });

          if (productData.name && productData.category && productData.unitPrice !== undefined) {
            await storage.createProduct(productData as any);
            results.imported++;
          } else {
            results.errors.push(`Row ${i + 1}: Missing required fields (name, category, unitPrice)`);
          }
        } catch (rowError) {
          results.errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : "Unknown error"}`);
        }
      }

      res.json(results);
    } catch (error) {
      handleError(res, "import products", error);
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      handleError(res, "get invoices", error);
    }
  });

  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextInvoiceNumber();
      res.json({ nextNumber });
    } catch (error) {
      handleError(res, "get next invoice number", error);
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }
      res.json(invoice);
    } catch (error) {
      handleError(res, "get invoice", error);
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      console.log("[POST /api/invoices] Received:", JSON.stringify(req.body));
      const { invoice, items } = req.body;
      
      if (!invoice) {
        return res.status(400).json({ error: "Missing invoice data" });
      }
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing or invalid items array" });
      }
      
      const invoiceData = insertInvoiceSchema.parse(invoice);
      
      // SERVER-SIDE ENFORCEMENT: Auto-detect and set invoiceType based on prefix/role
      // This prevents fabrication invoices from being misclassified as SALE
      let enforedInvoiceType = invoiceData.invoiceType || 'SALE';
      if (invoiceData.invoiceNumber?.startsWith('FAB-')) {
        enforedInvoiceType = 'FABRICATION';
      } else if (invoiceData.role?.toLowerCase().includes('fabrication')) {
        enforedInvoiceType = 'FABRICATION';
      }
      
      const invoiceWithType = { ...invoiceData, invoiceType: enforedInvoiceType };
      const itemsData = z.array(insertInvoiceItemSchema).parse(items);
      const created = await storage.createInvoice(invoiceWithType, itemsData);
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "create",
          entity: "invoice",
          entityId: created.id,
          details: JSON.stringify({ invoiceNumber: created.invoiceNumber, type: enforedInvoiceType }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(201).json(created);
    } catch (error) {
      handleError(res, "create invoice", error);
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid status", 
          details: "Status must be one of: pending, paid, cancelled",
          received: req.body.status
        });
      }
      
      const invoice = await storage.updateInvoiceStatus(req.params.id, parsed.data.status);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }
      res.json(invoice);
    } catch (error) {
      handleError(res, "update invoice status", error);
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete invoice", error);
    }
  });

  app.post("/api/invoices/:id/duplicate", async (req, res) => {
    try {
      const originalInvoice = await storage.getInvoiceWithItems(req.params.id);
      if (!originalInvoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }
      
      const nextNumber = await storage.getNextInvoiceNumber();
      const today = new Date().toISOString().split("T")[0];
      
      const newInvoice = {
        invoiceNumber: nextNumber,
        invoiceType: originalInvoice.invoiceType || 'SALE',
        date: today,
        responsible: originalInvoice.responsible,
        clientName: originalInvoice.clientName,
        paymentMode: originalInvoice.paymentMode,
        totalHT: originalInvoice.totalHT,
        status: "pending" as const,
        tvaAmount: originalInvoice.tvaAmount,
        totalTTC: originalInvoice.totalTTC,
        applyTva: originalInvoice.applyTva,
        tvaRate: originalInvoice.tvaRate,
        totalWeight: originalInvoice.totalWeight,
        role: originalInvoice.role,
      };
      
      const newItems = originalInvoice.items.map((item) => ({
        productId: item.productId,
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        weightPerUnit: item.weightPerUnit,
        totalWeight: item.totalWeight,
        total: item.total,
      }));
      
      const created = await storage.createInvoice(newInvoice, newItems);
      res.status(201).json(created);
    } catch (error) {
      handleError(res, "duplicate invoice", error);
    }
  });

  // Invoice Payments API
  app.get("/api/invoices/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getInvoicePayments(req.params.id);
      const paidAmount = await storage.getInvoicePaidAmount(req.params.id);
      res.json({ payments, paidAmount });
    } catch (error) {
      handleError(res, "get invoice payments", error);
    }
  });

  app.post("/api/invoices/:id/payments", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found", id: req.params.id });
      }
      
      // Validate payment amount
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid payment amount" });
      }
      
      // Check remaining balance
      const currentPaid = await storage.getInvoicePaidAmount(req.params.id);
      const remaining = invoice.totalTTC - currentPaid;
      if (amount > remaining + 0.01) { // Allow small rounding tolerance
        return res.status(400).json({ 
          error: "Payment exceeds remaining balance", 
          remaining: remaining 
        });
      }
      
      // Validate payment method
      const validMethods = ['cash', 'cheque', 'virement', 'carte'];
      if (!validMethods.includes(req.body.paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
      }
      
      const data = insertInvoicePaymentSchema.parse({
        ...req.body,
        amount: amount,
        invoiceId: req.params.id,
        createdAt: new Date().toISOString(),
      });
      
      const payment = await storage.createInvoicePayment(data);
      
      const paidAmount = await storage.getInvoicePaidAmount(req.params.id);
      if (paidAmount >= invoice.totalTTC - 0.01) {
        await storage.updateInvoiceStatus(req.params.id, "paid");
      } else if (paidAmount > 0 && invoice.status === "pending") {
        await storage.updateInvoiceStatus(req.params.id, "unpaid");
      }
      
      res.status(201).json(payment);
    } catch (error) {
      handleError(res, "create invoice payment", error);
    }
  });

  app.delete("/api/invoices/:invoiceId/payments/:paymentId", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoicePayment(req.params.paymentId);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found", id: req.params.paymentId });
      }
      
      const invoice = await storage.getInvoice(req.params.invoiceId);
      if (invoice) {
        const paidAmount = await storage.getInvoicePaidAmount(req.params.invoiceId);
        if (paidAmount >= invoice.totalTTC) {
          await storage.updateInvoiceStatus(req.params.invoiceId, "paid");
        } else if (paidAmount > 0) {
          await storage.updateInvoiceStatus(req.params.invoiceId, "unpaid");
        } else {
          await storage.updateInvoiceStatus(req.params.invoiceId, "pending");
        }
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete invoice payment", error);
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      handleError(res, "get sales", error);
    }
  });

  // Sale lookup by ticket number (must be before :id route)
  app.get("/api/sales/lookup", async (req, res) => {
    try {
      const saleNumber = req.query.saleNumber as string;
      if (!saleNumber) {
        return res.status(400).json({ error: "saleNumber query parameter is required" });
      }
      const sale = await storage.getSaleByNumber(saleNumber);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found with this ticket number" });
      }
      const saleWithItems = await storage.getSaleWithItems(sale.id);
      if (!saleWithItems) {
        return res.status(404).json({ error: "Sale not found" });
      }
      const returnedQuantities = await storage.getReturnedQuantities(sale.id);
      res.json({ ...saleWithItems, returnedQuantities });
    } catch (error) {
      handleError(res, "lookup sale by number", error);
    }
  });

  // CSV Export (must be before :id route)
  app.get("/api/sales/export/csv", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const csvHeader = "Sale Number,Date,Payment Mode,Status,Discount,Total,Customer Name,Customer Phone\n";
      const csvRows = sales.map(sale => 
        `"${sale.saleNumber}","${sale.date}","${sale.paymentMode}","${sale.status || 'completed'}","${sale.discount || 0}","${sale.total}","${sale.customerName || ''}","${sale.customerPhone || ''}"`
      ).join("\n");
      const csv = csvHeader + csvRows;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=sales_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      handleError(res, "export sales csv", error);
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }
      res.json(sale);
    } catch (error) {
      handleError(res, "get sale", error);
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      console.log("[POST /api/sales] Received:", JSON.stringify(req.body));
      const { sale, items } = req.body;
      
      if (!sale) {
        return res.status(400).json({ error: "Missing sale data" });
      }
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing or invalid items array" });
      }
      
      const saleData = insertSaleSchema.parse(sale);
      const itemsData = z.array(insertSaleItemSchema).parse(items);

      if (saleData.walletId && (saleData.amountPaid || 0) > 0) {
        const wallets = await storage.getPaymentWallets();
        const wallet = wallets.find(w => w.id === saleData.walletId && w.isActive);
        if (!wallet) {
          return res.status(400).json({ error: "Selected wallet not found or inactive" });
        }
      }

      const created = await storage.createSale(saleData, itemsData);
      if (saleData.walletId && (saleData.amountPaid || 0) > 0) {
        try {
          await storage.creditWalletBalance(saleData.walletId, saleData.amountPaid || 0);
        } catch (e) {
          console.error("[POST /api/sales] Failed to credit wallet:", e);
        }
      }
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "create",
          entity: "sale",
          entityId: created.id,
          details: JSON.stringify({ total: created.totalAmount, items: itemsData.length, walletId: saleData.walletId || null }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(201).json(created);
    } catch (error) {
      handleError(res, "create sale", error);
    }
  });

  app.get("/api/sales/:id/receipt", async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }

      // Fetch reseller info if sale has a resellerId
      let reseller = null;
      if (sale.resellerId) {
        reseller = await storage.getReseller(sale.resellerId);
      }

      let storeSettings: any = null;
      try {
        storeSettings = await storage.getStoreSettings();
      } catch (e) {}

      let branding: any = { primaryColor: "#C9A84C" };
      try {
        const brandingJson = await storage.getSetting("branding");
        if (brandingJson) {
          branding = JSON.parse(brandingJson);
        }
      } catch (e) {}

      let logoDataUrl = '';
      if (req.query.logo) {
        logoDataUrl = sanitizeUrl(req.query.logo as string);
      } else if (storeSettings?.logoUrl) {
        const sUrl = storeSettings.logoUrl;
        if (/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/i.test(sUrl) || /^https:\/\//i.test(sUrl)) {
          logoDataUrl = sUrl;
        }
      } else if (branding.logo) {
        logoDataUrl = sanitizeUrl(branding.logo);
      } else {
        try {
          const logoPath = path.resolve('attached_assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png');
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          }
        } catch (e) {}
      }

      const sanitizedQuery = {
        logo: logoDataUrl,
        primaryColor: sanitizeColor((req.query.primaryColor as string) || branding.primaryColor || '#C9A84C'),
      };
      const html = generateReceiptHTML(sale, sanitizedQuery, reseller, storeSettings);
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      handleError(res, "generate receipt", error);
    }
  });

  app.patch("/api/sales/:id/status", async (req, res) => {
    try {
      const { status } = saleStatusSchema.parse(req.body);
      const updated = await storage.updateSaleStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }
      res.json(updated);
    } catch (error) {
      handleError(res, "update sale status", error);
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSale(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "delete",
          entity: "sale",
          entityId: req.params.id,
          details: null,
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete sale", error);
    }
  });

  app.put("/api/sales/:id/edit", async (req, res) => {
    try {
      const { items, discount, deliveryCost, customerName, customerPhone } = saleEditSchema.parse(req.body);

      const existingSale = await storage.getSale(req.params.id);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const newTotal = Math.round(items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) * 100) / 100;
      const dc = deliveryCost || existingSale.deliveryCost || 0;
      const finalTotal = Math.round((newTotal - (discount || 0) + dc) * 100) / 100;

      const amountPaid = existingSale.amountPaid || 0;
      let newStatus = existingSale.status;
      if (amountPaid >= finalTotal) {
        newStatus = "completed";
      } else if (amountPaid > 0) {
        newStatus = "partial";
      } else if (existingSale.status === "completed") {
        newStatus = "completed";
      }

      const saleData: any = {
        total: finalTotal,
        discount: discount || 0,
        deliveryCost: dc,
        status: newStatus,
      };
      if (customerName !== undefined) saleData.customerName = customerName;
      if (customerPhone !== undefined) saleData.customerPhone = customerPhone;

      const saleItems = items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: 0,
        total: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));

      const updated = await storage.updateSaleWithItems(req.params.id, saleData, saleItems);
      if (!updated) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(updated);
    } catch (error) {
      handleError(res, "edit sale with items", error);
    }
  });

  // Update sale (for partial payments)
  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const data = saleUpdateSchema.parse(req.body);
      const updated = await storage.updateSale(req.params.id, data);
      if (!updated) {
        return res.status(404).json({ error: "Sale not found", id: req.params.id });
      }
      res.json(updated);
    } catch (error) {
      handleError(res, "update sale", error);
    }
  });

  // Sale payments for partial payment tracking
  app.get("/api/sales/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getSalePayments(req.params.id);
      res.json(payments);
    } catch (error) {
      handleError(res, "get sale payments", error);
    }
  });

  app.post("/api/sales/:id/payments", async (req, res) => {
    try {
      const { amount, paymentMethod, reference, notes } = salePaymentInputSchema.parse(req.body);

      const sale = await storage.getSale(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const today = new Date();
      const paymentDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      const payment = await storage.createSalePayment({
        saleId: req.params.id,
        amount,
        paymentDate,
        paymentMethod: paymentMethod || "CASH",
        reference: reference || null,
        notes: notes || null,
        createdAt: today.toISOString(),
      });

      // Update sale's amountPaid and status
      const newAmountPaid = (sale.amountPaid || 0) + amount;
      const remaining = sale.total - newAmountPaid;
      let newStatus = sale.status;
      
      if (remaining <= 0) {
        newStatus = "completed";
      } else if (newAmountPaid > 0) {
        newStatus = "partial";
      }

      await storage.updateSale(req.params.id, {
        amountPaid: Math.round(newAmountPaid * 100) / 100,
        status: newStatus,
      });

      res.status(201).json(payment);
    } catch (error) {
      handleError(res, "create sale payment", error);
    }
  });

  app.get("/api/sales/:id/returns", async (req, res) => {
    try {
      const returns = await storage.getSaleReturns(req.params.id);
      res.json(returns);
    } catch (error) {
      handleError(res, "get sale returns", error);
    }
  });

  app.post("/api/sales/:id/returns", async (req, res) => {
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const { items, reason } = z.object({
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        })).min(1),
        reason: z.string().max(500).nullable().optional(),
      }).parse(req.body);

      const saleWithItems = await storage.getSaleWithItems(req.params.id);
      if (!saleWithItems) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const returnedQuantities = await storage.getReturnedQuantities(req.params.id);

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: "Each item must have productId and positive quantity" });
        }
        const saleItem = saleWithItems.items.find((si: any) => si.productId === item.productId);
        if (!saleItem) {
          return res.status(400).json({ error: `Product ${item.productId} was not in this sale` });
        }
        const alreadyReturned = returnedQuantities[item.productId] || 0;
        const maxReturnable = saleItem.quantity - alreadyReturned;
        if (item.quantity > maxReturnable) {
          return res.status(400).json({ error: `Cannot return more than ${maxReturnable} of ${saleItem.productName}` });
        }
      }

      const returnNumber = await storage.getNextReturnNumber();
      const now = new Date();
      const returnDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const returnItems: any[] = items.map((item: any) => {
        const saleItem = saleWithItems.items.find((si: any) => si.productId === item.productId)!;
        return {
          productId: item.productId,
          productName: saleItem.productName,
          quantity: item.quantity,
          unitPrice: saleItem.unitPrice,
          total: Math.round(item.quantity * saleItem.unitPrice * 100) / 100,
        };
      });

      const totalRefund = returnItems.reduce((sum: number, i: any) => sum + i.total, 0);

      const returnData = {
        saleId: req.params.id,
        returnNumber,
        returnDate,
        totalRefund: Math.round(totalRefund * 100) / 100,
        reason: reason || null,
        createdBy: (req.session as any)?.userId || 'system',
        createdAt: now.toISOString(),
      };

      const result = await storage.processReturn(req.params.id, returnData, returnItems);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, "process sale return", error);
    }
  });

  app.get("/api/returns/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextReturnNumber();
      res.json({ returnNumber: nextNumber });
    } catch (error) {
      handleError(res, "get next return number", error);
    }
  });

  app.get("/api/invoices/export/csv", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      const csvHeader = "Invoice Number,Date,Client Name,Responsible,Status,TVA Rate,Total HT,Total TTC\n";
      const csvRows = invoices.map(inv => 
        `"${inv.invoiceNumber}","${inv.date}","${inv.clientName || ''}","${inv.responsible}","${inv.status}","${inv.tvaRate || 0}%","${inv.totalHT}","${inv.totalTTC}"`
      ).join("\n");
      const csv = csvHeader + csvRows;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      handleError(res, "export invoices csv", error);
    }
  });

  app.get("/api/resellers", async (req, res) => {
    try {
      const resellers = await storage.getResellers();
      res.json(resellers);
    } catch (error) {
      handleError(res, "get resellers", error);
    }
  });

  app.get("/api/resellers/summaries", async (req, res) => {
    try {
      const allSales = await storage.getSales();
      const resellers = await storage.getResellers();
      const summaries: Record<string, { unpaidCount: number; totalUnpaid: number }> = {};
      for (const r of resellers) {
        summaries[r.id] = { unpaidCount: 0, totalUnpaid: 0 };
      }
      for (const sale of allSales) {
        if (sale.resellerId && summaries[sale.resellerId]) {
          const remaining = Math.max(0, (sale.total || 0) - (sale.amountPaid || 0));
          if (sale.status === "partial" || sale.status === "credit" || remaining > 0.01) {
            summaries[sale.resellerId].unpaidCount++;
            summaries[sale.resellerId].totalUnpaid += remaining;
          }
        }
      }
      res.json(summaries);
    } catch (error) {
      handleError(res, "get reseller summaries", error);
    }
  });

  app.get("/api/resellers/:id/sales", async (req, res) => {
    try {
      const reseller = await storage.getReseller(req.params.id);
      if (!reseller) {
        return res.status(404).json({ error: "Reseller not found" });
      }
      const allSales = await storage.getSales();
      const resellerSales = allSales
        .filter((s) => s.resellerId === req.params.id)
        .map((s) => ({
          ...s,
          remaining: Math.max(0, (s.total || 0) - (s.amountPaid || 0)),
        }));
      const unpaidSales = resellerSales.filter(
        (s) => s.status === "partial" || s.status === "credit" || s.remaining > 0.01
      );
      const summary = {
        totalSalesCount: resellerSales.length,
        unpaidCount: unpaidSales.length,
        totalAmount: resellerSales.reduce((sum, s) => sum + (s.total || 0), 0),
        totalPaid: resellerSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0),
        totalUnpaid: unpaidSales.reduce((sum, s) => sum + s.remaining, 0),
      };
      res.json({ reseller, sales: resellerSales, summary });
    } catch (error) {
      handleError(res, "get reseller sales", error);
    }
  });

  app.get("/api/resellers/:id", async (req, res) => {
    try {
      const reseller = await storage.getReseller(req.params.id);
      if (!reseller) {
        return res.status(404).json({ error: "Reseller not found", id: req.params.id });
      }
      res.json(reseller);
    } catch (error) {
      handleError(res, "get reseller", error);
    }
  });

  app.post("/api/resellers", async (req, res) => {
    try {
      console.log("[POST /api/resellers] Received:", JSON.stringify(req.body));
      const data = insertResellerSchema.parse(req.body);
      const reseller = await storage.createReseller(data);
      res.status(201).json(reseller);
    } catch (error) {
      handleError(res, "create reseller", error);
    }
  });

  app.patch("/api/resellers/:id", async (req, res) => {
    try {
      const data = insertResellerSchema.partial().parse(req.body);
      const reseller = await storage.updateReseller(req.params.id, data);
      if (!reseller) {
        return res.status(404).json({ error: "Reseller not found", id: req.params.id });
      }
      res.json(reseller);
    } catch (error) {
      handleError(res, "update reseller", error);
    }
  });

  app.delete("/api/resellers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReseller(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Reseller not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete reseller", error);
    }
  });

  app.post("/api/resellers/draw-winner", async (req, res) => {
    try {
      const winner = await storage.drawWinner();
      if (!winner) {
        return res.status(400).json({ 
          error: "No eligible resellers", 
          details: "No resellers in the reward pool are eligible for drawing"
        });
      }
      res.json(winner);
    } catch (error) {
      handleError(res, "draw winner", error);
    }
  });

  app.post("/api/resellers/reset-pool", async (req, res) => {
    try {
      await storage.resetRewardPool();
      res.status(204).send();
    } catch (error) {
      handleError(res, "reset reward pool", error);
    }
  });

  app.post("/api/resellers/reset-thresholds", requireAdmin, async (req, res) => {
    try {
      await storage.resetAllThresholds();
      res.status(204).send();
    } catch (error) {
      handleError(res, "reset all thresholds", error);
    }
  });

  // ===================== ADMIN-ONLY ROUTES =====================
  // Employees, Salary Payments, Expenses, Profit Stats - require admin role
  app.use("/api/employees", requireAdmin);
  app.use("/api/salary-payments", requireAdmin);
  app.use("/api/expenses", requireAdmin);
  app.use("/api/profit-stats", requireAdmin);

  app.get("/api/employees", async (req, res) => {
    try {
      const allEmployees = await storage.getEmployees();
      res.json(allEmployees);
    } catch (error) {
      handleError(res, "get employees", error);
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found", id: req.params.id });
      }
      res.json(employee);
    } catch (error) {
      handleError(res, "get employee", error);
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      console.log("[POST /api/employees] Received:", JSON.stringify(req.body));
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      handleError(res, "create employee", error);
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, data);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found", id: req.params.id });
      }
      res.json(employee);
    } catch (error) {
      handleError(res, "update employee", error);
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete employee", error);
    }
  });

  app.get("/api/salary-payments", async (req, res) => {
    try {
      const payments = await storage.getSalaryPayments();
      res.json(payments);
    } catch (error) {
      handleError(res, "get salary payments", error);
    }
  });

  app.post("/api/salary-payments", async (req, res) => {
    try {
      console.log("[POST /api/salary-payments] Received:", JSON.stringify(req.body));
      const data = insertSalaryPaymentSchema.parse(req.body);
      const payment = await storage.createSalaryPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      handleError(res, "create salary payment", error);
    }
  });

  app.delete("/api/salary-payments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSalaryPayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Salary payment not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete salary payment", error);
    }
  });

  app.get("/api/expenses", async (req, res) => {
    try {
      const allExpenses = await storage.getExpenses();
      res.json(allExpenses);
    } catch (error) {
      handleError(res, "get expenses", error);
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found", id: req.params.id });
      }
      res.json(expense);
    } catch (error) {
      handleError(res, "get expense", error);
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      console.log("[POST /api/expenses] Received:", JSON.stringify(req.body));
      const data = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(data);
      try {
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          username: req.session?.username || "system",
          action: "create",
          entity: "expense",
          entityId: expense.id,
          details: JSON.stringify({ category: expense.category, amount: expense.amount }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
      res.status(201).json(expense);
    } catch (error) {
      handleError(res, "create expense", error);
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const data = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, data);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found", id: req.params.id });
      }
      res.json(expense);
    } catch (error) {
      handleError(res, "update expense", error);
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete expense", error);
    }
  });

  // Customer API
  app.get("/api/customers", async (req, res) => {
    try {
      const customerList = await storage.getCustomers();
      res.json(customerList);
    } catch (error) {
      handleError(res, "get customers", error);
    }
  });

  app.get("/api/customers/:id/portal-token", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      const token = crypto
        .createHash("sha256")
        .update(req.params.id + process.env.SESSION_SECRET!)
        .digest("hex")
        .substring(0, 16);
      res.json({ token, url: `/portal/${req.params.id}?token=${token}` });
    } catch (error) {
      handleError(res, "getPortalToken", error);
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found", id: req.params.id });
      }
      res.json(customer);
    } catch (error) {
      handleError(res, "get customer", error);
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      // Map snake_case from frontend to camelCase for Drizzle schema
      const mappedData = {
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        address: req.body.address || null,
        creditLimit: parseFloat(req.body.credit_limit) || parseFloat(req.body.creditLimit) || 0,
        currentBalance: 0,
        notes: req.body.notes || null,
        createdAt: new Date().toISOString(),
      };
      const data = insertCustomerSchema.parse(mappedData);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      handleError(res, "create customer", error);
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      // Map snake_case from frontend to camelCase for Drizzle schema
      const mappedData: Record<string, any> = {};
      if (req.body.name !== undefined) mappedData.name = req.body.name;
      if (req.body.phone !== undefined) mappedData.phone = req.body.phone;
      if (req.body.email !== undefined) mappedData.email = req.body.email;
      if (req.body.address !== undefined) mappedData.address = req.body.address;
      if (req.body.credit_limit !== undefined) mappedData.creditLimit = parseFloat(req.body.credit_limit);
      if (req.body.creditLimit !== undefined) mappedData.creditLimit = parseFloat(req.body.creditLimit);
      if (req.body.notes !== undefined) mappedData.notes = req.body.notes;
      
      const data = insertCustomerSchema.partial().parse(mappedData);
      const customer = await storage.updateCustomer(req.params.id, data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found", id: req.params.id });
      }
      res.json(customer);
    } catch (error) {
      handleError(res, "update customer", error);
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete customer", error);
    }
  });

  app.patch("/api/customers/:id/balance", async (req, res) => {
    try {
      const { amount } = customerBalanceSchema.parse(req.body);
      const customer = await storage.updateCustomerBalance(req.params.id, amount);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found", id: req.params.id });
      }
      res.json(customer);
    } catch (error) {
      handleError(res, "update customer balance", error);
    }
  });

  app.get("/api/fabrication-invoices", async (req, res) => {
    try {
      const fabricationInvoices = await storage.getFabricationInvoices();
      res.json(fabricationInvoices);
    } catch (error) {
      handleError(res, "get fabrication invoices", error);
    }
  });

  app.get("/api/fabrication-invoices/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextFabricationNumber();
      res.json({ nextNumber });
    } catch (error) {
      handleError(res, "get next fabrication number", error);
    }
  });

  app.get("/api/fabrication-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getFabricationInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Fabrication invoice not found", id: req.params.id });
      }
      res.json(invoice);
    } catch (error) {
      handleError(res, "get fabrication invoice", error);
    }
  });

  app.post("/api/fabrication-invoices", async (req, res) => {
    try {
      console.log("[POST /api/fabrication-invoices] Received:", JSON.stringify(req.body));
      const { invoice, items } = req.body;
      
      if (!invoice) {
        return res.status(400).json({ error: "Missing invoice data" });
      }
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing or invalid items array" });
      }
      
      const invoiceData = insertFabricationInvoiceSchema.parse(invoice);
      const itemsData = z.array(insertFabricationItemSchema).parse(items);
      const created = await storage.createFabricationInvoice(invoiceData, itemsData);
      res.status(201).json(created);
    } catch (error) {
      handleError(res, "create fabrication invoice", error);
    }
  });

  app.delete("/api/fabrication-invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFabricationInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Fabrication invoice not found", id: req.params.id });
      }
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete fabrication invoice", error);
    }
  });

  app.get("/api/profit-stats", async (req, res) => {
    try {
      const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const endDate = (req.query.endDate as string) || new Date().toISOString().split("T")[0];
      const stats = await storage.getProfitStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      handleError(res, "get profit stats", error);
    }
  });

  // Backup/Restore API (Admin only)
  app.get("/api/backup", requireAdmin, async (req, res) => {
    try {
      const backup = await storage.exportAllData();
      const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backup);
    } catch (error) {
      handleError(res, "export backup", error);
    }
  });

  app.post("/api/restore", requireAdmin, async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: "Invalid backup data" });
      }
      
      // Validate backup structure
      const backupData = data.data || data;
      const allowedTables = ['products', 'customers', 'resellers', 'employees', 'expenses'];
      const validatedData: Record<string, any[]> = {};
      
      for (const table of allowedTables) {
        if (backupData[table] && Array.isArray(backupData[table])) {
          // Filter out any entries with invalid or suspicious fields
          validatedData[table] = backupData[table].filter((item: any) => 
            item && typeof item === 'object' && !Array.isArray(item)
          );
        }
      }
      
      const result = await storage.importAllData({ data: validatedData });
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, "restore backup", error);
    }
  });

  // ===================== CUSTOMER PORTAL (PUBLIC with token) =====================
  app.get("/api/portal/:customerId", async (req, res) => {
    try {
      const token = req.query.token as string;
      const expectedToken = crypto
        .createHash("sha256")
        .update(req.params.customerId + process.env.SESSION_SECRET!)
        .digest("hex")
        .substring(0, 16);
      if (!token || token !== expectedToken) {
        return res.status(403).json({ error: "Invalid or missing portal token" });
      }

      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const allSales = await storage.getSales();
      const allInvoices = await storage.getInvoices();

      const customerSales = allSales.filter(
        (s) =>
          s.customerName &&
          s.customerName.toLowerCase() === customer.name.toLowerCase()
      );
      const customerInvoices = allInvoices.filter(
        (inv) =>
          inv.clientName &&
          inv.clientName.toLowerCase() === customer.name.toLowerCase()
      );

      const transactions: any[] = [];
      for (const s of customerSales) {
        transactions.push({
          id: s.id,
          type: "sale",
          date: s.date,
          reference: s.saleNumber,
          total: s.total || 0,
          amountPaid: s.amountPaid || 0,
          status: s.status,
          paymentMode: s.paymentMode,
        });
      }
      for (const inv of customerInvoices) {
        transactions.push({
          id: inv.id,
          type: "invoice",
          date: inv.date,
          reference: inv.invoiceNumber,
          total: inv.totalTTC || 0,
          amountPaid: inv.amountPaid || 0,
          status: inv.status,
          paymentMode: inv.paymentMode,
        });
      }
      transactions.sort((a, b) => b.date.localeCompare(a.date));

      let branding: any = { primaryColor: "#1976D2" };
      try {
        const brandingJson = await storage.getSetting("branding");
        if (brandingJson) branding = JSON.parse(brandingJson);
      } catch {}

      res.json({
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          creditLimit: customer.creditLimit,
          currentBalance: customer.currentBalance,
        },
        transactions,
        branding,
      });
    } catch (error) {
      handleError(res, "getCustomerPortal", error);
    }
  });

  // ===================== GLOBAL SEARCH =====================
  app.get("/api/search", requireAuth, async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").toLowerCase().trim();
      if (!q || q.length < 2) return res.json({ results: [] });

      const [products, customers, invoices, sales, resellers] = await Promise.all([
        storage.getProducts(),
        storage.getCustomers(),
        storage.getInvoices(),
        storage.getSales(),
        storage.getResellers(),
      ]);

      const results: any[] = [];

      for (const p of products) {
        if (
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
        ) {
          results.push({ type: "product", id: p.id, title: p.name, subtitle: `${p.category} · ${p.stockQuantity} en stock`, url: "/emanager-portal/stock" });
        }
        if (results.length >= 20) break;
      }

      for (const c of customers) {
        if (
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
        ) {
          results.push({ type: "customer", id: c.id, title: c.name, subtitle: c.phone || c.email || "", url: "/customers" });
        }
        if (results.length >= 30) break;
      }

      for (const r of resellers) {
        if (
          r.name.toLowerCase().includes(q) ||
          (r.phone && r.phone.toLowerCase().includes(q))
        ) {
          results.push({ type: "reseller", id: r.id, title: r.name, subtitle: `Revendeur · ${(r.totalPurchases || 0).toLocaleString()} MRU`, url: "/resellers" });
        }
        if (results.length >= 35) break;
      }

      for (const inv of invoices) {
        if (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.clientName && inv.clientName.toLowerCase().includes(q))
        ) {
          results.push({ type: "invoice", id: inv.id, title: inv.invoiceNumber, subtitle: inv.clientName || "—", url: `/invoices/${inv.id}` });
        }
        if (results.length >= 45) break;
      }

      for (const s of sales) {
        if (
          s.saleNumber.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q))
        ) {
          results.push({ type: "sale", id: s.id, title: s.saleNumber, subtitle: s.customerName || "POS", url: "/sales" });
        }
        if (results.length >= 50) break;
      }

      res.json({ results: results.slice(0, 50) });
    } catch (error) {
      handleError(res, "globalSearch", error);
    }
  });

  // ===================== NOTIFICATIONS =====================
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const [products, invoices, sales, customers] = await Promise.all([
        storage.getProducts(),
        storage.getInvoices(),
        storage.getSales(),
        storage.getCustomers(),
      ]);

      const notifications: any[] = [];
      const now = new Date().toISOString().split("T")[0];

      for (const p of products) {
        if (p.stockQuantity <= p.lowStockThreshold) {
          notifications.push({
            id: `low-stock-${p.id}`,
            type: "low_stock",
            severity: p.stockQuantity === 0 ? "critical" : "warning",
            title: p.stockQuantity === 0 ? "Rupture de stock" : "Stock bas",
            message: `${p.name}: ${p.stockQuantity} restant(s) (seuil: ${p.lowStockThreshold})`,
            date: now,
            link: "/emanager-portal/stock",
          });
        }
      }

      for (const inv of invoices) {
        if (inv.status === "pending" || inv.status === "partial") {
          const isPastDue = inv.dueDate && inv.dueDate < now;
          if (isPastDue) {
            notifications.push({
              id: `overdue-${inv.id}`,
              type: "overdue_invoice",
              severity: "critical",
              title: "Facture en retard",
              message: `${inv.invoiceNumber} — ${inv.clientName || "Client"} · ${(inv.totalTTC || 0).toLocaleString()} MRU`,
              date: inv.dueDate,
              link: `/invoices/${inv.id}`,
            });
          }
        }
      }

      for (const c of customers) {
        if (c.currentBalance > c.creditLimit && c.creditLimit > 0) {
          notifications.push({
            id: `credit-exceeded-${c.id}`,
            type: "credit_exceeded",
            severity: "warning",
            title: "Limite de crédit dépassée",
            message: `${c.name}: ${c.currentBalance.toLocaleString()} / ${c.creditLimit.toLocaleString()} MRU`,
            date: now,
            link: "/customers",
          });
        }
      }

      notifications.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 };
        return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2);
      });

      res.json({ notifications, count: notifications.length });
    } catch (error) {
      handleError(res, "getNotifications", error);
    }
  });

  // ===================== PRODUCT FAVORITES TOGGLE =====================
  app.patch("/api/products/:id/favorite", requireAuth, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      const updated = await storage.updateProduct(req.params.id, { isFavorite: !product.isFavorite });
      res.json(updated);
    } catch (error) {
      handleError(res, "toggleFavorite", error);
    }
  });

  // ===================== DASHBOARD WITH PERIOD FILTERING =====================
  app.get("/api/dashboard/stats-filtered", requireAuth, async (req, res) => {
    try {
      const period = (req.query.period as string) || "month";
      const customStart = req.query.start as string;
      const customEnd = req.query.end as string;

      const now = new Date();
      let startDate: string;
      let endDate: string = now.toISOString().split("T")[0];

      switch (period) {
        case "today":
          startDate = endDate;
          break;
        case "week": {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay());
          startDate = d.toISOString().split("T")[0];
          break;
        }
        case "year": {
          startDate = `${now.getFullYear()}-01-01`;
          break;
        }
        case "custom": {
          startDate = customStart || endDate;
          endDate = customEnd || endDate;
          break;
        }
        default: {
          startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          break;
        }
      }

      const [allSales, allInvoices, allExpenses, allCustomers] = await Promise.all([
        storage.getSales(),
        storage.getInvoices(),
        storage.getExpenses(),
        storage.getCustomers(),
      ]);

      const filteredSales = allSales.filter((s) => s.date >= startDate && s.date <= endDate);
      const filteredInvoices = allInvoices.filter((inv) => inv.date >= startDate && inv.date <= endDate);
      const filteredExpenses = allExpenses.filter((e) => e.date >= startDate && e.date <= endDate);

      const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0)
        + filteredInvoices.filter((i) => i.invoiceType === "SALE").reduce((sum, i) => sum + (i.totalTTC || 0), 0);
      const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const salesCount = filteredSales.length;
      const avgOrderValue = salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0;

      const outstandingCredit = allCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

      let topCustomerName = "—";
      let topCustomerAmount = 0;
      const customerTotals: Record<string, number> = {};
      for (const s of filteredSales) {
        const name = s.customerName || "Walk-in";
        customerTotals[name] = (customerTotals[name] || 0) + (s.total || 0);
      }
      for (const [name, total] of Object.entries(customerTotals)) {
        if (total > topCustomerAmount) {
          topCustomerAmount = total;
          topCustomerName = name;
        }
      }

      res.json({
        period,
        startDate,
        endDate,
        totalRevenue,
        totalExpenses: totalExpensesAmt,
        netIncome: totalRevenue - totalExpensesAmt,
        salesCount,
        invoicesCount: filteredInvoices.length,
        avgOrderValue,
        outstandingCredit,
        topCustomer: { name: topCustomerName, amount: topCustomerAmount },
      });
    } catch (error) {
      handleError(res, "getDashboardStatsFiltered", error);
    }
  });

  // ==========================================
  // PUBLIC STORE API ROUTES (no auth required)
  // ==========================================

  app.get("/api/store/deals", async (req: Request, res: Response) => {
    try {
      const products = await storage.getStoreProducts();
      const deals = products.filter((p: any) => p.isDealOfDay && p.dealDiscount > 0);
      res.json(deals);
    } catch (error) {
      handleError(res, "getStoreDeals", error);
    }
  });

  app.get("/api/store/products", async (req: Request, res: Response) => {
    try {
      const products = await storage.getStoreProducts();
      res.json(products);
    } catch (error) {
      handleError(res, "getStoreProducts", error);
    }
  });

  app.get("/api/store/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.stockQuantity <= 0) {
        return res.status(404).json({ error: "Product not found or out of stock" });
      }
      res.json(product);
    } catch (error) {
      handleError(res, "getStoreProduct", error);
    }
  });

  app.get("/api/store/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getStoreSettings();
      res.json(settings || {});
    } catch (error) {
      handleError(res, "getStoreSettings", error);
    }
  });

  app.get("/api/store/banners", async (req: Request, res: Response) => {
    try {
      const banners = await storage.getCmsBanners();
      res.json(banners.filter(b => b.isActive));
    } catch (error) {
      handleError(res, "getStoreBanners", error);
    }
  });

  app.get("/api/store/pages/:slug", async (req: Request, res: Response) => {
    try {
      const page = await storage.getCmsPage(req.params.slug);
      if (!page || !page.isPublished) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      handleError(res, "getStorePage", error);
    }
  });

  app.get("/api/store/recommendations", async (req: Request, res: Response) => {
    try {
      let email = "";
      const sc = (req.session as any)?.storeCustomer;
      if (sc?.email) {
        email = sc.email;
      } else if (typeof req.query.email === "string" && (req as any).session?.userId) {
        email = req.query.email;
      }
      const viewedIds = typeof req.query.viewedIds === "string" ? req.query.viewedIds.split(",").filter(Boolean) : [];
      const viewedCategories = typeof req.query.viewedCategories === "string" ? req.query.viewedCategories.split(",").filter(Boolean) : [];
      const limit = Math.min(parseInt(String(req.query.limit)) || 12, 30);
      const excludeId = typeof req.query.excludeId === "string" ? req.query.excludeId : "";

      const allProducts = await storage.getProducts();
      const activeProducts = allProducts.filter(p => (p.stockQuantity ?? 0) > 0);

      const purchasedProductIds = new Set<string>();
      const purchasedCategories = new Map<string, number>();
      const coBoughtMap = new Map<string, Set<string>>();

      if (email) {
        const allOrders = await storage.getStoreOrders();
        const customerOrders = allOrders.filter(o => o.customerEmail === email);

        for (const order of customerOrders) {
          try {
            const items = JSON.parse(order.items || "[]");
            const orderProductIds: string[] = [];
            for (const item of items) {
              const pid = item.productId || item.id;
              if (pid) {
                purchasedProductIds.add(pid);
                orderProductIds.push(pid);
                const product = allProducts.find(p => p.id === pid);
                if (product?.category) {
                  purchasedCategories.set(product.category, (purchasedCategories.get(product.category) || 0) + (item.quantity || 1));
                }
              }
            }
            for (const pid of orderProductIds) {
              if (!coBoughtMap.has(pid)) coBoughtMap.set(pid, new Set());
              for (const other of orderProductIds) {
                if (other !== pid) coBoughtMap.get(pid)!.add(other);
              }
            }
          } catch {}
        }
      }

      const scores = new Map<string, number>();
      const viewedIdSet = new Set(viewedIds);
      const excludeSet = new Set([...purchasedProductIds, ...viewedIds]);
      if (excludeId) excludeSet.add(excludeId);

      for (const product of activeProducts) {
        if (excludeSet.has(product.id)) continue;

        let score = 0;

        if (product.category && purchasedCategories.has(product.category)) {
          score += 5 * Math.min(purchasedCategories.get(product.category)!, 5);
        }

        for (const [, coBought] of coBoughtMap) {
          if (coBought.has(product.id)) {
            score += 3;
          }
        }

        if (product.category && viewedCategories.includes(product.category)) {
          score += 3;
        }

        if (product.isFavorite) score += 1;
        if (product.isDealOfDay) score += 2;

        scores.set(product.id, score);
      }

      try {
        const topCandidates = [...scores.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit * 2)
          .map(([id]) => id);
        const reviews = await Promise.all(
          topCandidates.map(async (pid) => {
            const r = await storage.getProductReviews(pid);
            return { pid, avg: r.length > 0 ? r.reduce((s, rv) => s + (rv.rating || 0), 0) / r.length : 0, count: r.length };
          })
        );
        for (const { pid, avg, count } of reviews) {
          if (avg >= 4 && count >= 1) {
            scores.set(pid, (scores.get(pid) || 0) + Math.min(avg * 0.5, 3));
          }
        }
      } catch {}

      const scored = [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      let results = scored.map(id => activeProducts.find(p => p.id === id)!).filter(Boolean);

      if (results.length < limit) {
        const resultIds = new Set(results.map(r => r.id));
        const fillers = activeProducts
          .filter(p => !resultIds.has(p.id) && !excludeSet.has(p.id))
          .sort((a, b) => {
            const aScore = (a.isFavorite ? 2 : 0) + (a.isDealOfDay ? 1 : 0);
            const bScore = (b.isFavorite ? 2 : 0) + (b.isDealOfDay ? 1 : 0);
            return bScore - aScore;
          })
          .slice(0, limit - results.length);
        results = [...results, ...fillers];
      }

      res.json(results);
    } catch (error) {
      handleError(res, "getRecommendations", error);
    }
  });

  app.post("/api/store/orders", async (req: Request, res: Response) => {
    try {
      const storeOrderInputSchema = z.object({
        customerName: z.string().min(1).max(200),
        customerEmail: z.string().email().max(200).nullable().optional(),
        customerPhone: z.string().max(50).nullable().optional(),
        customerAddress: z.string().max(500).nullable().optional(),
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        })).min(1),
        promoCode: z.string().max(100).nullable().optional(),
        deliveryCost: z.number().min(0).optional(),
        notes: z.string().max(2000).nullable().optional(),
        paymentMethod: z.string().max(100).nullable().optional(),
        paymentProof: z.string().max(8_000_000).nullable().optional(),
      });
      const { customerName, customerEmail, customerPhone, customerAddress, items, promoCode, deliveryCost, notes, paymentMethod, paymentProof } = storeOrderInputSchema.parse(req.body);

      let subtotal = 0;
      const validatedItems: { productId: string; productName: string; quantity: number; unitPrice: number }[] = [];
      for (const item of items) {
        if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          return res.status(400).json({ error: "Invalid item: each item needs a productId and positive integer quantity" });
        }
        const product = await storage.getProduct(item.productId);
        if (!product || product.stockQuantity < item.quantity) {
          return res.status(400).json({ error: `Product ${product?.name || item.productId} is out of stock or insufficient quantity` });
        }
        let effectivePrice = product.unitPrice;
        if (product.isDealOfDay && product.dealDiscount && product.dealDiscount > 0) {
          effectivePrice = Math.round(product.unitPrice * (1 - product.dealDiscount / 100) * 100) / 100;
        }
        validatedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, unitPrice: effectivePrice });
        subtotal += item.quantity * effectivePrice;
      }

      let discount = 0;
      if (promoCode) {
        const validation = await storage.validatePromoCode(promoCode, subtotal);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
        if (validation.promo) {
          if (validation.promo.discountType === "percentage") {
            discount = Math.round(subtotal * (validation.promo.discountValue / 100) * 100) / 100;
          } else {
            discount = validation.promo.discountValue;
          }
          await storage.applyPromoCode(promoCode);
        }
      }

      const total = Math.max(0, subtotal - discount + (deliveryCost || 0));
      const orderNumber = await storage.getNextOrderNumber();

      const order = await storage.createStoreOrder({
        orderNumber,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        items: JSON.stringify(validatedItems),
        subtotal,
        discount,
        promoCode: promoCode || null,
        deliveryCost: deliveryCost || 0,
        total,
        status: "pending",
        notes: notes || null,
        paymentMethod: paymentMethod || null,
        paymentProof: paymentProof || null,
      });

      if (customerEmail) {
        try {
          const existingCustomer = await storage.getStoreCustomerByEmail(customerEmail);
          if (!existingCustomer) {
            const guestPassword = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
            await storage.createStoreCustomer({
              email: customerEmail,
              password: guestPassword,
              fullName: customerName,
              phone: customerPhone || null,
              address: customerAddress || null,
              language: "en",
              isActive: true,
            });
          }
          await storage.createStoreNotification({
            customerEmail,
            customerId: null,
            orderNumber,
            type: "order_placed",
            title: `Order Placed - ${orderNumber}`,
            titleAr: `تم تقديم الطلب - ${orderNumber}`,
            titleFr: `Commande Passée - ${orderNumber}`,
            message: `Your order ${orderNumber} has been placed successfully. Total: ${total.toFixed(2)} MRU`,
            messageAr: `تم تقديم طلبكم ${orderNumber} بنجاح. المجموع: ${total.toFixed(2)} أوقية`,
            messageFr: `Votre commande ${orderNumber} a été passée avec succès. Total: ${total.toFixed(2)} MRU`,
            channel: "in_store",
          });
        } catch {}
      }

      if (customerEmail) {
        try {
          const settings = await storage.getStoreSettings();
          if (settings?.autoEmailInvoice !== false) {
            const custRecord = await storage.getStoreCustomerByEmail(customerEmail);
            const lang = custRecord?.language || "en";
            sendOrderInvoiceEmail({
              orderNumber,
              customerName,
              customerEmail,
              customerPhone: customerPhone || undefined,
              customerAddress: customerAddress || undefined,
              items: validatedItems.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
              subtotal,
              discount,
              deliveryCost: deliveryCost || 0,
              total,
              paymentMethod: paymentMethod || undefined,
              status: "pending",
              createdAt: new Date().toISOString(),
            }, lang).catch((err: any) => console.error("[EMAIL] Invoice send failed:", err.message || err));
          }
        } catch {}
      }

      res.status(201).json(order);
    } catch (error) {
      handleError(res, "createStoreOrder", error);
    }
  });

  app.get("/api/store/orders/lookup", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any)?.storeCustomer;
      const orderNumber = (req.query.orderNumber as string || "").trim();
      const email = (req.query.email as string || "").trim();

      if (sc && sc.email) {
        const allOrders = await storage.getStoreOrders();
        const filtered = allOrders.filter(o =>
          o.customerEmail && o.customerEmail.toLowerCase() === sc.email.toLowerCase()
        );
        const safe = filtered.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          items: o.items,
          subtotal: o.subtotal,
          discount: o.discount,
          total: o.total,
          status: o.status,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
        }));
        return res.json(safe);
      }

      if (!orderNumber || !email) {
        return res.status(400).json({ error: "Both order number and email are required for guest lookup" });
      }

      const allOrders = await storage.getStoreOrders();
      const filtered = allOrders.filter(o =>
        o.orderNumber.toLowerCase() === orderNumber.toLowerCase() &&
        o.customerEmail && o.customerEmail.toLowerCase() === email.toLowerCase()
      );
      const safe = filtered.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        items: o.items,
        subtotal: o.subtotal,
        discount: o.discount,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
      }));
      res.json(safe);
    } catch (error) {
      handleError(res, "lookupStoreOrders", error);
    }
  });

  app.get("/api/store/wallets", async (_req: Request, res: Response) => {
    try {
      const wallets = await storage.getPaymentWallets();
      res.json(wallets.filter(w => w.isActive));
    } catch (error) {
      handleError(res, "getPaymentWallets", error);
    }
  });

  app.get("/api/store/orders/:orderNumber/track", async (req: Request, res: Response) => {
    try {
      const { orderNumber } = req.params;
      const email = (req.query.email as string || "").trim();
      const order = await storage.getStoreOrderByNumber(orderNumber);
      if (!order) return res.status(404).json({ error: "Order not found" });

      const sc = (req.session as any)?.storeCustomer;
      const isAuthenticated = sc && sc.email && order.customerEmail &&
        sc.email.toLowerCase() === order.customerEmail.toLowerCase();
      const isEmailVerified = email && order.customerEmail &&
        email.toLowerCase() === order.customerEmail.toLowerCase();

      if (isAuthenticated || isEmailVerified) {
        return res.json({
          orderNumber: order.orderNumber,
          status: order.status,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
        });
      }

      return res.status(403).json({ error: "Email verification required to track this order" });
    } catch (error) {
      handleError(res, "trackOrder", error);
    }
  });

  app.post("/api/store/promo/validate", async (req: Request, res: Response) => {
    try {
      const { code, orderAmount } = promoValidateSchema.parse(req.body);
      const result = await storage.validatePromoCode(code, orderAmount || 0);
      res.json(result);
    } catch (error) {
      handleError(res, "validatePromoCode", error);
    }
  });

  app.post("/api/store/chat", async (req: Request, res: Response) => {
    try {
      const { message, history, lang } = storeChatSchema.parse(req.body);
      const validLangs = ["en", "fr", "ar"];
      const safeLang = lang && validLangs.includes(lang) ? lang : "en";
      const response = await handleCustomerChat(message, history || [], safeLang);
      res.json({ response });
    } catch (error) {
      handleError(res, "storeChat", error);
    }
  });

  app.get("/api/store/greeting", async (req: Request, res: Response) => {
    try {
      const language = (req.query.lang as string) || "en";
      const greeting = await getCustomerGreeting(language);
      res.json({ greeting });
    } catch (error) {
      handleError(res, "storeGreeting", error);
    }
  });

  // ==========================================
  // PUBLIC: Store Categories
  // ==========================================

  app.get("/api/store/categories", async (req: Request, res: Response) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats.filter(c => c.isActive));
    } catch (error) {
      handleError(res, "getStoreCategories", error);
    }
  });

  // ==========================================
  // ADMIN: Categories Management
  // ==========================================

  app.get("/api/categories", requirePermission("settings"), async (req: Request, res: Response) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (error) {
      handleError(res, "getCategories", error);
    }
  });

  app.post("/api/categories", requirePermission("settings"), async (req: Request, res: Response) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(data);
      res.status(201).json(cat);
    } catch (error) {
      handleError(res, "createCategory", error);
    }
  });

  app.put("/api/categories/:id", requirePermission("settings"), async (req: Request, res: Response) => {
    try {
      const data = insertCategorySchema.partial().parse(req.body);
      const updated = await storage.updateCategory(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Category not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updateCategory", error);
    }
  });

  app.delete("/api/categories/:id", requirePermission("settings"), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteCategory", error);
    }
  });

  // ==========================================
  // STORE CUSTOMER AUTH
  // ==========================================

  app.post("/api/store/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, phone, language } = storeSignupSchema.parse(req.body);
      const existing = await storage.getStoreCustomerByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const customer = await storage.createStoreCustomer({
        email,
        password: hashedPassword,
        fullName,
        phone: phone || null,
        address: null,
        language: req.body.language || "en",
        isActive: true,
      });
      (req.session as any).storeCustomer = { id: customer.id, email: customer.email, fullName: customer.fullName };
      sendWelcomeEmail(email, fullName, req.body.language || "en").catch(() => {});
      try {
        await storage.createStoreNotification({
          customerEmail: email,
          customerId: customer.id,
          orderNumber: null,
          type: "welcome",
          title: "Welcome to LIMJIBA!",
          titleAr: "مرحباً بكم في لمجيبة!",
          titleFr: "Bienvenue chez LIMJIBA!",
          message: "Your account has been created successfully. Enjoy shopping!",
          messageAr: "تم إنشاء حسابكم بنجاح. تسوق ممتع!",
          messageFr: "Votre compte a été créé avec succès. Bon shopping!",
          channel: "in_store",
        });
      } catch {}
      res.status(201).json({ id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone });
    } catch (error) {
      handleError(res, "storeSignup", error);
    }
  });

  app.post("/api/store/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = storeLoginSchema.parse(req.body);
      const customer = await storage.getStoreCustomerByEmail(email);
      if (!customer || !customer.isActive) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, customer.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      (req.session as any).storeCustomer = { id: customer.id, email: customer.email, fullName: customer.fullName };
      res.json({ id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone, address: customer.address });
    } catch (error) {
      handleError(res, "storeLogin", error);
    }
  });

  app.post("/api/store/auth/logout", async (req: Request, res: Response) => {
    try {
      delete (req.session as any).storeCustomer;
      res.json({ success: true });
    } catch (error) {
      handleError(res, "storeLogout", error);
    }
  });

  app.get("/api/store/auth/session", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (sc) {
        const customer = await storage.getStoreCustomerById(sc.id);
        if (customer && customer.isActive) {
          return res.json({ isAuthenticated: true, customer: { id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone, address: customer.address, loyaltyPoints: (customer as any).loyaltyPoints || 0 } });
        }
      }
      res.json({ isAuthenticated: false });
    } catch (error) {
      handleError(res, "storeSession", error);
    }
  });

  app.get("/api/store/auth/profile", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (!sc) return res.status(401).json({ error: "Not authenticated" });
      const customer = await storage.getStoreCustomerById(sc.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json({ id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone, address: customer.address, language: customer.language, loyaltyPoints: (customer as any).loyaltyPoints || 0 });
    } catch (error) {
      handleError(res, "storeProfile", error);
    }
  });

  app.put("/api/store/auth/profile", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (!sc) return res.status(401).json({ error: "Not authenticated" });
      const parsed = storeProfileUpdateSchema.parse(req.body);
      const newEmail = parsed.email?.trim().toLowerCase();
      const oldEmail = sc.email?.toLowerCase();
      if (newEmail && newEmail !== oldEmail) {
        const existing = await storage.getStoreCustomerByEmail(newEmail);
        if (existing && existing.id !== sc.id) {
          return res.status(409).json({ error: "An account with this email already exists" });
        }
      }
      const updated = await storage.updateStoreCustomer(sc.id, { ...parsed, email: newEmail || parsed.email });
      if (!updated) return res.status(404).json({ error: "Customer not found" });
      if (newEmail && newEmail !== oldEmail) {
        try {
          await db.update(storeOrders).set({ customerEmail: updated.email }).where(eq(storeOrders.customerEmail, sc.email));
          await db.update(storeNotifications).set({ customerEmail: updated.email }).where(eq(storeNotifications.customerEmail, sc.email));
          await db.update(productReviews).set({ customerEmail: updated.email }).where(eq(productReviews.customerEmail, sc.email));
          await db.update(storeReviews).set({ customerEmail: updated.email }).where(eq(storeReviews.customerEmail, sc.email));
        } catch (e) {
          console.error("[profile] Failed to migrate email references:", e);
        }
      }
      (req.session as any).storeCustomer = { id: updated.id, email: updated.email, fullName: updated.fullName };
      res.json({ id: updated.id, email: updated.email, fullName: updated.fullName, phone: updated.phone, address: updated.address, language: updated.language });
    } catch (error) {
      handleError(res, "updateStoreProfile", error);
    }
  });

  app.get("/api/store/auth/my-orders", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (!sc) return res.status(401).json({ error: "Not authenticated" });
      const allOrders = await storage.getStoreOrders();
      const myOrders = allOrders.filter(o => o.customerEmail && o.customerEmail.toLowerCase() === sc.email.toLowerCase());
      const safe = myOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        items: o.items,
        subtotal: o.subtotal,
        discount: o.discount,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentConfirmed: o.paymentConfirmed,
        createdAt: o.createdAt,
      }));
      res.json(safe);
    } catch (error) {
      handleError(res, "getMyOrders", error);
    }
  });

  app.post("/api/store/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = z.object({ email: z.string().email().max(200) }).parse(req.body);
      const customer = await storage.getStoreCustomerByEmail(email);
      if (!customer) return res.json({ message: "If an account exists, a reset link has been sent." });
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600000).toISOString();
      await storage.updateStoreCustomerResetToken(customer.id, token, expiry);
      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const resetUrl = `${protocol}://${host}/store/reset-password?token=${token}`;
      sendPasswordResetEmail(email, customer.fullName, resetUrl, customer.language || "en").catch(() => {});
      try {
        await storage.createStoreNotification({
          customerEmail: email,
          customerId: customer.id,
          orderNumber: null,
          type: "password_reset",
          title: "Password Reset Requested",
          titleAr: "طلب إعادة تعيين كلمة المرور",
          titleFr: "Réinitialisation du mot de passe demandée",
          message: `A password reset was requested for your account. If this was not you, please ignore this message.`,
          messageAr: `تم طلب إعادة تعيين كلمة المرور لحسابكم. إذا لم تكونوا أنتم، تجاهلوا هذه الرسالة.`,
          messageFr: `Une réinitialisation de mot de passe a été demandée pour votre compte. Si ce n'était pas vous, ignorez ce message.`,
          channel: "in_store",
        });
      } catch {}
      res.json({ message: "If an account exists, a reset link has been sent.", token: process.env.NODE_ENV === "development" ? token : undefined });
    } catch (error) {
      handleError(res, "forgotPassword", error);
    }
  });

  app.post("/api/store/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = z.object({
        token: z.string().min(1).max(200),
        password: z.string().min(6).max(200),
      }).parse(req.body);
      const customer = await storage.getStoreCustomerByResetToken(token);
      if (!customer) return res.status(400).json({ error: "Invalid or expired reset token" });
      if (customer.resetTokenExpiry && new Date(customer.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateStoreCustomer(customer.id, { password: hashedPassword } as any);
      await storage.updateStoreCustomerResetToken(customer.id, null, null);
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      handleError(res, "resetPassword", error);
    }
  });

  app.get("/api/store/products/:id/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getProductReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      handleError(res, "getProductReviews", error);
    }
  });

  app.post("/api/store/products/:id/reviews", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (!sc) return res.status(401).json({ error: "Not authenticated" });
      const { rating, reviewText } = productReviewSchema.parse(req.body);
      const existing = await storage.getProductReviews(req.params.id);
      if (existing.some(r => r.customerEmail.toLowerCase() === sc.email.toLowerCase())) {
        return res.status(400).json({ error: "You have already reviewed this product" });
      }
      const customer = await storage.getStoreCustomerById(sc.id);
      const review = await storage.createProductReview({
        productId: req.params.id,
        customerEmail: sc.email,
        customerName: customer?.fullName || sc.email,
        rating,
        reviewText: reviewText || null,
      });
      res.status(201).json(review);
    } catch (error) {
      handleError(res, "createProductReview", error);
    }
  });

  app.get("/api/store/reviews", async (_req: Request, res: Response) => {
    try {
      const reviews = await storage.getStoreReviews();
      res.json(reviews);
    } catch (error) {
      handleError(res, "getStoreReviews", error);
    }
  });

  app.post("/api/store/reviews", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any).storeCustomer;
      if (!sc) return res.status(401).json({ error: "Not authenticated" });
      const { rating, reviewText } = productReviewSchema.parse(req.body);
      const existing = await storage.getStoreReviews();
      if (existing.some(r => r.customerEmail.toLowerCase() === sc.email.toLowerCase())) {
        return res.status(400).json({ error: "You have already rated our store" });
      }
      const customer = await storage.getStoreCustomerById(sc.id);
      const review = await storage.createStoreReview({
        customerEmail: sc.email,
        customerName: customer?.fullName || sc.email,
        rating,
        reviewText: reviewText || null,
      });
      res.status(201).json(review);
    } catch (error) {
      handleError(res, "createStoreReview", error);
    }
  });

  app.get("/api/store/products/:id/variants", async (req: Request, res: Response) => {
    try {
      const variants = await storage.getProductVariants(req.params.id);
      res.json(variants.filter(v => v.isActive));
    } catch (error) {
      handleError(res, "getProductVariants", error);
    }
  });

  app.get("/api/products/:id/variants", requireAuth, async (req: Request, res: Response) => {
    try {
      const variants = await storage.getProductVariants(req.params.id);
      res.json(variants);
    } catch (error) {
      handleError(res, "getProductVariantsAdmin", error);
    }
  });

  app.post("/api/products/:id/variants", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertProductVariantSchema.omit({ productId: true }).parse(req.body);
      const variant = await storage.createProductVariant({ ...data, productId: req.params.id });
      res.status(201).json(variant);
    } catch (error) {
      handleError(res, "createProductVariant", error);
    }
  });

  app.patch("/api/product-variants/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertProductVariantSchema.partial().parse(req.body);
      const updated = await storage.updateProductVariant(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Variant not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updateProductVariant", error);
    }
  });

  app.delete("/api/product-variants/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteProductVariant(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Variant not found" });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteProductVariant", error);
    }
  });

  app.post("/api/products/:id/variants/batch", requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ error: "Product not found" });

      const variants: any[] = req.body.variants || [];
      if (variants.length > 100) return res.status(400).json({ error: "Too many variants (max 100)" });

      const validatedVariants = variants.map((v: any, i: number) => ({
        productId,
        variantLabel: String(v.variantLabel || "").substring(0, 200),
        sku: v.sku ? String(v.sku).substring(0, 100) : null,
        unitPrice: Math.max(0, Number(v.unitPrice) || product.unitPrice),
        costPrice: Math.max(0, Number(v.costPrice) || 0),
        stockQuantity: Math.max(0, Math.floor(Number(v.stockQuantity) || 0)),
        imageUrl: v.imageUrl || null,
        option1Name: v.option1Name || null,
        option1Value: v.option1Value || null,
        option2Name: v.option2Name || null,
        option2Value: v.option2Value || null,
        option3Name: v.option3Name || null,
        option3Value: v.option3Value || null,
        sortOrder: i,
        isActive: v.isActive !== false,
      }));

      const created = await storage.batchReplaceVariants(productId, validatedVariants);
      res.json(created);
    } catch (error) {
      handleError(res, "batchReplaceVariants", error);
    }
  });

  app.post("/api/ai/generate-descriptions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { productName, category, variants } = z.object({
        productName: z.string().min(1).max(200),
        category: z.string().max(100).optional(),
        variants: z.array(z.string().max(100)).max(50).optional(),
      }).parse(req.body);
      const variantLabels = Array.isArray(variants) ? variants.map((v: any) => String(v).substring(0, 100)).slice(0, 50) : [];
      const result = await generateProductDescriptions(
        productName.substring(0, 200),
        String(category || "General").substring(0, 100),
        variantLabels,
      );
      res.json(result);
    } catch (error) {
      handleError(res, "generateProductDescriptions", error);
    }
  });

  app.post("/api/ai/generate-notification", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { topic } = z.object({
        topic: z.string().max(200).optional(),
      }).parse(req.body);
      const result = await generateNotificationContent(topic);
      res.json(result);
    } catch (error) {
      handleError(res, "generateNotificationContent", error);
    }
  });

  // ==========================================
  // ADMIN: Promo Codes
  // ==========================================

  app.get("/api/promo-codes", requireAuth, async (req: Request, res: Response) => {
    try {
      const codes = await storage.getPromoCodes();
      res.json(codes);
    } catch (error) {
      handleError(res, "getPromoCodes", error);
    }
  });

  app.post("/api/promo-codes", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertPromoCodeSchema.parse({ ...req.body, code: req.body.code?.toUpperCase() });
      const promo = await storage.createPromoCode(data);
      res.status(201).json(promo);
    } catch (error) {
      handleError(res, "createPromoCode", error);
    }
  });

  app.patch("/api/promo-codes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertPromoCodeSchema.partial().parse(req.body);
      const updated = await storage.updatePromoCode(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Promo code not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updatePromoCode", error);
    }
  });

  app.delete("/api/promo-codes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePromoCode(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Promo code not found" });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deletePromoCode", error);
    }
  });

  app.post("/api/promo-codes/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const suggestion = await generatePromoCode();
      res.json(suggestion);
    } catch (error) {
      handleError(res, "generatePromoCode", error);
    }
  });

  // ==========================================
  // ADMIN: Store Orders
  // ==========================================

  app.get("/api/store-orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getStoreOrders();
      res.json(orders);
    } catch (error) {
      handleError(res, "getStoreOrders", error);
    }
  });

  app.get("/api/store-orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const order = await storage.getStoreOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      handleError(res, "getStoreOrder", error);
    }
  });

  app.patch("/api/store-orders/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = storeOrderStatusSchema.parse(req.body);
      const order = await storage.getStoreOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      const previousStatus = order.status;
      let orderItems: any[] = [];
      try { orderItems = JSON.parse(order.items); } catch {}

      if (status === "confirmed" && previousStatus !== "confirmed" && previousStatus !== "shipped" && previousStatus !== "delivered") {
        for (const item of orderItems) {
          if (item.productId) {
            await storage.updateStock(item.productId, -(item.quantity || 0));
            try {
              await storage.createStockMovement({
                productId: item.productId,
                movementType: "out",
                reason: "sale",
                quantity: -(item.quantity || 0),
                previousStock: 0,
                newStock: 0,
                reference: `Store Order ${order.orderNumber}`,
                createdAt: new Date().toISOString(),
                createdBy: req.session?.username || "system",
              });
            } catch {}
          }
        }
      }

      if (status === "cancelled" && (previousStatus === "confirmed" || previousStatus === "shipped")) {
        for (const item of orderItems) {
          if (item.productId) {
            await storage.updateStock(item.productId, item.quantity || 0);
            try {
              await storage.createStockMovement({
                productId: item.productId,
                movementType: "in",
                reason: "return",
                quantity: item.quantity || 0,
                previousStock: 0,
                newStock: 0,
                reference: `Store Order ${order.orderNumber} cancelled`,
                createdAt: new Date().toISOString(),
                createdBy: req.session?.username || "system",
              });
            } catch {}
          }
        }
      }

      if (status === "delivered" && previousStatus !== "delivered") {
        try {
          if (order.customerEmail) {
            const customer = await storage.getStoreCustomerByEmail(order.customerEmail);
            if (customer) {
              const pointsToAdd = Math.floor((order.total || 0) / 10);
              if (pointsToAdd > 0) {
                const currentPoints = (customer as any).loyaltyPoints || 0;
                await storage.updateStoreCustomer(customer.id, { loyaltyPoints: currentPoints + pointsToAdd } as any);
              }
            }
          }
        } catch {}
      }

      const updated = await storage.updateStoreOrderStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ error: "Order not found" });

      try {
        await storage.createAuditLog({
          userId: req.session.userId,
          username: req.session.username || "system",
          action: "update",
          entity: "store_order",
          entityId: req.params.id,
          details: JSON.stringify({ previousStatus, newStatus: status, orderNumber: order.orderNumber }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch {}

      try {
        const statusTitles: Record<string, Record<string, string>> = {
          confirmed: { en: "Order Confirmed", fr: "Commande Confirmée", ar: "تم تأكيد الطلب" },
          shipped: { en: "Order Shipped", fr: "Commande Expédiée", ar: "تم شحن الطلب" },
          delivered: { en: "Order Delivered", fr: "Commande Livrée", ar: "تم توصيل الطلب" },
          cancelled: { en: "Order Cancelled", fr: "Commande Annulée", ar: "تم إلغاء الطلب" },
        };
        const statusMsgs: Record<string, Record<string, string>> = {
          confirmed: { en: `Your order ${order.orderNumber} has been confirmed.`, fr: `Votre commande ${order.orderNumber} a été confirmée.`, ar: `تم تأكيد طلبكم ${order.orderNumber}.` },
          shipped: { en: `Your order ${order.orderNumber} has been shipped!`, fr: `Votre commande ${order.orderNumber} a été expédiée!`, ar: `تم شحن طلبكم ${order.orderNumber}!` },
          delivered: { en: `Your order ${order.orderNumber} has been delivered. Thank you!`, fr: `Votre commande ${order.orderNumber} a été livrée. Merci!`, ar: `تم توصيل طلبكم ${order.orderNumber}. شكراً!` },
          cancelled: { en: `Your order ${order.orderNumber} has been cancelled.`, fr: `Votre commande ${order.orderNumber} a été annulée.`, ar: `تم إلغاء طلبكم ${order.orderNumber}.` },
        };
        if (statusTitles[status] && order.customerEmail) {
          await storage.createStoreNotification({
            customerEmail: order.customerEmail,
            customerId: null,
            orderNumber: order.orderNumber,
            type: `order_${status}`,
            title: statusTitles[status].en + " - " + order.orderNumber,
            titleAr: statusTitles[status].ar + " - " + order.orderNumber,
            titleFr: statusTitles[status].fr + " - " + order.orderNumber,
            message: statusMsgs[status].en,
            messageAr: statusMsgs[status].ar,
            messageFr: statusMsgs[status].fr,
            channel: "in_store",
          });
          const custLang = await storage.getStoreCustomerByEmail(order.customerEmail);
          sendOrderStatusEmail(order.customerEmail, order.customerName || "Customer", order.orderNumber, status, order.total || 0, custLang?.language || "en").catch(() => {});
        }
      } catch {}

      res.json(updated);
    } catch (error) {
      handleError(res, "updateStoreOrderStatus", error);
    }
  });

  app.patch("/api/store-orders/:id/confirm-payment", requireAuth, async (req: Request, res: Response) => {
    try {
      const order = await storage.getStoreOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.paymentConfirmed) return res.json(order);
      const result = await storage.confirmStoreOrderPayment(req.params.id);
      if (!result) return res.status(404).json({ error: "Order not found" });
      try {
        if (order.paymentMethod && order.total) {
          const wallets = await storage.getPaymentWallets();
          const matchedWallet = wallets.find(w => w.name === order.paymentMethod || w.nameAr === order.paymentMethod || w.nameFr === order.paymentMethod);
          if (matchedWallet) {
            await storage.creditWalletBalance(matchedWallet.id, order.total);
          }
        }
      } catch {}
      try {
        await storage.createAuditLog({
          userId: req.session.userId,
          username: req.session.username || "system",
          action: "update",
          entity: "store_order",
          entityId: req.params.id,
          details: JSON.stringify({ action: "payment_confirmed", orderNumber: order.orderNumber }),
          ipAddress: req.ip || null,
          createdAt: new Date().toISOString(),
        });
      } catch {}
      try {
        if (order.customerEmail) {
          await storage.createStoreNotification({
            customerEmail: order.customerEmail,
            customerId: null,
            orderNumber: order.orderNumber,
            type: "payment_confirmed",
            title: `Payment Confirmed - ${order.orderNumber}`,
            titleAr: `تم تأكيد الدفع - ${order.orderNumber}`,
            titleFr: `Paiement Confirmé - ${order.orderNumber}`,
            message: `Your payment of ${(order.total || 0).toFixed(2)} MRU for order ${order.orderNumber} has been confirmed.`,
            messageAr: `تم تأكيد دفعتك بمبلغ ${(order.total || 0).toFixed(2)} أوقية للطلب ${order.orderNumber}.`,
            messageFr: `Votre paiement de ${(order.total || 0).toFixed(2)} MRU pour la commande ${order.orderNumber} a été confirmé.`,
            channel: "in_store",
          });
        }
      } catch {}

      if (order.customerEmail) {
        try {
          const settings = await storage.getStoreSettings();
          if (settings?.autoEmailInvoice !== false) {
            const custRecord = await storage.getStoreCustomerByEmail(order.customerEmail);
            const lang = custRecord?.language || "en";
            const trustedHost = process.env.APP_BASE_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "https://limjiba.com");
            const trackingUrl = `${trustedHost}/store/orders`;
            sendPaymentConfirmedEmail(
              order.customerEmail,
              order.customerName || "Customer",
              order.orderNumber,
              order.total || 0,
              trackingUrl,
              lang
            ).catch((err: any) => console.error("[EMAIL] Payment confirmed email failed:", err.message || err));
          }
        } catch (emailErr: any) {
          console.error("[EMAIL] Payment confirmed email prep failed:", emailErr.message || emailErr);
        }
      }

      res.json(result);
    } catch (error) {
      handleError(res, "confirmStoreOrderPayment", error);
    }
  });

  // ==================== SUPPORT CHAT (Customer-facing) ====================

  function generateSupportToken(conversationId: number, email: string): string {
    return crypto.createHmac("sha256", process.env.SESSION_SECRET!)
      .update(`${conversationId}:${email}`)
      .digest("hex");
  }

  function verifySupportToken(token: string, conversationId: number, email: string): boolean {
    if (!token || typeof token !== "string" || !/^[0-9a-f]+$/.test(token)) return false;
    const expected = generateSupportToken(conversationId, email);
    if (token.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }

  async function resolveGuestSupportEmail(req: Request, convId: number): Promise<string | null> {
    const session = (req as any).session?.storeCustomer;
    if (session?.email) return session.email;

    const token = req.headers["x-support-token"] as string | undefined;
    if (!token) return null;

    const conv = await storage.getSupportConversation(convId);
    if (!conv) return null;

    if (verifySupportToken(token, convId, conv.customerEmail)) {
      return conv.customerEmail;
    }
    return null;
  }

  app.post("/api/store/support/conversations", async (req: Request, res: Response) => {
    try {
      const { subject, message, customerEmail, customerName } = z.object({
        subject: z.string().min(1).max(200),
        message: z.string().min(1).max(5000),
        customerEmail: z.string().email().max(200).optional(),
        customerName: z.string().max(200).optional(),
      }).parse(req.body);

      const session = (req as any).session?.storeCustomer;
      const email = session?.email || customerEmail;
      const name = session?.fullName || customerName;
      if (!email || !name) return res.status(400).json({ error: "Email and name required" });

      const conv = await storage.createSupportConversation({
        customerEmail: email,
        customerName: name,
        subject,
        status: "open",
      });

      await storage.createSupportMessage({
        conversationId: conv.id,
        senderType: "customer",
        senderName: name,
        content: message,
      });

      const responseData: any = { ...conv };
      if (!session?.email) {
        responseData.supportToken = generateSupportToken(conv.id, email);
      }

      res.status(201).json(responseData);
    } catch (error) {
      handleError(res, "createSupportConversation", error);
    }
  });

  app.get("/api/store/support/conversations", async (req: Request, res: Response) => {
    try {
      const session = (req as any).session?.storeCustomer;
      if (!session?.email) return res.status(401).json({ error: "Login required" });

      const conversations = await storage.getSupportConversations({ customerEmail: session.email });
      res.json(conversations);
    } catch (error) {
      handleError(res, "getCustomerSupportConversations", error);
    }
  });

  app.get("/api/store/support/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const convId = parseInt(req.params.id);
      const email = await resolveGuestSupportEmail(req, convId);
      if (!email) return res.status(401).json({ error: "Login required or invalid support token" });

      const conv = await storage.getSupportConversation(convId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.customerEmail !== email) return res.status(403).json({ error: "Access denied" });

      await storage.markSupportMessagesRead(conv.id, "admin");
      const messages = await storage.getSupportMessages(conv.id);
      res.json(messages);
    } catch (error) {
      handleError(res, "getCustomerSupportMessages", error);
    }
  });

  app.post("/api/store/support/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const convId = parseInt(req.params.id);
      const email = await resolveGuestSupportEmail(req, convId);
      if (!email) return res.status(401).json({ error: "Login required or invalid support token" });

      const { content } = supportMessageSchema.parse(req.body);

      const conv = await storage.getSupportConversation(convId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.customerEmail !== email) return res.status(403).json({ error: "Access denied" });

      const session = (req as any).session?.storeCustomer;
      const msg = await storage.createSupportMessage({
        conversationId: conv.id,
        senderType: "customer",
        senderName: session?.fullName || conv.customerName,
        content: content.trim(),
      });

      if (conv.status === "resolved") {
        await storage.updateSupportConversationStatus(conv.id, "open");
      }

      res.status(201).json(msg);
    } catch (error) {
      handleError(res, "createCustomerSupportMessage", error);
    }
  });

  app.get("/api/store/support/conversations/:id/poll", async (req: Request, res: Response) => {
    try {
      const convId = parseInt(req.params.id);
      const email = await resolveGuestSupportEmail(req, convId);
      if (!email) return res.status(401).json({ error: "Login required or invalid support token" });

      const conv = await storage.getSupportConversation(convId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.customerEmail !== email) return res.status(403).json({ error: "Access denied" });

      const afterId = parseInt(req.query.after as string) || 0;
      const messages = await storage.getSupportMessagesSince(conv.id, afterId);
      res.json(messages);
    } catch (error) {
      handleError(res, "pollSupportMessages", error);
    }
  });

  // ==================== SUPPORT CHAT (Admin-facing) ====================

  app.get("/api/support/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const conversations = await storage.getSupportConversations(status ? { status } : undefined);
      res.json(conversations);
    } catch (error) {
      handleError(res, "getAdminSupportConversations", error);
    }
  });

  app.get("/api/support/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const conv = await storage.getSupportConversation(parseInt(req.params.id));
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      await storage.markSupportMessagesRead(conv.id, "customer");
      const messages = await storage.getSupportMessages(conv.id);
      res.json(messages);
    } catch (error) {
      handleError(res, "getAdminSupportMessages", error);
    }
  });

  app.post("/api/support/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content } = supportMessageSchema.parse(req.body);

      const conv = await storage.getSupportConversation(parseInt(req.params.id));
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      const user = await storage.getUser((req as any).session.userId);
      const senderName = user?.displayName || user?.username || "Support";

      const msg = await storage.createSupportMessage({
        conversationId: conv.id,
        senderType: "admin",
        senderName,
        content: content.trim(),
      });

      try {
        const customer = await storage.getStoreCustomerByEmail(conv.customerEmail);
        if (customer) {
          await storage.createStoreNotification({
            customerId: customer.id,
            customerEmail: conv.customerEmail,
            type: "support_reply",
            title: "New Support Reply",
            titleAr: "رد جديد من الدعم",
            titleFr: "Nouvelle réponse du support",
            message: content.trim().substring(0, 200),
            messageAr: content.trim().substring(0, 200),
            messageFr: content.trim().substring(0, 200),
            channel: "in_store",
          });
        }
      } catch {}

      res.status(201).json(msg);
    } catch (error) {
      handleError(res, "createAdminSupportMessage", error);
    }
  });

  app.patch("/api/support/conversations/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = supportConversationStatusSchema.parse(req.body);
      const conv = await storage.updateSupportConversationStatus(parseInt(req.params.id), status);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json(conv);
    } catch (error) {
      handleError(res, "updateSupportConversationStatus", error);
    }
  });

  app.get("/api/support/unread-count", requireAuth, async (_req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadSupportCount();
      res.json({ count });
    } catch (error) {
      handleError(res, "getUnreadSupportCount", error);
    }
  });

  app.get("/api/support/conversations/:id/poll", requireAuth, async (req: Request, res: Response) => {
    try {
      const afterId = parseInt(req.query.after as string) || 0;
      const messages = await storage.getSupportMessagesSince(parseInt(req.params.id), afterId);
      res.json(messages);
    } catch (error) {
      handleError(res, "pollAdminSupportMessages", error);
    }
  });

  app.post("/api/store/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = { ...req.body };
      if (!data.customerId && data.customerEmail) {
        const customer = await storage.getStoreCustomerByEmail(data.customerEmail);
        if (customer) {
          data.customerId = customer.id;
        }
      }
      const notification = await storage.createStoreNotification(data);
      res.status(201).json(notification);
    } catch (error) {
      handleError(res, "createStoreNotification", error);
    }
  });

  app.get("/api/store/notifications", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any)?.storeCustomer;
      if (!sc?.id) return res.status(401).json({ error: "Not authenticated" });
      const notifications = await storage.getStoreNotifications(sc.id);
      res.json(notifications);
    } catch (error) {
      handleError(res, "getStoreNotifications", error);
    }
  });

  app.patch("/api/store/notifications/read-all", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any)?.storeCustomer;
      if (!sc?.id) return res.status(401).json({ error: "Not authenticated" });
      const count = await storage.markAllStoreNotificationsRead(sc.id, sc.email);
      res.json({ success: true, count });
    } catch (error) {
      handleError(res, "markAllStoreNotificationsRead", error);
    }
  });

  app.patch("/api/store/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const sc = (req.session as any)?.storeCustomer;
      if (!sc?.id) return res.status(401).json({ error: "Not authenticated" });
      const result = await storage.markStoreNotificationRead(req.params.id, sc.id, sc.email);
      if (!result) return res.status(404).json({ error: "Notification not found" });
      res.json(result);
    } catch (error) {
      handleError(res, "markStoreNotificationRead", error);
    }
  });

  // ==========================================
  // ADMIN: Payment Wallets
  // ==========================================

  app.get("/api/payment-wallets", requireAuth, async (_req: Request, res: Response) => {
    try {
      const wallets = await storage.getPaymentWallets();
      res.json(wallets);
    } catch (error) {
      handleError(res, "getPaymentWallets", error);
    }
  });

  app.post("/api/payment-wallets", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertPaymentWalletSchema.parse(req.body);
      const wallet = await storage.createPaymentWallet(data);
      res.status(201).json(wallet);
    } catch (error) {
      handleError(res, "createPaymentWallet", error);
    }
  });

  app.put("/api/payment-wallets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertPaymentWalletSchema.partial().parse(req.body);
      const updated = await storage.updatePaymentWallet(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Wallet not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updatePaymentWallet", error);
    }
  });

  app.delete("/api/payment-wallets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePaymentWallet(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Wallet not found" });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deletePaymentWallet", error);
    }
  });

  app.post("/api/wallets/transfer", requirePermission("suppliers"), async (req: Request, res: Response) => {
    try {
      const { fromWalletId, toWalletId, amount: parsedAmount } = walletTransferSchema.parse(req.body);
      if (fromWalletId === toWalletId) {
        return res.status(400).json({ error: "Invalid wallet selection" });
      }
      await storage.transferWalletBalance(fromWalletId, toWalletId, parsedAmount);
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "payment_wallet",
        entityId: fromWalletId,
        details: JSON.stringify({ action: "wallet_transfer", fromWalletId, toWalletId, amount: parsedAmount }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error: any) {
      if (error?.message?.includes("Insufficient") || error?.message?.includes("not found")) {
        return res.status(400).json({ error: error.message });
      }
      handleError(res, "walletTransfer", error);
    }
  });

  app.post("/api/wallets/:id/credit", requirePermission("suppliers"), async (req: Request, res: Response) => {
    try {
      const { amount: parsedAmount, method, note } = walletCreditSchema.parse(req.body);
      const wallets = await storage.getPaymentWallets();
      const wallet = wallets.find(w => w.id === req.params.id);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
      await storage.creditWalletBalance(req.params.id, parsedAmount);
      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "payment_wallet",
        entityId: req.params.id,
        details: JSON.stringify({ action: "cash_credit", method, amount: parsedAmount, note: note || "", walletName: wallet.name }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "walletCashCredit", error);
    }
  });

  app.post("/api/admin/clear-test-data", requirePermission("suppliers"), async (req: Request, res: Response) => {
    try {
      const db = (await import("./db")).db;
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_name ILIKE '%BERRA%' OR invoice_number LIKE 'FR-0001%')`);
      await db.execute(sql`DELETE FROM invoices WHERE client_name ILIKE '%BERRA%' OR invoice_number LIKE 'FR-0001%'`);
      await db.execute(sql`DELETE FROM quick_invoices WHERE client_name ILIKE '%BERRA%' OR invoice_number LIKE 'FR-0001%'`);
      await db.execute(sql`DELETE FROM audit_logs WHERE details ILIKE '%BERRA%' OR details ILIKE '%FR-0001%'`);
      res.json({ success: true, message: "Test data cleared" });
    } catch (error) {
      handleError(res, "clearTestData", error);
    }
  });

  // ==========================================
  // ADMIN: Store Customers
  // ==========================================

  app.get("/api/store-customers", requireAuth, async (_req: Request, res: Response) => {
    try {
      const customers = await storage.getAllStoreCustomers();
      const orders = await storage.getStoreOrders();
      const enriched = customers.map(c => {
        const customerOrders = orders.filter(o => o.customerEmail?.toLowerCase() === c.email.toLowerCase());
        return {
          ...c,
          password: undefined,
          resetToken: undefined,
          resetTokenExpiry: undefined,
          totalOrders: customerOrders.length,
          totalSpent: customerOrders.filter(o => o.paymentConfirmed).reduce((sum, o) => sum + (o.total || 0), 0),
        };
      });
      res.json(enriched);
    } catch (error) {
      handleError(res, "getStoreCustomers", error);
    }
  });

  app.post("/api/store-customers/bulk-notify", requireAuth, async (req: Request, res: Response) => {
    try {
      const { customerIds, title, titleAr, titleFr, message, messageAr, messageFr, sendEmail: doSendEmail } = bulkNotifySchema.parse(req.body);
      const allCustomers = await storage.getAllStoreCustomers();
      const selected = allCustomers.filter(c => customerIds.includes(c.id));
      let sent = 0;
      for (const customer of selected) {
        try {
          await storage.createStoreNotification({
            customerEmail: customer.email,
            customerId: customer.id,
            orderNumber: null,
            type: "marketing",
            title: title || "LIMJIBA Update",
            titleAr: titleAr || title || "تحديث لمجيبة",
            titleFr: titleFr || title || "Mise à jour LIMJIBA",
            message: message || "",
            messageAr: messageAr || message || "",
            messageFr: messageFr || message || "",
            channel: "in_store",
          });
          if (doSendEmail) {
            sendMarketingEmail(customer.email, customer.fullName, title || "LIMJIBA Update", message || "", messageFr || message || "", messageAr || message || "", customer.language || "en").catch(() => {});
          }
          sent++;
        } catch {}
      }
      res.json({ sent, total: selected.length });
    } catch (error) {
      handleError(res, "bulkNotifyCustomers", error);
    }
  });

  // ==========================================
  // ADMIN: Dashboard Balance Sheet & Store Orders
  // ==========================================

  app.get("/api/dashboard/balance-sheet", requireAuth, async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getStoreSettings();
      const openingBalance = (settings as any)?.openingBalance || 0;
      const wallets = await storage.getPaymentWallets();
      const walletBalances = wallets.map(w => ({ id: w.id, name: w.name, balance: (w as any).balance || 0, openingBalance: (w as any).openingBalance || 0 }));
      const totalWalletBalance = walletBalances.reduce((s, w) => s + w.balance, 0);
      const totalWalletOpeningBalance = walletBalances.reduce((s, w) => s + w.openingBalance, 0);

      const allInvoices = await storage.getInvoices();
      const invoiceIncome = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.totalTTC || 0), 0);

      const allSales = await storage.getSales();
      const salesIncome = allSales.reduce((s, sale) => s + (sale.total || 0), 0);

      const storeOrders = await storage.getStoreOrders();
      const storeIncome = storeOrders.filter(o => o.paymentConfirmed).reduce((s, o) => s + (o.total || 0), 0);

      const quickInvoices = await storage.getQuickInvoices();
      const quickInvoiceIncome = quickInvoices.reduce((s, qi) => s + (qi.totalTTC || 0), 0);

      const allExpenses = await storage.getExpenses();
      const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);

      const allSalaries = await storage.getSalaryPayments();
      const totalSalaries = allSalaries.reduce((s, sp) => s + (sp.amount || 0), 0);

      const totalIncome = invoiceIncome + salesIncome + storeIncome + quickInvoiceIncome;
      const totalOutgoing = totalExpenses + totalSalaries;
      const netProfit = totalIncome - totalOutgoing;
      const currentBalance = openingBalance + netProfit;

      res.json({
        openingBalance,
        walletBalances,
        totalWalletBalance,
        totalWalletOpeningBalance,
        income: { invoices: invoiceIncome, sales: salesIncome, storeOrders: storeIncome, quickInvoices: quickInvoiceIncome, total: totalIncome },
        outgoing: { expenses: totalExpenses, salaries: totalSalaries, total: totalOutgoing },
        netProfit,
        currentBalance,
      });
    } catch (error) {
      handleError(res, "getBalanceSheet", error);
    }
  });

  app.post("/api/wallets/:id/opening-balance", requirePermission("suppliers"), async (req: Request, res: Response) => {
    try {
      const { openingBalance: parsedBalance } = openingBalanceSchema.parse(req.body);

      const wallets = await storage.getPaymentWallets();
      const currentWallet = wallets.find(w => w.id === req.params.id);
      if (!currentWallet) return res.status(404).json({ error: "Wallet not found" });

      const oldOB = (currentWallet as any).openingBalance || 0;
      const delta = parsedBalance - oldOB;

      const wallet = await storage.updatePaymentWallet(req.params.id, { openingBalance: parsedBalance } as any);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      if (delta > 0) {
        await storage.creditWalletBalance(req.params.id, delta);
      } else if (delta < 0) {
        await storage.debitWalletBalance(req.params.id, Math.abs(delta));
      }

      await storage.createAuditLog({
        userId: req.session.userId,
        username: req.session.username || "system",
        action: "update",
        entity: "payment_wallet",
        entityId: req.params.id,
        details: JSON.stringify({ action: "set_opening_balance", openingBalance: parsedBalance, previousOpeningBalance: oldOB, balanceAdjustment: delta, walletName: (wallet as any).name || currentWallet.name }),
        ipAddress: req.ip || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "setWalletOpeningBalance", error);
    }
  });

  app.post("/api/dashboard/opening-balance", requireAuth, async (req: Request, res: Response) => {
    try {
      const { openingBalance } = openingBalanceSchema.parse(req.body);
      await storage.updateStoreSettings({ openingBalance } as any);
      res.json({ success: true, openingBalance });
    } catch (error) {
      handleError(res, "setOpeningBalance", error);
    }
  });

  app.get("/api/dashboard/store-orders-summary", requireAuth, async (_req: Request, res: Response) => {
    try {
      const storeOrders = await storage.getStoreOrders();
      const allProducts = await storage.getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const ordersWithProfit = storeOrders.map(order => {
        let orderItems: any[] = [];
        try { orderItems = JSON.parse(order.items); } catch {}
        let orderProfit = 0;
        const itemsWithProfit = orderItems.map(item => {
          const product = productMap.get(item.productId);
          const purchasePrice = product ? ((product as any).purchasePrice || 0) : 0;
          const profit = (item.unitPrice - purchasePrice) * item.quantity;
          orderProfit += profit;
          return { ...item, purchasePrice, profit: Math.round(profit * 100) / 100 };
        });
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          total: order.total,
          status: order.status,
          paymentConfirmed: order.paymentConfirmed,
          createdAt: order.createdAt,
          items: itemsWithProfit,
          profit: Math.round(orderProfit * 100) / 100,
        };
      });

      const totalRevenue = storeOrders.filter(o => o.paymentConfirmed).reduce((s, o) => s + (o.total || 0), 0);
      const totalProfit = ordersWithProfit.filter(o => o.paymentConfirmed).reduce((s, o) => s + o.profit, 0);

      res.json({
        orders: ordersWithProfit.slice(0, 50),
        totalOrders: storeOrders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        confirmedOrders: storeOrders.filter(o => o.paymentConfirmed).length,
        pendingOrders: storeOrders.filter(o => o.status === "pending").length,
      });
    } catch (error) {
      handleError(res, "getStoreOrdersSummary", error);
    }
  });

  // ==========================================
  // ADMIN: CMS
  // ==========================================

  app.get("/api/cms/pages", requireAuth, async (req: Request, res: Response) => {
    try {
      const slugs = ["home", "about", "contact", "terms"];
      const pages = [];
      for (const slug of slugs) {
        const page = await storage.getCmsPage(slug);
        if (page) pages.push(page);
      }
      res.json(pages);
    } catch (error) {
      handleError(res, "getCmsPages", error);
    }
  });

  app.put("/api/cms/pages/:slug", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCmsPageSchema.partial().parse(req.body);
      const updated = await storage.updateCmsPage(req.params.slug, data);
      if (!updated) return res.status(404).json({ error: "Page not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updateCmsPage", error);
    }
  });

  app.get("/api/cms/banners", requireAuth, async (req: Request, res: Response) => {
    try {
      const banners = await storage.getCmsBanners();
      res.json(banners);
    } catch (error) {
      handleError(res, "getCmsBanners", error);
    }
  });

  app.post("/api/cms/banners", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCmsBannerSchema.parse(req.body);
      const banner = await storage.createCmsBanner(data);
      res.status(201).json(banner);
    } catch (error) {
      handleError(res, "createCmsBanner", error);
    }
  });

  app.patch("/api/cms/banners/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertCmsBannerSchema.partial().parse(req.body);
      const updated = await storage.updateCmsBanner(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Banner not found" });
      res.json(updated);
    } catch (error) {
      handleError(res, "updateCmsBanner", error);
    }
  });

  app.delete("/api/cms/banners/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCmsBanner(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Banner not found" });
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteCmsBanner", error);
    }
  });

  // ==========================================
  // ADMIN: Store Settings
  // ==========================================

  app.get("/api/store-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getStoreSettings();
      res.json(settings || {});
    } catch (error) {
      handleError(res, "getStoreSettings", error);
    }
  });

  app.put("/api/store-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertStoreSettingsSchema.partial().parse(req.body);
      const updated = await storage.updateStoreSettings(data);
      res.json(updated);
    } catch (error) {
      handleError(res, "updateStoreSettings", error);
    }
  });

  // ==========================================
  // ADMIN: Limjiba AI Assistant
  // ==========================================

  app.post("/api/admin/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, history } = adminChatSchema.parse(req.body);
      const response = await handleAdminChat(message, history || []);
      res.json({ response });
    } catch (error) {
      handleError(res, "adminChat", error);
    }
  });

  return httpServer;
}

function formatDateDMY(dateString: string): string {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function numberToFrenchWords(n: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  if (n === 0) return "zero";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      return tens[t] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? (u === 1 && t !== 8 ? " et un" : "-" + units[u]) : (t === 8 ? "s" : ""));
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : (h > 1 && r === 0 ? "s" : ""));
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = t === 1 ? "mille" : numberToFrenchWords(t) + " mille";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const prefix = m === 1 ? "un million" : numberToFrenchWords(m) + " millions";
    return prefix + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  return n.toString();
}

function numberToArabicWords(n: number): string {
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

  if (n === 0) return "صفر";
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u > 0 ? units[u] + " و" + tens[t] : tens[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const prefix = h === 1 ? "مائة" : h === 2 ? "مائتان" : units[h] + " مائة";
    return prefix + (r > 0 ? " و" + numberToArabicWords(r) : "");
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = t === 1 ? "ألف" : t === 2 ? "ألفان" : numberToArabicWords(t) + " آلاف";
    return prefix + (r > 0 ? " و" + numberToArabicWords(r) : "");
  }
  if (n < 1000000000) {
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const prefix = m === 1 ? "مليون" : m === 2 ? "مليونان" : numberToArabicWords(m) + " ملايين";
    return prefix + (r > 0 ? " و" + numberToArabicWords(r) : "");
  }
  return n.toString();
}

interface InvoiceBranding {
  logo?: string;
  watermark?: string;
  enableWatermark: boolean;
  watermarkOpacity: number;
  logoPosition: "left" | "center" | "right";
  primaryColor: string;
  accentColor: string;
  invoiceLanguage: "fr" | "ar" | "bilingual";
}

function generateInvoicePDF(invoice: any, branding: InvoiceBranding = {
  enableWatermark: false,
  watermarkOpacity: 0.12,
  logoPosition: "left",
  primaryColor: "#1976D2",
  accentColor: "#42A5F5",
  invoiceLanguage: "fr"
}): string {
  const isArabic = branding.invoiceLanguage === "ar";
  const isBilingual = branding.invoiceLanguage === "bilingual";
  const dir = isArabic ? "rtl" : "ltr";
  const fontFamily = isArabic ? "'Cairo', 'Roboto', sans-serif" : "'Roboto', Arial, sans-serif";
  
  const labels = {
    invoice: isArabic ? "فاتورة" : "FACTURE",
    invoiceAr: "فاتورة",
    invoiceFr: "FACTURE",
    invoiceNumber: isArabic ? "رقم الفاتورة" : "N° Facture",
    date: isArabic ? "التاريخ" : "Date",
    client: isArabic ? "العميل" : "Client",
    responsible: isArabic ? "المسؤول" : "Responsable",
    role: isArabic ? "الوظيفة" : "Fonction",
    paymentMode: isArabic ? "طريقة الدفع" : "Mode de Paiement",
    dueDate: isArabic ? "تاريخ الاستحقاق" : "Échéance",
    designation: isArabic ? "التسمية" : "Désignation",
    quantity: isArabic ? "الكمية" : "Qté",
    unitPrice: isArabic ? "سعر الوحدة" : "P.U",
    total: isArabic ? "المجموع" : "Total",
    totalHT: isArabic ? "المجموع بدون ضريبة" : "Total H.T",
    totalTTC: isArabic ? "المجموع الكلي" : "Total T.T.C",
    amountInWords: isArabic ? "المبلغ بالحروف" : "Arrêter la présente facture à la somme de",
    companyName: "LIMJIBA - لمجيبة",
    companySubtitle: isArabic ? "استيراد المنتجات الفاخرة" : "IMPORTATION DE PRODUITS PREMIUM",
    weightPerUnit: isArabic ? "الوزن/الوحدة" : "Poids/U",
    totalWeight: isArabic ? "الوزن الكلي" : "Poids Total",
  };

  const amountWords = isArabic 
    ? numberToArabicWords(Math.floor(invoice.totalTTC)) + " أوقية موريتانية"
    : numberToFrenchWords(Math.floor(invoice.totalTTC)) + " ouguiyas mauritaniens";

  const logoHtml = branding.logo ? `<img src="${escapeHtml(branding.logo)}" style="max-height: 60px; max-width: 150px;" />` : '';
  
  const logoAlignment = branding.logoPosition === "center" ? "center" : branding.logoPosition === "right" ? "flex-end" : "flex-start";

  const watermarkHtml = branding.enableWatermark && branding.watermark ? `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: ${branding.watermarkOpacity}; z-index: -1; pointer-events: none;">
      <img src="${escapeHtml(branding.watermark)}" style="max-width: 400px; max-height: 400px;" />
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Cairo:wght@300;400;500;700&display=swap" rel="stylesheet">
  <title>${labels.invoice} ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fontFamily}; font-size: 12px; color: #333; background: white; padding: 20px; direction: ${dir}; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid ${branding.primaryColor}; padding-bottom: 20px; }
    .company { text-align: ${isArabic ? 'right' : 'left'}; }
    .company h1 { color: ${branding.primaryColor}; font-size: 24px; font-weight: 700; }
    .company p { color: #666; font-size: 11px; }
    .invoice-info { text-align: ${isArabic ? 'left' : 'right'}; }
    .invoice-title { background: ${branding.primaryColor}; color: white; padding: 10px 20px; font-size: 18px; font-weight: 700; }
    .invoice-details { margin-top: 10px; }
    .invoice-details p { margin: 5px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .detail-box { background: #f8f9fa; padding: 15px; border-radius: 4px; border-${isArabic ? 'right' : 'left'}: 3px solid ${branding.accentColor}; }
    .detail-box h3 { color: ${branding.primaryColor}; margin-bottom: 10px; font-size: 13px; }
    .detail-box p { margin: 3px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .meta-table td { padding: 8px 12px; border: 1px solid #ddd; }
    .meta-table .label { background: #f5f5f5; font-weight: 500; width: 20%; color: ${branding.primaryColor}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: ${branding.primaryColor}; color: white; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: 500; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f8f9fa; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { background: #f8f9fa; padding: 15px 30px; border-radius: 4px; min-width: 250px; }
    .totals-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .totals-row.final { border-top: 2px solid ${branding.primaryColor}; padding-top: 10px; margin-top: 10px; font-weight: 700; font-size: 16px; color: ${branding.primaryColor}; }
    .amount-words { margin-top: 20px; padding: 15px; background: linear-gradient(to right, ${branding.accentColor}22, transparent); border-${isArabic ? 'right' : 'left'}: 3px solid ${branding.primaryColor}; font-style: italic; }
    .logo-container { display: flex; justify-content: ${logoAlignment}; margin-bottom: 10px; }
    @media print { body { padding: 0; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  ${watermarkHtml}
  <div class="container">
    <div class="logo-container">${logoHtml}</div>
    <div class="header">
      <div class="company">
        <h1>${labels.companyName}</h1>
        <p>${labels.companySubtitle}</p>
        <p style="margin-top: 10px;">Nouakchott, Mauritania</p>
        <p>Tel: +222 00 00 00 00</p>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">${isBilingual ? `${labels.invoiceFr} / ${labels.invoiceAr}` : labels.invoice}</div>
        <div class="invoice-details">
          <p><strong>${labels.invoiceNumber}:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>${labels.date}:</strong> ${formatDateDMY(invoice.date)}</p>
        </div>
      </div>
    </div>
    
    <table class="meta-table">
      <tr>
        <td class="label">${labels.responsible}</td>
        <td>${invoice.responsible}</td>
        <td class="label">${labels.role}</td>
        <td>${invoice.role || '-'}</td>
      </tr>
      <tr>
        <td class="label">${labels.paymentMode}</td>
        <td>${invoice.paymentMode}</td>
        <td class="label">${labels.dueDate}</td>
        <td>${invoice.dueDate ? formatDateDMY(invoice.dueDate) : '-'}</td>
      </tr>
      ${invoice.clientName ? `
      <tr>
        <td class="label">${labels.client}</td>
        <td colspan="3">${invoice.clientName}</td>
      </tr>
      ` : ''}
    </table>
    
    <table>
      <thead>
        <tr>
          <th>${labels.quantity}</th>
          <th>${labels.designation}</th>
          <th>${labels.unitPrice}</th>
          <th>${labels.weightPerUnit}</th>
          <th>${labels.totalWeight}</th>
          <th>${labels.total}</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item: any) => `
          <tr>
            <td>${item.quantity}</td>
            <td>${item.designation}</td>
            <td>${item.unitPrice > 0 ? item.unitPrice.toLocaleString() + ' MRU' : '- MRU'}</td>
            <td>${(item.weightPerUnit || 0).toFixed(2)} kg</td>
            <td>${(item.totalWeight || 0).toFixed(2)} kg</td>
            <td>${item.total > 0 ? item.total.toLocaleString() + ' MRU' : '- MRU'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${labels.totalWeight}:</span>
          <span>${(invoice.totalWeight || 0).toFixed(2)} kg</span>
        </div>
        <div class="totals-row">
          <span>${labels.totalHT}:</span>
          <span>${invoice.totalHT.toLocaleString()} MRU</span>
        </div>
        ${invoice.applyTva ? `
        <div class="totals-row">
          <span>${isArabic ? 'ضريبة القيمة المضافة' : 'TVA'} (${((invoice.tvaRate || 0.19) * 100).toFixed(0)}%):</span>
          <span>${(invoice.tvaAmount || 0).toLocaleString()} MRU</span>
        </div>
        ` : ''}
        <div class="totals-row final">
          <span>${labels.totalTTC}:</span>
          <span>${invoice.totalTTC.toLocaleString()} MRU</span>
        </div>
      </div>
    </div>
    
    <div class="amount-words">
      <strong>${labels.amountInWords}:</strong><br>
      ${amountWords}
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
  `;
}

function generateDeliveryNotePDF(invoice: any, branding: { logo?: string; primaryColor?: string } = {}): string {
  const primaryColor = sanitizeColor(branding.primaryColor || '#1976D2');
  const logo = branding.logo ? sanitizeUrl(branding.logo) : undefined;
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const blNumber = invoice.invoiceNumber.replace('FA-', 'BL-');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bon de Livraison - ${blNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Roboto', sans-serif; font-size: 12px; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${primaryColor}; }
    .company-info h1 { color: ${primaryColor}; font-size: 24px; margin-bottom: 10px; }
    .company-info p { color: #666; font-size: 11px; line-height: 1.6; }
    .logo { max-width: 100px; max-height: 80px; object-fit: contain; }
    .document-title { text-align: center; background: ${primaryColor}; color: white; padding: 15px; font-size: 20px; font-weight: bold; margin-bottom: 30px; letter-spacing: 2px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { padding: 15px; background: #f5f5f5; border-radius: 4px; width: 48%; }
    .info-box h3 { color: ${primaryColor}; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .info-box p { line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: ${primaryColor}; color: white; padding: 12px 8px; text-align: left; font-weight: 500; }
    td { padding: 10px 8px; border-bottom: 1px solid #e0e0e0; }
    tr:nth-child(even) { background: #fafafa; }
    .weight-total { text-align: right; margin-bottom: 40px; }
    .weight-total span { background: ${primaryColor}20; padding: 10px 20px; border-radius: 4px; font-size: 14px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
    .signature-box { width: 45%; text-align: center; }
    .signature-box p { margin-bottom: 60px; font-weight: bold; color: ${primaryColor}; }
    .signature-line { border-top: 2px solid #333; padding-top: 10px; font-size: 11px; color: #666; }
    .note { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 30px; font-style: italic; }
    @media print { body { padding: 0; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>LIMJIBA - لمجيبة</h1>
        <p>Nouakchott, Mauritania<br>
        Tél: +222 00 00 00 00</p>
      </div>
      ${logo ? `<img src="${escapeHtml(logo)}" class="logo" alt="Logo">` : ''}
    </div>

    <div class="document-title">BON DE LIVRAISON</div>

    <div class="info-section">
      <div class="info-box">
        <h3>Informations Document</h3>
        <p><strong>N° BL:</strong> ${blNumber}<br>
        <strong>Date:</strong> ${formatDate(invoice.date)}<br>
        <strong>Facture liée:</strong> ${invoice.invoiceNumber}<br>
        <strong>Responsable:</strong> ${invoice.responsible || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h3>Client</h3>
        <p>${invoice.clientName || 'Client comptoir'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%">Qté</th>
          <th style="width: 50%">Désignation</th>
          <th style="width: 20%">Poids unitaire</th>
          <th style="width: 20%">Poids total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item: any) => `
          <tr>
            <td>${item.quantity}</td>
            <td>${item.designation}</td>
            <td>${(item.weightPerUnit || 0).toFixed(2)} kg</td>
            <td>${(item.totalWeight || 0).toFixed(2)} kg</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="weight-total">
      <span><strong>Poids total:</strong> ${(invoice.totalWeight || 0).toFixed(2)} kg</span>
    </div>

    <div class="note">
      Marchandise livrée en bon état. Toute réclamation doit être faite dans les 48 heures suivant la réception.
    </div>

    <div class="signatures">
      <div class="signature-box">
        <p>Signature du livreur</p>
        <div class="signature-line">Nom et cachet</div>
      </div>
      <div class="signature-box">
        <p>Signature du client</p>
        <div class="signature-line">Lu et approuvé</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateReceiptHTML(sale: any, query: any = {}, reseller: any = null, storeSettings: any = null): string {
  const logo = query.logo || '';
  const primaryColor = sanitizeColor(String(query.primaryColor || '#C9A84C'));
  const companyPhone = escapeHtml(storeSettings?.contactPhone || '+222 XX XX XX XX');
  const companyAddress = escapeHtml(storeSettings?.contactAddress || 'Nouakchott, Mauritania');
  const companyEmail = escapeHtml(storeSettings?.contactEmail || 'support@limjiba.com');
  const companyName = escapeHtml(storeSettings?.storeName ? `${storeSettings.storeName} - لمجيبة` : 'LIMJIBA - لمجيبة');
  
  // Format date as DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };
  
  const paymentLabels: Record<string, string> = {
    'CASH': 'Espèces',
    'CARD': 'Carte',
    'CREDIT': 'Crédit',
    'TRANSFER': 'Virement'
  };
  
  const statusLabels: Record<string, string> = {
    'completed': 'Payé',
    'partial': 'Partiel',
    'credit': 'Crédit',
    'pending': 'En attente'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket de Caisse - ${sale.saleNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Roboto', -apple-system, sans-serif; 
      font-size: 11px; 
      width: 80mm; 
      margin: 0 auto; 
      padding: 10px;
      background: #fff;
      color: #333;
    }
    .header { 
      text-align: center; 
      padding-bottom: 14px; 
      margin-bottom: 12px;
      border-bottom: 3px solid ${primaryColor};
    }
    .logo-container {
      margin-bottom: 10px;
      background: #0A1628;
      border-radius: 12px;
      padding: 10px;
      display: inline-block;
    }
    .logo {
      max-width: 90px;
      max-height: 90px;
      object-fit: contain;
    }
    .company-name { 
      font-size: 20px; 
      font-weight: 800;
      color: ${primaryColor};
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .company-info { 
      font-size: 9px; 
      color: #666;
      line-height: 1.5;
    }
    .company-phone {
      font-size: 12px;
      font-weight: 700;
      color: ${primaryColor};
      margin-top: 6px;
    }
    .receipt-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: 8px 0;
      background: linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10);
      margin: 10px 0;
      border-radius: 6px;
      color: ${primaryColor};
    }
    .info { 
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid ${primaryColor};
    }
    .info-row { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 4px 0;
      font-size: 10px;
    }
    .info-label { color: #666; font-weight: 500; }
    .info-value { font-weight: 600; color: #333; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 12px 0;
    }
    th { 
      font-size: 9px;
      text-transform: uppercase;
      color: #888;
      border-bottom: 2px solid #eee;
      padding: 8px 4px;
      text-align: left;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    th:last-child { text-align: right; }
    td { 
      padding: 8px 4px;
      border-bottom: 1px dashed #e0e0e0;
      vertical-align: middle;
      font-size: 11px;
    }
    td:last-child { 
      text-align: right; 
      font-weight: 600; 
      font-family: 'SF Mono', 'Consolas', monospace;
    }
    .item-name { font-weight: 600; color: #333; }
    .item-qty { 
      color: #888; 
      font-size: 9px; 
      font-family: 'SF Mono', 'Consolas', monospace;
    }
    .totals {
      background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05);
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 11px;
    }
    .totals-row span:last-child {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-weight: 600;
    }
    .totals-row.discount { color: #4caf50; }
    .totals-row.grand-total {
      font-size: 18px;
      font-weight: 800;
      color: ${primaryColor};
      border-top: 2px dashed ${primaryColor}40;
      padding-top: 10px;
      margin-top: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-partial { background: #e3f2fd; color: #1565c0; }
    .status-credit { background: #fff3e0; color: #e65100; }
    .status-pending { background: #f5f5f5; color: #616161; }
    .payment-section {
      margin-top: 8px;
      padding: 10px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid ${primaryColor};
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 11px;
    }
    .payment-row span:first-child { color: #666; font-weight: 500; }
    .payment-row span:last-child { font-weight: 600; font-family: 'SF Mono', 'Consolas', monospace; }
    .payment-row.paid { color: #2e7d32; }
    .payment-row.paid span { color: #2e7d32; }
    .payment-row.remaining { color: #e65100; }
    .payment-row.remaining span { color: #e65100; }
    .payment-row.remaining span:last-child { font-size: 13px; font-weight: 800; }
    .footer { 
      text-align: center; 
      margin-top: 18px;
      padding-top: 14px;
      border-top: 2px dashed #ddd;
    }
    .footer-thanks {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 6px;
    }
    .footer-msg {
      font-size: 10px;
      color: #888;
      font-style: italic;
    }
    .receipt-number {
      text-align: center;
      font-size: 9px;
      color: #aaa;
      margin-top: 12px;
      padding: 6px;
      background: #f5f5f5;
      border-radius: 4px;
      font-family: 'SF Mono', 'Consolas', monospace;
    }
    @media print { 
      body { width: 80mm; padding: 5mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logo ? `<div class="logo-container"><img src="${escapeHtml(logo)}" alt="Logo" class="logo" /></div>` : ''}
    <div class="company-name">${companyName}</div>
    <div class="company-info">${companyAddress}</div>
    ${companyPhone ? `<div class="company-phone">Tel: ${companyPhone}</div>` : ''}
    ${companyEmail ? `<div class="company-info">${companyEmail}</div>` : ''}
  </div>
  
  <div class="receipt-title">Ticket de Caisse</div>
  
  <div class="info">
    <div class="info-row">
      <span class="info-label">N:</span>
      <span class="info-value">${sale.saleNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span class="info-value">${formatDate(sale.date)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Paiement:</span>
      <span class="info-value">${paymentLabels[sale.paymentMode] || sale.paymentMode}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Statut:</span>
      <span class="info-value">
        <span class="status-badge status-${sale.status || 'completed'}">
          ${statusLabels[sale.status || 'completed'] || 'Payé'}
        </span>
      </span>
    </div>
    ${sale.customerName ? `
    <div class="info-row">
      <span class="info-label">Client:</span>
      <span class="info-value">${sale.customerName}</span>
    </div>
    ` : ''}
    ${reseller ? `
    <div class="info-row">
      <span class="info-label">Revendeur:</span>
      <span class="info-value">${reseller.name}</span>
    </div>
    ${reseller.phone ? `
    <div class="info-row">
      <span class="info-label">Tel:</span>
      <span class="info-value">${reseller.phone}</span>
    </div>
    ` : ''}
    <div class="info-row">
      <span class="info-label">Total Achats:</span>
      <span class="info-value">${(reseller.totalPurchases || 0).toLocaleString('fr-FR')} MRU</span>
    </div>
    <div class="info-row">
      <span class="info-label">Progression:</span>
      <span class="info-value">${Math.min(100, ((reseller.totalPurchases || 0) / (reseller.rewardThreshold || 100000) * 100)).toFixed(1)}%</span>
    </div>
    ` : ''}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th>Qté</th>
        <th>Prix</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((item: any) => `
        <tr>
          <td class="item-name">${item.productName}</td>
          <td class="item-qty">${item.quantity}</td>
          <td>${item.total.toLocaleString('fr-FR')} MRU</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span>Sous-total:</span>
      <span>${(sale.total + (sale.discount || 0)).toLocaleString('fr-FR')} MRU</span>
    </div>
    ${sale.discount > 0 ? `
    <div class="totals-row discount">
      <span>Remise:</span>
      <span>-${sale.discount.toLocaleString('fr-FR')} MRU</span>
    </div>
    ` : ''}
    <div class="totals-row grand-total">
      <span>TOTAL:</span>
      <span>${sale.total.toLocaleString('fr-FR')} MRU</span>
    </div>
  </div>
  
  ${(() => {
    const amountPaid = Number(sale.amountPaid) || 0;
    const remaining = Math.max(0, Math.round((sale.total - amountPaid) * 100) / 100);
    const status = sale.status || 'completed';
    if (status === 'completed' && amountPaid >= sale.total) {
      return `
      <div class="payment-section">
        <div class="payment-row paid">
          <span>Montant Payé:</span>
          <span>${sale.total.toLocaleString('fr-FR')} MRU</span>
        </div>
        <div class="payment-row paid" style="font-weight:700;">
          <span>Statut:</span>
          <span style="font-family:inherit;">PAYÉ EN TOTALITÉ</span>
        </div>
      </div>`;
    } else if (status === 'partial' || (amountPaid > 0 && amountPaid < sale.total)) {
      return `
      <div class="payment-section">
        <div class="payment-row paid">
          <span>Montant Payé:</span>
          <span>${amountPaid.toLocaleString('fr-FR')} MRU</span>
        </div>
        <div class="payment-row remaining">
          <span>Reste à Payer:</span>
          <span>${remaining.toLocaleString('fr-FR')} MRU</span>
        </div>
      </div>`;
    } else if (status === 'credit' || amountPaid === 0) {
      return `
      <div class="payment-section">
        <div class="payment-row">
          <span>Montant Payé:</span>
          <span>0 MRU</span>
        </div>
        <div class="payment-row remaining">
          <span>Crédit Restant:</span>
          <span>${sale.total.toLocaleString('fr-FR')} MRU</span>
        </div>
      </div>`;
    }
    return '';
  })()}
  
  <div class="footer">
    <div class="footer-thanks">Merci pour votre achat!</div>
    <div class="footer-msg">A bientot chez ${companyName}</div>
  </div>
  
  <div class="receipt-number">${sale.saleNumber}</div>
  
  <button class="no-print print-btn" onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:10px 20px;background:${primaryColor};color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">Imprimer</button>
  
  <script>
    // Ensure print happens even if logo fails to load
    var printed = false;
    function triggerPrint() {
      if (!printed) {
        printed = true;
        setTimeout(function() { window.print(); }, 100);
      }
    }
    
    // Handle logo loading
    var logo = document.querySelector('.logo');
    if (logo) {
      logo.onload = triggerPrint;
      logo.onerror = function() {
        this.style.display = 'none';
        triggerPrint();
      };
      // Fallback timeout in case image is slow
      setTimeout(triggerPrint, 2000);
    } else {
      triggerPrint();
    }
  </script>
</body>
</html>
  `;
}
