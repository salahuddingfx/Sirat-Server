const orderService = require("../services/order.services");
const User = require("../models/user.model");
const Settings = require("../models/settings.model");
const { sendEmail } = require("../utils/mailer");

const money = (value) => `৳${Number(value || 0).toFixed(2)}`;

const getOrderRecipient = async (order) => {
  if (order?.user) {
    const user = await User.findById(order.user).select("name email phone");
    if (user?.email) {
      return {
        name: user.name || "Customer",
        email: user.email,
        phone: user.phone || order.guestInfo?.phone || ""
      };
    }
  }

  if (order?.guestInfo?.email) {
    return {
      name: order.guestInfo.name || "Customer",
      email: order.guestInfo.email,
      phone: order.guestInfo.phone || ""
    };
  }

  return null;
};

const buildOrderSummaryRows = (order) => {
  return order.items
    .map((item) => {
      const product = item.product || {};
      const productName = product.name || "Product";
      const variant = item.variant ? ` (${item.variant})` : "";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">${productName}${variant}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${money(item.price)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${money(item.quantity * item.price)}</td>
        </tr>`;
    })
    .join("");
};

const buildOrderEmailHtml = (order, recipient) => {
  const rows = buildOrderSummaryRows(order);
  const shipping = money(order.shippingCharge);
  const total = money(order.totalAmount);
  const paymentLabel = order.paymentMethod ? order.paymentMethod.toUpperCase() : "COD";
  const address = [
    order.guestInfo?.address,
    order.guestInfo?.city
  ].filter(Boolean).join(", ");

  return `
    <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
      <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;overflow:hidden;">
        <div style="background:#c5a059;color:#fff;padding:24px;">
          <h1 style="margin:0;font-size:24px;">Sirat Order Invoice</h1>
          <p style="margin:8px 0 0;opacity:.95;">Order ID: <strong>${order.orderId}</strong></p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;">Hi ${recipient?.name || "Customer"}, your order has been received successfully.</p>
          <p style="margin:0 0 20px;">We’ll keep you updated on every status change.</p>

          <div style="margin-bottom:20px;">
            <h2 style="font-size:18px;margin:0 0 8px;">Order Details</h2>
            <p style="margin:0;color:#5a5650;">Payment: ${paymentLabel}</p>
            ${address ? `<p style="margin:6px 0 0;color:#5a5650;">Shipping: ${address}</p>` : ""}
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
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top:18px;display:flex;justify-content:flex-end;">
            <div style="min-width:240px;">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
                <span>Shipping</span><strong>${shipping}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;">
                <span>Total</span><strong>${total}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
};

const buildAdminAlertHtml = (order, recipient) => {
  return `
    <div style="font-family:Arial,sans-serif;background:#faf9f5;padding:24px;color:#141311;">
      <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:16px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:22px;">New Order Received</h1>
        <p style="margin:0 0 8px;">Order ID: <strong>${order.orderId}</strong></p>
        <p style="margin:0 0 8px;">Customer: <strong>${recipient?.name || order.guestInfo?.name || 'Guest'}</strong></p>
        <p style="margin:0 0 8px;">Email: <strong>${recipient?.email || order.guestInfo?.email || 'N/A'}</strong></p>
        <p style="margin:0 0 8px;">Phone: <strong>${recipient?.phone || order.guestInfo?.phone || 'N/A'}</strong></p>
        <p style="margin:0 0 8px;">Total: <strong>${money(order.totalAmount)}</strong></p>
        <p style="margin:0 0 18px;">Payment: <strong>${(order.paymentMethod || 'cod').toUpperCase()}</strong></p>
        <h2 style="font-size:18px;margin:0 0 12px;">Items</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.8;">
          ${order.items.map((item) => `<li>${item.product?.name || 'Product'} x ${item.quantity}${item.variant ? ` (${item.variant})` : ''}</li>`).join('')}
        </ul>
      </div>
    </div>`;
};

const placeOrder = async (req, res) => {
  try {
    const orderData = req.body;
    // If user is logged in, attach their ID
    if (req.user) {
      orderData.user = req.user.id;
    }
    const order = await orderService.createOrder(orderData);
    const fullOrder = await orderService.getOrderById(order.id);

    // Send email notifications without blocking the response
    (async () => {
      try {
        const recipient = await getOrderRecipient(order);
        const settings = (await Settings.findOne()) || {};
        const adminEmail = settings.email || process.env.SMTP_USER;

        if (recipient?.email) {
          await sendEmail({
            to: [{ email: recipient.email, name: recipient.name }],
            subject: `Your Sirat order ${order.orderId} invoice`,
            html: buildOrderEmailHtml(fullOrder, recipient),
            replyTo: adminEmail || undefined
          });
        }

        if (adminEmail) {
          await sendEmail({
            to: [{ email: adminEmail, name: 'Sirat Admin' }],
            subject: `New order alert - ${order.orderId}`,
            html: buildAdminAlertHtml(fullOrder, recipient),
            replyTo: recipient?.email || undefined
          });
        }
      } catch (notifyError) {
        console.error('Failed to send order emails:', notifyError.message || notifyError);
      }
    })();

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrders({ user: req.user.id });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    
    // Check if it's their order or if they are admin
    if (req.user.role !== 'admin' && order.user?.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrder,
};
