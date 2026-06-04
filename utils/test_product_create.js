const { connectDB, pool } = require("../config/db.config");
const productService = require("../service/product.service");

async function test() {
  try {
    await connectDB();
    console.log("Connected to DB, running product creation test...");
    
    const uniqueName = `Orbit Tee Test ${Date.now()}`;
    const dummyProductData = {
      name: uniqueName,
      description: "This is a test description for Orbit Tee which is at least 10 chars",
      price: "499",
      oldPrice: "599",
      costPrice: "200",
      packagingCost: "20",
      managementCost: "30",
      otherCost: "10",
      category: "T-Shirt",
      featured: "false",
      status: "Live",
      keepImages: "[]",
      variants: [{ label: "M", priceDelta: 0, stock: 10 }]
    };

    console.log(`Creating product with name: ${uniqueName}...`);
    const result = await productService.createProduct(dummyProductData);
    console.log("Product creation succeeded!", result);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Product creation test failed with error:", err);
    await pool.end();
    process.exit(1);
  }
}

test();
