import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InvoicePayment,
  type InsertInvoicePayment,
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
  type Customer,
  type InsertCustomer,
  users,
  products,
  invoices,
  invoiceItems,
  invoicePayments,
  sales,
  saleItems,
  resellers,
  customers,
  employees,
  salaryPayments,
  expenses,
  fabricationInvoices,
  fabricationItems,
  stockMovements,
} from "@shared/schema";
import { db, withRetry } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { cache, CACHE_KEYS, CACHE_TTL } from "./cache";

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
  updateSaleStatus(id: string, status: string): Promise<Sale | undefined>;
  deleteSale(id: string): Promise<boolean>;

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

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  updateCustomerBalance(id: string, amount: number): Promise<Customer | undefined>;

  getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]>;
  createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment>;
  deleteInvoicePayment(id: string): Promise<boolean>;
  getInvoicePaidAmount(invoiceId: string): Promise<number>;

  exportAllData(): Promise<object>;
  importAllData(data: object): Promise<{ imported: number }>;
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
    // Check cache first for instant cold-start response
    const cached = cache.get<Product[]>(CACHE_KEYS.PRODUCTS);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(products);
    });
    
    // Update cache for next request
    cache.set(CACHE_KEYS.PRODUCTS, result, CACHE_TTL.SHORT);
    return result;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return await withRetry(async () => {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      return product || undefined;
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await withRetry(async () => {
      const [created] = await db.insert(products).values(product).returning();
      return created;
    });
    
    // Invalidate products cache on mutation
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
      return updated || undefined;
    });
    
    // Invalidate products cache on mutation
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      const deleted = await db.delete(products).where(eq(products.id, id)).returning();
      return deleted.length > 0;
    });
    
    // Invalidate products cache on mutation
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const result = await withRetry(async () => {
      const [existing] = await db.select().from(products).where(eq(products.id, id));
      if (!existing) return undefined;
      const newQuantity = Math.max(0, existing.stockQuantity + quantity);
      const [updated] = await db.update(products).set({ stockQuantity: newQuantity }).where(eq(products.id, id)).returning();
      return updated || undefined;
    });
    
    // Invalidate caches on stock change
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async getInvoices(): Promise<Invoice[]> {
    // Check cache first for instant cold-start response
    const cached = cache.get<Invoice[]>(CACHE_KEYS.INVOICES);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(invoices).orderBy(desc(invoices.date));
    });
    
    cache.set(CACHE_KEYS.INVOICES, result, CACHE_TTL.SHORT);
    return result;
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
    const result = await withRetry(async () => {
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
    
    // Invalidate caches on mutation
    cache.delete(CACHE_KEYS.INVOICES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(invoices).set({ status }).where(eq(invoices.id, id)).returning();
      return updated || undefined;
    });
    
    // Invalidate caches on invoice status change
    cache.delete(CACHE_KEYS.INVOICES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      return await db.transaction(async (tx) => {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        const deleted = await tx.delete(invoices).where(eq(invoices.id, id)).returning();
        return deleted.length > 0;
      });
    });
    
    // Invalidate caches on mutation
    cache.delete(CACHE_KEYS.INVOICES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
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
    // Check cache first for instant cold-start response
    const cached = cache.get<Sale[]>(CACHE_KEYS.SALES);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(sales).orderBy(desc(sales.date));
    });
    
    cache.set(CACHE_KEYS.SALES, result, CACHE_TTL.SHORT);
    return result;
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
    const result = await withRetry(async () => {
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
    
    // Invalidate all affected caches on sale
    cache.delete(CACHE_KEYS.SALES);
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateSaleStatus(id: string, status: string): Promise<Sale | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(sales).set({ status }).where(eq(sales.id, id)).returning();
      return updated || undefined;
    });
    
    cache.delete(CACHE_KEYS.SALES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteSale(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      await db.delete(saleItems).where(eq(saleItems.saleId, id));
      const deleted = await db.delete(sales).where(eq(sales.id, id)).returning();
      return deleted.length > 0;
    });
    
    cache.delete(CACHE_KEYS.SALES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async getResellers(): Promise<Reseller[]> {
    // Check cache first for instant cold-start response
    const cached = cache.get<Reseller[]>(CACHE_KEYS.RESELLERS);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(resellers);
    });
    
    cache.set(CACHE_KEYS.RESELLERS, result, CACHE_TTL.SHORT);
    return result;
  }

  async getReseller(id: string): Promise<Reseller | undefined> {
    return await withRetry(async () => {
      const [reseller] = await db.select().from(resellers).where(eq(resellers.id, id));
      return reseller || undefined;
    });
  }

  async createReseller(reseller: InsertReseller): Promise<Reseller> {
    const result = await withRetry(async () => {
      const [created] = await db.insert(resellers).values(reseller).returning();
      return created;
    });
    
    // Invalidate caches on mutation
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateReseller(id: string, reseller: Partial<InsertReseller>): Promise<Reseller | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(resellers).set(reseller).where(eq(resellers.id, id)).returning();
      return updated || undefined;
    });
    
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteReseller(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      const deleted = await db.delete(resellers).where(eq(resellers.id, id)).returning();
      return deleted.length > 0;
    });
    
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async addResellerPurchase(id: string, amount: number): Promise<Reseller | undefined> {
    const result = await withRetry(async () => {
      const [existing] = await db.select().from(resellers).where(eq(resellers.id, id));
      if (!existing) return undefined;
      const newTotal = existing.totalPurchases + amount;
      const inRewardPool = !existing.isWinner && newTotal >= existing.rewardThreshold;
      const [updated] = await db.update(resellers).set({ totalPurchases: newTotal, inRewardPool }).where(eq(resellers.id, id)).returning();
      return updated || undefined;
    });
    
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async drawWinner(): Promise<Reseller | undefined> {
    const result = await withRetry(async () => {
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
    
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async resetRewardPool(): Promise<void> {
    await withRetry(async () => {
      await db.update(resellers).set({ inRewardPool: false }).where(eq(resellers.inRewardPool, true));
    });
    
    cache.delete(CACHE_KEYS.RESELLERS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
  }

  async getEmployees(): Promise<Employee[]> {
    const cached = cache.get<Employee[]>(CACHE_KEYS.EMPLOYEES);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(employees);
    });
    
    cache.set(CACHE_KEYS.EMPLOYEES, result, CACHE_TTL.SHORT);
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return await withRetry(async () => {
      const [employee] = await db.select().from(employees).where(eq(employees.id, id));
      return employee || undefined;
    });
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const result = await withRetry(async () => {
      const [created] = await db.insert(employees).values(employee).returning();
      return created;
    });
    
    cache.delete(CACHE_KEYS.EMPLOYEES);
    return result;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
      return updated || undefined;
    });
    
    cache.delete(CACHE_KEYS.EMPLOYEES);
    return result;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      const deleted = await db.delete(employees).where(eq(employees.id, id)).returning();
      return deleted.length > 0;
    });
    
    cache.delete(CACHE_KEYS.EMPLOYEES);
    return result;
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
    const result = await withRetry(async () => {
      const [created] = await db.insert(salaryPayments).values(payment).returning();
      return created;
    });
    
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteSalaryPayment(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      const deleted = await db.delete(salaryPayments).where(eq(salaryPayments.id, id)).returning();
      return deleted.length > 0;
    });
    
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async getExpenses(): Promise<Expense[]> {
    const cached = cache.get<Expense[]>(CACHE_KEYS.EXPENSES);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(expenses).orderBy(desc(expenses.date));
    });
    
    cache.set(CACHE_KEYS.EXPENSES, result, CACHE_TTL.SHORT);
    return result;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return await withRetry(async () => {
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
      return expense || undefined;
    });
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await withRetry(async () => {
      const [created] = await db.insert(expenses).values(expense).returning();
      return created;
    });
    
    cache.delete(CACHE_KEYS.EXPENSES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const result = await withRetry(async () => {
      const [updated] = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
      return updated || undefined;
    });
    
    cache.delete(CACHE_KEYS.EXPENSES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      const deleted = await db.delete(expenses).where(eq(expenses.id, id)).returning();
      return deleted.length > 0;
    });
    
    cache.delete(CACHE_KEYS.EXPENSES);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result;
  }

  async getFabricationInvoices(): Promise<FabricationInvoice[]> {
    const cached = cache.get<FabricationInvoice[]>(CACHE_KEYS.FABRICATION_INVOICES);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
      return await db.select().from(fabricationInvoices).orderBy(desc(fabricationInvoices.date));
    });
    
    cache.set(CACHE_KEYS.FABRICATION_INVOICES, result, CACHE_TTL.SHORT);
    return result;
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
    const result = await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(fabricationInvoices).values(invoice).returning();
        const createdItems: FabricationItem[] = [];
        
        for (const item of items) {
          const [createdItem] = await tx.insert(fabricationItems).values({ ...item, fabricationInvoiceId: created.id }).returning();
          createdItems.push(createdItem);
          
          // After fabrication, add manufactured products to inventory
          // Find existing product by name or create new one
          const existingProducts = await tx.select().from(products).where(
            eq(products.name, item.productName)
          );
          
          if (existingProducts.length > 0) {
            // Update existing product: add quantity and update cost price
            const existingProduct = existingProducts[0];
            const previousStock = existingProduct.stockQuantity;
            const newStock = previousStock + item.quantity;
            // Validate unitCost - use existing cost price if not provided
            const unitCost = (item.unitCost && item.unitCost > 0) ? item.unitCost : existingProduct.costPrice;
            
            await tx.update(products).set({
              stockQuantity: newStock,
              costPrice: unitCost,
              weightPerUnit: item.weightPerUnit || existingProduct.weightPerUnit,
            }).where(eq(products.id, existingProduct.id));
            
            // Create stock movement for the fabrication
            await tx.insert(stockMovements).values({
              productId: existingProduct.id,
              quantity: item.quantity,
              movementType: "in",
              reason: `Fabrication: ${created.invoiceNumber}`,
              previousStock,
              newStock,
              reference: created.invoiceNumber,
              createdAt: new Date().toISOString(),
            });
            
            console.log(`[Fabrication] Updated product "${item.productName}": +${item.quantity} units, cost=${unitCost}`);
          } else {
            // Create new product from fabrication item
            // Validate that unitCost is provided
            if (!item.unitCost || item.unitCost <= 0) {
              throw new Error(`Fabrication item "${item.productName}" must have a valid unitCost > 0`);
            }
            const unitCost = item.unitCost;
            // Use UUID for unique SKU to avoid collisions
            const uniqueSku = `FAB-${createdItem.id.substring(0, 8)}`;
            const [newProduct] = await tx.insert(products).values({
              name: item.productName,
              sku: uniqueSku,
              category: "Fabricated",
              unitPrice: unitCost * 1.3, // Default 30% markup for selling price
              costPrice: unitCost,
              stockQuantity: item.quantity,
              lowStockThreshold: 10,
              unit: "pcs",
              weightPerUnit: item.weightPerUnit || 0,
            }).returning();
            
            // Create stock movement for the new product
            await tx.insert(stockMovements).values({
              productId: newProduct.id,
              quantity: item.quantity,
              movementType: "in",
              reason: `Fabrication: ${created.invoiceNumber}`,
              previousStock: 0,
              newStock: item.quantity,
              reference: created.invoiceNumber,
              createdAt: new Date().toISOString(),
            });
            
            console.log(`[Fabrication] Created new product "${item.productName}": ${item.quantity} units, cost=${unitCost}`);
          }
        }
        
        return { ...created, items: createdItems };
      });
    });
    
    cache.delete(CACHE_KEYS.FABRICATION_INVOICES);
    cache.delete(CACHE_KEYS.PRODUCTS); // Also invalidate products cache
    return result;
  }

  async deleteFabricationInvoice(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      return await db.transaction(async (tx) => {
        await tx.delete(fabricationItems).where(eq(fabricationItems.fabricationInvoiceId, id));
        const deleted = await tx.delete(fabricationInvoices).where(eq(fabricationInvoices.id, id)).returning();
        return deleted.length > 0;
      });
    });
    
    cache.delete(CACHE_KEYS.FABRICATION_INVOICES);
    return result;
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
    // Check cache first for instant cold-start response
    const cached = cache.get<DashboardStats>(CACHE_KEYS.DASHBOARD_STATS);
    if (cached) return cached;
    
    const result = await withRetry(async () => {
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
    
    cache.set(CACHE_KEYS.DASHBOARD_STATS, result, CACHE_TTL.SHORT);
    return result;
  }

  async getProfitStats(startDate: string, endDate: string): Promise<ProfitStats> {
    return await withRetry(async () => {
      const allSales = await db.select().from(sales).where(
        and(gte(sales.date, startDate), lte(sales.date, endDate))
      );
      const totalSalesRevenue = allSales.reduce((sum, s) => sum + s.total - (s.discount || 0), 0);

      const allInvoices = await db.select().from(invoices).where(
        and(gte(invoices.date, startDate), lte(invoices.date, endDate))
      );
      const totalInvoiceRevenue = allInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0);

      const totalRevenue = totalSalesRevenue + totalInvoiceRevenue;

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

      // Get fabrication costs - these are manufacturing costs, NOT revenue
      const allFabricationInvoices = await db.select().from(fabricationInvoices).where(
        and(gte(fabricationInvoices.date, startDate), lte(fabricationInvoices.date, endDate))
      );
      const totalFabricationCosts = allFabricationInvoices.reduce((sum, fab) => sum + (fab.totalCost || 0), 0);

      // Gross profit = Revenue - Product Costs (COGS)
      // Fabrication costs are treated as part of COGS since they represent manufacturing costs
      const grossProfit = totalRevenue - totalProductCosts - totalFabricationCosts;
      const netProfit = grossProfit - totalSalaries - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        totalSalesRevenue,
        totalInvoiceRevenue,
        totalRevenue,
        totalProductCosts,
        totalFabricationCosts,
        totalSalaries,
        totalExpenses,
        grossProfit,
        netProfit,
        profitMargin,
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

  async getCustomers(): Promise<Customer[]> {
    return await withRetry(async () => {
      return await db.select().from(customers).orderBy(desc(customers.createdAt));
    });
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return await withRetry(async () => {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer || undefined;
    });
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return await withRetry(async () => {
      const [created] = await db.insert(customers).values(customer).returning();
      return created;
    });
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
      return updated || undefined;
    });
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(customers).where(eq(customers.id, id)).returning();
      return result.length > 0;
    });
  }

  async updateCustomerBalance(id: string, amount: number): Promise<Customer | undefined> {
    return await withRetry(async () => {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      if (!customer) return undefined;
      
      const newBalance = (customer.currentBalance || 0) + amount;
      const [updated] = await db.update(customers)
        .set({ currentBalance: newBalance })
        .where(eq(customers.id, id))
        .returning();
      return updated || undefined;
    });
  }

  async getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
    return await withRetry(async () => {
      return await db.select().from(invoicePayments)
        .where(eq(invoicePayments.invoiceId, invoiceId))
        .orderBy(desc(invoicePayments.createdAt));
    });
  }

  async createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment> {
    return await withRetry(async () => {
      const [created] = await db.insert(invoicePayments).values(payment).returning();
      cache.delete(CACHE_KEYS.INVOICES);
      return created;
    });
  }

  async deleteInvoicePayment(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(invoicePayments).where(eq(invoicePayments.id, id)).returning();
      if (result.length > 0) {
        cache.delete(CACHE_KEYS.INVOICES);
      }
      return result.length > 0;
    });
  }

  async getInvoicePaidAmount(invoiceId: string): Promise<number> {
    return await withRetry(async () => {
      const result = await db.select({
        total: sql<number>`COALESCE(SUM(${invoicePayments.amount}), 0)`
      }).from(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId));
      return Number(result[0]?.total || 0);
    });
  }

  async exportAllData(): Promise<object> {
    return await withRetry(async () => {
      const [
        allProducts,
        allInvoices,
        allInvoiceItems,
        allSales,
        allSaleItems,
        allResellers,
        allEmployees,
        allSalaryPayments,
        allExpenses,
        allFabricationInvoices,
        allFabricationItems,
        allCustomers,
        allStockMovements,
        allInvoicePayments,
      ] = await Promise.all([
        db.select().from(products),
        db.select().from(invoices),
        db.select().from(invoiceItems),
        db.select().from(sales),
        db.select().from(saleItems),
        db.select().from(resellers),
        db.select().from(employees),
        db.select().from(salaryPayments),
        db.select().from(expenses),
        db.select().from(fabricationInvoices),
        db.select().from(fabricationItems),
        db.select().from(customers),
        db.select().from(stockMovements),
        db.select().from(invoicePayments),
      ]);

      return {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        data: {
          products: allProducts,
          invoices: allInvoices,
          invoiceItems: allInvoiceItems,
          sales: allSales,
          saleItems: allSaleItems,
          resellers: allResellers,
          employees: allEmployees,
          salaryPayments: allSalaryPayments,
          expenses: allExpenses,
          fabricationInvoices: allFabricationInvoices,
          fabricationItems: allFabricationItems,
          customers: allCustomers,
          stockMovements: allStockMovements,
          invoicePayments: allInvoicePayments,
        }
      };
    });
  }

  async importAllData(backup: any): Promise<{ imported: number }> {
    return await withRetry(async () => {
      const data = backup.data || backup;
      let imported = 0;

      // Import products
      if (data.products?.length) {
        for (const product of data.products) {
          try {
            await db.insert(products).values({
              ...product,
              id: undefined, // Let DB generate new ID
            }).onConflictDoNothing();
            imported++;
          } catch (e) { /* skip duplicates */ }
        }
        cache.delete(CACHE_KEYS.PRODUCTS);
      }

      // Import customers
      if (data.customers?.length) {
        for (const customer of data.customers) {
          try {
            await db.insert(customers).values({
              ...customer,
              id: undefined,
            }).onConflictDoNothing();
            imported++;
          } catch (e) { /* skip duplicates */ }
        }
      }

      // Import resellers
      if (data.resellers?.length) {
        for (const reseller of data.resellers) {
          try {
            await db.insert(resellers).values({
              ...reseller,
              id: undefined,
            }).onConflictDoNothing();
            imported++;
          } catch (e) { /* skip duplicates */ }
        }
        cache.delete(CACHE_KEYS.RESELLERS);
      }

      // Import employees
      if (data.employees?.length) {
        for (const employee of data.employees) {
          try {
            await db.insert(employees).values({
              ...employee,
              id: undefined,
            }).onConflictDoNothing();
            imported++;
          } catch (e) { /* skip duplicates */ }
        }
        cache.delete(CACHE_KEYS.EMPLOYEES);
      }

      // Import expenses
      if (data.expenses?.length) {
        for (const expense of data.expenses) {
          try {
            await db.insert(expenses).values({
              ...expense,
              id: undefined,
            }).onConflictDoNothing();
            imported++;
          } catch (e) { /* skip duplicates */ }
        }
        cache.delete(CACHE_KEYS.EXPENSES);
      }

      // Clear all caches after import
      cache.delete(CACHE_KEYS.INVOICES);
      cache.delete(CACHE_KEYS.SALES);
      cache.delete(CACHE_KEYS.FABRICATION_INVOICES);
      cache.delete(CACHE_KEYS.DASHBOARD_STATS);

      return { imported };
    });
  }
}

export const storage = new DatabaseStorage();
