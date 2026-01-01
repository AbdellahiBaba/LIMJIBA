import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price").notNull().default(0),
  weightPerUnit: real("weight_per_unit").notNull().default(0),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  unit: text("unit").notNull().default("pcs"),
  barcode: text("barcode"),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

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
  status: text("status").notNull().default("pending"),
  clientName: text("client_name"),
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
  weightPerUnit: real("weight_per_unit").notNull().default(0),
  totalWeight: real("total_weight").notNull().default(0),
  total: real("total").notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, invoiceId: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleNumber: text("sale_number").notNull().unique(),
  date: text("date").notNull(),
  paymentMode: text("payment_mode").notNull(),
  total: real("total").notNull(),
  discount: real("discount").default(0),
  resellerId: varchar("reseller_id"),
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
  total: real("total").notNull(),
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, saleId: true });
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

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
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProfitStats {
  totalSalesRevenue: number;
  totalProductCosts: number;
  totalSalaries: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  periodStart: string;
  periodEnd: string;
}
