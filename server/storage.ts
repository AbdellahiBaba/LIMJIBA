import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type Reseller,
  type InsertReseller,
  type InvoiceWithItems,
  type SaleWithItems,
  type DashboardStats,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  updateStock(id: string, quantity: number): Promise<Product | undefined>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceWithItems(id: string): Promise<InvoiceWithItems | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getNextInvoiceNumber(): Promise<string>;

  getSales(): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  getSaleWithItems(id: string): Promise<SaleWithItems | undefined>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems>;

  getResellers(): Promise<Reseller[]>;
  getReseller(id: string): Promise<Reseller | undefined>;
  createReseller(reseller: InsertReseller): Promise<Reseller>;
  updateReseller(id: string, reseller: Partial<InsertReseller>): Promise<Reseller | undefined>;
  deleteReseller(id: string): Promise<boolean>;
  addResellerPurchase(id: string, amount: number): Promise<Reseller | undefined>;
  drawWinner(): Promise<Reseller | undefined>;
  resetRewardPool(): Promise<void>;

  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private invoices: Map<string, Invoice>;
  private invoiceItems: Map<string, InvoiceItem>;
  private sales: Map<string, Sale>;
  private saleItems: Map<string, SaleItem>;
  private resellers: Map<string, Reseller>;
  private invoiceCounter: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.sales = new Map();
    this.saleItems = new Map();
    this.resellers = new Map();
    this.invoiceCounter = 0;

    this.seedData();
  }

  private seedData() {
    const sampleProducts: InsertProduct[] = [
      { name: "Sac en plastique, 1KG", category: "Sacs en plastique", unitPrice: 217, stockQuantity: 500, lowStockThreshold: 50, unit: "pcs" },
      { name: "Sac en plastique, 3KG", category: "Sacs en plastique", unitPrice: 320, stockQuantity: 300, lowStockThreshold: 30, unit: "pcs" },
      { name: "Sac en plastique, 5KG", category: "Sacs en plastique", unitPrice: 265, stockQuantity: 800, lowStockThreshold: 80, unit: "pcs" },
      { name: "Sac en plastique, 10KG", category: "Sacs en plastique", unitPrice: 450, stockQuantity: 200, lowStockThreshold: 20, unit: "pcs" },
      { name: "Sac en plastique Imprimer, 15KG", category: "Sacs en plastique", unitPrice: 395, stockQuantity: 150, lowStockThreshold: 15, unit: "pcs" },
      { name: "Sac en plastique pour le pain", category: "Emballage alimentaire", unitPrice: 180, stockQuantity: 1000, lowStockThreshold: 100, unit: "pcs" },
      { name: "Sac en plastique pour le pain AR", category: "Emballage alimentaire", unitPrice: 195, stockQuantity: 800, lowStockThreshold: 80, unit: "pcs" },
      { name: "Sac en plastique 25KG", category: "Emballage industriel", unitPrice: 550, stockQuantity: 100, lowStockThreshold: 10, unit: "pcs" },
    ];

    for (const product of sampleProducts) {
      const id = randomUUID();
      this.products.set(id, { ...product, id });
    }

    const sampleResellers: InsertReseller[] = [
      { name: "Ahmed Boudiaf", phone: "+213 555 123 456", email: "ahmed@example.com", totalPurchases: 85000, rewardThreshold: 100000, inRewardPool: false, isWinner: false },
      { name: "Fatima Zahra", phone: "+213 555 234 567", email: "fatima@example.com", totalPurchases: 120000, rewardThreshold: 100000, inRewardPool: true, isWinner: false },
      { name: "Mohamed Cherif", phone: "+213 555 345 678", email: "mohamed@example.com", totalPurchases: 45000, rewardThreshold: 100000, inRewardPool: false, isWinner: false },
    ];

    for (const reseller of sampleResellers) {
      const id = randomUUID();
      this.resellers.set(id, { ...reseller, id, wonAt: null });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, stockQuantity: existing.stockQuantity + quantity };
    this.products.set(id, updated);
    return updated;
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceWithItems(id: string): Promise<InvoiceWithItems | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    const items = Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === id
    );
    return { ...invoice, items };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    const id = randomUUID();
    const newInvoice: Invoice = { ...invoice, id };
    this.invoices.set(id, newInvoice);
    this.invoiceCounter++;

    const createdItems: InvoiceItem[] = [];
    for (const item of items) {
      const itemId = randomUUID();
      const newItem: InvoiceItem = { ...item, id: itemId, invoiceId: id };
      this.invoiceItems.set(itemId, newItem);
      createdItems.push(newItem);
    }

    return { ...newInvoice, items: createdItems };
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const items = Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === id
    );
    for (const item of items) {
      this.invoiceItems.delete(item.id);
    }
    return this.invoices.delete(id);
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.invoiceCounter + 1;
    return `${count.toString().padStart(4, "0")}/${year}`;
  }

  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getSale(id: string): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async getSaleWithItems(id: string): Promise<SaleWithItems | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;
    const items = Array.from(this.saleItems.values()).filter(
      (item) => item.saleId === id
    );
    return { ...sale, items };
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    const id = randomUUID();
    const newSale: Sale = { ...sale, id };
    this.sales.set(id, newSale);

    const createdItems: SaleItem[] = [];
    for (const item of items) {
      const itemId = randomUUID();
      const newItem: SaleItem = { ...item, id: itemId, saleId: id };
      this.saleItems.set(itemId, newItem);
      createdItems.push(newItem);

      const product = this.products.get(item.productId);
      if (product) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        this.products.set(item.productId, product);
      }
    }

    if (sale.resellerId) {
      await this.addResellerPurchase(sale.resellerId, sale.total);
    }

    return { ...newSale, items: createdItems };
  }

  async getResellers(): Promise<Reseller[]> {
    return Array.from(this.resellers.values());
  }

  async getReseller(id: string): Promise<Reseller | undefined> {
    return this.resellers.get(id);
  }

  async createReseller(reseller: InsertReseller): Promise<Reseller> {
    const id = randomUUID();
    const newReseller: Reseller = { ...reseller, id, wonAt: null };
    this.resellers.set(id, newReseller);
    return newReseller;
  }

  async updateReseller(id: string, reseller: Partial<InsertReseller>): Promise<Reseller | undefined> {
    const existing = this.resellers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...reseller };
    this.resellers.set(id, updated);
    return updated;
  }

  async deleteReseller(id: string): Promise<boolean> {
    return this.resellers.delete(id);
  }

  async addResellerPurchase(id: string, amount: number): Promise<Reseller | undefined> {
    const existing = this.resellers.get(id);
    if (!existing) return undefined;
    const newTotal = existing.totalPurchases + amount;
    const inRewardPool = !existing.isWinner && newTotal >= existing.rewardThreshold;
    const updated = { ...existing, totalPurchases: newTotal, inRewardPool };
    this.resellers.set(id, updated);
    return updated;
  }

  async drawWinner(): Promise<Reseller | undefined> {
    const eligible = Array.from(this.resellers.values()).filter(
      (r) => r.inRewardPool && !r.isWinner
    );
    if (eligible.length === 0) return undefined;

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const updated: Reseller = {
      ...winner,
      isWinner: true,
      inRewardPool: false,
      wonAt: new Date().toISOString(),
    };
    this.resellers.set(winner.id, updated);
    return updated;
  }

  async resetRewardPool(): Promise<void> {
    for (const [id, reseller] of this.resellers.entries()) {
      if (reseller.inRewardPool) {
        this.resellers.set(id, { ...reseller, inRewardPool: false });
      }
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const products = Array.from(this.products.values());
    const invoices = Array.from(this.invoices.values());
    const sales = Array.from(this.sales.values());
    const resellers = Array.from(this.resellers.values());

    const today = new Date().toISOString().split("T")[0];
    const todaySalesData = sales.filter((s) => s.date === today);

    return {
      totalProducts: products.length,
      lowStockCount: products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter((i) => i.status === "pending").length,
      todaySales: todaySalesData.length,
      todayRevenue: todaySalesData.reduce((sum, s) => sum + s.total, 0),
      activeResellers: resellers.length,
      rewardPoolCount: resellers.filter((r) => r.inRewardPool).length,
    };
  }
}

export const storage = new MemStorage();
