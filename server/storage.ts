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
  type StockMovement,
  type InsertStockMovement,
  type StockMovementWithProduct,
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
  stockMovements,
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

  getStockMovements(productId?: string): Promise<StockMovementWithProduct[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  adjustStock(productId: string, quantity: number, reason: string, reference?: string, createdBy?: string): Promise<{ movement: StockMovement; product: Product }>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await withRetry(async () => {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    });
  }

  async getProducts(): Promise<Product[]> {
    return await withRetry(async () => {
      return await db.select().from(products);
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return await withRetry(async () => {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      return product || undefined;
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return await withRetry(async () => {
      const [created] = await db.insert(products).values(product).returning();
      return created;
    });
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(products).where(eq(products.id, id)).returning();
      return result.length > 0;
    });
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    return await withRetry(async () => {
      const [existing] = await db.select().from(products).where(eq(products.id, id));
      if (!existing) return undefined;
      const newQuantity = Math.max(0, existing.stockQuantity + quantity);
      const [updated] = await db.update(products).set({ stockQuantity: newQuantity }).where(eq(products.id, id)).returning();
      return updated || undefined;
    });
  }

  async getInvoices(): Promise<Invoice[]> {
    return await withRetry(async () => {
      return await db.select().from(invoices).orderBy(desc(invoices.date));
    });
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      return invoice || undefined;
    });
  }

  async getInvoiceWithItems(id: string): Promise<InvoiceWithItems | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!invoice) return undefined;
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      return { ...invoice, items };
    });
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithItems> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(invoices).values(invoice).returning();
        const createdItems: InvoiceItem[] = [];
        for (const item of items) {
          const [createdItem] = await tx.insert(invoiceItems).values({ ...item, invoiceId: created.id }).returning();
          createdItems.push(createdItem);
        }
        return { ...created, items: createdItems };
      });
    });
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(invoices).set({ status }).where(eq(invoices.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        const result = await tx.delete(invoices).where(eq(invoices.id, id)).returning();
        return result.length > 0;
      });
    });
  }

  async getNextInvoiceNumber(): Promise<string> {
    return await withRetry(async () => {
      const year = new Date().getFullYear();
      const result = await db.select({ count: sql<number>`count(*)` }).from(invoices);
      const count = Number(result[0]?.count || 0) + 1;
      return `FA-${count.toString().padStart(4, "0")}/${year}`;
    });
  }

  async getSales(): Promise<Sale[]> {
    return await withRetry(async () => {
      return await db.select().from(sales).orderBy(desc(sales.date));
    });
  }

  async getSale(id: string): Promise<Sale | undefined> {
    return await withRetry(async () => {
      const [sale] = await db.select().from(sales).where(eq(sales.id, id));
      return sale || undefined;
    });
  }

  async getSaleWithItems(id: string): Promise<SaleWithItems | undefined> {
    return await withRetry(async () => {
      const [sale] = await db.select().from(sales).where(eq(sales.id, id));
      if (!sale) return undefined;
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
      return { ...sale, items };
    });
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(sales).values(sale).returning();
        const createdItems: SaleItem[] = [];
        
        for (const item of items) {
          const [createdItem] = await tx.insert(saleItems).values({ ...item, saleId: created.id }).returning();
          createdItems.push(createdItem);
          
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            const newQuantity = Math.max(0, product.stockQuantity - item.quantity);
            await tx.update(products).set({ stockQuantity: newQuantity }).where(eq(products.id, item.productId));
          }
        }

        if (sale.resellerId) {
          const [reseller] = await tx.select().from(resellers).where(eq(resellers.id, sale.resellerId));
          if (reseller) {
            const newTotal = reseller.totalPurchases + sale.total;
            const inRewardPool = !reseller.isWinner && newTotal >= reseller.rewardThreshold;
            await tx.update(resellers).set({ totalPurchases: newTotal, inRewardPool }).where(eq(resellers.id, sale.resellerId));
          }
        }

        return { ...created, items: createdItems };
      });
    });
  }

  async getResellers(): Promise<Reseller[]> {
    return await withRetry(async () => {
      return await db.select().from(resellers);
    });
  }

  async getReseller(id: string): Promise<Reseller | undefined> {
    return await withRetry(async () => {
      const [reseller] = await db.select().from(resellers).where(eq(resellers.id, id));
      return reseller || undefined;
    });
  }

  async createReseller(reseller: InsertReseller): Promise<Reseller> {
    return await withRetry(async () => {
      const [created] = await db.insert(resellers).values(reseller).returning();
      return created;
    });
  }

  async updateReseller(id: string, reseller: Partial<InsertReseller>): Promise<Reseller | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(resellers).set(reseller).where(eq(resellers.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteReseller(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(resellers).where(eq(resellers.id, id)).returning();
      return result.length > 0;
    });
  }

  async addResellerPurchase(id: string, amount: number): Promise<Reseller | undefined> {
    return await withRetry(async () => {
      const [existing] = await db.select().from(resellers).where(eq(resellers.id, id));
      if (!existing) return undefined;
      const newTotal = existing.totalPurchases + amount;
      const inRewardPool = !existing.isWinner && newTotal >= existing.rewardThreshold;
      const [updated] = await db.update(resellers).set({ totalPurchases: newTotal, inRewardPool }).where(eq(resellers.id, id)).returning();
      return updated || undefined;
    });
  }

  async drawWinner(): Promise<Reseller | undefined> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const eligible = await tx.select().from(resellers).where(
          and(eq(resellers.inRewardPool, true), eq(resellers.isWinner, false))
        );
        if (eligible.length === 0) return undefined;
        
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        const [updated] = await tx.update(resellers).set({
          isWinner: true,
          inRewardPool: false,
          wonAt: new Date().toISOString(),
        }).where(eq(resellers.id, winner.id)).returning();
        return updated;
      });
    });
  }

  async resetRewardPool(): Promise<void> {
    await withRetry(async () => {
      await db.update(resellers).set({ inRewardPool: false }).where(eq(resellers.inRewardPool, true));
    });
  }

  async getEmployees(): Promise<Employee[]> {
    return await withRetry(async () => {
      return await db.select().from(employees);
    });
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return await withRetry(async () => {
      const [employee] = await db.select().from(employees).where(eq(employees.id, id));
      return employee || undefined;
    });
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    return await withRetry(async () => {
      const [created] = await db.insert(employees).values(employee).returning();
      return created;
    });
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(employees).where(eq(employees.id, id)).returning();
      return result.length > 0;
    });
  }

  async getSalaryPayments(): Promise<SalaryPayment[]> {
    return await withRetry(async () => {
      return await db.select().from(salaryPayments).orderBy(desc(salaryPayments.paymentDate));
    });
  }

  async getSalaryPayment(id: string): Promise<SalaryPayment | undefined> {
    return await withRetry(async () => {
      const [payment] = await db.select().from(salaryPayments).where(eq(salaryPayments.id, id));
      return payment || undefined;
    });
  }

  async createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment> {
    return await withRetry(async () => {
      const [created] = await db.insert(salaryPayments).values(payment).returning();
      return created;
    });
  }

  async deleteSalaryPayment(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(salaryPayments).where(eq(salaryPayments.id, id)).returning();
      return result.length > 0;
    });
  }

  async getExpenses(): Promise<Expense[]> {
    return await withRetry(async () => {
      return await db.select().from(expenses).orderBy(desc(expenses.date));
    });
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return await withRetry(async () => {
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
      return expense || undefined;
    });
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    return await withRetry(async () => {
      const [created] = await db.insert(expenses).values(expense).returning();
      return created;
    });
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteExpense(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
      return result.length > 0;
    });
  }

  async getFabricationInvoices(): Promise<FabricationInvoice[]> {
    return await withRetry(async () => {
      return await db.select().from(fabricationInvoices).orderBy(desc(fabricationInvoices.date));
    });
  }

  async getFabricationInvoice(id: string): Promise<FabricationInvoice | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(fabricationInvoices).where(eq(fabricationInvoices.id, id));
      return invoice || undefined;
    });
  }

  async getFabricationInvoiceWithItems(id: string): Promise<FabricationInvoiceWithItems | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(fabricationInvoices).where(eq(fabricationInvoices.id, id));
      if (!invoice) return undefined;
      const items = await db.select().from(fabricationItems).where(eq(fabricationItems.fabricationInvoiceId, id));
      return { ...invoice, items };
    });
  }

  async createFabricationInvoice(invoice: InsertFabricationInvoice, items: InsertFabricationItem[]): Promise<FabricationInvoiceWithItems> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(fabricationInvoices).values(invoice).returning();
        const createdItems: FabricationItem[] = [];
        for (const item of items) {
          const [createdItem] = await tx.insert(fabricationItems).values({ ...item, fabricationInvoiceId: created.id }).returning();
          createdItems.push(createdItem);
        }
        return { ...created, items: createdItems };
      });
    });
  }

  async deleteFabricationInvoice(id: string): Promise<boolean> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        await tx.delete(fabricationItems).where(eq(fabricationItems.fabricationInvoiceId, id));
        const result = await tx.delete(fabricationInvoices).where(eq(fabricationInvoices.id, id)).returning();
        return result.length > 0;
      });
    });
  }

  async getNextFabricationNumber(): Promise<string> {
    return await withRetry(async () => {
      const year = new Date().getFullYear();
      const result = await db.select({ count: sql<number>`count(*)` }).from(fabricationInvoices);
      const count = Number(result[0]?.count || 0) + 1;
      return `FAB-${count.toString().padStart(4, "0")}/${year}`;
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return await withRetry(async () => {
      const allProducts = await db.select().from(products);
      const allInvoices = await db.select().from(invoices);
      const allSales = await db.select().from(sales);
      const allResellers = await db.select().from(resellers);

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
    });
  }

  async getProfitStats(startDate: string, endDate: string): Promise<ProfitStats> {
    return await withRetry(async () => {
      const allSales = await db.select().from(sales).where(
        and(gte(sales.date, startDate), lte(sales.date, endDate))
      );
      const totalSalesRevenue = allSales.reduce((sum, s) => sum + s.total, 0);

      let totalProductCosts = 0;
      for (const sale of allSales) {
        const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
        for (const item of items) {
          const [product] = await db.select().from(products).where(eq(products.id, item.productId));
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
    });
  }

  async getStockMovements(productId?: string): Promise<StockMovementWithProduct[]> {
    return await withRetry(async () => {
      let movements: StockMovement[];
      if (productId) {
        movements = await db.select().from(stockMovements)
          .where(eq(stockMovements.productId, productId))
          .orderBy(desc(stockMovements.createdAt));
      } else {
        movements = await db.select().from(stockMovements)
          .orderBy(desc(stockMovements.createdAt));
      }
      
      const result: StockMovementWithProduct[] = [];
      for (const movement of movements) {
        const [product] = await db.select().from(products).where(eq(products.id, movement.productId));
        result.push({ ...movement, product: product || undefined });
      }
      return result;
    });
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    return await withRetry(async () => {
      const [created] = await db.insert(stockMovements).values(movement).returning();
      return created;
    });
  }

  async adjustStock(
    productId: string,
    quantity: number,
    reason: string,
    reference?: string,
    createdBy?: string
  ): Promise<{ movement: StockMovement; product: Product }> {
    return await withRetry(async () => {
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      if (!product) {
        throw new Error("Product not found");
      }

      const previousStock = product.stockQuantity;
      const newStock = Math.max(0, previousStock + quantity);
      const movementType = quantity > 0 ? "in" : quantity < 0 ? "out" : "adjustment";

      const [updatedProduct] = await db.update(products)
        .set({ stockQuantity: newStock })
        .where(eq(products.id, productId))
        .returning();

      const [movement] = await db.insert(stockMovements).values({
        productId,
        movementType,
        reason,
        quantity,
        previousStock,
        newStock,
        reference,
        createdAt: new Date().toISOString(),
        createdBy,
      }).returning();

      return { movement, product: updatedProduct };
    });
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    return await withRetry(async () => {
      const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
      return product || undefined;
    });
  }
}

export const storage = new DatabaseStorage();
