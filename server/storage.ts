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
  type Employee,
  type InsertEmployee,
  type SalaryPayment,
  type InsertSalaryPayment,
  type Expense,
  type InsertExpense,
  type FabricationInvoice,
  type InsertFabricationInvoice,
  type FabricationItem,
  type InsertFabricationItem,
  type FabricationInvoiceWithItems,
  type ProfitStats,
  users,
  products,
  invoices,
  invoiceItems,
  sales,
  saleItems,
  resellers,
  employees,
  salaryPayments,
  expenses,
  fabricationInvoices,
  fabricationItems,
} from "@shared/schema";
import { db, withRetry } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

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

  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  getSalaryPayments(): Promise<SalaryPayment[]>;
  getSalaryPayment(id: string): Promise<SalaryPayment | undefined>;
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  deleteSalaryPayment(id: string): Promise<boolean>;

  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  getFabricationInvoices(): Promise<FabricationInvoice[]>;
  getFabricationInvoice(id: string): Promise<FabricationInvoice | undefined>;
  getFabricationInvoiceWithItems(id: string): Promise<FabricationInvoiceWithItems | undefined>;
  createFabricationInvoice(invoice: InsertFabricationInvoice, items: InsertFabricationItem[]): Promise<FabricationInvoiceWithItems>;
  deleteFabricationInvoice(id: string): Promise<boolean>;
  getNextFabricationNumber(): Promise<string>;

  getDashboardStats(): Promise<DashboardStats>;
  getProfitStats(startDate: string, endDate: string): Promise<ProfitStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await withRetry(async () => {
      return await db.select().from(products);
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return await withRetry(async () => {
      const [created] = await db.insert(products).values(product).returning();
      return created;
    });
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    const newQuantity = Math.max(0, existing.stockQuantity + quantity);
    return await this.updateProduct(id, { stockQuantity: newQuantity });
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.date));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceWithItems(id: string): Promise<InvoiceWithItems | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    return { ...invoice, items };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    const createdItems: InvoiceItem[] = [];
    for (const item of items) {
      const [createdItem] = await db.insert(invoiceItems).values({ ...item, invoiceId: created.id }).returning();
      createdItems.push(createdItem);
    }
    return { ...created, items: createdItems };
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ status }).where(eq(invoices.id, id)).returning();
    return updated || undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const count = Number(result[0]?.count || 0) + 1;
    return `FA-${count.toString().padStart(4, "0")}/${year}`;
  }

  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.date));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getSaleWithItems(id: string): Promise<SaleWithItems | undefined> {
    const sale = await this.getSale(id);
    if (!sale) return undefined;
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    return { ...sale, items };
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    const [created] = await db.insert(sales).values(sale).returning();
    const createdItems: SaleItem[] = [];
    
    for (const item of items) {
      const [createdItem] = await db.insert(saleItems).values({ ...item, saleId: created.id }).returning();
      createdItems.push(createdItem);
      
      const product = await this.getProduct(item.productId);
      if (product) {
        await this.updateStock(item.productId, -item.quantity);
      }
    }

    if (sale.resellerId) {
      await this.addResellerPurchase(sale.resellerId, sale.total);
    }

    return { ...created, items: createdItems };
  }

  async getResellers(): Promise<Reseller[]> {
    return await db.select().from(resellers);
  }

  async getReseller(id: string): Promise<Reseller | undefined> {
    const [reseller] = await db.select().from(resellers).where(eq(resellers.id, id));
    return reseller || undefined;
  }

  async createReseller(reseller: InsertReseller): Promise<Reseller> {
    const [created] = await db.insert(resellers).values(reseller).returning();
    return created;
  }

  async updateReseller(id: string, reseller: Partial<InsertReseller>): Promise<Reseller | undefined> {
    const [updated] = await db.update(resellers).set(reseller).where(eq(resellers.id, id)).returning();
    return updated || undefined;
  }

  async deleteReseller(id: string): Promise<boolean> {
    const result = await db.delete(resellers).where(eq(resellers.id, id)).returning();
    return result.length > 0;
  }

  async addResellerPurchase(id: string, amount: number): Promise<Reseller | undefined> {
    const existing = await this.getReseller(id);
    if (!existing) return undefined;
    const newTotal = existing.totalPurchases + amount;
    const inRewardPool = !existing.isWinner && newTotal >= existing.rewardThreshold;
    return await this.updateReseller(id, { totalPurchases: newTotal, inRewardPool });
  }

  async drawWinner(): Promise<Reseller | undefined> {
    const eligible = await db.select().from(resellers).where(
      and(eq(resellers.inRewardPool, true), eq(resellers.isWinner, false))
    );
    if (eligible.length === 0) return undefined;
    
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const [updated] = await db.update(resellers).set({
      isWinner: true,
      inRewardPool: false,
      wonAt: new Date().toISOString(),
    }).where(eq(resellers.id, winner.id)).returning();
    return updated;
  }

  async resetRewardPool(): Promise<void> {
    await db.update(resellers).set({ inRewardPool: false }).where(eq(resellers.inRewardPool, true));
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(employee).returning();
    return created;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
    return updated || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id)).returning();
    return result.length > 0;
  }

  async getSalaryPayments(): Promise<SalaryPayment[]> {
    return await db.select().from(salaryPayments).orderBy(desc(salaryPayments.paymentDate));
  }

  async getSalaryPayment(id: string): Promise<SalaryPayment | undefined> {
    const [payment] = await db.select().from(salaryPayments).where(eq(salaryPayments.id, id));
    return payment || undefined;
  }

  async createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment> {
    const [created] = await db.insert(salaryPayments).values(payment).returning();
    return created;
  }

  async deleteSalaryPayment(id: string): Promise<boolean> {
    const result = await db.delete(salaryPayments).where(eq(salaryPayments.id, id)).returning();
    return result.length > 0;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
    return updated || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  async getFabricationInvoices(): Promise<FabricationInvoice[]> {
    return await db.select().from(fabricationInvoices).orderBy(desc(fabricationInvoices.date));
  }

  async getFabricationInvoice(id: string): Promise<FabricationInvoice | undefined> {
    const [invoice] = await db.select().from(fabricationInvoices).where(eq(fabricationInvoices.id, id));
    return invoice || undefined;
  }

  async getFabricationInvoiceWithItems(id: string): Promise<FabricationInvoiceWithItems | undefined> {
    const invoice = await this.getFabricationInvoice(id);
    if (!invoice) return undefined;
    const items = await db.select().from(fabricationItems).where(eq(fabricationItems.fabricationInvoiceId, id));
    return { ...invoice, items };
  }

  async createFabricationInvoice(invoice: InsertFabricationInvoice, items: InsertFabricationItem[]): Promise<FabricationInvoiceWithItems> {
    const [created] = await db.insert(fabricationInvoices).values(invoice).returning();
    const createdItems: FabricationItem[] = [];
    for (const item of items) {
      const [createdItem] = await db.insert(fabricationItems).values({ ...item, fabricationInvoiceId: created.id }).returning();
      createdItems.push(createdItem);
    }
    return { ...created, items: createdItems };
  }

  async deleteFabricationInvoice(id: string): Promise<boolean> {
    await db.delete(fabricationItems).where(eq(fabricationItems.fabricationInvoiceId, id));
    const result = await db.delete(fabricationInvoices).where(eq(fabricationInvoices.id, id)).returning();
    return result.length > 0;
  }

  async getNextFabricationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)` }).from(fabricationInvoices);
    const count = Number(result[0]?.count || 0) + 1;
    return `FAB-${count.toString().padStart(4, "0")}/${year}`;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allProducts = await this.getProducts();
    const allInvoices = await this.getInvoices();
    const allSales = await this.getSales();
    const allResellers = await this.getResellers();

    const today = new Date().toISOString().split("T")[0];
    const todaySalesData = allSales.filter((s) => s.date === today);

    return {
      totalProducts: allProducts.length,
      lowStockCount: allProducts.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
      totalInvoices: allInvoices.length,
      pendingInvoices: allInvoices.filter((i) => i.status === "pending").length,
      todaySales: todaySalesData.length,
      todayRevenue: todaySalesData.reduce((sum, s) => sum + s.total, 0),
      activeResellers: allResellers.length,
      rewardPoolCount: allResellers.filter((r) => r.inRewardPool).length,
    };
  }

  async getProfitStats(startDate: string, endDate: string): Promise<ProfitStats> {
    const allSales = await db.select().from(sales).where(
      and(gte(sales.date, startDate), lte(sales.date, endDate))
    );
    const totalSalesRevenue = allSales.reduce((sum, s) => sum + s.total, 0);

    let totalProductCosts = 0;
    for (const sale of allSales) {
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      for (const item of items) {
        const product = await this.getProduct(item.productId);
        if (product) {
          totalProductCosts += (product.costPrice || 0) * item.quantity;
        }
      }
    }

    const allPayments = await db.select().from(salaryPayments).where(
      and(gte(salaryPayments.paymentDate, startDate), lte(salaryPayments.paymentDate, endDate))
    );
    const totalSalaries = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const allExpenses = await db.select().from(expenses).where(
      and(gte(expenses.date, startDate), lte(expenses.date, endDate))
    );
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = totalSalesRevenue - totalProductCosts;
    const netProfit = grossProfit - totalSalaries - totalExpenses;

    return {
      totalSalesRevenue,
      totalProductCosts,
      totalSalaries,
      totalExpenses,
      grossProfit,
      netProfit,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }
}

export const storage = new DatabaseStorage();
