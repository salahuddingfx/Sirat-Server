async function run() {
  try {
    const slug = "genesis-custom-print-tee";
    console.log(`Sending GET request to http://localhost:5000/api/products/${slug}...`);
    const res = await fetch(`http://localhost:5000/api/products/${slug}`);
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
