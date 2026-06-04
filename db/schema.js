const { mysqlTable, varchar, text, double, int, boolean, mysqlEnum, datetime, primaryKey } = require("drizzle-orm/mysql-core");
const { relations, sql } = require("drizzle-orm");

// 1. user
const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).unique(),
  phone: varchar("phone", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatar: varchar("avatar", { length: 255 }),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 2. address
const address = mysqlTable("address", {
  id: varchar("id", { length: 255 }).primaryKey(),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
  zipCode: varchar("zipCode", { length: 255 }),
  country: varchar("country", { length: 255 }).default("Bangladesh").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  userId: varchar("userId", { length: 255 }).notNull(),
});

// 3. category
const category = mysqlTable("category", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  image: varchar("image", { length: 255 }).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 4. contact
const contact = mysqlTable("contact", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 5. counter
const counter = mysqlTable("counter", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  count: int("count").default(0).notNull(),
});

// 6. coupon
const coupon = mysqlTable("coupon", {
  id: varchar("id", { length: 255 }).primaryKey(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).default("percentage").notNull(),
  discountValue: double("discountValue").notNull(),
  minPurchase: double("minPurchase").default(0).notNull(),
  expiryDate: datetime("expiryDate", { mode: "date" }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 7. passwordresettoken
const passwordresettoken = mysqlTable("passwordresettoken", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: datetime("expiresAt", { mode: "date" }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 8. event
const event = mysqlTable("event", {
  id: varchar("id", { length: 255 }).primaryKey(),
  type: varchar("type", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).default("engagement").notNull(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 255 }),
  isLoggedIn: boolean("isLoggedIn").default(false).notNull(),
  page: varchar("page", { length: 255 }).default("").notNull(),
  path: varchar("path", { length: 255 }).default("").notNull(),
  label: varchar("label", { length: 255 }).default("").notNull(),
  value: double("value"),
  currency: varchar("currency", { length: 255 }).default("").notNull(),
  metadata: text("metadata"), // Map longtext to text
  ip: varchar("ip", { length: 255 }).default("").notNull(),
  country: varchar("country", { length: 255 }).default("Unknown").notNull(),
  city: varchar("city", { length: 255 }).default("Unknown").notNull(),
  device: varchar("device", { length: 255 }).default("desktop").notNull(),
  browser: varchar("browser", { length: 255 }).default("Unknown").notNull(),
  timestamp: datetime("timestamp", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 8. flashsale
const flashsale = mysqlTable("flashsale", {
  id: varchar("id", { length: 255 }).primaryKey(),
  isActive: boolean("isActive").default(false).notNull(),
  title: varchar("title", { length: 255 }).default("Flash Sale").notNull(),
  discountPercent: double("discountPercent").default(0).notNull(),
  startDate: datetime("startDate", { mode: "date" }),
  endDate: datetime("endDate", { mode: "date" }),
  countdownSeconds: int("countdownSeconds").default(86400).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 9. heroslide
const heroslide = mysqlTable("heroslide", {
  id: varchar("id", { length: 255 }).primaryKey(),
  image: varchar("image", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }),
  description: text("description"),
  actionText: varchar("actionText", { length: 255 }).default("Shop Now").notNull(),
  link: varchar("link", { length: 255 }).default("/shop").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  order: int("order").default(0).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 10. order
const order = mysqlTable("order", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("orderId", { length: 255 }).notNull().unique(),
  userId: varchar("userId", { length: 255 }),
  guestName: varchar("guestName", { length: 255 }),
  guestEmail: varchar("guestEmail", { length: 255 }),
  guestPhone: varchar("guestPhone", { length: 255 }),
  guestAddress: varchar("guestAddress", { length: 255 }),
  guestCity: varchar("guestCity", { length: 255 }),
  guestZipCode: varchar("guestZipCode", { length: 255 }),
  shippingCharge: double("shippingCharge").notNull(),
  totalAmount: double("totalAmount").notNull(),
  discountAmount: double("discountAmount").default(0),
  couponCode: varchar("couponCode", { length: 255 }),
  paymentMethod: mysqlEnum("paymentMethod", ["cod", "bkash", "nagad"]).default("cod").notNull(),
  senderNumber: varchar("senderNumber", { length: 255 }),
  txId: varchar("txId", { length: 255 }),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  status: mysqlEnum("status", ["received", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"]).default("received").notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 11. orderitem
const orderitem = mysqlTable("orderitem", {
  id: varchar("id", { length: 255 }).primaryKey(),
  productId: varchar("productId", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  variant: varchar("variant", { length: 255 }),
  price: double("price").notNull(),
  orderId: varchar("orderId", { length: 255 }).notNull(),
});

// 12. product
const product = mysqlTable("product", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: double("price").notNull(),
  oldPrice: double("oldPrice"),
  costPrice: double("costPrice").default(0).notNull(),
  packagingCost: double("packagingCost").default(0).notNull(),
  managementCost: double("managementCost").default(0).notNull(),
  otherCost: double("otherCost").default(0).notNull(),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["Live", "Alert", "Draft"]).default("Live").notNull(),
  weight: double("weight").default(0.35).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  rating: double("rating").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  categoryId: varchar("categoryId", { length: 255 }).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 13. productimage
const productimage = mysqlTable("productimage", {
  id: varchar("id", { length: 255 }).primaryKey(),
  url: varchar("url", { length: 255 }).notNull(),
  productId: varchar("productId", { length: 255 }).notNull(),
});

// 14. productvariant
const productvariant = mysqlTable("productvariant", {
  id: varchar("id", { length: 255 }).primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  priceDelta: double("priceDelta").default(0).notNull(),
  stock: int("stock").default(0).notNull(),
  productId: varchar("productId", { length: 255 }).notNull(),
});

// 15. review
const review = mysqlTable("review", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("userId", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  productId: varchar("productId", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 16. settings
const settings = mysqlTable("settings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  phone: varchar("phone", { length: 255 }).default("+880 1700 000000").notNull(),
  email: varchar("email", { length: 255 }).default("hello@siratclothing.com").notNull(),
  address: varchar("address", { length: 255 }).default("Dhaka, Bangladesh").notNull(),
  facebook: varchar("facebook", { length: 255 }).default("https://www.facebook.com/sirat2026").notNull(),
  instagram: varchar("instagram", { length: 255 }).default("https://instagram.com").notNull(),
  whatsapp: varchar("whatsapp", { length: 255 }).default("https://wa.me/8801700000000").notNull(),
  tagline: varchar("tagline", { length: 255 }).default("Purity in Every Step").notNull(),
  description: text("description").default("").notNull(),
  logo: varchar("logo", { length: 255 }).default("").notNull(),
  bkashNumber: varchar("bkashNumber", { length: 255 }).default("").notNull(),
  nagadNumber: varchar("nagadNumber", { length: 255 }).default("").notNull(),
  rocketNumber: varchar("rocketNumber", { length: 255 }).default("").notNull(),
  pinterest: varchar("pinterest", { length: 255 }).default("").notNull(),
  youtube: varchar("youtube", { length: 255 }).default("").notNull(),
  tiktok: varchar("tiktok", { length: 255 }).default("").notNull(),
  twitter: varchar("twitter", { length: 255 }).default("").notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 17. visitor
const visitor = mysqlTable("visitor", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  userId: varchar("userId", { length: 255 }),
  isLoggedIn: boolean("isLoggedIn").default(false).notNull(),
  ip: varchar("ip", { length: 255 }).default("").notNull(),
  userAgent: text("userAgent").notNull(),
  country: varchar("country", { length: 255 }).default("Unknown").notNull(),
  countryCode: varchar("countryCode", { length: 255 }).default("").notNull(),
  city: varchar("city", { length: 255 }).default("Unknown").notNull(),
  region: varchar("region", { length: 255 }).default("").notNull(),
  timezone: varchar("timezone", { length: 255 }).default("").notNull(),
  latitude: double("latitude"),
  longitude: double("longitude"),
  browser: varchar("browser", { length: 255 }).default("Unknown").notNull(),
  browserVersion: varchar("browserVersion", { length: 255 }).default("").notNull(),
  os: varchar("os", { length: 255 }).default("Unknown").notNull(),
  osVersion: varchar("osVersion", { length: 255 }).default("").notNull(),
  device: varchar("device", { length: 255 }).default("desktop").notNull(),
  isMobile: boolean("isMobile").default(false).notNull(),
  isBot: boolean("isBot").default(false).notNull(),
  referrer: text("referrer").default("").notNull(),
  referrerHost: varchar("referrerHost", { length: 255 }).default("").notNull(),
  landingPage: text("landingPage").default("").notNull(),
  screenResolution: varchar("screenResolution", { length: 255 }).default("").notNull(),
  language: varchar("language", { length: 255 }).default("").notNull(),
  pagesViewed: int("pagesViewed").default(1).notNull(),
  eventsCount: int("eventsCount").default(0).notNull(),
  durationMs: int("durationMs").default(0).notNull(),
  lastSeen: datetime("lastSeen", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// 18. _flashsaleproducts (many-to-many join table)
const flashsaleproducts = mysqlTable("_flashsaleproducts", {
  A: varchar("A", { length: 255 }).notNull().references(() => flashsale.id, { onDelete: "cascade" }),
  B: varchar("B", { length: 255 }).notNull().references(() => product.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.A, table.B] }),
}));

// Relationships Definition for Relational Queries API
const userRelations = relations(user, ({ many }) => ({
  addresses: many(address),
  events: many(event),
  orders: many(order),
  reviews: many(review),
  visitors: many(visitor),
}));

const addressRelations = relations(address, ({ one }) => ({
  user: one(user, {
    fields: [address.userId],
    references: [user.id],
  }),
}));

const categoryRelations = relations(category, ({ many }) => ({
  product: many(product),
}));

const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  images: many(productimage),
  variants: many(productvariant),
  reviews: many(review),
  orderitem: many(orderitem),
  flashsaleproducts: many(flashsaleproducts),
}));

const productimageRelations = relations(productimage, ({ one }) => ({
  product: one(product, {
    fields: [productimage.productId],
    references: [product.id],
  }),
}));

const productvariantRelations = relations(productvariant, ({ one }) => ({
  product: one(product, {
    fields: [productvariant.productId],
    references: [product.id],
  }),
}));

const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  orderitem: many(orderitem),
}));

const orderitemRelations = relations(orderitem, ({ one }) => ({
  order: one(order, {
    fields: [orderitem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderitem.productId],
    references: [product.id],
  }),
}));

const reviewRelations = relations(review, ({ one }) => ({
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
}));

const visitorRelations = relations(visitor, ({ one }) => ({
  user: one(user, {
    fields: [visitor.userId],
    references: [user.id],
  }),
}));

const eventRelations = relations(event, ({ one }) => ({
  user: one(user, {
    fields: [event.userId],
    references: [user.id],
  }),
}));

const flashsaleRelations = relations(flashsale, ({ many }) => ({
  flashsaleproducts: many(flashsaleproducts),
}));

const flashsaleproductsRelations = relations(flashsaleproducts, ({ one }) => ({
  flashsale: one(flashsale, {
    fields: [flashsaleproducts.A],
    references: [flashsale.id],
  }),
  product: one(product, {
    fields: [flashsaleproducts.B],
    references: [product.id],
  }),
}));

module.exports = {
  flashsaleproducts,
  user,
  address,
  category,
  contact,
  counter,
  coupon,
  event,
  flashsale,
  heroslide,
  order,
  orderitem,
  passwordresettoken,
  product,
  productimage,
  productvariant,
  review,
  settings,
  visitor,

  userRelations,
  addressRelations,
  categoryRelations,
  productRelations,
  productimageRelations,
  productvariantRelations,
  orderRelations,
  orderitemRelations,
  reviewRelations,
  visitorRelations,
  eventRelations,
  flashsaleRelations,
  flashsaleproductsRelations,
};
