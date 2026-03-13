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
  const svgIcons: Record<string, { svg: string; bg: string }> = {
    whatsapp: {
      bg: "#25D366",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
    },
    instagram: {
      bg: "#E4405F",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
    },
    facebook: {
      bg: "#1877F2",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    },
    snapchat: {
      bg: "#FFFC00",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#333" width="18" height="18"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.13-.044.26-.09.382-.12.218-.056.427-.08.618-.08.41 0 .727.155.943.464.178.254.224.567.119.873-.151.44-.523.764-1.106 1.03-.292.134-.705.25-1.199.39l-.12.035c-.19.056-.383.12-.577.192-.468.168-.728.39-.828.548-.088.142-.12.3-.098.458.047.36.453 1.063.49 1.116.3.45.613.842.944 1.226.335.39.699.693 1.053.953.36.264.713.468 1.056.594.344.126.645.204.898.238.122.015.238.015.338-.012.143-.038.314-.167.454-.274.13-.098.27-.192.404-.248.265-.098.56-.13.84-.088.3.044.572.18.75.41.314.41.19.91-.15 1.322-.347.418-.81.706-1.354.914-.556.216-1.104.326-1.604.413l-.016.003c-.093.015-.186.03-.279.053-.128.026-.26.073-.392.134-.26.12-.406.33-.497.5-.105.195-.19.467-.27.778-.09.35-.232.49-.523.49-.06 0-.12 0-.194-.016a6.053 6.053 0 01-.808-.194 5.927 5.927 0 00-.768-.18c-.28-.044-.55-.053-.82-.03a6.038 6.038 0 00-1.27.27 5.93 5.93 0 01-.762.21c-.07.013-.14.013-.2.013-.28 0-.43-.136-.52-.48-.09-.31-.17-.58-.27-.77-.1-.17-.24-.38-.5-.5-.13-.06-.26-.11-.39-.14-.09-.02-.19-.03-.28-.05l-.02-.003c-.5-.087-1.05-.197-1.6-.413-.55-.208-1.01-.496-1.36-.914-.33-.412-.46-.912-.15-1.322.18-.23.45-.366.75-.41.28-.042.58-.01.84.088.14.056.27.15.4.248.14.107.32.236.46.274.1.027.22.027.34.012.25-.034.55-.112.9-.238.34-.126.7-.33 1.05-.594.36-.26.72-.563 1.06-.953.33-.384.64-.777.94-1.226.04-.053.45-.756.49-1.116.02-.158-.01-.316-.1-.458-.1-.158-.36-.38-.83-.548a9.11 9.11 0 00-.57-.192l-.12-.035c-.5-.14-.91-.256-1.2-.39-.59-.266-.96-.59-1.11-1.03-.11-.306-.06-.619.12-.873.22-.31.53-.464.94-.464.19 0 .4.024.62.08.12.03.25.076.38.12.26.094.62.23.92.214.2 0 .33-.045.4-.09a15.78 15.78 0 01-.03-.51l-.003-.06c-.1-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793z"/></svg>`
    },
    tiktok: {
      bg: "#000000",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
    },
  };

  const icons = Object.entries(svgIcons)
    .filter(([key]) => _cachedSocialLinks[key]?.trim())
    .map(([key, { svg, bg }]) => {
      const url = escHtml(_cachedSocialLinks[key].trim());
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const encodedSvg = Buffer.from(svg).toString("base64");
      return `<a href="${url}" target="_blank" title="${label}" style="display:inline-block;width:40px;height:40px;border-radius:50%;background:${bg};margin:0 5px;text-decoration:none;overflow:hidden;"><table role="presentation" width="40" height="40" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="padding:0;"><img src="data:image/svg+xml;base64,${encodedSvg}" alt="${label}" width="20" height="20" style="display:block;border:0;" /></td></tr></table></a>`;
    });

  if (icons.length === 0) return "";
  return `<p style="color:rgba(201,168,76,0.6);margin:0 0 14px;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Follow Us</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;"><tr><td align="center" style="padding:0;">${icons.join("")}</td></tr></table>`;
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
