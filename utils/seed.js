const mongoose = require("mongoose");
const env = require("../config/env.config");
const Product = require("../models/product.model");

const products = [
  {
    name: "Oat-Bar Oversized Tee",
    price: 1250,
    oldPrice: 1550,
    costPrice: 550,
    category: "Oversized",
    stock: 45,
    status: "Live",
    featured: true,
    rating: 4.8,
    weight: 0.3,
    description: "Crafted from heavy 260GSM combed cotton, this boxy drop-shoulder tee features a minimalist Oat-Bar screen print on the back. Made for comfort and daily wear.",
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, inStock: true },
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true },
      { label: "XL", priceDelta: 0, inStock: true }
    ]
  },
  {
    name: "Lumina Compression Tee",
    price: 950,
    oldPrice: 1200,
    costPrice: 400,
    category: "Essentials",
    stock: 30,
    status: "Live",
    featured: false,
    rating: 4.5,
    weight: 0.25,
    description: "Premium cotton-spandex blend engineered for maximum durability, breathability, and aesthetic shape-retention during high-performance runs.",
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true },
      { label: "XL", priceDelta: 0, inStock: true }
    ]
  },
  {
    name: "Heavyweight Zip Hoodie",
    price: 2450,
    oldPrice: 2950,
    costPrice: 1100,
    category: "Essentials",
    stock: 20,
    status: "Live",
    featured: true,
    rating: 4.9,
    weight: 0.85,
    description: "Thick 400GSM brushed fleece hoodie featuring a heavy-duty YKK zipper, double-lined hood, and subtle puff print branding. Designed to withstand harsh drops.",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true },
      { label: "XL", priceDelta: 0, inStock: true }
    ]
  },
  {
    name: "Apex Cargo Sweatpants",
    price: 1850,
    oldPrice: 2200,
    costPrice: 850,
    category: "Essentials",
    stock: 25,
    status: "Live",
    featured: false,
    rating: 4.6,
    weight: 0.65,
    description: "Tapered fit streetwear sweatpants crafted from heavyweight terry cotton, complete with deep utility cargo pockets and metal-tipped drawstrings.",
    images: ["https://images.unsplash.com/photo-1551854838-212c50b4c184?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, inStock: true },
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true }
    ]
  },
  {
    name: "Genesis Custom Print Tee",
    price: 1350,
    oldPrice: 1650,
    costPrice: 600,
    category: "Custom Prints",
    stock: 35,
    status: "Live",
    featured: true,
    rating: 4.7,
    weight: 0.32,
    description: "Premium oversized graphic tee featuring our custom Genesis oil-painting digital print on high-density combed cotton. Made to make a statement.",
    images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600"],
    variants: [
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true },
      { label: "XL", priceDelta: 0, inStock: true }
    ]
  },
  {
    name: "Ghost Screen Print Tee",
    price: 1150,
    oldPrice: 1450,
    costPrice: 500,
    category: "Screen Prints",
    stock: 40,
    status: "Live",
    featured: false,
    rating: 4.4,
    weight: 0.28,
    description: "High-density puff ink screen print on a comfortable 220GSM combed cotton base. Features heavy visual drape and clean fit lines.",
    images: ["https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600"],
    variants: [
      { label: "S", priceDelta: 0, inStock: true },
      { label: "M", priceDelta: 0, inStock: true },
      { label: "L", priceDelta: 0, inStock: true }
    ]
  }
];

const seedDB = async () => {
  try {
    if (!env.mongoUri) {
      throw new Error("MONGO_URI environment variable is missing.");
    }
    console.log("Connecting to database...");
    await mongoose.connect(env.mongoUri);
    console.log("Database connected. Clearing existing products...");
    await Product.deleteMany({});
    console.log("Seeding new products...");
    await Product.create(products);
    console.log("Database seeded successfully with premium items!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDB();
