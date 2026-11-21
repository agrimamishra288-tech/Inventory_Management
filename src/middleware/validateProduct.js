const ApiError = require("../utils/ApiError");

const ALLOWED_FIELDS = ["name", "sku", "category", "price", "quantity", "reorderLevel", "supplier"];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const collectProductErrors = (body, { partial }) => {
  if (!isPlainObject(body)) {
    return ["Request body must be a JSON object"];
  }

  const errors = [];
  const fields = Object.keys(body);

  const unknown = fields.filter((field) => !ALLOWED_FIELDS.includes(field));
  if (unknown.length > 0) {
    errors.push(`Unknown field(s): ${unknown.join(", ")}`);
  }

  if (partial) {
    if (fields.length === 0) {
      errors.push("Provide at least one field to update");
    }
  } else {
    ["name", "sku", "category", "price", "quantity", "supplier"].forEach((field) => {
      if (body[field] === undefined) {
        errors.push(`${field} is required`);
      }
    });
  }

  ["name", "sku", "category", "supplier"].forEach((field) => {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].trim() === "") {
        errors.push(`${field} must be a non-empty string`);
      }
    }
  });

  if (typeof body.sku === "string" && !/^[A-Za-z0-9-]+$/.test(body.sku.trim())) {
    errors.push("sku may only contain letters, numbers and hyphens");
  }

  ["price", "quantity", "reorderLevel"].forEach((field) => {
    if (body[field] === undefined) return;

    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${field} must be a number`);
      return;
    }
    if (value < 0) {
      errors.push(`${field} cannot be negative`);
    }
    if (field !== "price" && !Number.isInteger(value)) {
      errors.push(`${field} must be a whole number`);
    }
  });

  return errors;
};

const validateCreateProduct = (req, res, next) => {
  const errors = collectProductErrors(req.body, { partial: false });
  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }
  next();
};

const validateUpdateProduct = (req, res, next) => {
  const errors = collectProductErrors(req.body, { partial: true });
  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }
  next();
};

const validateStockChange = (req, res, next) => {
  const body = req.body;
  const errors = [];

  if (!isPlainObject(body)) {
    errors.push("Request body must be a JSON object");
  } else {
    const unknown = Object.keys(body).filter((field) => field !== "change");
    if (unknown.length > 0) {
      errors.push(`Unknown field(s): ${unknown.join(", ")}`);
    }

    if (!Number.isInteger(body.change)) {
      errors.push("change must be a whole number");
    } else if (body.change === 0) {
      errors.push("change cannot be zero");
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }
  next();
};

module.exports = { validateCreateProduct, validateUpdateProduct, validateStockChange };
