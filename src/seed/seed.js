require("dotenv").config();

const mongoose = require("mongoose");

const Product = require("../models/Product");

const products = [
  {
    name: "Wireless Mouse",
    sku: "ELEC-WM-101",
    category: "Electronics",
    price: 1299,
    quantity: 40,
    reorderLevel: 10,
    supplier: "Logitech",
  },
  {
    name: "Mechanical Keyboard",
    sku: "ELEC-KB-204",
    category: "Electronics",
    price: 3499,
    quantity: 25,
    reorderLevel: 8,
    supplier: "Corsair",
  },
  {
    name: "24-inch LED Monitor",
    sku: "ELEC-MN-318",
    category: "Electronics",
    price: 8999,
    quantity: 18,
    reorderLevel: 5,
    supplier: "Samsung",
  },
  {
    name: "Bluetooth Speaker",
    sku: "ELEC-BS-127",
    category: "Electronics",
    price: 6499,
    quantity: 13,
    reorderLevel: 6,
    supplier: "JBL",
  },
  {
    name: "Cotton T-Shirt",
    sku: "APRL-TS-501",
    category: "Apparel",
    price: 599,
    quantity: 50,
    reorderLevel: 15,
    supplier: "H&M",
  },
  {
    name: "Denim Jeans",
    sku: "APRL-DJ-502",
    category: "Apparel",
    price: 1899,
    quantity: 28,
    reorderLevel: 10,
    supplier: "Levi's",
  },
  {
    name: "Study Table",
    sku: "FURN-TB-812",
    category: "Furniture",
    price: 3999,
    quantity: 2,
    reorderLevel: 4,
    supplier: "IKEA India",
  },
  {
    name: "Office Chair",
    sku: "FURN-OC-615",
    category: "Furniture",
    price: 5499,
    quantity: 12,
    reorderLevel: 6,
    supplier: "Godrej Interio",
  },
  {
    name: "Gel Pen Pack of 15",
    sku: "STNY-PN-713",
    category: "Stationery",
    price: 120,
    quantity: 40,
    reorderLevel: 20,
    supplier: "Cello Pens",
  },
  {
    name: "A4 Notebook - 200 Pages",
    sku: "STNY-NB-208",
    category: "Stationery",
    price: 80,
    quantity: 8,
    reorderLevel: 25,
    supplier: "Classmate",
  },
  {
    name: "Highlighter Set of 5",
    sku: "STNY-HL-117",
    category: "Stationery",
    price: 249,
    quantity: 3,
    reorderLevel: 10,
    supplier: "Faber-Castell",
  },
  {
    name: "Yoga Mat 6mm",
    sku: "SPTS-YM-404",
    category: "Sports",
    price: 899,
    quantity: 14,
    reorderLevel: 20,
    supplier: "Boldfit",
  },
];

const seed = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/inventory_db"
    );

    await Product.deleteMany({});
    const created = await Product.insertMany(products);
    const categories = new Set(created.map((product) => product.category));

    console.log(`Seeded ${created.length} products across ${categories.size} categories.`);
    await mongoose.connection.close();
  } catch (error) {
    console.error("Seeding failed:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seed();
