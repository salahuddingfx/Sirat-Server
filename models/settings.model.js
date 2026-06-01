const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    phone: { type: String, default: "+880 1700 000000" },
    email: { type: String, default: "hello@siratclothing.com" },
    address: { type: String, default: "Dhaka, Bangladesh" },
    facebook: { type: String, default: "https://www.facebook.com/sirat2026" },
    instagram: { type: String, default: "https://instagram.com" },
    whatsapp: { type: String, default: "https://wa.me/8801700000000" },
    tagline: { type: String, default: "Purity in Every Step" },
    description: { type: String, default: "আপনার পোশাকে আসুক শুদ্ধতার ছোঁয়া। আমরা বিশ্বাস করি কোয়ালিটি এবং সততায়। imported premium fabric এবং 100% combed cotton এ তৈরি কাস্টম প্রিন্টেড টি-শার্টের নির্ভরযোগ্য ঠিকানা।" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
