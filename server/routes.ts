import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertSaleSchema, insertSaleItemSchema, insertResellerSchema } from "@shared/schema";
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

      const html = generateInvoicePDF(invoice);
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

function generateInvoicePDF(invoice: any): string {
  const itemRows = invoice.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.designation}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.unitPrice > 0 ? item.unitPrice.toLocaleString() + ' DZD' : '- DZD'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.total > 0 ? item.total.toLocaleString() + ' DZD' : '- DZD'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: 'Roboto', Arial, sans-serif; margin: 0; padding: 40px; background: #fff; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #1976D2; padding-bottom: 20px; }
    .company { }
    .company h1 { color: #1976D2; margin: 0; font-size: 24px; }
    .company p { margin: 5px 0; color: #666; font-size: 12px; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { color: #1976D2; margin: 0; }
    .invoice-info p { margin: 5px 0; font-size: 12px; }
    .meta-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
    .meta-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .meta-table .label { background: #f5f5f5; font-weight: 500; width: 150px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #1976D2; color: white; padding: 10px; text-align: left; font-size: 12px; }
    .items-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    .items-table tr:nth-child(even) { background: #f9f9f9; }
    .totals { text-align: right; margin-top: 20px; }
    .totals p { margin: 5px 0; font-size: 14px; }
    .totals .grand-total { font-size: 18px; font-weight: bold; color: #1976D2; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer p { font-size: 12px; color: #666; margin: 5px 0; }
    .signature { margin-top: 40px; text-align: right; }
    .signature p { margin: 5px 0; font-size: 12px; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #1976D2; color: white; border: none; cursor: pointer; border-radius: 4px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="header">
    <div class="company">
      <h1>POLY FLECTA PLASTICA</h1>
      <p>FABRICATION D'EMBALLAGE EN PLASTIQUE</p>
      <p>Village Zaitout, Local N°01, Commune Hammam Dalaa - W M'sila</p>
      <p>CARTE ARTISAN N° : 28/ 00 - 2896688A24</p>
      <p>N° ARTICLE : 101082709</p>
      <p>N° FISCAL : 28516010001318002800</p>
    </div>
    <div class="invoice-info">
      <h2>FACTURE</h2>
      <p><strong>N°:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${invoice.date}</p>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Responsible</td>
      <td>${invoice.responsible}</td>
      <td class="label">Role</td>
      <td>${invoice.role}</td>
    </tr>
    <tr>
      <td class="label">Mode de Paiement</td>
      <td>${invoice.paymentMode}</td>
      <td class="label">Échéance</td>
      <td>${invoice.dueDate || 'À déterminer'}</td>
    </tr>
    ${invoice.clientName ? `
    <tr>
      <td class="label">Client</td>
      <td colspan="3">${invoice.clientName}</td>
    </tr>
    ` : ''}
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 80px;">Qté</th>
        <th>Désignation</th>
        <th style="width: 120px; text-align: right;">Prix U</th>
        <th style="width: 120px; text-align: right;">Montant</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <p>TOTAL H.T: <strong>${invoice.totalHT.toLocaleString()} DZD</strong></p>
    <p class="grand-total">TOTAL T.T.C: ${invoice.totalTTC.toLocaleString()} DZD</p>
  </div>

  <div class="footer">
    <p><strong>Arrêter la présente facture à la somme de:</strong></p>
    <p style="font-style: italic;">${numberToFrenchWords(Math.floor(invoice.totalTTC))}</p>
    <p><strong>MODE DE PAIEMENT:</strong> ${invoice.paymentMode}</p>
  </div>

  <div class="signature">
    <p>Cachet & Signature</p>
    <div style="width: 150px; height: 80px; border: 1px solid #ddd; margin-left: auto;"></div>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1976D2; font-size: 11px; color: #666;">
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
