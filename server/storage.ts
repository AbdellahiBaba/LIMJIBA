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
  type SalePayment,
  type InsertSalePayment,
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
  type Setting,
  type InventoryValuation,
  type ProductInventoryValue,
  type SaleReturn,
  type InsertSaleReturn,
  type SaleReturnItem,
  type InsertSaleReturnItem,
  type SaleReturnWithItems,
  type QuickInvoice,
  type InsertQuickInvoice,
  type Supplier,
  type InsertSupplier,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type PurchaseOrderWithItems,
  type ParkedSale,
  type InsertParkedSale,
  type AuditLog,
  type InsertAuditLog,
  type TransportationInvoice,
  type InsertTransportationInvoice,
  type TransportationItem,
  type InsertTransportationItem,
  type TransportationInvoiceWithItems,
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
  salePayments,
  saleReturns,
  saleReturnItems,
  expenses,
  fabricationInvoices,
  fabricationItems,
  stockMovements,
  settings,
  quickInvoices,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  parkedSales,
  auditLogs,
  transportationInvoices,
  transportationItems,
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
  resetAllThresholds(): Promise<void>;

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
  getInventoryValuation(): Promise<InventoryValuation>;

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

  getSalePayments(saleId: string): Promise<SalePayment[]>;
  createSalePayment(payment: InsertSalePayment): Promise<SalePayment>;
  deleteSalePayment(id: string): Promise<boolean>;
  getSalePaidAmount(saleId: string): Promise<number>;
  updateSale(id: string, data: Partial<InsertSale>): Promise<Sale | undefined>;

  updateSaleWithItems(id: string, saleData: Partial<InsertSale>, items: InsertSaleItem[]): Promise<SaleWithItems | undefined>;
  getSaleByNumber(saleNumber: string): Promise<Sale | undefined>;
  getSaleReturns(saleId: string): Promise<SaleReturnWithItems[]>;
  getReturnedQuantities(saleId: string): Promise<Record<string, number>>;
  processReturn(saleId: string, returnData: InsertSaleReturn, items: InsertSaleReturnItem[]): Promise<SaleReturnWithItems>;
  getNextReturnNumber(): Promise<string>;

  getQuickInvoices(): Promise<QuickInvoice[]>;
  getQuickInvoice(id: string): Promise<QuickInvoice | undefined>;
  createQuickInvoice(invoice: InsertQuickInvoice): Promise<QuickInvoice>;
  deleteQuickInvoice(id: string): Promise<boolean>;

  exportAllData(): Promise<object>;
  importAllData(data: object): Promise<{ imported: number }>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  getUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  getPurchaseOrders(): Promise<PurchaseOrderWithItems[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrderWithItems | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithItems>;
  updatePurchaseOrderStatus(id: string, status: string): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<boolean>;
  getNextPONumber(): Promise<string>;
  receivePurchaseOrder(id: string, receivedBy: string): Promise<PurchaseOrderWithItems | undefined>;

  getParkedSales(): Promise<ParkedSale[]>;
  createParkedSale(sale: InsertParkedSale): Promise<ParkedSale>;
  deleteParkedSale(id: string): Promise<boolean>;

  getAuditLogs(filters?: { userId?: string; action?: string; entity?: string; startDate?: string; endDate?: string }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  updateInvoiceDeliveryStatus(id: string, status: string): Promise<Invoice | undefined>;

  getTransportationInvoices(): Promise<TransportationInvoice[]>;
  getTransportationInvoice(id: string): Promise<TransportationInvoice | undefined>;
  getTransportationInvoiceWithItems(id: string): Promise<TransportationInvoiceWithItems | undefined>;
  createTransportationInvoice(invoice: InsertTransportationInvoice, items: InsertTransportationItem[]): Promise<TransportationInvoiceWithItems>;
  updateTransportationInvoiceStatus(id: string, status: string): Promise<TransportationInvoice | undefined>;
  deleteTransportationInvoice(id: string): Promise<boolean>;
  getNextTransportationNumber(): Promise<string>;
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
        // ACCOUNTING VALIDATION: Pre-validate all items
        const validationErrors: string[] = [];
        const itemsWithCost: (InsertInvoiceItem & { costPrice: number })[] = [];
        
        // Validate items array is not empty
        if (!items || items.length === 0) {
          throw new Error("Invoice must have at least one item.");
        }
        
        for (const item of items) {
          // Validate quantity is positive
          if (item.quantity <= 0) {
            validationErrors.push(`Item "${item.designation}" has invalid quantity: ${item.quantity}. Quantity must be > 0.`);
            continue;
          }
          
          let costPrice = item.costPrice || 0;
          
          // If item has productId, validate product exists and get costPrice
          if (item.productId) {
            const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
            if (!product) {
              validationErrors.push(`Product "${item.designation}" (ID: ${item.productId}) not found.`);
              continue;
            }
            
            // Use product's costPrice if item doesn't have one
            if (!costPrice || costPrice <= 0) {
              costPrice = product.costPrice || 0;
            }
            
            // ACCOUNTING: Require costPrice for product-linked items (for accurate COGS)
            if (costPrice <= 0) {
              validationErrors.push(
                `Product "${product.name}" has no cost price. Please set a cost price before invoicing.`
              );
              continue;
            }
          } else {
            // Custom item without productId - allow 0 cost (services may have no direct cost)
            // Log warning for audit purposes
            if (costPrice <= 0) {
              console.log(`[Invoice] Custom item "${item.designation}" has no cost price. COGS = 0 for this item.`);
            }
          }
          
          itemsWithCost.push({ ...item, costPrice: Math.round(costPrice * 100) / 100 });
        }
        
        // If any validation errors, abort transaction
        if (validationErrors.length > 0) {
          throw new Error(`Invoice validation failed:\n${validationErrors.join('\n')}`);
        }
        
        const [created] = await tx.insert(invoices).values(invoice).returning();
        const createdItems: InvoiceItem[] = [];
        
        for (const item of itemsWithCost) {
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
        // ACCOUNTING VALIDATION: Pre-validate all items before creating sale
        const validationErrors: string[] = [];
        const productValidations: { product: any; item: InsertSaleItem; costPrice: number }[] = [];
        
        // Validate items array is not empty
        if (!items || items.length === 0) {
          throw new Error("Sale must have at least one item.");
        }
        
        for (const item of items) {
          // Validate quantity is positive
          if (item.quantity <= 0) {
            validationErrors.push(`Item "${item.productName}" has invalid quantity: ${item.quantity}. Quantity must be > 0.`);
            continue;
          }
          
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          
          if (!product) {
            validationErrors.push(`Product "${item.productName}" (ID: ${item.productId}) not found.`);
            continue;
          }
          
          // ACCOUNTING: Validate sufficient stock (prevent negative inventory)
          if (product.stockQuantity < item.quantity) {
            validationErrors.push(
              `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stockQuantity}.`
            );
            continue;
          }
          
          // ACCOUNTING: Validate costPrice is set (required for COGS calculation)
          if (!product.costPrice || product.costPrice <= 0) {
            validationErrors.push(
              `Product "${product.name}" has no cost price set. COGS cannot be calculated. Please set a cost price before selling.`
            );
            continue;
          }
          
          productValidations.push({ product, item, costPrice: product.costPrice });
        }
        
        // If any validation errors, abort transaction
        if (validationErrors.length > 0) {
          throw new Error(`Sale validation failed:\n${validationErrors.join('\n')}`);
        }
        
        // Create the sale record
        const [created] = await tx.insert(sales).values(sale).returning();
        const createdItems: SaleItem[] = [];
        
        for (const { product, item, costPrice } of productValidations) {
          // ACCOUNTING: Store costPrice with sale item for accurate COGS tracking
          // This captures the cost at time of sale (prevents retroactive COGS changes)
          const itemWithCost = {
            ...item,
            saleId: created.id,
            costPrice: Math.round(costPrice * 100) / 100, // Round to 2 decimals
          };
          
          const [createdItem] = await tx.insert(saleItems).values(itemWithCost).returning();
          createdItems.push(createdItem);
          
          // Deduct stock and create movement record
          const newQuantity = product.stockQuantity - item.quantity;
          await tx.update(products).set({ stockQuantity: newQuantity }).where(eq(products.id, item.productId));
          
          // Create stock movement for audit trail
          await tx.insert(stockMovements).values({
            productId: product.id,
            quantity: -item.quantity,
            movementType: "out",
            reason: "sale",
            previousStock: product.stockQuantity,
            newStock: newQuantity,
            reference: created.saleNumber,
            createdAt: new Date().toISOString(),
          });
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

  async resetAllThresholds(): Promise<void> {
    await withRetry(async () => {
      await db.update(resellers).set({
        totalPurchases: 0,
        inRewardPool: false,
        isWinner: false,
        wonAt: null,
      });
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
        // ACCOUNTING VALIDATION: Pre-validate all fabrication items
        const validationErrors: string[] = [];
        
        // Validate items array is not empty
        if (!items || items.length === 0) {
          throw new Error("Fabrication invoice must have at least one item.");
        }
        
        for (const item of items) {
          // Validate quantity is positive (prevent zero-quantity fabrication)
          if (!item.quantity || item.quantity <= 0) {
            validationErrors.push(`Item "${item.productName}" has invalid quantity: ${item.quantity}. Quantity must be > 0.`);
          }
          
          // Validate cost components are non-negative
          if ((item.materialsCost ?? 0) < 0) {
            validationErrors.push(`Item "${item.productName}" has negative materials cost.`);
          }
          if ((item.laborCost ?? 0) < 0) {
            validationErrors.push(`Item "${item.productName}" has negative labor cost.`);
          }
          if ((item.overheadCost ?? 0) < 0) {
            validationErrors.push(`Item "${item.productName}" has negative overhead cost.`);
          }
          
          // Calculate total unitCost from components if provided, otherwise use unitCost directly
          const materialsCost = item.materialsCost || 0;
          const laborCost = item.laborCost || 0;
          const overheadCost = item.overheadCost || 0;
          const calculatedCost = materialsCost + laborCost + overheadCost;
          const effectiveUnitCost = calculatedCost > 0 ? calculatedCost : (item.unitCost || 0);
          
          // Validate that we have a valid unit cost
          if (effectiveUnitCost <= 0) {
            validationErrors.push(
              `Item "${item.productName}" has no valid cost. Provide unitCost or cost breakdown (materials + labor + overhead).`
            );
          }
        }
        
        // If any validation errors, abort transaction
        if (validationErrors.length > 0) {
          throw new Error(`Fabrication validation failed:\n${validationErrors.join('\n')}`);
        }
        
        const [created] = await tx.insert(fabricationInvoices).values(invoice).returning();
        const createdItems: FabricationItem[] = [];
        
        for (const item of items) {
          // ACCOUNTING: Calculate unitCost from cost breakdown if provided
          const materialsCost = Math.round((item.materialsCost || 0) * 100) / 100;
          const laborCost = Math.round((item.laborCost || 0) * 100) / 100;
          const overheadCost = Math.round((item.overheadCost || 0) * 100) / 100;
          const calculatedCost = materialsCost + laborCost + overheadCost;
          const effectiveUnitCost = calculatedCost > 0 ? calculatedCost : Math.round((item.unitCost || 0) * 100) / 100;
          const totalCost = Math.round(effectiveUnitCost * item.quantity * 100) / 100;
          
          const itemWithCalculatedCost = {
            ...item,
            fabricationInvoiceId: created.id,
            materialsCost,
            laborCost,
            overheadCost,
            unitCost: effectiveUnitCost,
            totalCost,
          };
          
          const [createdItem] = await tx.insert(fabricationItems).values(itemWithCalculatedCost).returning();
          createdItems.push(createdItem);
          
          // After fabrication, add manufactured products to inventory
          const existingProducts = await tx.select().from(products).where(
            eq(products.name, item.productName)
          );
          
          if (existingProducts.length > 0) {
            // Update existing product: add quantity and update cost price
            const existingProduct = existingProducts[0];
            const previousStock = existingProduct.stockQuantity;
            const newStock = previousStock + item.quantity;
            
            await tx.update(products).set({
              stockQuantity: newStock,
              costPrice: effectiveUnitCost,
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
            
            console.log(`[Fabrication] Updated product "${item.productName}": +${item.quantity} units, cost=${effectiveUnitCost}`);
          } else {
            // Create new product from fabrication item
            const [newProduct] = await tx.insert(products).values({
              name: item.productName,
              category: "Fabricated",
              unitPrice: Math.round(effectiveUnitCost * 1.3 * 100) / 100, // 30% markup
              costPrice: effectiveUnitCost,
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
            
            console.log(`[Fabrication] Created new product "${item.productName}": ${item.quantity} units, cost=${effectiveUnitCost}`);
          }
        }
        
        return { ...created, items: createdItems };
      });
    });
    
    cache.delete(CACHE_KEYS.FABRICATION_INVOICES);
    cache.delete(CACHE_KEYS.PRODUCTS);
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

      const allQuickInvoices = await db.select().from(quickInvoices);

      return {
        totalProducts: allProducts.length,
        lowStockCount: allProducts.filter((p) => p.stockQuantity <= p.lowStockThreshold).length,
        totalInvoices: allInvoices.length,
        pendingInvoices: allInvoices.filter((i) => i.status === "pending").length,
        todaySales: todaySalesData.length,
        todayRevenue: todaySalesData.reduce((sum, s) => sum + s.total, 0),
        activeResellers: allResellers.length,
        rewardPoolCount: allResellers.filter((r) => r.inRewardPool).length,
        quickInvoicesCount: allQuickInvoices.length,
        quickInvoicesTotal: allQuickInvoices.reduce((sum, qi) => sum + (qi.totalTTC || 0), 0),
      };
    });
    
    cache.set(CACHE_KEYS.DASHBOARD_STATS, result, CACHE_TTL.SHORT);
    return result;
  }

  async getProfitStats(startDate: string, endDate: string): Promise<ProfitStats> {
    return await withRetry(async () => {
      // ACCOUNTING: Calculate revenue from POS sales
      const allSales = await db.select().from(sales).where(
        and(gte(sales.date, startDate), lte(sales.date, endDate))
      );
      const totalSalesRevenue = Math.round(
        allSales.reduce((sum, s) => sum + s.total - (s.discount || 0), 0) * 100
      ) / 100;

      // ACCOUNTING: Get all invoices in date range
      const allInvoices = await db.select().from(invoices).where(
        and(gte(invoices.date, startDate), lte(invoices.date, endDate))
      );
      
      // CRITICAL: Filter to only SALE invoices for revenue calculation
      // Fabrication invoices (FAB-) are NOT revenue - they are manufacturing costs
      // that flow into inventory and COGS when products are sold
      const salesInvoices = allInvoices.filter(inv => {
        // Exclude if explicitly marked as FABRICATION
        if (inv.invoiceType === 'FABRICATION') return false;
        // Legacy check: exclude by invoice number prefix (FAB-)
        if (inv.invoiceNumber.startsWith('FAB-')) return false;
        // Legacy check: exclude by role containing 'fabrication'
        if (inv.role?.toLowerCase().includes('fabrication')) return false;
        return true;
      });
      
      const totalInvoiceRevenue = Math.round(
        salesInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0) * 100
      ) / 100;

      const totalRevenue = Math.round((totalSalesRevenue + totalInvoiceRevenue) * 100) / 100;

      // ACCOUNTING: Calculate COGS from stored costPrice on sale items
      // Using stored costPrice ensures accurate historical cost at time of sale
      // This prevents retroactive COGS changes when product costs are updated
      let totalProductCosts = 0;
      
      // COGS from POS sales - use costPrice stored on sale item
      for (const sale of allSales) {
        const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
        for (const item of items) {
          // Prefer stored costPrice on item (captured at sale time)
          // Fallback to product lookup for legacy data without stored costPrice
          let itemCost = item.costPrice || 0;
          if (itemCost <= 0) {
            const [product] = await db.select().from(products).where(eq(products.id, item.productId));
            if (product) {
              itemCost = product.costPrice || 0;
            }
          }
          totalProductCosts += itemCost * item.quantity;
        }
      }
      
      // COGS from B2B sales invoices only - use costPrice stored on invoice item
      // Exclude fabrication invoices from COGS (they update inventory, not COGS directly)
      for (const inv of salesInvoices) {
        const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
        for (const item of items) {
          // Prefer stored costPrice on item (captured at invoice time)
          let itemCost = item.costPrice || 0;
          
          // Fallback to product lookup for items with productId and no stored cost
          if (itemCost <= 0 && item.productId) {
            const [product] = await db.select().from(products).where(eq(products.id, item.productId));
            if (product) {
              itemCost = product.costPrice || 0;
            }
          }
          
          totalProductCosts += itemCost * item.quantity;
        }
      }
      
      // Round COGS to 2 decimal places
      totalProductCosts = Math.round(totalProductCosts * 100) / 100;

      const allPayments = await db.select().from(salaryPayments).where(
        and(gte(salaryPayments.paymentDate, startDate), lte(salaryPayments.paymentDate, endDate))
      );
      const totalSalaries = Math.round(
        allPayments.reduce((sum, p) => sum + p.amount, 0) * 100
      ) / 100;

      const allExpenses = await db.select().from(expenses).where(
        and(gte(expenses.date, startDate), lte(expenses.date, endDate))
      );
      const totalExpenses = Math.round(
        allExpenses.reduce((sum, e) => sum + e.amount, 0) * 100
      ) / 100;

      // Get fabrication costs - manufacturing costs (informational only)
      // ACCOUNTING NOTE: Fabrication costs are NOT subtracted from profit because:
      // 1. They increase inventory value (asset)
      // 2. They become part of product.costPrice
      // 3. They flow to COGS only when products are sold (matching principle)
      const allFabricationInvoices = await db.select().from(fabricationInvoices).where(
        and(gte(fabricationInvoices.date, startDate), lte(fabricationInvoices.date, endDate))
      );
      const totalFabricationCosts = Math.round(
        allFabricationInvoices.reduce((sum, fab) => sum + (fab.totalCost || 0), 0) * 100
      ) / 100;

      // ACCOUNTING FORMULAS (GAAP/IFRS compliant):
      // Gross Profit = Revenue - COGS
      const grossProfit = Math.round((totalRevenue - totalProductCosts) * 100) / 100;
      
      // Operating Profit = Gross Profit - Operating Expenses (Salaries + Expenses)
      const operatingProfit = Math.round((grossProfit - totalSalaries - totalExpenses) * 100) / 100;
      
      // Net Profit = Operating Profit (no taxes in this system)
      const netProfit = operatingProfit;
      
      // Profit Margin = Net Profit / Revenue * 100
      const profitMargin = totalRevenue > 0 
        ? Math.round((netProfit / totalRevenue) * 10000) / 100 
        : 0;

      return {
        totalSalesRevenue,
        totalInvoiceRevenue,
        totalRevenue,
        totalProductCosts,
        totalFabricationCosts,
        totalSalaries,
        totalExpenses,
        grossProfit,
        operatingProfit,
        netProfit,
        profitMargin,
        periodStart: startDate,
        periodEnd: endDate,
      };
    });
  }

  /**
   * GAAP/IFRS Inventory Valuation
   * 
   * Calculates total inventory value using the cost method per:
   * - GAAP ASC 330 (Inventory)
   * - IFRS IAS 2 (Inventories)
   * 
   * Formula: Inventory Value = Sum of (Stock Quantity × Cost Price) for all products
   * 
   * Cost Price represents:
   * - For purchased goods: acquisition cost including purchase price and directly attributable costs
   * - For manufactured goods: production cost (materials + labor + overhead) from fabrication invoices
   * 
   * Products with stock > 0 but costPrice = 0 are flagged as warnings since they
   * represent incomplete cost data that would understate inventory valuation.
   */
  async getInventoryValuation(): Promise<InventoryValuation> {
    return await withRetry(async () => {
      const allProducts = await db.select().from(products);
      
      const warnings: string[] = [];
      let totalInventoryValue = 0;
      let productsWithStock = 0;
      let productsWithWarnings = 0;
      
      const productValues: ProductInventoryValue[] = allProducts.map(product => {
        // Calculate inventory value: stockQty × costPrice (rounded to 2 decimals)
        // Per GAAP/IFRS: use historical cost for valuation
        const inventoryValue = Math.round(product.stockQuantity * product.costPrice * 100) / 100;
        
        // Track products with stock
        if (product.stockQuantity > 0) {
          productsWithStock++;
        }
        
        // Flag products with stock but no cost price (data quality issue)
        // Per GAAP/IFRS: inventory must be recorded at cost - zero cost is invalid
        const hasCostWarning = product.stockQuantity > 0 && product.costPrice <= 0;
        if (hasCostWarning) {
          productsWithWarnings++;
          warnings.push(
            `Product "${product.name}" has ${product.stockQuantity} units in stock but costPrice = ${product.costPrice}. ` +
            `This understates inventory value. Update costPrice for accurate valuation.`
          );
        }
        
        // Accumulate total inventory value
        totalInventoryValue += inventoryValue;
        
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          stockQuantity: product.stockQuantity,
          costPrice: product.costPrice,
          inventoryValue,
          hasCostWarning,
        };
      });
      
      // Round total to 2 decimals
      totalInventoryValue = Math.round(totalInventoryValue * 100) / 100;
      
      return {
        products: productValues,
        totalInventoryValue,
        totalProducts: allProducts.length,
        productsWithStock,
        productsWithWarnings,
        warnings,
        valuationDate: new Date().toISOString(),
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

  async getSalePayments(saleId: string): Promise<SalePayment[]> {
    return await withRetry(async () => {
      return await db.select().from(salePayments).where(eq(salePayments.saleId, saleId)).orderBy(desc(salePayments.createdAt));
    });
  }

  async createSalePayment(payment: InsertSalePayment): Promise<SalePayment> {
    return await withRetry(async () => {
      const [newPayment] = await db.insert(salePayments).values(payment).returning();
      cache.delete(CACHE_KEYS.SALES);
      return newPayment;
    });
  }

  async deleteSalePayment(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(salePayments).where(eq(salePayments.id, id)).returning();
      cache.delete(CACHE_KEYS.SALES);
      return result.length > 0;
    });
  }

  async getSalePaidAmount(saleId: string): Promise<number> {
    return await withRetry(async () => {
      const result = await db.select({
        total: sql<number>`COALESCE(SUM(${salePayments.amount}), 0)`
      }).from(salePayments).where(eq(salePayments.saleId, saleId));
      return Number(result[0]?.total || 0);
    });
  }

  async updateSale(id: string, data: Partial<InsertSale>): Promise<Sale | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
      cache.delete(CACHE_KEYS.SALES);
      return updated || undefined;
    });
  }

  async updateSaleWithItems(id: string, saleData: Partial<InsertSale>, newItems: InsertSaleItem[]): Promise<SaleWithItems | undefined> {
    const result = await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [existingSale] = await tx.select().from(sales).where(eq(sales.id, id));
        if (!existingSale) return undefined;

        const oldItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));

        for (const oldItem of oldItems) {
          const [product] = await tx.select().from(products).where(eq(products.id, oldItem.productId));
          if (product) {
            const restoredStock = product.stockQuantity + oldItem.quantity;
            await tx.update(products).set({ stockQuantity: restoredStock }).where(eq(products.id, oldItem.productId));
            await tx.insert(stockMovements).values({
              productId: product.id,
              quantity: oldItem.quantity,
              movementType: "in",
              reason: "sale_edit_restore",
              previousStock: product.stockQuantity,
              newStock: restoredStock,
              reference: existingSale.saleNumber,
              createdAt: new Date().toISOString(),
            });
          }
        }

        await tx.delete(saleItems).where(eq(saleItems.saleId, id));

        if (!newItems || newItems.length === 0) {
          throw new Error("Sale must have at least one item.");
        }

        const createdItems: SaleItem[] = [];
        for (const item of newItems) {
          if (item.quantity <= 0) {
            throw new Error(`Item "${item.productName}" has invalid quantity.`);
          }
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (!product) {
            throw new Error(`Product "${item.productName}" not found.`);
          }
          if (product.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stockQuantity}.`);
          }

          const costPrice = product.costPrice || 0;
          const [createdItem] = await tx.insert(saleItems).values({
            ...item,
            saleId: id,
            costPrice: Math.round(costPrice * 100) / 100,
          }).returning();
          createdItems.push(createdItem);

          const newStock = product.stockQuantity - item.quantity;
          await tx.update(products).set({ stockQuantity: newStock }).where(eq(products.id, item.productId));
          await tx.insert(stockMovements).values({
            productId: product.id,
            quantity: -item.quantity,
            movementType: "out",
            reason: "sale_edit_deduct",
            previousStock: product.stockQuantity,
            newStock,
            reference: existingSale.saleNumber,
            createdAt: new Date().toISOString(),
          });
        }

        const [updatedSale] = await tx.update(sales).set(saleData).where(eq(sales.id, id)).returning();
        return { ...updatedSale, items: createdItems };
      });
    });

    cache.delete(CACHE_KEYS.SALES);
    cache.delete(CACHE_KEYS.PRODUCTS);
    cache.delete(CACHE_KEYS.DASHBOARD_STATS);
    return result || undefined;
  }

  async getSaleByNumber(saleNumber: string): Promise<Sale | undefined> {
    return await withRetry(async () => {
      const [sale] = await db.select().from(sales).where(eq(sales.saleNumber, saleNumber));
      return sale || undefined;
    });
  }

  async getSaleReturns(saleId: string): Promise<SaleReturnWithItems[]> {
    return await withRetry(async () => {
      const returns = await db.select().from(saleReturns).where(eq(saleReturns.saleId, saleId)).orderBy(desc(saleReturns.createdAt));
      const result: SaleReturnWithItems[] = [];
      for (const ret of returns) {
        const items = await db.select().from(saleReturnItems).where(eq(saleReturnItems.returnId, ret.id));
        result.push({ ...ret, items });
      }
      return result;
    });
  }

  async getReturnedQuantities(saleId: string): Promise<Record<string, number>> {
    return await withRetry(async () => {
      const returns = await db.select().from(saleReturns).where(eq(saleReturns.saleId, saleId));
      const quantities: Record<string, number> = {};
      for (const ret of returns) {
        const items = await db.select().from(saleReturnItems).where(eq(saleReturnItems.returnId, ret.id));
        for (const item of items) {
          quantities[item.productId] = (quantities[item.productId] || 0) + item.quantity;
        }
      }
      return quantities;
    });
  }

  async getNextReturnNumber(): Promise<string> {
    return await withRetry(async () => {
      const allReturns = await db.select({ returnNumber: saleReturns.returnNumber }).from(saleReturns);
      let maxNum = 0;
      for (const r of allReturns) {
        const match = r.returnNumber.match(/RET-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `RET-${String(maxNum + 1).padStart(4, '0')}`;
    });
  }

  async processReturn(saleId: string, returnData: InsertSaleReturn, items: InsertSaleReturnItem[]): Promise<SaleReturnWithItems> {
    return await withRetry(async () => {
      return await db.transaction(async (tx) => {
        const [saleRecord] = await tx.select().from(sales).where(eq(sales.id, saleId));
        if (!saleRecord) throw new Error("Sale not found");

        const [createdReturn] = await tx.insert(saleReturns).values(returnData).returning();

        const createdItems: SaleReturnItem[] = [];
        let totalRefund = 0;

        for (const item of items) {
          const [createdItem] = await tx.insert(saleReturnItems).values({
            ...item,
            returnId: createdReturn.id,
          }).returning();
          createdItems.push(createdItem);
          totalRefund += item.total;

          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            const previousStock = product.stockQuantity;
            const newStock = previousStock + item.quantity;
            await tx.update(products).set({ stockQuantity: newStock }).where(eq(products.id, item.productId));

            await tx.insert(stockMovements).values({
              productId: item.productId,
              movementType: 'in',
              reason: 'return',
              quantity: item.quantity,
              previousStock,
              newStock,
              reference: createdReturn.returnNumber,
              createdAt: new Date().toISOString(),
              createdBy: returnData.createdBy || 'system',
            });
          }
        }

        const newTotal = Math.round((saleRecord.total - totalRefund) * 100) / 100;
        const currentAmountPaid = Number(saleRecord.amountPaid) || 0;
        const clampedAmountPaid = Math.min(currentAmountPaid, Math.max(0, newTotal));

        let newStatus: string;
        if (newTotal <= 0) {
          newStatus = 'completed';
        } else if (clampedAmountPaid >= newTotal) {
          newStatus = 'completed';
        } else if (clampedAmountPaid > 0) {
          newStatus = 'partial';
        } else {
          newStatus = 'credit';
        }

        await tx.update(sales).set({
          total: Math.max(0, newTotal),
          amountPaid: clampedAmountPaid,
          status: newStatus,
        }).where(eq(sales.id, saleId));

        cache.delete(CACHE_KEYS.SALES);
        cache.delete(CACHE_KEYS.PRODUCTS);
        cache.delete(CACHE_KEYS.DASHBOARD_STATS);

        return { ...createdReturn, items: createdItems };
      });
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

  async getQuickInvoices(): Promise<QuickInvoice[]> {
    return await withRetry(async () => {
      return await db.select().from(quickInvoices).orderBy(desc(quickInvoices.createdAt));
    });
  }

  async getQuickInvoice(id: string): Promise<QuickInvoice | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(quickInvoices).where(eq(quickInvoices.id, id));
      return invoice;
    });
  }

  async createQuickInvoice(invoice: InsertQuickInvoice): Promise<QuickInvoice> {
    return await withRetry(async () => {
      const [created] = await db.insert(quickInvoices).values(invoice).returning();
      return created;
    });
  }

  async deleteQuickInvoice(id: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.delete(quickInvoices).where(eq(quickInvoices.id, id));
      return true;
    });
  }

  async getSetting(key: string): Promise<string | undefined> {
    return await withRetry(async () => {
      const [setting] = await db.select().from(settings).where(eq(settings.key, key));
      return setting?.value;
    });
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    return await withRetry(async () => {
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        const [updated] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
        return updated;
      } else {
        const [created] = await db.insert(settings).values({ key, value }).returning();
        return created;
      }
    });
  }

  // ===================== USER MANAGEMENT =====================

  async getUsers(): Promise<User[]> {
    return await withRetry(async () => {
      return await db.select().from(users);
    });
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      return updated;
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    return await withRetry(async () => {
      await db.delete(users).where(eq(users.id, id));
      return true;
    });
  }

  // ===================== SUPPLIERS =====================

  async getSuppliers(): Promise<Supplier[]> {
    return await withRetry(async () => {
      return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    });
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return await withRetry(async () => {
      const [s] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return s;
    });
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    return await withRetry(async () => {
      const [created] = await db.insert(suppliers).values(supplier).returning();
      return created;
    });
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
      return updated;
    });
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return await withRetry(async () => {
      await db.delete(suppliers).where(eq(suppliers.id, id));
      return true;
    });
  }

  // ===================== PURCHASE ORDERS =====================

  async getPurchaseOrders(): Promise<PurchaseOrderWithItems[]> {
    return await withRetry(async () => {
      const pos = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
      const result: PurchaseOrderWithItems[] = [];
      for (const po of pos) {
        const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
        const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
        result.push({ ...po, items, supplier });
      }
      return result;
    });
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderWithItems | undefined> {
    return await withRetry(async () => {
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      if (!po) return undefined;
      const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
      return { ...po, items, supplier };
    });
  }

  async createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithItems> {
    return await withRetry(async () => {
      const [created] = await db.insert(purchaseOrders).values(po).returning();
      const createdItems: PurchaseOrderItem[] = [];
      for (const item of items) {
        const [ci] = await db.insert(purchaseOrderItems).values({ ...item, purchaseOrderId: created.id }).returning();
        createdItems.push(ci);
      }
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, created.supplierId));
      return { ...created, items: createdItems, supplier };
    });
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<PurchaseOrder | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id)).returning();
      return updated;
    });
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    return await withRetry(async () => {
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
      return true;
    });
  }

  async getNextPONumber(): Promise<string> {
    return await withRetry(async () => {
      const currentYear = new Date().getFullYear();
      const allPOs = await db.select({ orderNumber: purchaseOrders.orderNumber }).from(purchaseOrders);
      const yearPOs = allPOs.filter(po => po.orderNumber.includes(`/${currentYear}`));
      let maxNum = 0;
      for (const po of yearPOs) {
        const match = po.orderNumber.match(/PO-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `PO-${String(maxNum + 1).padStart(4, '0')}/${currentYear}`;
    });
  }

  async receivePurchaseOrder(id: string, receivedBy: string): Promise<PurchaseOrderWithItems | undefined> {
    return await withRetry(async () => {
      const po = await this.getPurchaseOrder(id);
      if (!po || po.status === 'received') return po;

      const now = new Date().toISOString();
      await db.update(purchaseOrders).set({
        status: 'received',
        receivedAt: now,
        receivedBy,
      }).where(eq(purchaseOrders.id, id));

      for (const item of po.items) {
        if (item.productId) {
          const [product] = await db.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            const previousStock = product.stockQuantity;
            const newStock = previousStock + item.quantity;
            await db.update(products).set({
              stockQuantity: newStock,
              costPrice: item.unitCost,
            }).where(eq(products.id, item.productId));

            await db.insert(stockMovements).values({
              productId: item.productId,
              movementType: 'in',
              reason: 'purchase',
              quantity: item.quantity,
              previousStock,
              newStock,
              reference: po.orderNumber,
              createdAt: now,
              createdBy: receivedBy,
            });
          }
        }
      }

      cache.delete(CACHE_KEYS.PRODUCTS);
      cache.delete(CACHE_KEYS.DASHBOARD_STATS);
      return await this.getPurchaseOrder(id);
    });
  }

  // ===================== PARKED SALES =====================

  async getParkedSales(): Promise<ParkedSale[]> {
    return await withRetry(async () => {
      return await db.select().from(parkedSales).orderBy(desc(parkedSales.createdAt));
    });
  }

  async createParkedSale(sale: InsertParkedSale): Promise<ParkedSale> {
    return await withRetry(async () => {
      const [created] = await db.insert(parkedSales).values(sale).returning();
      return created;
    });
  }

  async deleteParkedSale(id: string): Promise<boolean> {
    return await withRetry(async () => {
      await db.delete(parkedSales).where(eq(parkedSales.id, id));
      return true;
    });
  }

  // ===================== AUDIT LOG =====================

  async getAuditLogs(filters?: { userId?: string; action?: string; entity?: string; startDate?: string; endDate?: string }): Promise<AuditLog[]> {
    return await withRetry(async () => {
      let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      const conditions: any[] = [];
      
      if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
      if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
      if (filters?.entity) conditions.push(eq(auditLogs.entity, filters.entity));
      if (filters?.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
      if (filters?.endDate) conditions.push(lte(auditLogs.createdAt, filters.endDate));
      
      if (conditions.length > 0) {
        return await db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(500);
      }
      return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
    });
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return await withRetry(async () => {
      const [created] = await db.insert(auditLogs).values(log).returning();
      return created;
    });
  }

  // ===================== DELIVERY STATUS =====================

  async updateInvoiceDeliveryStatus(id: string, status: string): Promise<Invoice | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(invoices).set({ deliveryStatus: status }).where(eq(invoices.id, id)).returning();
      cache.delete(CACHE_KEYS.INVOICES);
      return updated;
    });
  }

  // ===================== TRANSPORTATION INVOICES =====================

  async getTransportationInvoices(): Promise<TransportationInvoice[]> {
    const cached = cache.get<TransportationInvoice[]>(CACHE_KEYS.TRANSPORTATION_INVOICES);
    if (cached) return cached;
    return await withRetry(async () => {
      const result = await db.select().from(transportationInvoices).orderBy(desc(transportationInvoices.date));
      cache.set(CACHE_KEYS.TRANSPORTATION_INVOICES, result, CACHE_TTL.SHORT);
      return result;
    });
  }

  async getTransportationInvoice(id: string): Promise<TransportationInvoice | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(transportationInvoices).where(eq(transportationInvoices.id, id));
      return invoice || undefined;
    });
  }

  async getTransportationInvoiceWithItems(id: string): Promise<TransportationInvoiceWithItems | undefined> {
    return await withRetry(async () => {
      const [invoice] = await db.select().from(transportationInvoices).where(eq(transportationInvoices.id, id));
      if (!invoice) return undefined;
      const items = await db.select().from(transportationItems).where(eq(transportationItems.transportationInvoiceId, id));
      return { ...invoice, items };
    });
  }

  async createTransportationInvoice(invoice: InsertTransportationInvoice, items: InsertTransportationItem[]): Promise<TransportationInvoiceWithItems> {
    return await withRetry(async () => {
      const [created] = await db.insert(transportationInvoices).values(invoice).returning();
      const createdItems: TransportationItem[] = [];
      for (const item of items) {
        const [createdItem] = await db.insert(transportationItems).values({
          ...item,
          transportationInvoiceId: created.id,
        }).returning();
        createdItems.push(createdItem);
      }
      cache.delete(CACHE_KEYS.TRANSPORTATION_INVOICES);
      return { ...created, items: createdItems };
    });
  }

  async updateTransportationInvoiceStatus(id: string, status: string): Promise<TransportationInvoice | undefined> {
    return await withRetry(async () => {
      const [updated] = await db.update(transportationInvoices).set({ status }).where(eq(transportationInvoices.id, id)).returning();
      cache.delete(CACHE_KEYS.TRANSPORTATION_INVOICES);
      return updated;
    });
  }

  async deleteTransportationInvoice(id: string): Promise<boolean> {
    return await withRetry(async () => {
      await db.delete(transportationItems).where(eq(transportationItems.transportationInvoiceId, id));
      const result = await db.delete(transportationInvoices).where(eq(transportationInvoices.id, id));
      cache.delete(CACHE_KEYS.TRANSPORTATION_INVOICES);
      return (result.rowCount ?? 0) > 0;
    });
  }

  async getNextTransportationNumber(): Promise<string> {
    return await withRetry(async () => {
      const year = new Date().getFullYear();
      const prefix = `BT-`;
      const allInvoices = await db.select({ invoiceNumber: transportationInvoices.invoiceNumber }).from(transportationInvoices);
      let maxNum = 0;
      for (const inv of allInvoices) {
        const match = inv.invoiceNumber.match(/^BT-(\d+)\//);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = String(maxNum + 1).padStart(4, "0");
      return `${prefix}${nextNum}/${year}`;
    });
  }
}

export const storage = new DatabaseStorage();
