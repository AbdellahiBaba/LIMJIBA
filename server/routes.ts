import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProductSchema, 
  insertInvoiceSchema, 
  insertInvoiceItemSchema, 
  insertSaleSchema, 
  insertSaleItemSchema, 
  insertResellerSchema,
  insertEmployeeSchema,
  insertSalaryPaymentSchema,
  insertExpenseSchema,
  insertFabricationInvoiceSchema,
  insertFabricationItemSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to get product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to get invoices" });
    }
  });

  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextInvoiceNumber();
      res.json({ nextNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next invoice number" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { invoice, items } = req.body;
      const invoiceData = insertInvoiceSchema.parse(invoice);
      const itemsData = z.array(insertInvoiceItemSchema).parse(items);
      const created = await storage.createInvoice(invoiceData, itemsData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const invoice = await storage.updateInvoiceStatus(req.params.id, status);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice status" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
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
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sale" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const { sale, items } = req.body;
      const saleData = insertSaleSchema.parse(sale);
      const itemsData = z.array(insertSaleItemSchema).parse(items);
      const created = await storage.createSale(saleData, itemsData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  app.get("/api/sales/:id/receipt", async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const html = generateReceiptHTML(sale);
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate receipt" });
    }
  });

  app.get("/api/resellers", async (req, res) => {
    try {
      const resellers = await storage.getResellers();
      res.json(resellers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get resellers" });
    }
  });

  app.get("/api/resellers/:id", async (req, res) => {
    try {
      const reseller = await storage.getReseller(req.params.id);
      if (!reseller) {
        return res.status(404).json({ error: "Reseller not found" });
      }
      res.json(reseller);
    } catch (error) {
      res.status(500).json({ error: "Failed to get reseller" });
    }
  });

  app.post("/api/resellers", async (req, res) => {
    try {
      const data = insertResellerSchema.parse(req.body);
      const reseller = await storage.createReseller(data);
      res.status(201).json(reseller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create reseller" });
    }
  });

  app.patch("/api/resellers/:id", async (req, res) => {
    try {
      const data = insertResellerSchema.partial().parse(req.body);
      const reseller = await storage.updateReseller(req.params.id, data);
      if (!reseller) {
        return res.status(404).json({ error: "Reseller not found" });
      }
      res.json(reseller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update reseller" });
    }
  });

  app.delete("/api/resellers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReseller(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Reseller not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reseller" });
    }
  });

  app.post("/api/resellers/draw-winner", async (req, res) => {
    try {
      const winner = await storage.drawWinner();
      if (!winner) {
        return res.status(400).json({ error: "No eligible resellers in reward pool" });
      }
      res.json(winner);
    } catch (error) {
      res.status(500).json({ error: "Failed to draw winner" });
    }
  });

  app.post("/api/resellers/reset-pool", async (req, res) => {
    try {
      await storage.resetRewardPool();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to reset pool" });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const allEmployees = await storage.getEmployees();
      res.json(allEmployees);
    } catch (error) {
      res.status(500).json({ error: "Failed to get employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to get employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, data);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Salary Payment routes
  app.get("/api/salary-payments", async (req, res) => {
    try {
      const payments = await storage.getSalaryPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to get salary payments" });
    }
  });

  app.post("/api/salary-payments", async (req, res) => {
    try {
      const data = insertSalaryPaymentSchema.parse(req.body);
      const payment = await storage.createSalaryPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create salary payment" });
    }
  });

  app.delete("/api/salary-payments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSalaryPayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete salary payment" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const allExpenses = await storage.getExpenses();
      res.json(allExpenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to get expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const data = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const data = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, data);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Fabrication Invoice routes
  app.get("/api/fabrication-invoices", async (req, res) => {
    try {
      const fabricationInvoices = await storage.getFabricationInvoices();
      res.json(fabricationInvoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to get fabrication invoices" });
    }
  });

  app.get("/api/fabrication-invoices/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextFabricationNumber();
      res.json({ nextNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next fabrication number" });
    }
  });

  app.get("/api/fabrication-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getFabricationInvoiceWithItems(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Fabrication invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to get fabrication invoice" });
    }
  });

  app.post("/api/fabrication-invoices", async (req, res) => {
    try {
      const { invoice, items } = req.body;
      const invoiceData = insertFabricationInvoiceSchema.parse(invoice);
      const itemsData = z.array(insertFabricationItemSchema).parse(items);
      const created = await storage.createFabricationInvoice(invoiceData, itemsData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create fabrication invoice" });
    }
  });

  app.delete("/api/fabrication-invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFabricationInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Fabrication invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete fabrication invoice" });
    }
  });

  // Profit Stats route
  app.get("/api/profit-stats", async (req, res) => {
    try {
      const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const endDate = (req.query.endDate as string) || new Date().toISOString().split("T")[0];
      const stats = await storage.getProfitStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get profit stats" });
    }
  });

  return httpServer;
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
    number: isArabic ? "رقم" : "N°",
    date: isArabic ? "التاريخ" : "Date",
    responsible: isArabic ? "المسؤول" : "Responsible",
    role: isArabic ? "الوظيفة" : "Role",
    paymentMode: isArabic ? "طريقة الدفع" : "Mode de Paiement",
    dueDate: isArabic ? "تاريخ الاستحقاق" : "Échéance",
    client: isArabic ? "العميل" : "Client",
    qty: isArabic ? "الكمية" : "Qté",
    designation: isArabic ? "الوصف" : "Désignation",
    unitPrice: isArabic ? "سعر الوحدة" : "Prix U",
    amount: isArabic ? "المبلغ" : "Montant",
    totalHT: isArabic ? "المجموع (قبل الضريبة)" : "TOTAL H.T",
    totalTTC: isArabic ? "المجموع الكلي" : "TOTAL T.T.C",
    amountInWords: isArabic ? "المبلغ بالحروف" : "Arrêter la présente facture à la somme de",
    signature: isArabic ? "الختم والتوقيع" : "Cachet & Signature",
    tbd: isArabic ? "سيتم تحديده" : "À déterminer",
    companyName: "POLY FLECTA PLASTICA",
    companyNameAr: "بولي فليكتا بلاستيكا",
    tagline: isArabic ? "تصنيع عبوات بلاستيكية" : "FABRICATION D'EMBALLAGE EN PLASTIQUE",
  };

  const amountInWords = isArabic 
    ? numberToArabicWords(Math.floor(invoice.totalTTC)) + " دينار جزائري"
    : numberToFrenchWords(Math.floor(invoice.totalTTC)) + " dinars";

  const itemRows = invoice.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; ${isArabic ? 'text-align: right;' : ''}">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd; ${isArabic ? 'text-align: right;' : ''}">${item.designation}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: ${isArabic ? 'left' : 'right'};">${item.unitPrice > 0 ? item.unitPrice.toLocaleString() + ' DZD' : '- DZD'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: ${isArabic ? 'left' : 'right'};">${item.total > 0 ? item.total.toLocaleString() + ' DZD' : '- DZD'}</td>
    </tr>
  `).join('');

  const logoHtml = branding.logo 
    ? `<img src="${branding.logo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />`
    : `<div style="width: 60px; height: 60px; background: ${branding.primaryColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">PFP</div>`;

  const watermarkHtml = branding.enableWatermark && branding.watermark 
    ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: ${branding.watermarkOpacity};">
        <img src="${branding.watermark}" alt="Watermark" style="max-width: 400px; max-height: 400px;" />
       </div>`
    : '';

  const logoPositionStyle = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end'
  }[branding.logoPosition];

  const bilingualHeader = isBilingual ? `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="text-align: left;">
        <h1 style="color: ${branding.primaryColor}; margin: 0; font-size: 20px;">POLY FLECTA PLASTICA</h1>
        <p style="margin: 2px 0; font-size: 11px;">FABRICATION D'EMBALLAGE EN PLASTIQUE</p>
      </div>
      <div style="text-align: right; direction: rtl; font-family: 'Cairo', sans-serif;">
        <h1 style="color: ${branding.primaryColor}; margin: 0; font-size: 20px;">بولي فليكتا بلاستيكا</h1>
        <p style="margin: 2px 0; font-size: 11px;">تصنيع عبوات بلاستيكية</p>
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${isArabic ? 'ar' : 'fr'}">
<head>
  <meta charset="UTF-8">
  <title>${labels.invoice} ${invoice.invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: ${fontFamily}; margin: 0; padding: 40px; background: #fff; color: #333; direction: ${dir}; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid ${branding.primaryColor}; padding-bottom: 20px; }
    .company h1 { color: ${branding.primaryColor}; margin: 0; font-size: 24px; }
    .company p { margin: 5px 0; color: #666; font-size: 12px; }
    .invoice-info { text-align: ${isArabic ? 'left' : 'right'}; }
    .invoice-info h2 { color: ${branding.primaryColor}; margin: 0; }
    .invoice-info p { margin: 5px 0; font-size: 12px; }
    .meta-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
    .meta-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .meta-table .label { background: #f5f5f5; font-weight: 500; width: 150px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: ${branding.primaryColor}; color: white; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; font-size: 12px; }
    .items-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .items-table tr:nth-child(even) { background: #f9f9f9; }
    .totals { text-align: ${isArabic ? 'left' : 'right'}; margin-top: 20px; }
    .totals p { margin: 5px 0; font-size: 14px; }
    .totals .grand-total { font-size: 18px; font-weight: bold; color: ${branding.primaryColor}; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer p { font-size: 12px; color: #666; margin: 5px 0; }
    .signature { margin-top: 40px; text-align: ${isArabic ? 'left' : 'right'}; }
    .signature p { margin: 5px 0; font-size: 12px; }
    .print-btn { position: fixed; top: 20px; ${isArabic ? 'left' : 'right'}: 20px; padding: 10px 20px; background: ${branding.primaryColor}; color: white; border: none; cursor: pointer; border-radius: 4px; }
    @media print { .print-btn { display: none; } }
    .logo-container { display: flex; justify-content: ${logoPositionStyle}; margin-bottom: 10px; }
  </style>
</head>
<body>
  ${watermarkHtml}
  <button class="print-btn" onclick="window.print()">${isArabic ? 'طباعة' : 'Print / Save as PDF'}</button>
  
  ${isBilingual ? bilingualHeader : ''}
  
  <div class="header">
    <div class="company" style="${branding.logoPosition === 'left' ? '' : 'order: 2;'}">
      ${branding.logoPosition === 'left' ? logoHtml : ''}
      <h1>${isBilingual ? '' : (isArabic ? labels.companyNameAr : labels.companyName)}</h1>
      ${!isBilingual ? `<p>${labels.tagline}</p>` : ''}
      <p>Village Zaitout, Local N°01, Commune Hammam Dalaa - W M'sila</p>
      <p>CARTE ARTISAN N° : 28/ 00 - 2896688A24</p>
      <p>N° ARTICLE : 101082709</p>
      <p>N° FISCAL : 28516010001318002800</p>
    </div>
    <div class="invoice-info" style="${branding.logoPosition === 'right' ? '' : ''}">
      ${branding.logoPosition === 'right' ? logoHtml : ''}
      <h2>${isBilingual ? labels.invoiceFr + ' / ' + labels.invoiceAr : labels.invoice}</h2>
      <p><strong>${labels.number}:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>${labels.date}:</strong> ${invoice.date}</p>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">${labels.responsible}</td>
      <td>${invoice.responsible}</td>
      <td class="label">${labels.role}</td>
      <td>${invoice.role}</td>
    </tr>
    <tr>
      <td class="label">${labels.paymentMode}</td>
      <td>${invoice.paymentMode}</td>
      <td class="label">${labels.dueDate}</td>
      <td>${invoice.dueDate || labels.tbd}</td>
    </tr>
    ${invoice.clientName ? `
    <tr>
      <td class="label">${labels.client}</td>
      <td colspan="3">${invoice.clientName}</td>
    </tr>
    ` : ''}
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 80px;">${labels.qty}</th>
        <th>${labels.designation}</th>
        <th style="width: 120px; text-align: ${isArabic ? 'left' : 'right'};">${labels.unitPrice}</th>
        <th style="width: 120px; text-align: ${isArabic ? 'left' : 'right'};">${labels.amount}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <p>${labels.totalHT}: <strong>${invoice.totalHT.toLocaleString()} DZD</strong></p>
    <p class="grand-total">${labels.totalTTC}: ${invoice.totalTTC.toLocaleString()} DZD</p>
  </div>

  <div class="footer">
    <p><strong>${labels.amountInWords}:</strong></p>
    <p style="font-style: italic;">${amountInWords}</p>
    ${isBilingual ? `<p style="font-style: italic; direction: rtl; font-family: 'Cairo', sans-serif;">${numberToArabicWords(Math.floor(invoice.totalTTC))} دينار جزائري</p>` : ''}
    <p><strong>${labels.paymentMode}:</strong> ${invoice.paymentMode}</p>
  </div>

  <div class="signature">
    <p>${labels.signature}</p>
    <div style="width: 150px; height: 80px; border: 1px solid #ddd; margin-${isArabic ? 'right' : 'left'}: auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid ${branding.primaryColor}; font-size: 11px; color: #666;">
    <p>www.polyflectaplastica.com | contact@polyflectaplastica.com | +213 6 70 04 91 24</p>
  </div>
</body>
</html>
  `;
}

function generateReceiptHTML(sale: any): string {
  const itemRows = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0;">${item.productName}</td>
      <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 4px 0; text-align: right;">${item.total.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${sale.saleNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: 80mm auto; margin: 0; }
    }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; background: #fff; color: #000; width: 280px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 15px; }
    .header h1 { font-size: 14px; margin: 0; }
    .header p { margin: 2px 0; font-size: 10px; }
    .divider { border-top: 1px dashed #000; margin: 10px 0; }
    .items { width: 100%; }
    .items td { padding: 4px 0; font-size: 11px; }
    .totals { margin-top: 10px; }
    .totals p { margin: 4px 0; display: flex; justify-content: space-between; }
    .total-line { font-weight: bold; font-size: 14px; }
    .footer { text-align: center; margin-top: 15px; font-size: 10px; }
    .print-btn { position: fixed; top: 10px; right: 10px; padding: 8px 16px; background: #1976D2; color: white; border: none; cursor: pointer; border-radius: 4px; font-size: 12px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print</button>

  <div class="header">
    <h1>POLY FLECTA PLASTICA</h1>
    <p>Hammam Dalaa - M'sila</p>
    <p>+213 6 70 04 91 24</p>
  </div>

  <div class="divider"></div>

  <p style="text-align: center; font-size: 10px;">
    ${sale.saleNumber}<br>
    ${new Date(sale.date).toLocaleDateString()} ${new Date().toLocaleTimeString()}
  </p>

  <div class="divider"></div>

  <table class="items">
    <thead>
      <tr>
        <th style="text-align: left;">Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="totals">
    ${sale.discount > 0 ? `
    <p><span>Subtotal:</span><span>${(sale.total + sale.discount).toLocaleString()} DZD</span></p>
    <p><span>Discount:</span><span>-${sale.discount.toLocaleString()} DZD</span></p>
    ` : ''}
    <p class="total-line"><span>TOTAL:</span><span>${sale.total.toLocaleString()} DZD</span></p>
    <p><span>Payment:</span><span>${sale.paymentMode}</span></p>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p>www.polyflectaplastica.com</p>
  </div>
</body>
</html>
  `;
}
