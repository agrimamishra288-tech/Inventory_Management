const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const SORTABLE_FIELDS = [
  "name",
  "sku",
  "category",
  "price",
  "quantity",
  "reorderLevel",
  "createdAt",
  "updatedAt",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = (query) => {
  const filter = {};

  if (query.category) {
    filter.category = new RegExp(`^${escapeRegex(query.category.trim())}$`, "i");
  }
  if (query.supplier) {
    filter.supplier = new RegExp(`^${escapeRegex(query.supplier.trim())}$`, "i");
  }
  if (query.name) {
    filter.name = new RegExp(escapeRegex(query.name.trim()), "i");
  }
  if (query.sku) {
    filter.sku = query.sku.trim().toUpperCase();
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: pattern }, { sku: pattern }, { supplier: pattern }];
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      const minPrice = Number(query.minPrice);
      if (Number.isNaN(minPrice)) {
        throw new ApiError(400, "minPrice must be a number");
      }
      filter.price.$gte = minPrice;
    }
    if (query.maxPrice !== undefined) {
      const maxPrice = Number(query.maxPrice);
      if (Number.isNaN(maxPrice)) {
        throw new ApiError(400, "maxPrice must be a number");
      }
      filter.price.$lte = maxPrice;
    }
  }

  if (query.inStock !== undefined) {
    if (!["true", "false"].includes(query.inStock)) {
      throw new ApiError(400, "inStock must be true or false");
    }
    filter.quantity = query.inStock === "true" ? { $gt: 0 } : 0;
  }

  if (query.lowStock !== undefined) {
    if (!["true", "false"].includes(query.lowStock)) {
      throw new ApiError(400, "lowStock must be true or false");
    }
    if (query.lowStock === "true") {
      filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    }
  }

  return filter;
};

const buildSort = (query) => {
  let field = "createdAt";
  let direction = -1;

  if (query.sort) {
    const raw = String(query.sort);
    const descending = raw.startsWith("-");
    field = descending ? raw.slice(1) : raw;
    direction = descending ? -1 : 1;

    if (!field || !SORTABLE_FIELDS.includes(field)) {
      throw new ApiError(
        400,
        `Cannot sort by '${field}'. Allowed fields: ${SORTABLE_FIELDS.join(", ")}`
      );
    }
  }

  if (query.order !== undefined) {
    if (!["asc", "desc"].includes(query.order)) {
      throw new ApiError(400, "order must be asc or desc");
    }
    direction = query.order === "desc" ? -1 : 1;
  }

  return { [field]: direction };
};

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

const getProducts = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const sort = buildSort(req.query);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.status(200).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({ message: "Product deleted", id: product._id });
});

const adjustStock = asyncHandler(async (req, res) => {
  const { change } = req.body;

  const filter = { _id: req.params.id };
  if (change < 0) {
    filter.quantity = { $gte: -change };
  }

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { new: true, runValidators: true }
  );

  if (!product) {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      throw new ApiError(404, "Product not found");
    }
    throw new ApiError(
      400,
      `Insufficient stock. Available quantity is ${existing.quantity}.`
    );
  }

  res.status(200).json({ message: "Stock updated", product });
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.aggregate([
    { $match: { $expr: { $lte: ["$quantity", "$reorderLevel"] } } },
    {
      $addFields: {
        id: { $toString: "$_id" },
        stockValue: { $multiply: ["$price", "$quantity"] },
        shortfall: { $subtract: ["$reorderLevel", "$quantity"] },
      },
    },
    { $sort: { quantity: 1, name: 1 } },
    { $project: { __v: 0 } },
  ]);

  res.status(200).json({
    count: lowStockItems.length,
    lowStockItems,
  });
});

const getCategorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        avgPrice: { $avg: "$price" },
      },
    },
    { $sort: { totalStockValue: -1, _id: 1 } },
    {
      $project: {
        _id: 1,
        totalItems: 1,
        totalQuantity: 1,
        totalStockValue: 1,
        avgPrice: { $round: ["$avgPrice", 2] },
      },
    },
  ]);

  res.status(200).json({
    categories: summary.length,
    summary,
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary,
};
