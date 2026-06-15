const { connectDB } = require("../config/db.config");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Review = require("../models/review.model");
const mongoose = require("mongoose");

const categories = [
  {
    name: "Oversized",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600",
    featured: true,
  },
  {
    name: "Custom Prints",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600",
    featured: true,
  },
  {
    name: "Screen Prints",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600",
    featured: true,
  },
  {
    name: "Essentials",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
    featured: true,
  },
];

const products = [
  {
    name: "Oat-Bar Oversized Tee",
    price: 1250,
    oldPrice: 1550,
    costPrice: 550,
    packagingCost: 30,
    managementCost: 20,
    otherCost: 10,
    categoryName: "Oversized",
    stock: 45,
    status: "Live",
    featured: true,
    rating: 4.8,
    weight: 0.3,
    description:
      "Crafted from heavy 260GSM combed cotton, this boxy drop-shoulder tee features a minimalist Oat-Bar screen print on the back. Made for comfort and daily wear.",
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, stock: 10 },
      { label: "M", priceDelta: 0, stock: 12 },
      { label: "L", priceDelta: 0, stock: 15 },
      { label: "XL", priceDelta: 0, stock: 8 },
    ],
  },
  {
    name: "Lumina Compression Tee",
    price: 950,
    oldPrice: 1200,
    costPrice: 400,
    packagingCost: 25,
    managementCost: 15,
    otherCost: 10,
    categoryName: "Essentials",
    stock: 30,
    status: "Live",
    featured: false,
    rating: 4.5,
    weight: 0.25,
    description:
      "Premium cotton-spandex blend engineered for maximum durability, breathability, and aesthetic shape-retention during high-performance runs.",
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, stock: 10 },
      { label: "L", priceDelta: 0, stock: 10 },
      { label: "XL", priceDelta: 0, stock: 10 },
    ],
  },
  {
    name: "Heavyweight Zip Hoodie",
    price: 2450,
    oldPrice: 2950,
    costPrice: 1100,
    packagingCost: 50,
    managementCost: 30,
    otherCost: 15,
    categoryName: "Essentials",
    stock: 20,
    status: "Live",
    featured: true,
    rating: 4.9,
    weight: 0.85,
    description:
      "Thick 400GSM brushed fleece hoodie featuring a heavy-duty YKK zipper, double-lined hood, and subtle puff print branding. Designed to withstand harsh drops.",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, stock: 5 },
      { label: "L", priceDelta: 0, stock: 10 },
      { label: "XL", priceDelta: 0, stock: 5 },
    ],
  },
  {
    name: "Apex Cargo Sweatpants",
    price: 1850,
    oldPrice: 2200,
    costPrice: 850,
    packagingCost: 40,
    managementCost: 25,
    otherCost: 10,
    categoryName: "Essentials",
    stock: 25,
    status: "Live",
    featured: false,
    rating: 4.6,
    weight: 0.65,
    description:
      "Tapered fit streetwear sweatpants crafted from heavyweight terry cotton, complete with deep utility cargo pockets and metal-tipped drawstrings.",
    images: ["https://images.unsplash.com/photo-1551854838-212c50b4c184?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, stock: 5 },
      { label: "M", priceDelta: 0, stock: 10 },
      { label: "L", priceDelta: 0, stock: 10 },
    ],
  },
  {
    name: "Genesis Custom Print Tee",
    price: 1350,
    oldPrice: 1650,
    costPrice: 600,
    packagingCost: 35,
    managementCost: 20,
    otherCost: 15,
    categoryName: "Custom Prints",
    stock: 35,
    status: "Live",
    featured: true,
    rating: 4.7,
    weight: 0.32,
    description:
      "Premium oversized graphic tee featuring our custom Genesis oil-painting digital print on high-density combed cotton. Made to make a statement.",
    images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, stock: 15 },
      { label: "L", priceDelta: 0, stock: 10 },
      { label: "XL", priceDelta: 0, stock: 10 },
    ],
  },
  {
    name: "Ghost Screen Print Tee",
    price: 1150,
    oldPrice: 1450,
    costPrice: 500,
    packagingCost: 30,
    managementCost: 20,
    otherCost: 10,
    categoryName: "Screen Prints",
    stock: 40,
    status: "Live",
    featured: false,
    rating: 4.4,
    weight: 0.28,
    description:
      "High-density puff ink screen print on a comfortable 220GSM combed cotton base. Features heavy visual drape and clean fit lines.",
    images: ["https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, stock: 10 },
      { label: "M", priceDelta: 0, stock: 20 },
      { label: "L", priceDelta: 0, stock: 10 },
    ],
  },
];

const seedDB = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected. Clearing existing orders, reviews, products, and categories...");

    await Order.deleteMany({});
    await Review.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});

    console.log("Seeding new categories...");
    const categoryMap = {};
    for (const cat of categories) {
      const createdCat = await Category.create({
        name: cat.name,
        image: cat.image,
        featured: cat.featured,
      });
      categoryMap[cat.name] = createdCat._id;
    }

    console.log("Seeding new products...");
    for (const prod of products) {
      const { categoryName, images, variants, ...rest } = prod;
      const slug = prod.name
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");

      const mappedImages = images.map((img) => ({ url: img }));

      await Product.create({
        ...rest,
        slug,
        categoryId: categoryMap[categoryName],
        images: mappedImages,
        variants: variants,
      });
    }

    console.log("Database seeded successfully with premium items and categories!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDB();
