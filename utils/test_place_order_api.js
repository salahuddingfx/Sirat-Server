async function run() {
  try {
    const payload = {
      guestInfo: {
        name: "Salahuddin",
        email: "salahuddin@example.com",
        phone: "01711223344",
        address: "Banani, Dhaka",
        city: "Dhaka"
      },
      items: [
        {
          product: "6a1d37fdfadc75231e0c3bc6", // Oat-Bar Oversized Tee
          quantity: 1,
          variant: "M",
          price: 1250
        }
      ],
      shippingCharge: 120,
      totalAmount: 1370,
      paymentMethod: "cod"
    };

    console.log("Sending guest checkout POST request to http://localhost:5000/api/orders...");
    const res = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
