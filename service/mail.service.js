const PDFDocument = require("pdfkit");
const { db } = require("../config/db.config");
const { user, settings } = require("../db/schema");
const { eq } = require("drizzle-orm");
const { sendEmail } = require("../utils/mailer");

/* =========================================================================
   SHARED CONSTANTS
   ========================================================================= */
const BRAND = {
  name: "SIRAT",
  fullName: "SIRAT CLOTHING",
  tagline: "Premium Streetwear",
  address: "House 12, Road 5, Block C, Mirpur 1",
  city: "Dhaka 1216, Bangladesh",
  phone: "+880 1700-000000",
  email: "hello@siratclothing.com",
  website: "siratclothing.com",
  websiteUrl: "https://sirat.salahuddin.codes",
  logo: "https://sirat.salahuddin.codes/Sirat.png",
  gold: "#C5A059",
  goldSoft: "#B38F4B",
  charcoal: "#141311",
  cream: "#FAF9F5",
  border: "#E9E4D9",
  muted: "#5A5650",
};

const money = (value) => `৳${Number(value || 0).toFixed(2)}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* =========================================================================
   INVOICE SIZES
   All widths in PDF points (1 inch = 72 points). Heights left tall so
   PDFKit auto-paginates the long content area.
   ========================================================================= */
const INVOICE_SIZES = {
  a4: { label: 'A4 (8.27" × 11.69")', width: 595.28, height: 841.89, margin: 40, font: { base: 10, title: 22, h1: 14 } },
  "3in": { label: '3" Thermal', width: 216, height: 1200, margin: 18, font: { base: 9, title: 16, h1: 11 } },
  "2_75in": { label: '2.75" Thermal', width: 198, height: 1200, margin: 16, font: { base: 8.5, title: 15, h1: 10.5 } },
  "2in": { label: '2" Thermal', width: 144, height: 1200, margin: 14, font: { base: 8, title: 13, h1: 9.5 } },
  "1_5in": { label: '1.5" Thermal', width: 108, height: 1400, margin: 12, font: { base: 7, title: 11, h1: 8.5 } },
};

/* =========================================================================
   RECIPIENT / ITEMS
   ========================================================================= */
const resolveRecipient = async (order) => {
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
    return { name: guestName || "Customer", email: guestEmail, phone: guestPhone };
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
      sku: product.sku || "",
    };
  });
};

/* =========================================================================
   PDF BUILDER — supports A4 + 4 thermal sizes with fixed header & footer
   ========================================================================= */
const buildPdfBuffer = async (order, recipient, sizeKey = "a4") => {
  const size = INVOICE_SIZES[sizeKey] || INVOICE_SIZES.a4;
  const items = getOrderItems(order);
  const customer = recipient || {
    name: order?.guestInfo?.name || order?.guestName || "Customer",
    email: order?.guestInfo?.email || order?.guestEmail || "",
    phone: order?.guestInfo?.phone || order?.guestPhone || "",
  };
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", {
    year: "numeric", month: "short", day: "2-digit",
  });
  const isPaid = order.paymentStatus === "approved";
  const isThermal = sizeKey !== "a4";
  const W = size.width;
  const M = size.margin;
  const contentW = W - M * 2;
  const FONT = size.font;

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [W, size.height],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true,
      bufferPages: true,
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    /* ---------- HELPERS ---------- */
    const fmtMoney = (n) => `৳${Number(n || 0).toFixed(2)}`;
    const fmtDate = (d) => new Date(d || Date.now()).toLocaleDateString("en-GB", {
      year: "numeric", month: "short", day: "2-digit",
    });

    /* ---------- HEADER (drawn on every page) ---------- */
    const drawHeader = () => {
      const page = doc.bufferedPageRange();
      for (let i = 0; i < page.count; i++) {
        doc.switchToPage(i);

        // Top gold accent bar
        doc.rect(0, 0, W, 3).fill(BRAND.gold);

        // Brand block
        const headerY = 12;
        doc.fillColor(BRAND.charcoal).font("Helvetica-Bold").fontSize(FONT.title);
        doc.text(BRAND.name, M, headerY, { width: contentW, align: isThermal ? "left" : "left" });

        doc.fillColor(BRAND.muted).font("Helvetica").fontSize(isThermal ? 7 : 9);
        doc.text(BRAND.tagline.toUpperCase(), M, headerY + FONT.title + 1, { width: contentW, characterSpacing: 1.5 });

        // Invoice title + meta on the right
        if (!isThermal) {
          doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(28);
          doc.text("INVOICE", 0, headerY - 2, { width: W - M, align: "right" });
          doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9);
          doc.text(`#${order.orderId}`, 0, headerY + 28, { width: W - M, align: "right" });
          doc.text(`Date: ${dateStr}`, 0, headerY + 40, { width: W - M, align: "right" });
        } else {
          // Thermal: right-aligned meta next to brand
          const rightX = W - M;
          doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(FONT.h1);
          doc.text("INVOICE", 0, headerY + 1, { width: rightX, align: "right" });
          doc.fillColor(BRAND.muted).font("Helvetica").fontSize(FONT.base - 1);
          doc.text(`#${order.orderId}`, 0, headerY + FONT.h1 + 4, { width: rightX, align: "right" });
          doc.text(fmtDate(order.createdAt), 0, headerY + FONT.h1 + 4 + FONT.base + 1, { width: rightX, align: "right" });
        }

        // Divider under header
        const divY = headerY + (isThermal ? FONT.h1 + 4 + (FONT.base) * 2 + 8 : FONT.title + 36);
        doc.moveTo(M, divY).lineTo(W - M, divY).lineWidth(0.5).strokeColor(BRAND.border).stroke();
        doc.y = divY + 8;
      }
    };

    /* ---------- FOOTER (drawn on every page) ---------- */
    const drawFooter = () => {
      const page = doc.bufferedPageRange();
      for (let i = 0; i < page.count; i++) {
        doc.switchToPage(i);
        const pageH = doc.page.height;
        const footY = pageH - (isThermal ? 28 : 38);

        doc.moveTo(M, footY).lineTo(W - M, footY).lineWidth(0.5).strokeColor(BRAND.border).stroke();

        // Gold accent bar at very bottom
        doc.rect(0, pageH - 3, W, 3).fill(BRAND.gold);

        if (isThermal) {
          doc.fillColor(BRAND.muted).font("Helvetica").fontSize(FONT.base - 1);
          doc.text(`${BRAND.website}  •  ${BRAND.phone}`, M, footY + 5, { width: contentW, align: "center" });
          doc.fontSize(FONT.base - 2).fillColor("#9A958D");
          doc.text("Computer-generated invoice • No signature required", M, footY + 5 + FONT.base, { width: contentW, align: "center" });
        } else {
          doc.fillColor(BRAND.muted).font("Helvetica-Bold").fontSize(10);
          doc.text("Thank you for your business!", M, footY + 8, { width: contentW, align: "center" });
          doc.font("Helvetica").fontSize(8).fillColor("#9A958D");
          doc.text(
            `${BRAND.website}  •  ${BRAND.email}  •  ${BRAND.phone}`,
            M,
            footY + 22,
            { width: contentW, align: "center" }
          );
        }

        // Page number
        doc.fillColor(BRAND.muted).font("Helvetica").fontSize(FONT.base - 2);
        doc.text(`Page ${i + 1} / ${page.count}`, 0, pageH - 12, { width: W, align: "center" });
      }
    };

    /* ---------- CONTENT AREA HELPER ---------- */
    const usableHeight = () => {
      const pageH = doc.page.height;
      const headerReserved = isThermal ? 60 : 90;
      const footerReserved = isThermal ? 30 : 42;
      return pageH - headerReserved - footerReserved;
    };

    const ensureSpace = (needed) => {
      if (doc.y + needed > doc.page.height - (isThermal ? 30 : 42)) {
        doc.addPage();
      }
    };

    /* ============= BUILD CONTENT ============= */

    // FROM / TO
    const startY = doc.y;
    const colW = isThermal ? contentW : contentW / 2 - 6;

    if (isThermal) {
      // Single column for thermal
      doc.font("Helvetica-Bold").fontSize(FONT.base).fillColor(BRAND.gold).text("FROM", M);
      doc.fillColor(BRAND.charcoal).text(BRAND.fullName, M);
      doc.font("Helvetica").fontSize(FONT.base - 1).fillColor(BRAND.muted)
        .text(`${BRAND.address}, ${BRAND.city}`);
      doc.text(`${BRAND.phone} • ${BRAND.email}`);
      doc.moveDown(0.6);

      doc.font("Helvetica-Bold").fontSize(FONT.base).fillColor(BRAND.gold).text("BILL TO", M);
      doc.fillColor(BRAND.charcoal).font("Helvetica-Bold").text(customer.name || "Customer", M);
      doc.font("Helvetica").fontSize(FONT.base - 1).fillColor(BRAND.muted);
      if (customer.email) doc.text(customer.email);
      if (customer.phone) doc.text(customer.phone);
      const shipAddr = order?.guestInfo?.address || order?.guestAddress;
      const shipCity = order?.guestInfo?.city || order?.guestCity;
      if (shipAddr) doc.text(shipAddr);
      if (shipCity) doc.text(shipCity);
      doc.moveDown(0.6);
    } else {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.muted).text("FROM", M, startY, { width: colW, characterSpacing: 2 });
      doc.font("Helvetica-Bold").fontSize(FONT.h1).fillColor(BRAND.charcoal).text(BRAND.fullName, M, startY + 12, { width: colW });
      doc.font("Helvetica").fontSize(FONT.base).fillColor(BRAND.muted)
        .text(BRAND.address, M, startY + 26, { width: colW })
        .text(BRAND.city, M, startY + 38, { width: colW })
        .text(`Phone: ${BRAND.phone}`, M, startY + 50, { width: colW })
        .text(`Email: ${BRAND.email}`, M, startY + 62, { width: colW });

      const toX = M + colW + 12;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.muted).text("BILL TO", toX, startY, { width: colW, characterSpacing: 2 });
      doc.font("Helvetica-Bold").fontSize(FONT.h1).fillColor(BRAND.charcoal).text(customer.name || "Customer", toX, startY + 12, { width: colW });
      doc.font("Helvetica").fontSize(FONT.base).fillColor(BRAND.muted);
      let yOff = 26;
      if (customer.email) { doc.text(`Email: ${customer.email}`, toX, startY + yOff, { width: colW }); yOff += 12; }
      if (customer.phone) { doc.text(`Phone: ${customer.phone}`, toX, startY + yOff, { width: colW }); yOff += 12; }
      const shipAddr = order?.guestInfo?.address || order?.guestAddress;
      const shipCity = order?.guestInfo?.city || order?.guestCity;
      if (shipAddr) { doc.text(`Ship: ${shipAddr}`, toX, startY + yOff, { width: colW }); yOff += 12; }
      if (shipCity) { doc.text(shipCity, toX, startY + yOff, { width: colW }); yOff += 12; }

      doc.y = startY + 80;
    }

    // Payment row
    ensureSpace(isThermal ? 24 : 30);
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(FONT.base).fillColor(BRAND.gold).text("PAYMENT", M);
    doc.fillColor(BRAND.charcoal).font("Helvetica").fontSize(FONT.base)
      .text(`Method: ${(order.paymentMethod || "cod").toUpperCase()}    Status: ${(order.paymentStatus || "unpaid").toUpperCase()}${isPaid ? "  ✓" : ""}`);
    if (order.paymentDetails?.txId) {
      doc.fillColor(BRAND.muted).fontSize(FONT.base - 1).text(`TxID: ${order.paymentDetails.txId}${order.paymentDetails?.senderNumber ? `   From: ${order.paymentDetails.senderNumber}` : ""}`);
    }
    doc.moveDown(0.6);

    // Items header
    ensureSpace(isThermal ? 18 : 24);
    const lineH = FONT.base + 5;
    const tableY = doc.y;
    const colDefs = isThermal
      ? [
          { label: "ITEM",   x: M,            w: contentW * 0.5,  align: "left"   },
          { label: "QTY",    x: M + contentW * 0.5, w: contentW * 0.12, align: "right"  },
          { label: "PRICE",  x: M + contentW * 0.62, w: contentW * 0.18, align: "right" },
          { label: "TOTAL",  x: M + contentW * 0.80, w: contentW * 0.2,  align: "right" },
        ]
      : [
          { label: "ITEM",       x: M,             w: contentW * 0.44, align: "left"   },
          { label: "VARIANT",    x: M + contentW * 0.44, w: contentW * 0.12, align: "left"   },
          { label: "QTY",        x: M + contentW * 0.56, w: contentW * 0.08, align: "center" },
          { label: "UNIT PRICE", x: M + contentW * 0.64, w: contentW * 0.16, align: "right"  },
          { label: "TOTAL",      x: M + contentW * 0.80, w: contentW * 0.2,  align: "right"  },
        ];

    // Table header row (light cream background)
    doc.rect(M, tableY, contentW, lineH + 2).fill("#FAF7EF");
    doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(FONT.base - 1);
    colDefs.forEach((c) => doc.text(c.label, c.x + 3, tableY + 3, { width: c.w - 6, align: c.align, characterSpacing: 0.8 }));
    doc.fillColor(BRAND.charcoal);
    doc.y = tableY + lineH + 4;

    // Items rows
    items.forEach((item, idx) => {
      ensureSpace(lineH + 2);
      const rowY = doc.y;
      const alt = idx % 2 === 1 ? "#FBFAF6" : null;
      if (alt) doc.rect(M, rowY, contentW, lineH + 2).fill(alt);

      doc.fillColor(BRAND.charcoal).font("Helvetica-Bold").fontSize(FONT.base)
        .text(item.name, colDefs[0].x + 3, rowY + 2, { width: colDefs[0].w - 6 });
      if (!isThermal) {
        doc.font("Helvetica").fillColor(BRAND.muted)
          .text(item.variant || "—", colDefs[1].x + 3, rowY + 2, { width: colDefs[1].w - 6 });
      }
      doc.fillColor(BRAND.charcoal).font("Helvetica").fontSize(FONT.base)
        .text(String(item.quantity), colDefs[2].x + 3, rowY + 2, { width: colDefs[2].w - 6, align: colDefs[2].align })
        .text(fmtMoney(item.price), colDefs[3].x + 3, rowY + 2, { width: colDefs[3].w - 6, align: colDefs[3].align })
        .text(fmtMoney(item.price * item.quantity), colDefs[4] ? colDefs[4].x + 3 : colDefs[3].x + 3, rowY + 2,
          { width: colDefs[4] ? colDefs[4].w - 6 : colDefs[3].w - 6, align: (colDefs[4] || colDefs[3]).align });

      doc.y = rowY + lineH + 2;
    });

    doc.moveDown(0.6);
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(0.5).strokeColor(BRAND.border).stroke();
    doc.moveDown(0.4);

    // Summary
    ensureSpace(isThermal ? 50 : 70);
    const sumW = isThermal ? contentW : 200;
    const sumX = isThermal ? M : W - M - sumW;
    const netSales = items.reduce((s, it) => s + it.price * it.quantity, 0);

    doc.font("Helvetica").fontSize(FONT.base).fillColor(BRAND.muted);
    doc.text("Subtotal", sumX, doc.y, { width: sumW * 0.6, align: "left" });
    doc.fillColor(BRAND.charcoal).text(fmtMoney(netSales), sumX + sumW * 0.6, doc.y - FONT.base - 1, { width: sumW * 0.4, align: "right" });
    doc.moveDown(0.3);

    doc.fillColor(BRAND.muted).text("Shipping", sumX, doc.y, { width: sumW * 0.6, align: "left" });
    const ship = Number(order.shippingCharge || 0);
    doc.fillColor(BRAND.charcoal).text(ship > 0 ? fmtMoney(ship) : "FREE", sumX + sumW * 0.6, doc.y - FONT.base - 1, { width: sumW * 0.4, align: "right" });
    doc.moveDown(0.5);

    doc.moveTo(sumX, doc.y).lineTo(sumX + sumW, doc.y).lineWidth(1).strokeColor(BRAND.charcoal).stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica-Bold").fontSize(FONT.h1 + 2).fillColor(BRAND.charcoal);
    doc.text("TOTAL", sumX, doc.y, { width: sumW * 0.6, align: "left" });
    doc.fillColor(BRAND.gold).text(fmtMoney(order.totalAmount), sumX + sumW * 0.6, doc.y - FONT.h1 - 3, { width: sumW * 0.4, align: "right" });
    doc.moveDown(0.5);

    if (isPaid) {
      doc.font("Helvetica-Bold").fontSize(FONT.base).fillColor("#16a34a").text("✓ PAID IN FULL", sumX, doc.y, { width: sumW, align: "right" });
    }

    /* ---------- DRAW FIXED HEADER + FOOTER ON EVERY PAGE ---------- */
    drawHeader();
    drawFooter();

    doc.end();
  });
};

/* =========================================================================
   EMAIL TEMPLATES — shared base + themed variants
   ========================================================================= */
const emailBase = (inner, opts = {}) => {
  const { previewText = "", hideFooter = false } = opts;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.charcoal};-webkit-font-smoothing:antialiased;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(previewText)}</div>` : ""}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.cream};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(20,19,17,0.04);">
        <!-- BRAND HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.charcoal} 0%,#1F1D1A 100%);padding:32px 32px 28px;text-align:center;">
            <div style="display:inline-block;padding:8px 18px;background:rgba(197,160,89,0.15);border:1px solid rgba(197,160,89,0.4);border-radius:99px;margin-bottom:16px;">
              <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.18em;color:${BRAND.gold};text-transform:uppercase;">${BRAND.name} · ${BRAND.tagline}</span>
            </div>
            <div style="font-family:Georgia,serif;font-size:30px;font-weight:800;color:#FFFDFB;letter-spacing:-0.02em;line-height:1.1;">${opts.heading || "Hello from SIRAT"}</div>
            ${opts.subheading ? `<div style="margin-top:8px;font-size:14px;color:rgba(255,253,251,0.7);line-height:1.5;">${opts.subheading}</div>` : ""}
          </td>
        </tr>
        <!-- GOLD STRIPE -->
        <tr>
          <td style="height:3px;background:linear-gradient(to right,${BRAND.gold} 0%,${BRAND.goldSoft} 50%,${BRAND.gold} 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            ${inner}
          </td>
        </tr>
        ${hideFooter ? "" : `
        <!-- FOOTER -->
        <tr>
          <td style="background:${BRAND.cream};padding:24px 32px;border-top:1px solid ${BRAND.border};">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:14px;">
                  <span style="font-family:Georgia,serif;font-size:18px;font-weight:800;color:${BRAND.charcoal};letter-spacing:-0.01em;">${BRAND.name}</span>
                  <span style="font-size:11px;color:${BRAND.muted};margin-left:6px;text-transform:uppercase;letter-spacing:0.12em;">${BRAND.tagline}</span>
                </td>
              </tr>
              <tr>
                <td align="center" style="font-size:12px;color:${BRAND.muted};line-height:1.7;">
                  ${BRAND.address}<br>
                  ${BRAND.city}<br>
                  <a href="mailto:${BRAND.email}" style="color:${BRAND.goldSoft};text-decoration:none;font-weight:600;">${BRAND.email}</a> · ${BRAND.phone}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:16px;">
                  <a href="${BRAND.websiteUrl}" style="display:inline-block;padding:8px 18px;background:${BRAND.charcoal};color:#FFFDFB;border-radius:99px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-decoration:none;">VISIT ${BRAND.website.toUpperCase()}</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:18px;font-size:11px;color:#9A958D;line-height:1.5;">
                  You're receiving this because you shopped with ${BRAND.name}.<br>
                  <a href="mailto:${BRAND.email}?subject=Unsubscribe" style="color:#9A958D;text-decoration:underline;">Unsubscribe</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`}
      </table>
      <!-- Tiny credit -->
      <div style="max-width:640px;margin:14px auto 0;text-align:center;font-size:10px;color:#9A958D;letter-spacing:0.05em;">
        © ${new Date().getFullYear()} ${BRAND.fullName} · All rights reserved
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
};

const invoiceItemsTable = (items) => {
  const rows = items.map((item) => `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid ${BRAND.border};vertical-align:top;">
        <div style="font-weight:700;color:${BRAND.charcoal};font-size:14px;line-height:1.4;">${escapeHtml(item.name)}</div>
        ${item.variant ? `<div style="font-size:12px;color:${BRAND.muted};margin-top:3px;">${escapeHtml(item.variant)}</div>` : ""}
      </td>
      <td style="padding:14px 8px;border-bottom:1px solid ${BRAND.border};text-align:center;color:${BRAND.charcoal};font-size:14px;">${item.quantity}</td>
      <td style="padding:14px 12px;border-bottom:1px solid ${BRAND.border};text-align:right;color:${BRAND.charcoal};font-size:14px;white-space:nowrap;">${money(item.price)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid ${BRAND.border};text-align:right;color:${BRAND.charcoal};font-weight:700;font-size:14px;white-space:nowrap;">${money(item.price * item.quantity)}</td>
    </tr>
  `).join("");

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0;margin:24px 0;">
      <thead>
        <tr style="background:${BRAND.cream};">
          <th align="left"  style="padding:12px;font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;border-bottom:1px solid ${BRAND.border};">Item</th>
          <th align="center" style="padding:12px;font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;border-bottom:1px solid ${BRAND.border};">Qty</th>
          <th align="right" style="padding:12px;font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;border-bottom:1px solid ${BRAND.border};">Price</th>
          <th align="right" style="padding:12px;font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;border-bottom:1px solid ${BRAND.border};">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const summaryBlock = (order) => {
  const netSales = (order?.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
  const ship = Number(order?.shippingCharge || 0);
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;">
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Subtotal</td>
        <td align="right" style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;font-weight:600;">${money(netSales)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Shipping</td>
        <td align="right" style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;font-weight:600;">${ship > 0 ? money(ship) : '<span style="color:#16a34a;">FREE</span>'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0;"><div style="height:1px;background:${BRAND.charcoal};margin:10px 0;"></div></td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:Georgia,serif;font-size:20px;font-weight:800;color:${BRAND.charcoal};">Total</td>
        <td align="right" style="padding:8px 0;font-family:Georgia,serif;font-size:24px;font-weight:800;color:${BRAND.gold};">${money(order.totalAmount)}</td>
      </tr>
    </table>
  `;
};

/* ---------- INVOICE EMAIL (customer) ---------- */
const buildInvoiceHtml = (order, recipient) => {
  const items = getOrderItems(order);
  const customer = recipient || { name: "Customer" };
  const shipAddr = order?.guestInfo?.address || order?.guestAddress;
  const shipCity = order?.guestInfo?.city || order?.guestCity;
  const isPaid = order.paymentStatus === "approved";

  const inner = `
    <p style="margin:0 0 6px;font-size:16px;color:${BRAND.charcoal};">Hi <strong>${escapeHtml(customer.name)}</strong>,</p>
    <p style="margin:0 0 22px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
      Thank you for shopping with ${BRAND.name}. Your order has been received and is being prepared with care.
      A detailed PDF invoice is attached to this email.
    </p>

    <!-- ORDER META PILLS -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="padding:0;">
          <div style="display:inline-block;padding:10px 14px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:12px;margin-right:8px;margin-bottom:8px;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:2px;">Order ID</div>
            <div style="font-size:15px;font-weight:700;color:${BRAND.charcoal};">#${escapeHtml(order.orderId)}</div>
          </div>
          <div style="display:inline-block;padding:10px 14px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:12px;margin-right:8px;margin-bottom:8px;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:2px;">Payment</div>
            <div style="font-size:15px;font-weight:700;color:${BRAND.charcoal};">${escapeHtml((order.paymentMethod || "cod").toUpperCase())}</div>
          </div>
          <div style="display:inline-block;padding:10px 14px;background:${isPaid ? "#ECFDF5" : "#FEF3C7"};border:1px solid ${isPaid ? "#A7F3D0" : "#FDE68A"};border-radius:12px;margin-bottom:8px;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:${isPaid ? "#047857" : "#B45309"};text-transform:uppercase;margin-bottom:2px;">Status</div>
            <div style="font-size:15px;font-weight:700;color:${isPaid ? "#047857" : "#B45309"};">${escapeHtml((order.paymentStatus || "pending").toUpperCase())}${isPaid ? " ✓" : ""}</div>
          </div>
        </td>
      </tr>
    </table>

    ${invoiceItemsTable(items)}
    ${summaryBlock(order)}

    ${shipAddr || shipCity ? `
      <div style="margin-top:24px;padding:16px 18px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:12px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:6px;">Shipping to</div>
        <div style="font-size:14px;color:${BRAND.charcoal};line-height:1.5;">${escapeHtml([shipAddr, shipCity].filter(Boolean).join(", "))}</div>
      </div>
    ` : ""}

    <!-- CTA -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 8px;">
      <tr>
        <td align="center">
          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/track?id=${escapeHtml(order.orderId)}"
             style="display:inline-block;padding:14px 32px;background:${BRAND.gold};color:#FFFFFF;border-radius:99px;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;box-shadow:0 8px 20px rgba(197,160,89,0.3);">
            Track My Order
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:14px;color:${BRAND.muted};line-height:1.6;text-align:center;">
      Questions? Reply to this email or message us on
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.goldSoft};text-decoration:none;font-weight:600;">${BRAND.website}</a>.
    </p>
  `;

  return emailBase(inner, {
    heading: "Your Invoice",
    subheading: `Order #${escapeHtml(order.orderId)}`,
    previewText: `Invoice for order ${order.orderId} — ${money(order.totalAmount)}`,
  });
};

/* ---------- ADMIN ORDER ALERT ---------- */
const buildAdminAlertHtml = (order, recipient) => {
  const items = getOrderItems(order);
  const itemsHtml = items.map((item) => `
    <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};display:flex;justify-content:space-between;gap:12px;">
      <span style="color:${BRAND.charcoal};">${escapeHtml(item.name)}${item.variant ? ` <span style="color:${BRAND.muted};font-size:13px;">(${escapeHtml(item.variant)})</span>` : ""}</span>
      <span style="color:${BRAND.muted};white-space:nowrap;">× ${item.quantity}</span>
    </li>
  `).join("");

  const customerName = recipient?.name || order?.guestInfo?.name || order?.guestName || "Guest";
  const customerEmail = recipient?.email || order?.guestInfo?.email || order?.guestEmail || "N/A";
  const customerPhone = recipient?.phone || order?.guestInfo?.phone || order?.guestPhone || "N/A";

  const inner = `
    <div style="margin:0 0 18px;padding:12px 16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#B45309;text-transform:uppercase;">⚡ Action Required</div>
      <div style="font-size:14px;color:${BRAND.charcoal};margin-top:4px;line-height:1.5;">A new order just landed. Confirm and process it as soon as possible.</div>
    </div>

    <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:${BRAND.charcoal};margin:0 0 16px;">
      Order #${escapeHtml(order.orderId)}
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:120px;">Customer</td>
        <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;font-weight:700;">${escapeHtml(customerName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td>
        <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;"><a href="mailto:${escapeHtml(customerEmail)}" style="color:${BRAND.goldSoft};text-decoration:none;">${escapeHtml(customerEmail)}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Phone</td>
        <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;">${escapeHtml(customerPhone)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Payment</td>
        <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;font-weight:700;">${escapeHtml((order.paymentMethod || "cod").toUpperCase())} · <span style="color:${order.paymentStatus === "approved" ? "#16a34a" : "#B45309"};">${escapeHtml((order.paymentStatus || "pending").toUpperCase())}</span></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Total</td>
        <td style="padding:8px 0;font-family:Georgia,serif;font-size:20px;font-weight:800;color:${BRAND.gold};">${money(order.totalAmount)}</td>
      </tr>
    </table>

    <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;margin:24px 0 8px;">Items</div>
    <ul style="list-style:none;padding:12px 16px;margin:0;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:12px;">
      ${itemsHtml}
    </ul>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0;">
      <tr>
        <td align="center">
          <a href="${process.env.ADMIN_URL || "http://localhost:5174"}/orders"
             style="display:inline-block;padding:14px 32px;background:${BRAND.charcoal};color:#FFFFFF;border-radius:99px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
            Open Admin Panel
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailBase(inner, {
    heading: "New Order Alert",
    subheading: `${money(order.totalAmount)} · ${escapeHtml(customerName)}`,
    previewText: `New order #${order.orderId} from ${customerName} — ${money(order.totalAmount)}`,
  });
};

/* ---------- STATUS UPDATE ---------- */
const buildStatusUpdateHtml = (order, recipient) => {
  const statusColor = {
    received: "#C5A059",
    confirmed: "#0EA5E9",
    packed: "#8B5CF6",
    shipped: "#F59E0B",
    delivered: "#16A34A",
    cancelled: "#EF4444",
    returned: "#EF4444",
  }[order.status] || BRAND.gold;

  const statusMessages = {
    received: "We've received your order and will start processing it shortly.",
    confirmed: "Your order has been confirmed. We're getting it ready for you.",
    packed: "Your order has been carefully packed and is awaiting pickup.",
    shipped: "Your order is on its way! Track it for live updates.",
    delivered: "Your order has been delivered. Enjoy your new pieces!",
    cancelled: "Your order has been cancelled. Reach out if this was a mistake.",
    returned: "Your return has been logged. Our team will process it soon.",
  };

  const inner = `
    <p style="margin:0 0 6px;font-size:16px;color:${BRAND.charcoal};">Hi <strong>${escapeHtml(recipient?.name || "Customer")}</strong>,</p>
    <p style="margin:0 0 28px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
      Your order status has been updated. Here's where things stand:
    </p>

    <div style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:18px;padding:28px 24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.16em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:10px;">Order Status</div>
      <div style="display:inline-block;padding:12px 24px;background:${statusColor};color:#FFFFFF;border-radius:99px;font-family:Georgia,serif;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
        ${escapeHtml(order.status)}
      </div>
      <div style="margin-top:18px;font-size:14px;color:${BRAND.muted};line-height:1.5;">${statusMessages[order.status] || ""}</div>
      <div style="margin-top:14px;font-size:12px;color:${BRAND.muted};">Order <strong style="color:${BRAND.charcoal};">#${escapeHtml(order.orderId)}</strong></div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0;">
      <tr>
        <td align="center">
          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/track?id=${escapeHtml(order.orderId)}"
             style="display:inline-block;padding:14px 32px;background:${BRAND.gold};color:#FFFFFF;border-radius:99px;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;box-shadow:0 8px 20px rgba(197,160,89,0.3);">
            Track My Order
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailBase(inner, {
    heading: "Order Update",
    subheading: `Order #${escapeHtml(order.orderId)} is now ${escapeHtml((order.status || "").toUpperCase())}`,
    previewText: `Order #${order.orderId} is now ${order.status}`,
  });
};

/* ---------- NEWSLETTER WELCOME ---------- */
const sendNewsletterWelcomeEmail = async (email) => {
  const inner = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="font-family:Georgia,serif;font-size:42px;line-height:1;margin-bottom:12px;">✨</div>
      <p style="margin:0 0 20px;font-size:18px;line-height:1.6;color:${BRAND.charcoal};">
        Thank you for joining the <strong style="color:${BRAND.gold};">${BRAND.name} Elite List</strong>.
      </p>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:${BRAND.muted};">
        You'll be the first to hear about upcoming drops, limited collections, secret discount codes, and member-only events.
      </p>
    </div>

    <div style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:14px;padding:24px;margin:0 0 28px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.16em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:14px;text-align:center;">What you'll get</div>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;">⚡ Early access to new drops</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;">🎁 Member-only discount codes</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;">📦 Behind-the-scenes content</td>
        </tr>
      </table>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${BRAND.websiteUrl}/shop"
             style="display:inline-block;padding:14px 32px;background:${BRAND.gold};color:#FFFFFF;border-radius:99px;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
            Start Shopping
          </a>
        </td>
      </tr>
    </table>
  `;
  return await sendEmail({
    to: [{ email, name: "New Subscriber" }],
    subject: `Welcome to the ${BRAND.name} Elite List!`,
    html: emailBase(inner, {
      heading: "Welcome to SIRAT",
      subheading: "You're officially on the inside.",
      previewText: "Welcome to the SIRAT Elite List — early access to drops, secret codes, and more.",
    }),
  });
};

/* ---------- CONTACT NOTIFICATION ---------- */
const sendContactNotification = async (contact) => {
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return null;

  const inner = `
    <div style="margin:0 0 20px;padding:12px 16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#B45309;text-transform:uppercase;">📨 New contact form submission</div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:100px;">Name</td>
        <td style="padding:8px 0;color:${BRAND.charcoal};font-size:14px;font-weight:700;">${escapeHtml(contact.name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td>
        <td style="padding:8px 0;font-size:14px;"><a href="mailto:${escapeHtml(contact.email)}" style="color:${BRAND.goldSoft};text-decoration:none;font-weight:600;">${escapeHtml(contact.email)}</a></td>
      </tr>
    </table>

    <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:${BRAND.muted};text-transform:uppercase;margin:0 0 8px;">Message</div>
    <div style="padding:18px 20px;background:${BRAND.cream};border-left:3px solid ${BRAND.gold};border-radius:0 12px 12px 0;font-size:15px;line-height:1.7;color:${BRAND.charcoal};white-space:pre-wrap;">${escapeHtml(contact.message)}</div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 0;">
      <tr>
        <td align="center">
          <a href="mailto:${escapeHtml(contact.email)}?subject=Re: Your message to ${BRAND.name}"
             style="display:inline-block;padding:12px 24px;background:${BRAND.gold};color:#FFFFFF;border-radius:99px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
            Reply to ${escapeHtml(contact.name)}
          </a>
        </td>
      </tr>
    </table>
  `;

  return await Promise.all(
    adminEmails.map((email) =>
      sendEmail({
        to: [{ email, name: `${BRAND.name} Admin` }],
        subject: `New contact: ${contact.name}`,
        html: emailBase(inner, {
          heading: "New Contact Message",
          subheading: `From ${escapeHtml(contact.name)}`,
          previewText: `${contact.name} sent a message via the contact form.`,
        }),
        replyTo: contact.email,
      })
    )
  );
};

/* ---------- PASSWORD RESET (OTP) ---------- */
const buildPasswordResetHtml = (otp) => {
  const safeOtp = String(otp || "").replace(/\D/g, "").slice(0, 6);
  const inner = `
    <p style="margin:0 0 6px;font-size:16px;color:${BRAND.charcoal};">Hi there,</p>
    <p style="margin:0 0 22px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
      We received a request to reset the password for your ${BRAND.name} account.
      Use the one-time code below to continue. If you didn't make this request, you can safely ignore this email.
    </p>

    <!-- OTP CARD -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 22px;">
      <tr>
        <td align="center" style="padding:28px 18px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:14px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:${BRAND.muted};text-transform:uppercase;margin-bottom:14px;">Your Reset Code</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:800;letter-spacing:0.35em;color:${BRAND.charcoal};line-height:1;">${safeOtp || "------"}</div>
          <div style="margin-top:18px;display:inline-block;padding:6px 14px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:99px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#B45309;text-transform:uppercase;">⏱ Expires in 15 minutes</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- SECURITY NOTE -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="padding:14px 16px;background:#FEF2F2;border-left:3px solid #DC2626;border-radius:0 10px 10px 0;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;color:#991B1B;text-transform:uppercase;margin-bottom:4px;">Security Tip</div>
          <div style="font-size:13px;color:#7F1D1D;line-height:1.5;">Never share this code with anyone. ${BRAND.name} staff will never ask for it.</div>
        </td>
      </tr>
    </table>

    <p style="margin:18px 0 0;font-size:14px;color:${BRAND.muted};line-height:1.6;text-align:center;">
      Need help? Reach us at
      <a href="mailto:${BRAND.email}" style="color:${BRAND.goldSoft};text-decoration:none;font-weight:600;">${BRAND.email}</a>.
    </p>
  `;

  return emailBase(inner, {
    heading: "Reset Your Password",
    subheading: "Use the code below to set a new password",
    previewText: `Your ${BRAND.name} password reset code — valid for 15 minutes.`,
  });
};

const sendPasswordResetEmail = async (email, otp) => {
  return await sendEmail({
    to: email,
    subject: `${BRAND.name} · Password Reset Code`,
    html: buildPasswordResetHtml(otp),
  });
};

/* =========================================================================
   PUBLIC API
   ========================================================================= */
const sendOrderEmails = async (order, opts = {}) => {
  const recipient = await resolveRecipient(order);
  const adminEmails = await getAdminEmails();
  const pdfSizeKey = opts.pdfSize || "a4";
  const pdfBuffer = await buildPdfBuffer(order, recipient, pdfSizeKey);
  const attachment = {
    filename: `invoice-${order.orderId}.pdf`,
    content: pdfBuffer,
    contentType: "application/pdf",
  };

  const results = {};

  if (recipient?.email) {
    results.customer = await sendEmail({
      to: [{ email: recipient.email, name: recipient.name }],
      subject: `Your ${BRAND.name} order ${order.orderId} invoice`,
      html: buildInvoiceHtml(order, recipient),
      attachments: [attachment],
    });
  }

  if (adminEmails.length > 0) {
    results.admins = await Promise.all(
      adminEmails.map((email) =>
        sendEmail({
          to: [{ email, name: `${BRAND.name} Admin` }],
          subject: `New order alert — ${order.orderId} · ${money(order.totalAmount)}`,
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
    subject: `${BRAND.name} · Order ${order.orderId} is now ${(order.status || "").toUpperCase()}`,
    html: buildStatusUpdateHtml(order, recipient),
  });
};

module.exports = {
  buildInvoiceHtml,
  buildAdminAlertHtml,
  buildStatusUpdateHtml,
  buildPdfBuffer,
  sendOrderEmails,
  sendStatusUpdateEmail,
  sendNewsletterWelcomeEmail,
  sendContactNotification,
  sendPasswordResetEmail,
  INVOICE_SIZES,
  BRAND,
};
