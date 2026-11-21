const express = require("express");

const productRoutes = require("./routes/productRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Inventory and Data Management System API is running.",
    endpoints: "/api/products",
  });
});

app.use("/api/products", productRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
