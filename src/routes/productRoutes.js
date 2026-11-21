const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary,
} = require("../controllers/productController");
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateStockChange,
} = require("../middleware/validateProduct");

const router = express.Router();

router.route("/").get(getProducts).post(validateCreateProduct, createProduct);

router.get("/low-stock", getLowStockProducts);
router.get("/summary", getCategorySummary);
router.get("/reports/low-stock", getLowStockProducts);
router.get("/reports/category-summary", getCategorySummary);

router.patch("/:id/stock", validateStockChange, adjustStock);

router
  .route("/:id")
  .get(getProductById)
  .put(validateUpdateProduct, updateProduct)
  .delete(deleteProduct);

module.exports = router;
