const EMAIL_FROM = "LIMJIBA <noreply@limjiba.com>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  console.log(`[EMAIL] Would send to ${options.to}: ${options.subject}`);
  console.log(`[EMAIL] Note: Email service not configured. Set up SendGrid or Resend integration to enable.`);
  return false;
}

function brandedHtml(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF6EE; padding: 0;">
      <div style="background: #0A1628; padding: 24px; text-align: center;">
        <h1 style="color: #C9A84C; margin: 0; font-size: 28px; letter-spacing: 3px;">LIMJIBA</h1>
        <p style="color: rgba(201,168,76,0.6); margin: 4px 0 0; font-size: 12px;">لمجيبة</p>
      </div>
      <div style="padding: 32px 24px; color: #0A1628;">
        ${content}
      </div>
      <div style="background: #0A1628; padding: 16px; text-align: center;">
        <p style="color: rgba(255,255,255,0.5); margin: 0; font-size: 12px;">© ${new Date().getFullYear()} LIMJIBA. All rights reserved.</p>
        <p style="color: rgba(201,168,76,0.5); margin: 4px 0 0; font-size: 11px;">support@limjiba.com</p>
      </div>
    </div>
  `;
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

  const greeting = l === "ar" ? `مرحباً ${customerName}` : l === "fr" ? `Bonjour ${customerName}` : `Hello ${customerName}`;
  const html = brandedHtml(`
    <h2 style="color: #0A1628; margin-top: 0;">${msgs.subject}</h2>
    <p>${greeting},</p>
    <p>${msgs.body.replace("{orderNumber}", orderNumber)}</p>
    <div style="background: #0A1628; color: #C9A84C; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px;">${l === "ar" ? "المبلغ الإجمالي" : l === "fr" ? "Total" : "Total"}</p>
      <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold;">${total.toFixed(2)} MRU</p>
    </div>
  `);

  return sendEmail({ to: email, subject: `LIMJIBA - ${msgs.subject} - ${orderNumber}`, html });
}

export async function sendWelcomeEmail(email: string, customerName: string, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const subjects: Record<string, string> = { en: "Welcome to LIMJIBA!", fr: "Bienvenue chez LIMJIBA!", ar: "مرحباً بكم في لمجيبة!" };
  const bodies: Record<string, string> = {
    en: `<h2>Welcome, ${customerName}!</h2><p>Your LIMJIBA account has been created successfully. You can now enjoy faster checkout, order tracking, and loyalty rewards.</p>`,
    fr: `<h2>Bienvenue, ${customerName}!</h2><p>Votre compte LIMJIBA a été créé avec succès. Profitez d'un paiement rapide, du suivi de commandes et de récompenses fidélité.</p>`,
    ar: `<h2>مرحباً ${customerName}!</h2><p>تم إنشاء حسابكم في لمجيبة بنجاح. يمكنكم الآن الاستمتاع بتجربة شراء أسرع وتتبع الطلبات ومكافآت الولاء.</p>`,
  };

  return sendEmail({ to: email, subject: subjects[l], html: brandedHtml(bodies[l]) });
}

export async function sendPasswordResetEmail(email: string, customerName: string, resetUrl: string, lang: string = "en"): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const subjects: Record<string, string> = { en: "Password Reset - LIMJIBA", fr: "Réinitialisation du mot de passe - LIMJIBA", ar: "إعادة تعيين كلمة المرور - لمجيبة" };
  const bodies: Record<string, string> = {
    en: `<h2>Password Reset</h2><p>Hello ${customerName},</p><p>Click the link below to reset your password:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a><p style="margin-top: 16px; color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    fr: `<h2>Réinitialisation du mot de passe</h2><p>Bonjour ${customerName},</p><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Réinitialiser</a><p style="margin-top: 16px; color: #666; font-size: 12px;">Ce lien expire dans 1 heure.</p>`,
    ar: `<h2>إعادة تعيين كلمة المرور</h2><p>مرحباً ${customerName}،</p><p>انقروا على الرابط أدناه لإعادة تعيين كلمة المرور:</p><a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">إعادة التعيين</a><p style="margin-top: 16px; color: #666; font-size: 12px;">ينتهي هذا الرابط خلال ساعة واحدة.</p>`,
  };

  return sendEmail({ to: email, subject: subjects[l], html: brandedHtml(bodies[l]) });
}

export async function sendMarketingEmail(
  email: string, customerName: string, subject: string, messageEn: string, messageFr: string, messageAr: string, lang: string = "en"
): Promise<boolean> {
  const l = (lang === "ar" || lang === "fr") ? lang : "en";
  const message = l === "ar" ? messageAr : l === "fr" ? messageFr : messageEn;
  const greeting = l === "ar" ? `مرحباً ${customerName}` : l === "fr" ? `Bonjour ${customerName}` : `Hello ${customerName}`;

  return sendEmail({
    to: email,
    subject: `LIMJIBA - ${subject}`,
    html: brandedHtml(`<p>${greeting},</p><div>${message}</div>`),
  });
}
