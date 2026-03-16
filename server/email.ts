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
  if (websiteUrl && /^https?:\/\//i.test(websiteUrl.trim())) {
    _cachedWebsiteUrl = websiteUrl.trim().replace(/\/+$/, "");
  }
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

export async function sendEmail(options: EmailOptions): Promise<boolean> {
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
  const platforms: Record<string, { bg: string; label: string; textColor: string }> = {
    whatsapp:  { bg: "#25D366", label: "WhatsApp",  textColor: "#ffffff" },
    instagram: { bg: "#E4405F", label: "Instagram", textColor: "#ffffff" },
    facebook:  { bg: "#1877F2", label: "Facebook",  textColor: "#ffffff" },
    snapchat:  { bg: "#FFFC00", label: "Snapchat",  textColor: "#333333" },
    tiktok:    { bg: "#010101", label: "TikTok",    textColor: "#ffffff" },
  };

  const buttons = Object.entries(platforms)
    .filter(([key]) => _cachedSocialLinks[key]?.trim())
    .map(([key, { bg, label, textColor }]) => {
      const url = escHtml(_cachedSocialLinks[key].trim());
      return `<td align="center" valign="middle" style="padding:3px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="background:${bg};border-radius:4px;mso-padding-alt:7px 12px;">
        <a href="${url}" target="_blank" title="${label}"
           style="display:inline-block;padding:7px 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;text-decoration:none;color:${textColor};white-space:nowrap;mso-line-height-rule:exactly;line-height:14px;"
        >${label}</a>
      </td>
    </tr>
  </table>
</td>`;
    });

  if (buttons.length === 0) return "";

  const row1 = buttons.slice(0, 3);
  const row2 = buttons.slice(3);

  let rows = `<tr>${row1.join("")}</tr>`;
  if (row2.length > 0) rows += `\n  <tr>${row2.join("")}</tr>`;

  return `
<p style="color:rgba(201,168,76,0.6);margin:0 0 14px;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;font-family:Arial,sans-serif;">Follow Us</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;">
  ${rows}
</table>`;
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
    <div style="margin:24px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td align="center" style="background:#C9A84C;border-radius:8px;padding:0;">
            <a href="${escHtml(_cachedWebsiteUrl)}" target="_blank" style="display:inline-block;color:#0A1628;text-decoration:none;padding:14px 44px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-family:'Segoe UI',Arial,sans-serif;">&#10022; Visit Our Store &#10022;</a>
          </td>
        </tr>
      </table>
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
  product: { id?: number | string; name: string; nameAr?: string | null; nameFr?: string | null; unitPrice: number; imageUrl?: string | null; images?: string[] | null; dealDiscount?: number | null },
  type: "new_arrival" | "flash_sale"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const pName = l === "ar" ? (product.nameAr || product.name) : l === "fr" ? (product.nameFr || product.name) : product.name;
  const price = `${product.unitPrice.toLocaleString()} MRU`;
  const discount = product.dealDiscount ? `${product.dealDiscount}%` : "";
  const discountedPrice = product.dealDiscount ? `${Math.round(product.unitPrice * (1 - product.dealDiscount / 100)).toLocaleString()} MRU` : "";

  const baseUrl = process.env.APP_BASE_URL ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "https://limjiba.com");
  const productUrl = product.id ? `${baseUrl}/store/product/${product.id}` : baseUrl;

  const resolveImg = (url: string | null | undefined): string | null => {
    if (!url || !url.trim()) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const rawImgUrl = resolveImg(product.imageUrl) || resolveImg((product.images || [])[0]);
  const safeImgUrl = rawImgUrl ? escHtml(rawImgUrl) : null;

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
      en: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#0A1628;">LIMJIBA's curators have done it again.</strong> After an exhaustive global selection process, we are proud to introduce a product that meets our uncompromising standard of excellence. This is not simply an addition to our catalogue — it is a declaration of quality, precision, and the refined taste that defines every LIMJIBA acquisition. Reserved for those who demand the very best.</p>`,
      fr: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#0A1628;">L'équipe de sélection LIMJIBA a encore frappé.</strong> Après un processus de curation mondiale rigoureux, nous avons le privilège de vous présenter une acquisition qui incarne notre standard d'excellence absolue. Ce n'est pas simplement un nouveau produit — c'est une affirmation de qualité supérieure, destinée aux connaisseurs qui ne transigent pas avec le meilleur.</p>`,
      ar: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#0A1628;">فريق اختيار لمجيبة يُقدّم لكم الجديد.</strong> بعد عملية انتقاء عالمية دقيقة وصارمة، يسعدنا أن نُعلن عن أحدث إضافاتنا التي تُجسّد معايير التميّز التي لا نتنازل عنها. هذا ليس مجرد منتج جديد — إنه تأكيد على الجودة الرفيعة التي اعتادها عملاؤنا الأكثر تميّزاً.</p>`
    },
    flash_sale: {
      en: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#C9A84C;">An exceptional commercial opportunity — time-sensitive and exclusively yours.</strong> LIMJIBA rarely discounts. When we do, it signals something significant. This flash sale is a strategic window that sophisticated buyers recognise and act upon immediately. The offer is live now. Your competitors will not wait — neither should you.</p>`,
      fr: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#C9A84C;">Une opportunité commerciale exceptionnelle — limitée dans le temps, réservée à notre clientèle privilégiée.</strong> LIMJIBA accorde rarement des remises. Lorsque cela se produit, c'est le signal d'une occasion stratégique à ne pas manquer. Les acheteurs avisés le savent : les meilleures offres n'attendent pas. L'opportunité est ouverte maintenant. Agissez.</p>`,
      ar: `<p style="color:#1a1a2e;font-size:15px;line-height:1.8;"><strong style="color:#C9A84C;">فرصة تجارية استثنائية — محدودة زمنياً ومخصصة لعملائنا المميّزين.</strong> نادراً ما تُقدّم لمجيبة تخفيضات. وعندما تفعل، فهذا يعني فرصة حقيقية لا تتكرر. المشتري الذكي يعرف كيف يتصرف في اللحظة المناسبة. العرض متاح الآن — اغتنموه قبل أن يغلق الباب.</p>`
    }
  };

  const ctaLabels: Record<string, string> = {
    en: "View Product Now",
    fr: "Voir le Produit",
    ar: "عرض المنتج الآن"
  };

  const imgBlock = safeImgUrl
    ? `<div style="text-align:center;margin:20px 0;">
        <a href="${escHtml(productUrl)}" style="display:inline-block;text-decoration:none;">
          <img src="${safeImgUrl}" alt="${escHtml(pName)}" style="max-width:100%;max-height:340px;border-radius:12px;box-shadow:0 4px 20px rgba(10,22,40,0.18);border:2px solid rgba(201,168,76,0.25);" />
        </a>
      </div>`
    : "";

  const priceBlock = type === "flash_sale" && product.dealDiscount
    ? `<div style="text-align:center;margin:16px 0;padding:16px;background:linear-gradient(135deg,#0A1628,#132240);border-radius:10px;">
        <span style="color:rgba(255,255,255,0.5);text-decoration:line-through;font-size:16px;">${price}</span>
        <span style="color:#C9A84C;font-size:28px;font-weight:700;margin:0 12px;">${discountedPrice}</span>
        <span style="background:#C9A84C;color:#0A1628;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:700;">${discount} OFF</span>
      </div>`
    : `<div style="text-align:center;margin:16px 0;"><span style="color:#0A1628;font-size:24px;font-weight:700;">${price}</span></div>`;

  const ctaBlock = `<div style="text-align:center;margin:24px 0;">
    <a href="${escHtml(productUrl)}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:1px;">${ctaLabels[l]}</a>
  </div>
  <div style="text-align:center;margin:-12px 0 20px;">
    <a href="${escHtml(productUrl)}" style="color:#0A1628;font-size:12px;opacity:0.5;word-break:break-all;">${escHtml(productUrl)}</a>
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

export async function sendNewAccountWithPasswordEmail(
  email: string, customerName: string, password: string, lang: string = "en"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const subjects: Record<string, string> = {
    en: "Your LIMJIBA Account Has Been Created",
    fr: "Votre compte LIMJIBA a été créé",
    ar: "تم إنشاء حسابكم في لمجيبة",
  };
  const bodies: Record<string, string> = {
    en: `
      <h2 style="color:#0A1628;font-size:22px;margin-bottom:8px;">Welcome to LIMJIBA, ${customerName}!</h2>
      <p style="color:#444;margin-bottom:16px;">An account has been created for you automatically. Use the credentials below to sign in and view your order history.</p>
      <div style="background:#f4f1e8;border-left:4px solid #C9A84C;border-radius:8px;padding:18px 22px;margin:18px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Your Login Details</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>Password:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd;">${password}</span></p>
      </div>
      <p style="color:#666;font-size:13px;margin-bottom:20px;">We recommend changing your password after your first login.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://limjiba.com/store/login" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:1px;">Sign In to Your Account</a>
      </div>`,
    fr: `
      <h2 style="color:#0A1628;font-size:22px;margin-bottom:8px;">Bienvenue chez LIMJIBA, ${customerName}!</h2>
      <p style="color:#444;margin-bottom:16px;">Un compte a été créé automatiquement pour vous. Utilisez les identifiants ci-dessous pour vous connecter et consulter votre historique de commandes.</p>
      <div style="background:#f4f1e8;border-left:4px solid #C9A84C;border-radius:8px;padding:18px 22px;margin:18px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Vos identifiants</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>Mot de passe:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd;">${password}</span></p>
      </div>
      <p style="color:#666;font-size:13px;margin-bottom:20px;">Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://limjiba.com/store/login" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:1px;">Se connecter</a>
      </div>`,
    ar: `
      <h2 style="color:#0A1628;font-size:22px;margin-bottom:8px;">مرحباً بكم في لمجيبة، ${customerName}!</h2>
      <p style="color:#444;margin-bottom:16px;">تم إنشاء حساب لكم تلقائياً. استخدموا بيانات الاعتماد أدناه لتسجيل الدخول وعرض سجل طلباتكم.</p>
      <div style="background:#f4f1e8;border-right:4px solid #C9A84C;border-radius:8px;padding:18px 22px;margin:18px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">بيانات تسجيل الدخول</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>البريد الإلكتروني:</strong> ${email}</p>
        <p style="margin:4px 0;font-size:15px;color:#0A1628;"><strong>كلمة المرور:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd;">${password}</span></p>
      </div>
      <p style="color:#666;font-size:13px;margin-bottom:20px;">ننصحكم بتغيير كلمة المرور بعد تسجيل الدخول الأول.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://limjiba.com/store/login" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:1px;">تسجيل الدخول</a>
      </div>`,
  };
  return sendEmail({ to: email, subject: subjects[l], html: brandedHtml(bodies[l], dir) });
}

export interface PosReceiptData {
  saleNumber: string;
  date: string;
  customerName?: string;
  customerEmail: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount?: number;
  deliveryCost?: number;
  total: number;
  paymentMode: string;
  amountPaid?: number;
  status: string;
}

export async function sendAdminDailyDigestEmail(
  adminEmail: string,
  data: {
    date: string;
    ordersCount: number;
    ordersTotal: number;
    newCustomers: number;
    lowStockItems: { name: string; stock: number; threshold: number }[];
    topProducts: { name: string; qty: number; revenue: number }[];
    pendingOrders: number;
  }
): Promise<boolean> {
  const hasLowStock = data.lowStockItems.length > 0;
  const lowStockRows = data.lowStockItems.slice(0, 8).map(p =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;">${escHtml(p.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;text-align:center;color:#ef4444;font-weight:600;">${p.stock}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;text-align:center;color:#888;">${p.threshold}</td>
    </tr>`
  ).join("");

  const topProductRows = data.topProducts.slice(0, 5).map((p, i) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;color:#888;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;">${escHtml(p.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;text-align:center;">${p.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ead8;text-align:right;color:#C9A84C;font-weight:600;">${p.revenue.toLocaleString()} MRU</td>
    </tr>`
  ).join("");

  const body = `
    <h2 style="color:#0A1628;font-size:22px;margin:0 0 4px;">Daily Store Report</h2>
    <p style="color:#888;font-size:13px;margin-bottom:24px;">${data.date}</p>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0A1628,#162035);border-radius:10px;padding:16px;color:#fff;">
        <div style="font-size:28px;font-weight:700;color:#C9A84C;">${data.ordersCount}</div>
        <div style="font-size:13px;opacity:0.7;margin-top:2px;">Orders Today</div>
      </div>
      <div style="background:linear-gradient(135deg,#0A1628,#162035);border-radius:10px;padding:16px;color:#fff;">
        <div style="font-size:24px;font-weight:700;color:#C9A84C;">${data.ordersTotal.toLocaleString()} MRU</div>
        <div style="font-size:13px;opacity:0.7;margin-top:2px;">Revenue Today</div>
      </div>
      <div style="background:#f9f6ef;border-radius:10px;padding:16px;border:1px solid #f0ead8;">
        <div style="font-size:24px;font-weight:700;color:#0A1628;">${data.newCustomers}</div>
        <div style="font-size:13px;color:#888;margin-top:2px;">New Customers</div>
      </div>
      <div style="background:${data.pendingOrders > 0 ? "#fff8f0;border:1px solid #fed7aa" : "#f9f6ef;border:1px solid #f0ead8"};border-radius:10px;padding:16px;">
        <div style="font-size:24px;font-weight:700;color:${data.pendingOrders > 0 ? "#ea580c" : "#0A1628"};">${data.pendingOrders}</div>
        <div style="font-size:13px;color:#888;margin-top:2px;">Pending Orders</div>
      </div>
    </div>

    ${hasLowStock ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#ef4444;font-size:15px;margin:0 0 10px;display:flex;align-items:center;gap:6px;">⚠️ Low Stock Alert (${data.lowStockItems.length} items)</h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #fecaca;">
        <thead><tr style="background:#fef2f2;">
          <th style="padding:10px 12px;text-align:left;color:#ef4444;font-size:13px;">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#ef4444;font-size:13px;">Stock</th>
          <th style="padding:10px 12px;text-align:center;color:#ef4444;font-size:13px;">Threshold</th>
        </tr></thead>
        <tbody>${lowStockRows}</tbody>
      </table>
    </div>` : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:24px;color:#16a34a;font-size:13px;">✅ All products are sufficiently stocked</div>`}

    ${data.topProducts.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="color:#0A1628;font-size:15px;margin:0 0 10px;">🏆 Top Products Today</h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #f0ead8;">
        <thead><tr style="background:#0A1628;">
          <th style="padding:10px 12px;color:#C9A84C;font-size:13px;">#</th>
          <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:13px;">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#C9A84C;font-size:13px;">Units Sold</th>
          <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:13px;">Revenue</th>
        </tr></thead>
        <tbody>${topProductRows}</tbody>
      </table>
    </div>` : ""}

    <div style="text-align:center;margin-top:8px;">
      <a href="${process.env.APP_BASE_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "https://limjiba.com")}/emanager-portal" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8963F);color:#0A1628;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">Open Admin Portal</a>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `📊 LIMJIBA Daily Report — ${data.date} | ${data.ordersCount} orders, ${data.ordersTotal.toLocaleString()} MRU`,
    html: brandedHtml(body, "ltr"),
  });
}

export async function sendPosReceiptEmail(data: PosReceiptData, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const dir = l === "ar" ? "rtl" : "ltr";
  const subjects: Record<string, string> = {
    en: `Your LIMJIBA Receipt — ${data.saleNumber}`,
    fr: `Votre reçu LIMJIBA — ${data.saleNumber}`,
    ar: `إيصال لمجيبة — ${data.saleNumber}`,
  };
  const labels: Record<string, Record<string, string>> = {
    en: { title: "Sale Receipt", saleNum: "Sale #", date: "Date", item: "Item", qty: "Qty", price: "Unit Price", total: "Total", discount: "Discount", delivery: "Delivery", grandTotal: "Grand Total", payment: "Payment Method", paid: "Amount Paid", thank: "Thank you for shopping with LIMJIBA!" },
    fr: { title: "Reçu de vente", saleNum: "Vente #", date: "Date", item: "Article", qty: "Qté", price: "Prix unitaire", total: "Total", discount: "Remise", delivery: "Livraison", grandTotal: "Total général", payment: "Mode de paiement", paid: "Montant payé", thank: "Merci pour votre achat chez LIMJIBA!" },
    ar: { title: "إيصال البيع", saleNum: "رقم البيع", date: "التاريخ", item: "المنتج", qty: "الكمية", price: "سعر الوحدة", total: "الإجمالي", discount: "الخصم", delivery: "التوصيل", grandTotal: "الإجمالي الكلي", payment: "طريقة الدفع", paid: "المبلغ المدفوع", thank: "شكراً لتسوقكم في لمجيبة!" },
  };
  const lb = labels[l];

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ead8;color:#333;">${item.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ead8;text-align:center;color:#333;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ead8;text-align:right;color:#333;">${item.unitPrice.toLocaleString()} MRU</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ead8;text-align:right;font-weight:600;color:#0A1628;">${item.total.toLocaleString()} MRU</td>
    </tr>`).join("");

  const body = `
    <h2 style="color:#0A1628;font-size:22px;margin-bottom:4px;">${lb.title}</h2>
    <p style="color:#888;font-size:13px;margin-bottom:20px;">${lb.saleNum} ${data.saleNumber} &nbsp;|&nbsp; ${lb.date}: ${data.date}</p>
    ${data.customerName ? `<p style="color:#444;margin-bottom:16px;"><strong>${data.customerName}</strong></p>` : ""}
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #f0ead8;">
      <thead>
        <tr style="background:#0A1628;">
          <th style="padding:12px;text-align:left;color:#C9A84C;font-weight:600;">${lb.item}</th>
          <th style="padding:12px;text-align:center;color:#C9A84C;font-weight:600;">${lb.qty}</th>
          <th style="padding:12px;text-align:right;color:#C9A84C;font-weight:600;">${lb.price}</th>
          <th style="padding:12px;text-align:right;color:#C9A84C;font-weight:600;">${lb.total}</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="background:#f9f6ef;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      ${(data.discount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#666;">${lb.discount}</span><span style="color:#c33;">−${(data.discount || 0).toLocaleString()} MRU</span></div>` : ""}
      ${(data.deliveryCost || 0) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#666;">${lb.delivery}</span><span style="color:#333;">${(data.deliveryCost || 0).toLocaleString()} MRU</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;border-top:2px solid #C9A84C;padding-top:12px;margin-top:4px;">
        <span style="color:#0A1628;font-weight:700;font-size:17px;">${lb.grandTotal}</span>
        <span style="color:#C9A84C;font-weight:700;font-size:20px;">${data.total.toLocaleString()} MRU</span>
      </div>
    </div>
    <div style="background:#fff;border:1px solid #f0ead8;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:#888;">${lb.payment}</span><span style="color:#333;font-weight:600;">${data.paymentMode}</span></div>
      ${data.amountPaid !== undefined ? `<div style="display:flex;justify-content:space-between;"><span style="color:#888;">${lb.paid}</span><span style="color:#333;font-weight:600;">${data.amountPaid.toLocaleString()} MRU</span></div>` : ""}
    </div>
    <p style="text-align:center;color:#C9A84C;font-weight:600;font-size:15px;margin-top:24px;">${lb.thank}</p>`;

  return sendEmail({ to: data.customerEmail, subject: subjects[l], html: brandedHtml(body, dir) });
}
