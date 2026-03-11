import nodemailer from "nodemailer";

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let _cachedSocialLinks: Record<string, string> = {};
let _cachedWebsiteUrl = "https://limjiba.com";

export function setEmailSocialLinks(socialLinks: Record<string, string> | null, websiteUrl?: string) {
  if (!socialLinks || typeof socialLinks !== "object") {
    _cachedSocialLinks = {};
  } else {
    const safe: Record<string, string> = {};
    for (const [key, val] of Object.entries(socialLinks)) {
      if (typeof val === "string" && /^https?:\/\//i.test(val.trim())) {
        safe[key] = val.trim();
      }
    }
    _cachedSocialLinks = safe;
  }
  if (websiteUrl) _cachedWebsiteUrl = websiteUrl;
}

const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.SMTP_FROM || `LIMJIBA <${SMTP_USER}>`;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[EMAIL] SMTP credentials not configured (SMTP_USER / SMTP_PASS missing)");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`[EMAIL] SMTP transporter created: ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[EMAIL] Skipped (no SMTP): ${options.to} — ${options.subject}`);
    return false;
  }
  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send to ${options.to}:`, err.message || err);
    return false;
  }
}

function buildSocialIconsHtml(): string {
  const socials: Array<{ key: string; label: string; icon: string; color: string }> = [
    { key: "whatsapp", label: "WhatsApp", icon: "W", color: "#25D366" },
    { key: "instagram", label: "Instagram", icon: "I", color: "#E4405F" },
    { key: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
    { key: "snapchat", label: "Snapchat", icon: "S", color: "#FFFC00" },
    { key: "tiktok", label: "TikTok", icon: "T", color: "#FF0050" },
  ];

  const icons = socials
    .filter(s => _cachedSocialLinks[s.key]?.trim())
    .map(s => {
      const url = escHtml(_cachedSocialLinks[s.key].trim());
      return `<a href="${url}" target="_blank" title="${s.label}" style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:50%;background:rgba(201,168,76,0.15);color:#C9A84C;text-decoration:none;font-size:14px;font-weight:700;margin:0 5px;border:1px solid rgba(201,168,76,0.25);">${s.icon}</a>`;
    });

  if (icons.length === 0) return "";
  return `<p style="color:rgba(201,168,76,0.6);margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Follow Us</p><div style="margin-bottom:8px;">${icons.join("")}</div>`;
}

function brandedHtml(content: string, dir: string = "ltr"): string {
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${dir === "rtl" ? "ar" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#FAF6EE;">
  <div style="background:linear-gradient(135deg,#0A1628 0%,#132240 100%);padding:32px 24px;text-align:center;">
    <h1 style="color:#C9A84C;margin:0;font-size:32px;letter-spacing:4px;font-weight:700;">LIMJIBA</h1>
    <p style="color:rgba(201,168,76,0.7);margin:6px 0 0;font-size:16px;font-family:'Traditional Arabic',serif;">لمجيبة</p>
    <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:12px auto 0;"></div>
  </div>
  <div style="padding:32px 28px;color:#0A1628;line-height:1.6;direction:${dir};">
    ${content}
  </div>
  <div style="background:#0A1628;padding:32px 24px;text-align:center;">
    <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:0 auto 20px;"></div>
    ${buildSocialIconsHtml()}
    <div style="margin:20px 0;">
      <a href="${_cachedWebsiteUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:10px 28px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:1px;">limjiba.com</a>
    </div>
    <div style="width:40px;height:1px;background:rgba(201,168,76,0.2);margin:16px auto;"></div>
    <p style="color:rgba(201,168,76,0.8);margin:0;font-size:13px;font-weight:600;">LIMJIBA — IMPORTING</p>
    <p style="color:rgba(201,168,76,0.5);margin:6px 0 0;font-size:12px;">لمجيبة</p>
    <p style="color:rgba(255,255,255,0.35);margin:10px 0 0;font-size:11px;">© ${new Date().getFullYear()} LIMJIBA. All rights reserved.</p>
    <p style="color:rgba(201,168,76,0.4);margin:4px 0 0;font-size:11px;">
      <a href="mailto:support@limjiba.com" style="color:rgba(201,168,76,0.5);text-decoration:none;">support@limjiba.com</a>
    </p>
  </div>
</div>
</body></html>`;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCost: number;
  total: number;
  paymentMethod?: string;
  status: string;
  createdAt: string;
}

const INVOICE_LABELS: Record<string, Record<string, string>> = {
  en: {
    invoiceTitle: "Order Invoice",
    orderNumber: "Order #",
    date: "Date",
    billTo: "Bill To",
    phone: "Phone",
    address: "Address",
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit Price",
    lineTotal: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    deliveryCost: "Delivery",
    grandTotal: "Grand Total",
    paymentMethod: "Payment",
    status: "Status",
    greeting: "Dear",
    thankYou: "Thank you for your order! Here is your invoice.",
    footer: "If you have questions about this order, contact us at support@limjiba.com",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusShipped: "Shipped",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
  },
  fr: {
    invoiceTitle: "Facture de Commande",
    orderNumber: "Commande N°",
    date: "Date",
    billTo: "Facturé à",
    phone: "Téléphone",
    address: "Adresse",
    item: "Article",
    qty: "Qté",
    unitPrice: "Prix Unitaire",
    lineTotal: "Total",
    subtotal: "Sous-total",
    discount: "Remise",
    deliveryCost: "Livraison",
    grandTotal: "Total Général",
    paymentMethod: "Paiement",
    status: "Statut",
    greeting: "Cher(e)",
    thankYou: "Merci pour votre commande ! Voici votre facture.",
    footer: "Pour toute question, contactez-nous à support@limjiba.com",
    statusPending: "En attente",
    statusConfirmed: "Confirmée",
    statusShipped: "Expédiée",
    statusDelivered: "Livrée",
    statusCancelled: "Annulée",
  },
  ar: {
    invoiceTitle: "فاتورة الطلب",
    orderNumber: "رقم الطلب",
    date: "التاريخ",
    billTo: "فاتورة إلى",
    phone: "الهاتف",
    address: "العنوان",
    item: "المنتج",
    qty: "الكمية",
    unitPrice: "سعر الوحدة",
    lineTotal: "المجموع",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    deliveryCost: "التوصيل",
    grandTotal: "المجموع الكلي",
    paymentMethod: "طريقة الدفع",
    status: "الحالة",
    greeting: "عزيزي",
    thankYou: "شكراً لطلبكم! إليكم فاتورتكم.",
    footer: "لأي استفسار، تواصلوا معنا عبر support@limjiba.com",
    statusPending: "قيد الانتظار",
    statusConfirmed: "مؤكد",
    statusShipped: "تم الشحن",
    statusDelivered: "تم التوصيل",
    statusCancelled: "ملغى",
  },
};

function getStatusLabel(status: string, lang: string): string {
  const l = INVOICE_LABELS[lang] || INVOICE_LABELS.en;
  const key = `status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof l;
  return l[key] || status;
}

function formatDate(dateStr: string, lang: string): string {
  try {
    const d = new Date(dateStr);
    const locale = lang === "ar" ? "ar-MR" : lang === "fr" ? "fr-FR" : "en-US";
    return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function generateInvoiceHtml(data: InvoiceData, lang: string): string {
  const l = INVOICE_LABELS[lang] || INVOICE_LABELS.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "right" : "left";
  const alignEnd = lang === "ar" ? "left" : "right";

  const statusColor: Record<string, string> = {
    pending: "#E6A817",
    confirmed: "#2E7D32",
    shipped: "#1565C0",
    delivered: "#2E7D32",
    cancelled: "#C62828",
  };

  let itemsHtml = "";
  data.items.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8f6f1";
    const lineTotal = item.quantity * item.unitPrice;
    itemsHtml += `
      <tr style="background:${bg};">
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:${align};">${escHtml(item.productName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:${alignEnd};font-family:monospace;">${item.unitPrice.toLocaleString()} MRU</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:${alignEnd};font-family:monospace;font-weight:600;">${lineTotal.toLocaleString()} MRU</td>
      </tr>`;
  });

  const customerInfo = [
    `<strong>${escHtml(data.customerName)}</strong>`,
    escHtml(data.customerEmail),
    data.customerPhone ? `${l.phone}: ${escHtml(data.customerPhone)}` : "",
    data.customerAddress ? `${l.address}: ${escHtml(data.customerAddress)}` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  let totalsHtml = `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:${alignEnd};font-size:13px;color:#666;">${l.subtotal}</td>
      <td style="padding:8px 12px;text-align:${alignEnd};font-family:monospace;font-size:13px;">${data.subtotal.toLocaleString()} MRU</td>
    </tr>`;

  if (data.discount > 0) {
    totalsHtml += `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:${alignEnd};font-size:13px;color:#2E7D32;">${l.discount}</td>
      <td style="padding:8px 12px;text-align:${alignEnd};font-family:monospace;font-size:13px;color:#2E7D32;">-${data.discount.toLocaleString()} MRU</td>
    </tr>`;
  }

  if (data.deliveryCost > 0) {
    totalsHtml += `
    <tr>
      <td colspan="3" style="padding:8px 12px;text-align:${alignEnd};font-size:13px;color:#666;">${l.deliveryCost}</td>
      <td style="padding:8px 12px;text-align:${alignEnd};font-family:monospace;font-size:13px;">+${data.deliveryCost.toLocaleString()} MRU</td>
    </tr>`;
  }

  const sColor = statusColor[data.status] || "#666";

  const content = `
    <div style="text-align:${align};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px;">
        <div>
          <h2 style="color:#0A1628;margin:0 0 4px;font-size:22px;">${l.invoiceTitle}</h2>
          <p style="margin:0;color:#666;font-size:13px;">${l.orderNumber} <strong style="color:#C9A84C;">${data.orderNumber}</strong></p>
          <p style="margin:4px 0 0;color:#666;font-size:13px;">${l.date}: ${formatDate(data.createdAt, lang)}</p>
        </div>
        <div style="background:${sColor}15;border:1px solid ${sColor}40;border-radius:6px;padding:6px 14px;">
          <span style="color:${sColor};font-size:12px;font-weight:700;">${l.status}: ${getStatusLabel(data.status, lang)}</span>
        </div>
      </div>

      <p style="font-size:14px;color:#333;">${l.greeting} ${escHtml(data.customerName)},</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">${l.thankYou}</p>

      <div style="background:#f0ede6;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">${l.billTo}</p>
        <p style="margin:0;font-size:13px;line-height:1.7;">${customerInfo}</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e0ddd5;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:linear-gradient(135deg,#0A1628,#132240);">
            <th style="padding:12px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:${align};font-weight:600;">${l.item}</th>
            <th style="padding:12px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:600;">${l.qty}</th>
            <th style="padding:12px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:${alignEnd};font-weight:600;">${l.unitPrice}</th>
            <th style="padding:12px;color:#C9A84C;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:${alignEnd};font-weight:600;">${l.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot style="border-top:2px solid #C9A84C;">
          ${totalsHtml}
          <tr style="background:#0A1628;">
            <td colspan="3" style="padding:14px 12px;text-align:${alignEnd};color:#C9A84C;font-size:14px;font-weight:700;">${l.grandTotal}</td>
            <td style="padding:14px 12px;text-align:${alignEnd};color:#C9A84C;font-family:monospace;font-size:20px;font-weight:700;">${data.total.toLocaleString()} MRU</td>
          </tr>
        </tfoot>
      </table>

      ${data.paymentMethod ? `
      <div style="margin-top:20px;padding:12px 16px;background:#f0ede6;border-radius:8px;display:inline-block;">
        <span style="font-size:12px;color:#888;">${l.paymentMethod}:</span>
        <span style="font-size:13px;font-weight:600;color:#0A1628;margin-${lang === "ar" ? "right" : "left"}:8px;">${escHtml(data.paymentMethod!)}</span>
      </div>` : ""}

      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e0ddd5;">
        <p style="font-size:12px;color:#999;text-align:center;">${l.footer}</p>
      </div>
    </div>
  `;

  return brandedHtml(content, dir);
}

export async function sendOrderInvoiceEmail(data: InvoiceData, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const labels = INVOICE_LABELS[l];
  const html = generateInvoiceHtml(data, l);
  return sendEmail({
    to: data.customerEmail,
    subject: `LIMJIBA — ${labels.invoiceTitle} — ${data.orderNumber}`,
    html,
  });
}

const STATUS_MESSAGES: Record<string, Record<string, { subject: string; body: string }>> = {
  confirmed: {
    en: { subject: "Order Confirmed", body: "Your order <strong>{orderNumber}</strong> has been confirmed and is being prepared." },
    fr: { subject: "Commande Confirmée", body: "Votre commande <strong>{orderNumber}</strong> a été confirmée et est en cours de préparation." },
    ar: { subject: "تم تأكيد الطلب", body: "تم تأكيد طلبكم <strong>{orderNumber}</strong> وهو قيد التحضير." },
  },
  shipped: {
    en: { subject: "Order Shipped", body: "Your order <strong>{orderNumber}</strong> has been shipped and is on its way!" },
    fr: { subject: "Commande Expédiée", body: "Votre commande <strong>{orderNumber}</strong> a été expédiée!" },
    ar: { subject: "تم شحن الطلب", body: "تم شحن طلبكم <strong>{orderNumber}</strong> وهو في الطريق!" },
  },
  delivered: {
    en: { subject: "Order Delivered", body: "Your order <strong>{orderNumber}</strong> has been delivered. Thank you for shopping with LIMJIBA!" },
    fr: { subject: "Commande Livrée", body: "Votre commande <strong>{orderNumber}</strong> a été livrée. Merci d'avoir choisi LIMJIBA!" },
    ar: { subject: "تم توصيل الطلب", body: "تم توصيل طلبكم <strong>{orderNumber}</strong>. شكراً لتسوقكم مع لمجيبة!" },
  },
  cancelled: {
    en: { subject: "Order Cancelled", body: "Your order <strong>{orderNumber}</strong> has been cancelled. Contact us at support@limjiba.com for questions." },
    fr: { subject: "Commande Annulée", body: "Votre commande <strong>{orderNumber}</strong> a été annulée. Contactez-nous à support@limjiba.com." },
    ar: { subject: "تم إلغاء الطلب", body: "تم إلغاء طلبكم <strong>{orderNumber}</strong>. تواصلوا معنا عبر support@limjiba.com." },
  },
};

export async function sendOrderStatusEmail(
  email: string, customerName: string, orderNumber: string, status: string, total: number, lang: string = "en"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const msgs = STATUS_MESSAGES[status]?.[l];
  if (!msgs) return false;

  const dir = l === "ar" ? "rtl" : "ltr";
  const greeting = l === "ar" ? `مرحباً ${customerName}` : l === "fr" ? `Bonjour ${customerName}` : `Hello ${customerName}`;
  const html = brandedHtml(`
    <h2 style="color: #0A1628; margin-top: 0;">${msgs.subject}</h2>
    <p>${greeting},</p>
    <p>${msgs.body.replace("{orderNumber}", orderNumber)}</p>
    <div style="background: #0A1628; color: #C9A84C; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px;">${l === "ar" ? "المبلغ الإجمالي" : l === "fr" ? "Total" : "Total"}</p>
      <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold;">${total.toFixed(2)} MRU</p>
    </div>
  `, dir);

  return sendEmail({ to: email, subject: `LIMJIBA — ${msgs.subject} — ${orderNumber}`, html });
}

export async function sendWelcomeEmail(email: string, customerName: string, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const subjects: Record<string, string> = { en: "Welcome to LIMJIBA!", fr: "Bienvenue chez LIMJIBA!", ar: "مرحباً بكم في لمجيبة!" };
  const bodies: Record<string, string> = {
    en: `<h2>Welcome, ${customerName}!</h2><p>Your LIMJIBA account has been created successfully. You can now enjoy faster checkout, order tracking, and loyalty rewards.</p>`,
    fr: `<h2>Bienvenue, ${customerName}!</h2><p>Votre compte LIMJIBA a été créé avec succès. Profitez d'un paiement rapide, du suivi de commandes et de récompenses fidélité.</p>`,
    ar: `<h2>مرحباً ${customerName}!</h2><p>تم إنشاء حسابكم في لمجيبة بنجاح. يمكنكم الآن الاستمتاع بتجربة شراء أسرع وتتبع الطلبات ومكافآت الولاء.</p>`,
  };

  return sendEmail({ to: email, subject: subjects[l], html: brandedHtml(bodies[l], dir) });
}

export async function sendPasswordResetEmail(email: string, customerName: string, resetUrl: string, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const subjects: Record<string, string> = { en: "Password Reset - LIMJIBA", fr: "Réinitialisation du mot de passe - LIMJIBA", ar: "إعادة تعيين كلمة المرور - لمجيبة" };
  const bodies: Record<string, string> = {
    en: `<h2>Password Reset</h2><p>Hello ${customerName},</p><p>Click the link below to reset your password:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a><p style="margin-top: 16px; color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    fr: `<h2>Réinitialisation du mot de passe</h2><p>Bonjour ${customerName},</p><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Réinitialiser</a><p style="margin-top: 16px; color: #666; font-size: 12px;">Ce lien expire dans 1 heure.</p>`,
    ar: `<h2>إعادة تعيين كلمة المرور</h2><p>مرحباً ${customerName}،</p><p>انقروا على الرابط أدناه لإعادة تعيين كلمة المرور:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">إعادة التعيين</a><p style="margin-top: 16px; color: #666; font-size: 12px;">ينتهي هذا الرابط خلال ساعة واحدة.</p>`,
  };

  return sendEmail({ to: email, subject: subjects[l], html: brandedHtml(bodies[l], dir) });
}

export async function sendPaymentConfirmedEmail(
  email: string, customerName: string, orderNumber: string, total: number, trackingUrl: string, lang: string = "en"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";

  const subjects: Record<string, string> = {
    en: "Payment Confirmed",
    fr: "Paiement Confirmé",
    ar: "تم تأكيد الدفع",
  };

  const safeName = escHtml(customerName);
  const safeOrder = escHtml(orderNumber);

  const bodies: Record<string, string> = {
    en: `
      <h2 style="color:#0A1628;margin-top:0;">Payment Confirmed ✓</h2>
      <p>Hello ${safeName},</p>
      <p>We have received and confirmed your payment for order <strong style="color:#C9A84C;">${safeOrder}</strong>.</p>
      <div style="background:#0A1628;color:#C9A84C;padding:20px;border-radius:10px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Amount Paid</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;font-family:monospace;">${total.toLocaleString()} MRU</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(201,168,76,0.7);">Order ${safeOrder}</p>
      </div>
      <p>Your order is now being processed and will be prepared for delivery shortly.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${trackingUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">Track Your Order</a>
      </div>
      <p style="font-size:12px;color:#888;">If you have any questions, contact us at support@limjiba.com</p>`,
    fr: `
      <h2 style="color:#0A1628;margin-top:0;">Paiement Confirmé ✓</h2>
      <p>Bonjour ${safeName},</p>
      <p>Nous avons reçu et confirmé votre paiement pour la commande <strong style="color:#C9A84C;">${safeOrder}</strong>.</p>
      <div style="background:#0A1628;color:#C9A84C;padding:20px;border-radius:10px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Montant Payé</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;font-family:monospace;">${total.toLocaleString()} MRU</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(201,168,76,0.7);">Commande ${safeOrder}</p>
      </div>
      <p>Votre commande est en cours de traitement et sera bientôt préparée pour la livraison.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${trackingUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">Suivre Votre Commande</a>
      </div>
      <p style="font-size:12px;color:#888;">Pour toute question, contactez-nous à support@limjiba.com</p>`,
    ar: `
      <h2 style="color:#0A1628;margin-top:0;">تم تأكيد الدفع ✓</h2>
      <p>مرحباً ${safeName}،</p>
      <p>لقد استلمنا وأكدنا دفعتكم للطلب <strong style="color:#C9A84C;">${safeOrder}</strong>.</p>
      <div style="background:#0A1628;color:#C9A84C;padding:20px;border-radius:10px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">المبلغ المدفوع</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;font-family:monospace;">${total.toLocaleString()} أوقية</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(201,168,76,0.7);">طلب ${safeOrder}</p>
      </div>
      <p>طلبكم قيد المعالجة وسيتم تجهيزه للتوصيل قريباً.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${trackingUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">تتبع طلبكم</a>
      </div>
      <p style="font-size:12px;color:#888;">لأي استفسار، تواصلوا معنا عبر support@limjiba.com</p>`,
  };

  return sendEmail({
    to: email,
    subject: `LIMJIBA — ${subjects[l]} — ${orderNumber}`,
    html: brandedHtml(bodies[l], dir),
  });
}

export async function sendMarketingEmail(
  email: string, customerName: string, subject: string, messageEn: string, messageFr: string, messageAr: string, lang: string = "en"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const message = l === "ar" ? messageAr : l === "fr" ? messageFr : messageEn;
  const greeting = l === "ar" ? `مرحباً ${customerName}` : l === "fr" ? `Bonjour ${customerName}` : `Hello ${customerName}`;

  return sendEmail({
    to: email,
    subject: `LIMJIBA — ${subject}`,
    html: brandedHtml(`<p>${greeting},</p><div>${message}</div>`, dir),
  });
}

export async function sendProductMarketingEmail(
  email: string,
  customerName: string,
  lang: string,
  product: { name: string; nameAr?: string | null; nameFr?: string | null; unitPrice: number; imageUrl?: string | null; dealDiscount?: number | null },
  type: "new_arrival" | "flash_sale"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const pName = l === "ar" ? (product.nameAr || product.name) : l === "fr" ? (product.nameFr || product.name) : product.name;
  const price = `${product.unitPrice.toLocaleString()} MRU`;
  const discount = product.dealDiscount ? `${product.dealDiscount}%` : "";
  const discountedPrice = product.dealDiscount ? `${Math.round(product.unitPrice * (1 - product.dealDiscount / 100)).toLocaleString()} MRU` : "";

  const subjects: Record<string, string> = type === "new_arrival"
    ? { en: `✨ New Arrival — ${pName}`, fr: `✨ Nouvelle Arrivée — ${pName}`, ar: `✨ وصول جديد — ${pName}` }
    : { en: `🔥 Flash Sale — ${discount} OFF ${pName}`, fr: `🔥 Vente Flash — ${discount} de remise sur ${pName}`, ar: `🔥 تخفيض خاطف — ${discount} خصم على ${pName}` };

  const safeName = escHtml(customerName);
  const greetings: Record<string, string> = {
    en: `Dear ${safeName}`,
    fr: `Cher(e) ${safeName}`,
    ar: `عزيزي/عزيزتي ${safeName}`
  };

  const poeticMessages: Record<string, Record<string, string>> = {
    new_arrival: {
      en: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">A new treasure has graced the halls of LIMJIBA — handpicked with devotion, wrapped in elegance, and destined for those who appreciate the finer things in life.</p>`,
      fr: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">Un nouveau trésor vient d'embellir les salons de LIMJIBA — sélectionné avec passion, enveloppé d'élégance, et destiné à ceux qui savourent les plus belles choses de la vie.</p>`,
      ar: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">كنزٌ جديد قد زيّن أروقة لمجيبة — مُنتقى بعناية فائقة، يلبسه الأناقة، ومُقدَّر لمن يُقدّرون أجمل ما في الحياة.</p>`
    },
    flash_sale: {
      en: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">The golden hour has arrived — a rare moment where luxury meets opportunity. This exclusive offer is a whisper of fortune reserved for the discerning few. Seize it before the curtain falls.</p>`,
      fr: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">L'heure dorée est arrivée — un moment rare où le luxe rencontre l'opportunité. Cette offre exclusive est un murmure de fortune réservé aux plus avisés. Saisissez-la avant que le rideau ne tombe.</p>`,
      ar: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.7;">حانت الساعة الذهبية — لحظة نادرة يلتقي فيها الفخامة بالفرصة. هذا العرض الحصري همسة حظٍّ لا تُمنح إلا للمُميّزين. اغتنموها قبل أن يُسدل الستار.</p>`
    }
  };

  const ctaLabels: Record<string, string> = {
    en: "Discover Now",
    fr: "Découvrir Maintenant",
    ar: "اكتشف الآن"
  };

  const safeImgUrl = product.imageUrl && /^https?:\/\//i.test(product.imageUrl) ? escHtml(product.imageUrl) : null;
  const imgBlock = safeImgUrl
    ? `<div style="text-align:center;margin:20px 0;"><img src="${safeImgUrl}" alt="${escHtml(pName)}" style="max-width:100%;max-height:320px;border-radius:12px;box-shadow:0 4px 20px rgba(10,22,40,0.15);" /></div>`
    : "";

  const priceBlock = type === "flash_sale" && product.dealDiscount
    ? `<div style="text-align:center;margin:16px 0;padding:16px;background:linear-gradient(135deg,#0A1628,#132240);border-radius:10px;">
        <span style="color:rgba(255,255,255,0.5);text-decoration:line-through;font-size:16px;">${price}</span>
        <span style="color:#C9A84C;font-size:28px;font-weight:700;margin:0 12px;">${discountedPrice}</span>
        <span style="background:#C9A84C;color:#0A1628;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:700;">${discount} OFF</span>
      </div>`
    : `<div style="text-align:center;margin:16px 0;"><span style="color:#0A1628;font-size:24px;font-weight:700;">${price}</span></div>`;

  const ctaBlock = `<div style="text-align:center;margin:24px 0;">
    <a href="https://limjiba.com" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:1px;">${ctaLabels[l]}</a>
  </div>`;

  const body = `
    <p style="font-size:16px;color:#0A1628;font-weight:600;">${greetings[l]},</p>
    ${poeticMessages[type][l]}
    <h2 style="text-align:center;color:#0A1628;font-size:20px;margin:24px 0 8px;font-weight:700;">${escHtml(pName)}</h2>
    ${imgBlock}
    ${priceBlock}
    ${ctaBlock}
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:20px auto;"></div>
    <p style="text-align:center;color:rgba(10,22,40,0.5);font-size:12px;">${l === "ar" ? "مع أطيب التحيات من فريق لمجيبة" : l === "fr" ? "Avec nos plus chaleureuses salutations, l'équipe LIMJIBA" : "With warmest regards, The LIMJIBA Team"}</p>
  `;

  return sendEmail({
    to: email,
    subject: `LIMJIBA — ${subjects[l]}`,
    html: brandedHtml(body, dir),
  });
}

export async function sendAbandonedCartReminderEmail(
  email: string,
  customerName: string,
  lang: string,
  itemCount: number,
  subtotal: number
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const safeName = escHtml(customerName || (l === "ar" ? "عزيزنا" : l === "fr" ? "Cher client" : "Valued Customer"));
  const total = `${subtotal.toLocaleString()} MRU`;

  const subjects: Record<string, string> = {
    en: "Your treasures await you ✨",
    fr: "Vos trésors vous attendent ✨",
    ar: "كنوزكم في الانتظار ✨"
  };

  const greetings: Record<string, string> = {
    en: `Dear ${safeName}`,
    fr: `Cher(e) ${safeName}`,
    ar: `عزيزي/عزيزتي ${safeName}`
  };

  const poeticBlocks: Record<string, string> = {
    en: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.8;">
      We noticed you left something special behind — treasures carefully chosen, waiting patiently in the glow of golden light.
      Like a letter left unsealed, your selection longs for its destination. The finest things in life don't wait forever — 
      let us bring them home to you before the moment passes.
    </p>`,
    fr: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.8;">
      Nous avons remarqué que vous avez laissé quelque chose de spécial derrière vous — des trésors soigneusement choisis, 
      attendant patiemment sous l'éclat doré. Comme une lettre restée ouverte, votre sélection aspire à sa destination. 
      Les plus belles choses de la vie n'attendent pas éternellement — laissez-nous vous les apporter avant que l'instant ne s'envole.
    </p>`,
    ar: `<p style="font-style:italic;color:#5a4d3a;font-size:15px;line-height:1.8;">
      لاحظنا أنكم تركتم شيئاً مميزاً خلفكم — كنوزٌ مُنتقاة بعناية، تنتظر بصبرٍ تحت وهج الذهب.
      كرسالةٍ لم تُختم بعد، اختياركم يتوق إلى وجهته. أجمل ما في الحياة لا ينتظر طويلاً — 
      دعونا نحمله إليكم قبل أن تمضي اللحظة.
    </p>`
  };

  const cartSummaryLabels: Record<string, { items: string; total: string }> = {
    en: { items: "Items in your cart", total: "Cart value" },
    fr: { items: "Articles dans votre panier", total: "Valeur du panier" },
    ar: { items: "المنتجات في سلتكم", total: "قيمة السلة" }
  };

  const ctaLabels: Record<string, string> = {
    en: "Complete Your Order",
    fr: "Terminer Votre Commande",
    ar: "أكملوا طلبكم"
  };

  const signoffs: Record<string, string> = {
    en: "With warmest regards, The LIMJIBA Team",
    fr: "Avec nos plus chaleureuses salutations, l'équipe LIMJIBA",
    ar: "مع أطيب التحيات، فريق لمجيبة"
  };

  const labels = cartSummaryLabels[l];

  const body = `
    <p style="font-size:16px;color:#0A1628;font-weight:600;">${greetings[l]},</p>
    ${poeticBlocks[l]}
    <div style="margin:24px 0;padding:20px;background:linear-gradient(135deg,#0A1628,#132240);border-radius:12px;text-align:center;">
      <div style="margin-bottom:12px;">
        <span style="color:rgba(201,168,76,0.7);font-size:13px;text-transform:uppercase;letter-spacing:2px;">${labels.items}</span>
        <p style="color:#C9A84C;font-size:28px;font-weight:700;margin:4px 0;">${itemCount}</p>
      </div>
      <div style="width:40px;height:1px;background:rgba(201,168,76,0.3);margin:0 auto 12px;"></div>
      <div>
        <span style="color:rgba(201,168,76,0.7);font-size:13px;text-transform:uppercase;letter-spacing:2px;">${labels.total}</span>
        <p style="color:#C9A84C;font-size:28px;font-weight:700;margin:4px 0;">${total}</p>
      </div>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://limjiba.com" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:16px 48px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:1px;">${ctaLabels[l]}</a>
    </div>
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:24px auto;"></div>
    <p style="text-align:center;color:rgba(10,22,40,0.5);font-size:12px;">${signoffs[l]}</p>
  `;

  return sendEmail({
    to: email,
    subject: `LIMJIBA — ${subjects[l]}`,
    html: brandedHtml(body, dir),
  });
}
