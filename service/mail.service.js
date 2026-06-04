const PDFDocument = require("pdfkit");
const { db } = require("../config/db.config");
const { user, settings } = require("../db/schema");
const { eq } = require("drizzle-orm");
const { sendEmail } = require("../utils/mailer");

const money = (value) => `৳${Number(value || 0).toFixed(2)}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveRecipient = async (order) => {
  // Support both nested (guestInfo) and flat (guestName/guestEmail) formats
  const guest = order?.guestInfo || {};
  const guestName = guest.name || order?.guestName || "";
  const guestEmail = guest.email || order?.guestEmail || "";
  const guestPhone = guest.phone || order?.guestPhone || "";

  if (order?.user && typeof order.user === "object" && order.user.email) {
    return {
      name: order.user.name || "Customer",
      email: order.user.email,
      phone: order.user.phone || guestPhone,
    };
  }

  if (order?.userId) {
    const foundUser = await db.query.user.findFirst({
      where: eq(user.id, order.userId),
      columns: { name: true, email: true, phone: true },
    });
    if (foundUser?.email) {
      return {
        name: foundUser.name || "Customer",
        email: foundUser.email,
        phone: foundUser.phone || guestPhone,
      };
    }
  }

  if (guestEmail) {
    return {
      name: guestName || "Customer",
      email: guestEmail,
      phone: guestPhone,
    };
  }

  return null;
};

const getAdminEmails = async () => {
  const admins = await db.query.user.findMany({
    where: eq(user.role, "admin"),
    columns: { email: true },
  });
  const settingsRecord = await db.query.settings.findFirst();
  const emails = admins.map((a) => a.email);
  if (settingsRecord?.email && !emails.includes(settingsRecord.email)) emails.push(settingsRecord.email);
  if (process.env.SMTP_USER && !emails.includes(process.env.SMTP_USER)) emails.push(process.env.SMTP_USER);
  return emails;
};

const getOrderItems = (order) => {
  return (order?.items || []).map((item) => {
    const product = item.product || {};
    return {
      name: product.name || "Product",
      quantity: item.quantity || 0,
      price: Number(item.price || 0),
      variant: item.variant || "",
    };
  });
};

const buildInvoiceHtml = (order, recipient) => {
  const items = getOrderItems(order)
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${money(item.price)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${money(item.price * item.quantity)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
      <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;overflow:hidden;">
        <div style="background:#c5a059;color:#fff;padding:24px;">
          <h1 style="margin:0;font-size:24px;">Sirat Order Invoice</h1>
          <p style="margin:8px 0 0;opacity:.95;">Order ID: <strong>${escapeHtml(order.orderId)}</strong></p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(recipient?.name || "Customer")}, your order has been received successfully.</p>
          <p style="margin:0 0 20px;">We’ll keep you updated on every status change.</p>

          <div style="margin-bottom:20px;">
            <h2 style="font-size:18px;margin:0 0 8px;">Order Details</h2>
            <p style="margin:0;color:#5a5650;">Payment: ${escapeHtml((order.paymentMethod || "cod").toUpperCase())}</p>
            ${(order.guestInfo?.address || order.guestAddress) ? `<p style="margin:6px 0 0;color:#5a5650;">Shipping: ${escapeHtml([order.guestInfo?.address || order.guestAddress, order.guestInfo?.city || order.guestCity].filter(Boolean).join(", "))}</p>` : ""}
          </div>

          <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#faf7ef;">
                <th style="padding:10px 12px;text-align:left;border-bottom:1px solid #eee;">Item</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:1px solid #eee;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:1px solid #eee;">Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:1px solid #eee;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${items}</tbody>
          </table>

          <div style="margin-top:18px;display:flex;justify-content:flex-end;">
            <div style="min-width:240px;">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
                <span>Shipping</span><strong>${money(order.shippingCharge)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;">
                <span>Total</span><strong>${money(order.totalAmount)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
};

const buildAdminAlertHtml = (order, recipient) => {
  const items = getOrderItems(order)
    .map((item) => `<li>${escapeHtml(item.name)} x ${item.quantity}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</li>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
      <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:22px;">New Order Received</h1>
        <p style="margin:0 0 8px;">Order ID: <strong>${escapeHtml(order.orderId)}</strong></p>
        <p style="margin:0 0 8px;">Customer: <strong>${escapeHtml(recipient?.name || order.guestInfo?.name || order.guestName || "Guest")}</strong></p>
        <p style="margin:0 0 8px;">Email: <strong>${escapeHtml(recipient?.email || order.guestInfo?.email || order.guestEmail || "N/A")}</strong></p>
        <p style="margin:0 0 8px;">Phone: <strong>${escapeHtml(recipient?.phone || order.guestInfo?.phone || order.guestPhone || "N/A")}</strong></p>
        <p style="margin:0 0 8px;">Total: <strong>${money(order.totalAmount)}</strong></p>
        <p style="margin:0 0 18px;">Payment: <strong>${escapeHtml((order.paymentMethod || "cod").toUpperCase())}</strong></p>
        <h2 style="font-size:18px;margin:0 0 12px;">Items</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.8;">${items}</ul>
      </div>
    </div>`;
};

const buildStatusUpdateHtml = (order, recipient) => {
  return `
      <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
        <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;overflow:hidden;">
          <div style="background:#c5a059;color:#fff;padding:24px;">
            <h1 style="margin:0;font-size:24px;">Order Status Update</h1>
            <p style="margin:8px 0 0;opacity:.95;">Order ID: <strong>${escapeHtml(order.orderId)}</strong></p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 20px;font-size:16px;">Hi ${escapeHtml(recipient?.name || "Customer")},</p>
            <p style="margin:0 0 24px;font-size:18px;">Your order status has been updated to: <strong style="color:#c5a059;text-transform:uppercase;">${order.status}</strong></p>
            
            <p style="margin:0 0 20px;color:#5a5650;line-height:1.6;">We are working hard to get your premium garments to you as soon as possible. You can track your order live on our website.</p>
  
            <div style="text-align:center;margin-top:32px;">
              <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/track?id=${order.orderId}" style="background:#c5a059;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Track My Order</a>
            </div>
          </div>
        </div>
      </div>`;
};

const buildPdfBuffer = async (order, recipient) => {
  const items = getOrderItems(order);

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).fillColor("#141311").text("Sirat Invoice", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#5a5650").text(`Order ID: ${order.orderId}`);
    doc.text(`Customer: ${recipient?.name || "Customer"}`);
    doc.text(`Email: ${recipient?.email || "N/A"}`);
    doc.text(`Phone: ${recipient?.phone || "N/A"}`);
    doc.text(`Payment: ${(order.paymentMethod || "cod").toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#141311").text("Order Items", { underline: true });
    doc.moveDown(0.5);

    items.forEach((item, index) => {
      const line = `${index + 1}. ${item.name}${item.variant ? ` (${item.variant})` : ""} x ${item.quantity} - ${money(item.price * item.quantity)}`;
      doc.fontSize(11).fillColor("#141311").text(line);
    });

    doc.moveDown();
    doc.fontSize(12).text(`Shipping: ${money(order.shippingCharge)}`);
    doc.fontSize(14).fillColor("#141311").text(`Total: ${money(order.totalAmount)}`);
    doc.moveDown();

    const shippingAddress = order.guestInfo?.address || order.guestAddress;
    const shippingCity = order.guestInfo?.city || order.guestCity;
    if (shippingAddress || shippingCity) {
      doc.fontSize(11).fillColor("#5a5650").text(`Shipping Address: ${[shippingAddress, shippingCity].filter(Boolean).join(", ")}`);
    }

    doc.end();
  });
};

const sendOrderEmails = async (order) => {
  const recipient = await resolveRecipient(order);
  const adminEmails = await getAdminEmails();
  const pdfBuffer = await buildPdfBuffer(order, recipient);
  const attachment = {
    filename: `invoice-${order.orderId}.pdf`,
    content: pdfBuffer,
    contentType: "application/pdf",
  };

  const results = {};

  if (recipient?.email) {
    results.customer = await sendEmail({
      to: [{ email: recipient.email, name: recipient.name }],
      subject: `Your Sirat order ${order.orderId} invoice`,
      html: buildInvoiceHtml(order, recipient),
      attachments: [attachment],
    });
  }

  if (adminEmails.length > 0) {
    results.admins = await Promise.all(
      adminEmails.map((email) =>
        sendEmail({
          to: [{ email, name: "Sirat Admin" }],
          subject: `New order alert - ${order.orderId}`,
          html: buildAdminAlertHtml(order, recipient),
          replyTo: recipient?.email || undefined,
          attachments: [attachment],
        })
      )
    );
  }

  return results;
};

const sendStatusUpdateEmail = async (order) => {
  const recipient = await resolveRecipient(order);
  if (!recipient?.email) return null;

  return await sendEmail({
    to: [{ email: recipient.email, name: recipient.name }],
    subject: `Order Update: ${order.orderId} is now ${order.status.toUpperCase()}`,
    html: buildStatusUpdateHtml(order, recipient),
  });
};

const sendNewsletterWelcomeEmail = async (email) => {
  return await sendEmail({
    to: [{ email, name: "New Subscriber" }],
    subject: "Welcome to the SIRAT Elite List!",
    html: `
            <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
                <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;padding:32px;text-align:center;">
                    <h1 style="color:#c5a059;margin:0 0 16px;">Welcome to SIRAT</h1>
                    <p style="font-size:18px;line-height:1.6;margin:0 0 24px;">Thank you for joining our exclusive newsletter. You'll be the first to know about upcoming drops, limited collections, and member-only secret codes.</p>
                    <div style="border-top:1px solid #eee;padding-top:24px;margin-top:24px;">
                        <p style="margin:0;color:#5a5650;">Stay Premium.</p>
                        <p style="margin:4px 0 0;font-weight:700;">Team SIRAT</p>
                    </div>
                </div>
            </div>`,
  });
};

const sendContactNotification = async (contact) => {
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return null;

  return await Promise.all(
    adminEmails.map((email) =>
      sendEmail({
        to: [{ email, name: "Sirat Admin" }],
        subject: `New contact form from ${contact.name}`,
        html: `
        <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
          <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;padding:24px;">
            <h1 style="margin:0 0 12px;font-size:22px;">New Contact Message</h1>
            <p style="margin:0 0 8px;">Name: <strong>${escapeHtml(contact.name)}</strong></p>
            <p style="margin:0 0 8px;">Email: <strong>${escapeHtml(contact.email)}</strong></p>
            <p style="margin:0 0 12px;">Message:</p>
            <p style="margin:0;white-space:pre-wrap;line-height:1.7;">${escapeHtml(contact.message)}</p>
          </div>
        </div>`,
        replyTo: contact.email,
      })
    )
  );
};

module.exports = {
  buildInvoiceHtml,
  buildAdminAlertHtml,
  buildPdfBuffer,
  sendOrderEmails,
  sendStatusUpdateEmail,
  sendNewsletterWelcomeEmail,
  sendContactNotification,
};
