import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export {
  conversations, messages, supportConversations, supportMessages,
  insertSupportConversationSchema, insertSupportMessageSchema,
  type SupportConversation, type InsertSupportConversation,
  type SupportMessage, type InsertSupportMessage,
} from "./models/chat";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  displayName: text("display_name"),
  role: text("role").notNull().default("staff"),
  permissions: text("permissions").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
  displayName: true,
  role: true,
  permissions: true,
  isActive: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const ALL_PERMISSIONS = [
  "dashboard", "pos", "stock", "invoices", "sales", "customers",
  "resellers", "expenses", "salaries", "reports", "suppliers",
  "purchase_orders", "transportation", "branding", "settings", "audit_log"
] as const;
export type Permission = typeof ALL_PERMISSIONS[number];

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  category: text("category").notNull(),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price").notNull().default(0),
  purchasePrice: real("purchase_price").notNull().default(0),
  shippingCost: real("shipping_cost").notNull().default(0),
  additionalCost: real("additional_cost").notNull().default(0),
  weightPerUnit: real("weight_per_unit").notNull().default(0),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  unit: text("unit").notNull().default("pcs"),
  barcode: text("barcode"),
  imageUrl: text("image_url"),
  images: text("images").array(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isDealOfDay: boolean("is_deal_of_day").notNull().default(false),
  dealDiscount: real("deal_discount").notNull().default(0),
  hasVariants: boolean("has_variants").notNull().default(false),
  descriptionEn: text("description_en"),
  descriptionFr: text("description_fr"),
  descriptionAr: text("description_ar"),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  variantLabel: text("variant_label").notNull(),
  variantLabelAr: text("variant_label_ar"),
  variantLabelFr: text("variant_label_fr"),
  sku: text("sku"),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price").notNull().default(0),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  imageUrl: text("image_url"),
  images: text("images").array(),
  option1Name: text("option1_name"),
  option1Value: text("option1_value"),
  option2Name: text("option2_name"),
  option2Value: text("option2_value"),
  option3Name: text("option3_name"),
  option3Value: text("option3_value"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true });
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

// Stock movements for tracking inventory changes
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  movementType: text("movement_type").notNull(), // 'in' | 'out' | 'adjustment'
  reason: text("reason").notNull(), // 'purchase', 'sale', 'return', 'damaged', 'correction', 'initial'
  quantity: integer("quantity").notNull(), // positive for in, negative for out
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reference: text("reference"), // invoice number, sale number, or note
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type StockMovementWithProduct = StockMovement & { product?: Product };

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceType: text("invoice_type").notNull().default("SALE"), // 'SALE' | 'FABRICATION' | 'SERVICE'
  date: text("date").notNull(),
  responsible: text("responsible").notNull(),
  role: text("role").notNull().default("Ventes"),
  paymentMode: text("payment_mode").notNull(),
  dueDate: text("due_date"),
  totalHT: real("total_ht").notNull(),
  applyTva: boolean("apply_tva").notNull().default(false),
  tvaRate: real("tva_rate").notNull().default(0.19),
  tvaAmount: real("tva_amount").notNull().default(0),
  totalTTC: real("total_ttc").notNull(),
  totalWeight: real("total_weight").notNull().default(0),
  amountPaid: real("amount_paid").default(0),
  status: text("status").notNull().default("pending"), // 'pending' | 'partial' | 'paid'
  clientName: text("client_name"),
  deliveryCost: real("delivery_cost").default(0),
  deliveryStatus: text("delivery_status").notNull().default("none"), // 'none' | 'prepared' | 'shipped' | 'delivered'
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  productId: varchar("product_id"),
  designation: text("designation").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price").notNull().default(0),
  weightPerUnit: real("weight_per_unit").notNull().default(0),
  totalWeight: real("total_weight").notNull().default(0),
  total: real("total").notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, invoiceId: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export const invoicePayments = pgTable("invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({ id: true });
export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;
export type InvoicePayment = typeof invoicePayments.$inferSelect;

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleNumber: text("sale_number").notNull().unique(),
  date: text("date").notNull(),
  paymentMode: text("payment_mode").notNull(),
  total: real("total").notNull(),
  discount: real("discount").default(0),
  deliveryCost: real("delivery_cost").default(0),
  amountPaid: real("amount_paid").default(0),
  resellerId: varchar("reseller_id"),
  status: text("status").notNull().default("completed"), // 'completed' | 'partial' | 'credit'
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  walletId: varchar("wallet_id"),
});

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const saleItems = pgTable("sale_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price").notNull().default(0),
  purchaseOrderId: varchar("purchase_order_id"),
  total: real("total").notNull(),
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, saleId: true });
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

export const salePayments = pgTable("sale_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertSalePaymentSchema = createInsertSchema(salePayments).omit({ id: true });
export type InsertSalePayment = z.infer<typeof insertSalePaymentSchema>;
export type SalePayment = typeof salePayments.$inferSelect;

export const saleReturns = pgTable("sale_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull(),
  returnNumber: text("return_number").notNull().unique(),
  returnDate: text("return_date").notNull(),
  totalRefund: real("total_refund").notNull(),
  reason: text("reason"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
});

export const insertSaleReturnSchema = createInsertSchema(saleReturns).omit({ id: true });
export type InsertSaleReturn = z.infer<typeof insertSaleReturnSchema>;
export type SaleReturn = typeof saleReturns.$inferSelect;

export const saleReturnItems = pgTable("sale_return_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: varchar("return_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
});

export const insertSaleReturnItemSchema = createInsertSchema(saleReturnItems).omit({ id: true, returnId: true });
export type InsertSaleReturnItem = z.infer<typeof insertSaleReturnItemSchema>;
export type SaleReturnItem = typeof saleReturnItems.$inferSelect;

export type SaleReturnWithItems = SaleReturn & { items: SaleReturnItem[] };

export const resellers = pgTable("resellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  totalPurchases: real("total_purchases").notNull().default(0),
  rewardThreshold: real("reward_threshold").notNull().default(100000),
  inRewardPool: boolean("in_reward_pool").notNull().default(false),
  isWinner: boolean("is_winner").notNull().default(false),
  wonAt: text("won_at"),
});

export const insertResellerSchema = createInsertSchema(resellers).omit({ id: true });
export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type Reseller = typeof resellers.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  creditLimit: real("credit_limit").notNull().default(0),
  currentBalance: real("current_balance").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role"),
  monthlySalary: real("monthly_salary").notNull().default(0),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const salaryPayments = pgTable("salary_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
});

export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({ id: true });
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const fabricationInvoices = pgTable("fabrication_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  date: text("date").notNull(),
  responsible: text("responsible").notNull(),
  notes: text("notes"),
  totalWeight: real("total_weight").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
});

export const insertFabricationInvoiceSchema = createInsertSchema(fabricationInvoices).omit({ id: true });
export type InsertFabricationInvoice = z.infer<typeof insertFabricationInvoiceSchema>;
export type FabricationInvoice = typeof fabricationInvoices.$inferSelect;

export const fabricationItems = pgTable("fabrication_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fabricationInvoiceId: varchar("fabrication_invoice_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  weightPerUnit: real("weight_per_unit").notNull().default(0),
  totalWeight: real("total_weight").notNull().default(0),
  materialsCost: real("materials_cost").notNull().default(0),
  laborCost: real("labor_cost").notNull().default(0),
  overheadCost: real("overhead_cost").notNull().default(0),
  unitCost: real("unit_cost").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
});

export const insertFabricationItemSchema = createInsertSchema(fabricationItems).omit({ id: true, fabricationInvoiceId: true });
export type InsertFabricationItem = z.infer<typeof insertFabricationItemSchema>;
export type FabricationItem = typeof fabricationItems.$inferSelect;

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };
export type SaleWithItems = Sale & { items: SaleItem[] };
export type FabricationInvoiceWithItems = FabricationInvoice & { items: FabricationItem[] };
export type SalaryPaymentWithEmployee = SalaryPayment & { employee?: Employee };

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalInvoices: number;
  pendingInvoices: number;
  todaySales: number;
  todayRevenue: number;
  activeResellers: number;
  rewardPoolCount: number;
  quickInvoicesCount: number;
  quickInvoicesTotal: number;
}

export interface RecentActivity {
  id: string;
  type: "sale" | "invoice" | "expense" | "quick_invoice";
  description: string;
  amount: number;
  date: string;
  reference: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantId?: string;
  variantLabel?: string;
  stockQuantity?: number;
}

export interface ProfitStats {
  totalSalesRevenue: number;
  totalInvoiceRevenue: number;
  totalRevenue: number;
  totalProductCosts: number;       // COGS - Cost of Goods Sold
  totalShippingCosts: number;      // Total shipping costs from purchase orders
  totalDeliveryCosts: number;      // Total delivery costs from sales/invoices
  totalFabricationCosts: number;   // Manufacturing costs (informational, already in COGS via costPrice)
  totalSalaries: number;
  totalExpenses: number;
  grossProfit: number;             // Revenue - COGS
  operatingProfit: number;         // Gross Profit - Operating Expenses
  netProfit: number;               // Operating Profit (no taxes)
  profitMargin: number;
  periodStart: string;
  periodEnd: string;
}

export interface BatchProfitability {
  purchaseOrderId: string;
  orderNumber: string;
  supplierName: string;
  date: string;
  items: BatchItemProfitability[];
  totalPurchaseCost: number;
  totalShippingCost: number;
  totalTrueCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  remainingStock: number;
  remainingValue: number;
}

export interface BatchItemProfitability {
  productId: string;
  productName: string;
  quantityPurchased: number;
  unitCost: number;
  shippingShare: number;
  adjustedUnitCost: number;
  quantitySold: number;
  quantityRemaining: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

export interface ProductProfitability {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  currentCostPrice: number;
  batches: {
    purchaseOrderId: string;
    orderNumber: string;
    unitCost: number;
    adjustedUnitCost: number;
    quantityPurchased: number;
    quantitySold: number;
    quantityRemaining: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  inventoryValue: number;
}

/**
 * GAAP/IFRS Inventory Valuation Types
 * 
 * Per GAAP (ASC 330) and IFRS (IAS 2), inventory should be valued at:
 * - Lower of Cost or Net Realizable Value (LCM/NRV rule)
 * - Cost includes: purchase price, conversion costs, other costs to bring inventory to present location/condition
 * 
 * This system uses cost price (costPrice) for valuation, which represents:
 * - For purchased goods: the acquisition cost
 * - For manufactured goods: the production cost (materials + labor + overhead)
 */
export const quickInvoices = pgTable("quick_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull(),
  responsible: text("responsible"),
  role: text("role"),
  paymentMode: text("payment_mode").notNull().default("A TERME"),
  dueDate: text("due_date"),
  clientName: text("client_name"),
  clientAddress: text("client_address"),
  clientPhone: text("client_phone"),
  applyTva: boolean("apply_tva").notNull().default(false),
  tvaRate: real("tva_rate").notNull().default(0.19),
  totalHT: real("total_ht").notNull().default(0),
  tvaAmount: real("tva_amount").notNull().default(0),
  totalTTC: real("total_ttc").notNull().default(0),
  totalWeight: real("total_weight").notNull().default(0),
  notes: text("notes"),
  items: text("items").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertQuickInvoiceSchema = createInsertSchema(quickInvoices).omit({ id: true });
export type InsertQuickInvoice = z.infer<typeof insertQuickInvoiceSchema>;
export type QuickInvoice = typeof quickInvoices.$inferSelect;

// ===================== SUPPLIERS & PURCHASE ORDERS =====================

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: varchar("supplier_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("draft"), // 'draft' | 'ordered' | 'received' | 'cancelled'
  totalAmount: real("total_amount").notNull().default(0),
  shippingCost: real("shipping_cost").default(0),
  shippingDistributionMethod: text("shipping_distribution_method"), // 'by_quantity' | 'by_value'
  shippingAddedAt: text("shipping_added_at"),
  paymentWalletId: varchar("payment_wallet_id"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  receivedAt: text("received_at"),
  receivedBy: text("received_by"),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").notNull(),
  productId: varchar("product_id"),
  variantId: varchar("variant_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  shippingCostShare: real("shipping_cost_share").default(0),
  adjustedUnitCost: real("adjusted_unit_cost").default(0),
  total: real("total").notNull(),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true, purchaseOrderId: true });
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

export type PurchaseOrderWithItems = PurchaseOrder & { items: PurchaseOrderItem[]; supplier?: Supplier };

// ===================== PARKED SALES =====================

export const parkedSales = pgTable("parked_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  customerName: text("customer_name"),
  items: text("items").notNull(), // JSON string of cart items
  discount: real("discount").default(0),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"),
});

export const insertParkedSaleSchema = createInsertSchema(parkedSales).omit({ id: true });
export type InsertParkedSale = z.infer<typeof insertParkedSaleSchema>;
export type ParkedSale = typeof parkedSales.$inferSelect;

// ===================== AUDIT LOG =====================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  username: text("username").notNull(),
  action: text("action").notNull(), // 'login' | 'logout' | 'create' | 'update' | 'delete'
  entity: text("entity").notNull(), // 'sale' | 'invoice' | 'product' | 'customer' etc
  entityId: varchar("entity_id"),
  details: text("details"), // JSON string with additional info
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const transportationInvoices = pgTable("transportation_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").unique().notNull(),
  date: text("date").notNull(),
  direction: text("direction").notNull(),
  driverName: text("driver_name"),
  vehiclePlate: text("vehicle_plate"),
  departureLocation: text("departure_location").notNull(),
  arrivalLocation: text("arrival_location").notNull(),
  fuelCost: real("fuel_cost").default(0),
  driverFee: real("driver_fee").default(0),
  otherCosts: real("other_costs").default(0),
  totalCost: real("total_cost").notNull(),
  totalWeight: real("total_weight").default(0),
  totalValue: real("total_value").default(0),
  notes: text("notes"),
  responsible: text("responsible"),
  status: text("status").default("pending"),
  createdAt: text("created_at").notNull(),
});

export const insertTransportationInvoiceSchema = createInsertSchema(transportationInvoices).omit({ id: true });
export type InsertTransportationInvoice = z.infer<typeof insertTransportationInvoiceSchema>;
export type TransportationInvoice = typeof transportationInvoices.$inferSelect;

export const transportationItems = pgTable("transportation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transportationInvoiceId: varchar("transportation_invoice_id").notNull(),
  productId: varchar("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  weightPerUnit: real("weight_per_unit").default(0),
  totalWeight: real("total_weight").default(0),
  unitPrice: real("unit_price").default(0),
  totalValue: real("total_value").default(0),
});

export const insertTransportationItemSchema = createInsertSchema(transportationItems).omit({ id: true });
export type InsertTransportationItem = z.infer<typeof insertTransportationItemSchema>;
export type TransportationItem = typeof transportationItems.$inferSelect;
export type TransportationInvoiceWithItems = TransportationInvoice & { items: TransportationItem[] };

export interface ProductInventoryValue {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  costPrice: number;
  inventoryValue: number;           // stockQuantity * costPrice (rounded to 2 decimals)
  hasCostWarning: boolean;          // true if costPrice = 0 but stockQuantity > 0
}

export interface InventoryValuation {
  products: ProductInventoryValue[];
  totalInventoryValue: number;
  totalProducts: number;
  productsWithStock: number;
  productsWithWarnings: number;
  warnings: string[];
  valuationDate: string;
}

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percentage"),
  discountValue: real("discount_value").notNull(),
  minOrderAmount: real("min_order_amount").default(0),
  maxUses: integer("max_uses").default(0),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  createdBy: text("created_by").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, currentUses: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

export const storeOrders = pgTable("store_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  items: text("items").notNull(),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  promoCode: text("promo_code"),
  deliveryCost: real("delivery_cost").notNull().default(0),
  total: real("total").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  paymentMethod: text("payment_method"),
  paymentProof: text("payment_proof"),
  paymentConfirmed: boolean("payment_confirmed").notNull().default(false),
  paymentConfirmedAt: text("payment_confirmed_at"),
  pointsRedeemed: integer("points_redeemed").notNull().default(0),
  loyaltyDiscount: real("loyalty_discount").notNull().default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStoreOrderSchema = createInsertSchema(storeOrders).omit({ id: true, createdAt: true });
export type InsertStoreOrder = z.infer<typeof insertStoreOrderSchema>;
export type StoreOrder = typeof storeOrders.$inferSelect;

export const storeNotifications = pgTable("store_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  customerEmail: text("customer_email"),
  orderNumber: text("order_number"),
  type: text("type").notNull().default("payment_confirmed"),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  message: text("message").notNull(),
  messageAr: text("message_ar"),
  messageFr: text("message_fr"),
  channel: text("channel").notNull().default("in_store"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStoreNotificationSchema = createInsertSchema(storeNotifications).omit({ id: true, createdAt: true });
export type InsertStoreNotification = z.infer<typeof insertStoreNotificationSchema>;
export type StoreNotification = typeof storeNotifications.$inferSelect;

export const paymentWallets = pgTable("payment_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  walletNumber: text("wallet_number").notNull(),
  iconType: text("icon_type").notNull().default("wallet"),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  balance: real("balance").notNull().default(0),
  openingBalance: real("opening_balance").notNull().default(0),
});

export const insertPaymentWalletSchema = createInsertSchema(paymentWallets).omit({ id: true });
export type InsertPaymentWallet = z.infer<typeof insertPaymentWalletSchema>;
export type PaymentWallet = typeof paymentWallets.$inferSelect;

export const cmsPages = pgTable("cms_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default("{}"),
  isPublished: boolean("is_published").notNull().default(true),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertCmsPageSchema = createInsertSchema(cmsPages).omit({ id: true, updatedAt: true });
export type InsertCmsPage = z.infer<typeof insertCmsPageSchema>;
export type CmsPage = typeof cmsPages.$inferSelect;

export const cmsBanners = pgTable("cms_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertCmsBannerSchema = createInsertSchema(cmsBanners).omit({ id: true, createdAt: true });
export type InsertCmsBanner = z.infer<typeof insertCmsBannerSchema>;
export type CmsBanner = typeof cmsBanners.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  nameFr: text("name_fr"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const storeCustomers = pgTable("store_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  language: text("language").notNull().default("en"),
  isActive: boolean("is_active").notNull().default(true),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  resetToken: text("reset_token"),
  resetTokenExpiry: text("reset_token_expiry"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStoreCustomerSchema = createInsertSchema(storeCustomers).omit({ id: true, createdAt: true });
export type InsertStoreCustomer = z.infer<typeof insertStoreCustomerSchema>;
export type StoreCustomer = typeof storeCustomers.$inferSelect;

export const storeSettings = pgTable("store_settings", {
  id: varchar("id").primaryKey().default(sql`'default'`),
  storeName: text("store_name").notNull().default("LIMJIBA"),
  storeDescription: text("store_description").default(""),
  primaryColor: text("primary_color").notNull().default("#0A1628"),
  accentColor: text("accent_color").notNull().default("#C9A84C"),
  logoUrl: text("logo_url"),
  heroTitle: text("hero_title").default(""),
  heroSubtitle: text("hero_subtitle").default(""),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  socialLinks: text("social_links").default("{}"),
  trustBadges: text("trust_badges"),
  categorySectionTitle: text("category_section_title"),
  ctaText: text("cta_text"),
  footerDescription: text("footer_description"),
  openingBalance: real("opening_balance").notNull().default(0),
  pointsRate: real("points_rate").notNull().default(0.1),
  pointsValue: real("points_value").notNull().default(0.2),
  autoEmailInvoice: boolean("auto_email_invoice").notNull().default(true),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({ id: true, updatedAt: true });
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettings.$inferSelect;

export const productReviews = pgTable("product_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({ id: true, createdAt: true });
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;
export type ProductReview = typeof productReviews.$inferSelect;

export const storeReviews = pgTable("store_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStoreReviewSchema = createInsertSchema(storeReviews).omit({ id: true, createdAt: true });
export type InsertStoreReview = z.infer<typeof insertStoreReviewSchema>;
export type StoreReview = typeof storeReviews.$inferSelect;

export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerEmail: text("customer_email").notNull(),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  language: text("language").notNull().default("en"),
  items: text("items").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  subtotal: real("subtotal").notNull().default(0),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  convertedToOrder: boolean("converted_to_order").notNull().default(false),
  lastUpdatedAt: text("last_updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({ id: true, createdAt: true });
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  orderNumber: text("order_number"),
  note: text("note"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;
