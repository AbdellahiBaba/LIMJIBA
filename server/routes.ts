import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import puppeteer from "puppeteer";
import { storage } from "./storage";
import { isTransientError, checkDatabaseHealth, getPoolStats } from "./db";
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
} from "@shared/schema";
import { z } from "zod";

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

function logError(context: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  console.error(`[${context}] Error:`, errorMessage);
  if (errorStack) {
    console.error(`[${context}] Stack:`, errorStack);
  }
  return errorMessage;
}

function handleError(res: any, context: string, error: unknown, defaultStatus: number = 500) {
  const errorMessage = logError(context, error);
  
  // Handle Zod validation errors - 400 Bad Request
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      error: "Validation failed", 
      details: error.errors,
      message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
  }
  
  // For transient DB errors (after retries failed), return 500 not 503
  // This ensures API always responds and never blocks due to DB status
  if (isTransientError(error)) {
    return res.status(500).json({ 
      error: "Database operation failed", 
      details: "The operation could not be completed. Please try again.",
      retryable: true
    });
  }
  
  // Handle PostgreSQL constraint violations - 409 Conflict
  const pgError = error as any;
  if (pgError?.code === '23505') { // Unique violation
    return res.status(409).json({
      error: "Duplicate entry",
      details: pgError?.detail || errorMessage
    });
  }
  if (pgError?.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: "Referenced record not found",
      details: pgError?.detail || errorMessage
    });
  }
  if (pgError?.code === '23502') { // Not null violation
    return res.status(400).json({
      error: "Required field missing",
      details: pgError?.detail || errorMessage
    });
  }
  
  // All other errors - return appropriate status
  return res.status(defaultStatus).json({ 
    error: `Failed to ${context}`, 
    details: errorMessage 
  });
}

const statusSchema = z.object({
  status: z.enum(["pending", "unpaid", "paid", "cancelled"])
});

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
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.isAdmin;
        req.session.isAuthenticated = true;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save error" });
          }
          
          res.json({ 
            success: true, 
            user: { 
              id: user.id, 
              username: user.username, 
              isAdmin: user.isAdmin 
            } 
          });
        });
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
        },
      });
    } else {
      res.json({ isAuthenticated: false });
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
      const { value } = req.body;
      if (typeof value !== "string") {
        return res.status(400).json({ error: "Value must be a string" });
      }
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

      const branding = {
        logo: req.query.logo as string | undefined,
        watermark: req.query.watermark as string | undefined,
        enableWatermark: req.query.enableWatermark === "true",
        watermarkOpacity: parseFloat(req.query.watermarkOpacity as string) || 0.12,
        logoPosition: (req.query.logoPosition as "left" | "center" | "right") || "left",
        primaryColor: (req.query.primaryColor as string) || "#1976D2",
        accentColor: (req.query.accentColor as string) || "#42A5F5",
        invoiceLanguage: (req.query.invoiceLanguage as "fr" | "ar" | "bilingual") || "fr",
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
        logo: req.query.logo as string | undefined,
        primaryColor: (req.query.primaryColor as string) || "#1976D2",
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

      const html = generateReceiptHTML(sale, req.query, reseller);

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
      res.status(201).json(product);
    } catch (error) {
      handleError(res, "create product", error);
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      console.log("[PATCH /api/products] Received:", JSON.stringify(req.body));
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, data);
      if (!product) {
        return res.status(404).json({ error: "Product not found", id: req.params.id });
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
      const { productId, quantity, reason, reference, createdBy } = req.body;
      if (!productId || quantity === undefined || !reason) {
        return res.status(400).json({ error: "productId, quantity, and reason are required" });
      }
      const result = await storage.adjustStock(productId, quantity, reason, reference, createdBy);
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
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ error: "csvData is required" });
      }

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
      const created = await storage.createSale(saleData, itemsData);
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

      const html = generateReceiptHTML(sale, req.query, reseller);
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      handleError(res, "generate receipt", error);
    }
  });

  app.patch("/api/sales/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Missing status" });
      }
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
      res.status(204).send();
    } catch (error) {
      handleError(res, "delete sale", error);
    }
  });

  // CSV Export endpoints
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
      const { amount } = req.body;
      if (typeof amount !== 'number') {
        return res.status(400).json({ error: "Amount must be a number" });
      }
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
    companyName: "POLY FLECTA PLASTICA",
    companySubtitle: isArabic ? "تصنيع التغليف البلاستيكي" : "FABRICATION D'EMBALLAGE EN PLASTIQUE",
    weightPerUnit: isArabic ? "الوزن/الوحدة" : "Poids/U",
    totalWeight: isArabic ? "الوزن الكلي" : "Poids Total",
  };

  const amountWords = isArabic 
    ? numberToArabicWords(Math.floor(invoice.totalTTC)) + " دينار جزائري"
    : numberToFrenchWords(Math.floor(invoice.totalTTC)) + " dinars algériens";

  const logoHtml = branding.logo ? `<img src="${branding.logo}" style="max-height: 60px; max-width: 150px;" />` : '';
  
  const logoAlignment = branding.logoPosition === "center" ? "center" : branding.logoPosition === "right" ? "flex-end" : "flex-start";

  const watermarkHtml = branding.enableWatermark && branding.watermark ? `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: ${branding.watermarkOpacity}; z-index: -1; pointer-events: none;">
      <img src="${branding.watermark}" style="max-width: 400px; max-height: 400px;" />
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
        <p style="margin-top: 10px;">M'sila, Hammam Dalaa</p>
        <p>Tel: 0670 04 91 24</p>
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
            <td>${item.unitPrice > 0 ? item.unitPrice.toLocaleString() + ' DZD' : '- DZD'}</td>
            <td>${(item.weightPerUnit || 0).toFixed(2)} kg</td>
            <td>${(item.totalWeight || 0).toFixed(2)} kg</td>
            <td>${item.total > 0 ? item.total.toLocaleString() + ' DZD' : '- DZD'}</td>
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
          <span>${invoice.totalHT.toLocaleString()} DZD</span>
        </div>
        ${invoice.applyTva ? `
        <div class="totals-row">
          <span>${isArabic ? 'ضريبة القيمة المضافة' : 'TVA'} (${((invoice.tvaRate || 0.19) * 100).toFixed(0)}%):</span>
          <span>${(invoice.tvaAmount || 0).toLocaleString()} DZD</span>
        </div>
        ` : ''}
        <div class="totals-row final">
          <span>${labels.totalTTC}:</span>
          <span>${invoice.totalTTC.toLocaleString()} DZD</span>
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
  const primaryColor = branding.primaryColor || '#1976D2';
  const logo = branding.logo;
  
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
        <h1>POLY FLECTA PLASTICA</h1>
        <p>M'sila, Hammam Dalaa<br>
        Tél: 0670 04 91 24</p>
      </div>
      ${logo ? `<img src="${logo}" class="logo" alt="Logo">` : ''}
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

function generateReceiptHTML(sale: any, query: any = {}, reseller: any = null): string {
  const logo = query.logo || '';
  const primaryColor = query.primaryColor || '#1976D2';
  const companyPhone = '0670 04 91 24';
  const companyAddress = 'M\'sila, Hammam Dalaa';
  const companyName = 'POLY FLECTA PLASTICA';
  
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
    }
    .logo {
      max-width: 70px;
      max-height: 70px;
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
    .status-credit { background: #fff3e0; color: #e65100; }
    .status-pending { background: #f5f5f5; color: #616161; }
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
    ${logo ? `<div class="logo-container"><img src="${logo}" alt="Logo" class="logo" /></div>` : ''}
    <div class="company-name">${companyName}</div>
    <div class="company-info">${companyAddress}</div>
    <div class="company-phone">Tel: ${companyPhone}</div>
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
      <span class="info-value">${(reseller.totalPurchases || 0).toLocaleString('fr-FR')} DA</span>
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
          <td>${item.total.toLocaleString('fr-FR')} DA</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span>Sous-total:</span>
      <span>${(sale.total + (sale.discount || 0)).toLocaleString('fr-FR')} DA</span>
    </div>
    ${sale.discount > 0 ? `
    <div class="totals-row discount">
      <span>Remise:</span>
      <span>-${sale.discount.toLocaleString('fr-FR')} DA</span>
    </div>
    ` : ''}
    <div class="totals-row grand-total">
      <span>TOTAL:</span>
      <span>${sale.total.toLocaleString('fr-FR')} DA</span>
    </div>
  </div>
  
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
