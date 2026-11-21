# Inventory and Data Management System API

Lab Assignment 3 (Web Dev III, Unit 3) — a RESTful backend that lets a store or warehouse manage its product catalogue: create products, update stock, search and filter the catalogue, and generate inventory reports using Mongoose schema validation and MongoDB aggregation.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose (schema, validation, querying)
- dotenv (environment variables)
- nodemon (development-only tool for automatic server restart)

Only the required runtime libraries (Express, Mongoose, dotenv) are used; nodemon is a dev-only tool.

## Project Structure

```
assignment-3/
├── server.js                      # Loads .env, connects to MongoDB, starts Express
├── src/
│   ├── app.js                     # Express app, routes, error middleware
│   ├── config/db.js               # Mongoose connection
│   ├── models/Product.js          # Product schema with field-level validation
│   ├── controllers/productController.js
│   ├── routes/productRoutes.js
│   ├── middleware/
│   │   ├── validateProduct.js     # Input validation middleware
│   │   └── errorHandler.js        # 404 + centralized error handling
│   ├── utils/                     # ApiError, asyncHandler
│   └── seed/seed.js               # Optional sample data (12 products, 5 categories)
├── postman/Inventory_API.postman_collection.json
├── .env.example
└── package.json
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` (already provided for local development):

   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
   ```

3. Make sure MongoDB is running locally.

4. Start the server:

   ```bash
   npm start
   # or, during development (nodemon restarts on file changes)
   npm run dev
   ```

5. Optional — load sample data (12 products across 5 categories; this clears the products collection first):

   ```bash
   npm run seed
   ```

The API is served at `http://localhost:5000/api/products`.

## Product Schema

| Field          | Type   | Validation                                                    |
| -------------- | ------ | ------------------------------------------------------------- |
| `name`         | String | required, trimmed, 2–120 characters                           |
| `sku`          | String | required, unique, trimmed, uppercased, letters/numbers/hyphens |
| `category`     | String | required, trimmed, at least 2 characters                      |
| `price`        | Number | required, cannot be negative                                  |
| `quantity`     | Number | required, whole number, cannot be negative                    |
| `reorderLevel` | Number | whole number, cannot be negative, defaults to `5`             |
| `supplier`     | String | required, trimmed, at least 2 characters                      |
| `createdAt` / `updatedAt` | Date | added automatically by Mongoose timestamps        |
| `stockValue`   | Number | virtual: `price × quantity`                                   |
| `id`           | String | virtual alias for `_id`                                       |

`stockValue` and `id` are included in every JSON response via `toJSON` virtuals.

## Endpoints

| Method | Endpoint                       | Description                                   |
| ------ | ------------------------------ | --------------------------------------------- |
| POST   | `/api/products`                | Create a product (`201 Created`)              |
| GET    | `/api/products`                | List products with filtering, sorting, pagination |
| GET    | `/api/products/:id`            | Get a single product                          |
| PUT    | `/api/products/:id`            | Update product details (partial update supported) |
| DELETE | `/api/products/:id`            | Delete a product                              |
| PATCH  | `/api/products/:id/stock`      | Safely restock/sell stock (`change` can be + or −) |
| GET    | `/api/products/low-stock`      | Products where `quantity <= reorderLevel`     |
| GET    | `/api/products/summary`        | Category-wise inventory summary (aggregation) |
| GET    | `/api/products/reports/low-stock` | Alias of the low-stock report              |
| GET    | `/api/products/reports/category-summary` | Alias of the category summary      |

### Create a product

```http
POST /api/products
Content-Type: application/json

{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

Response `201 Created`:

```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens",
  "_id": "6a547727f6123427d6e61d7c",
  "createdAt": "2026-07-13T05:27:03.054Z",
  "updatedAt": "2026-07-13T05:27:03.054Z",
  "__v": 0,
  "stockValue": 4800,
  "id": "6a547727f6123427d6e61d7c"
}
```

### List products — filtering, sorting, pagination

```http
GET /api/products?category=Stationery&minPrice=50&maxPrice=500&sort=price&order=asc&page=1&limit=10
```

Supported query parameters:

| Parameter  | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `category` | Case-insensitive exact category                                     |
| `supplier` | Case-insensitive exact supplier                                     |
| `name`     | Case-insensitive partial name match                                |
| `sku`      | Exact SKU (case-insensitive)                                        |
| `search`   | Case-insensitive partial match across name, SKU and supplier       |
| `minPrice` / `maxPrice` | Price range                                         |
| `inStock`  | `true` (quantity > 0) or `false` (quantity = 0)                    |
| `lowStock` | `true` to return only products at or below reorder level           |
| `sort`     | `name`, `sku`, `category`, `price`, `quantity`, `reorderLevel`, `createdAt`, `updatedAt`; prefix with `-` for descending |
| `order`    | `asc` or `desc` (overrides the `-` prefix)                          |
| `page`     | Page number, default `1`                                           |
| `limit`    | Page size, default `10`, maximum `100`                             |

Response `200 OK`:

```json
{
  "total": 12,
  "page": 1,
  "totalPages": 2,
  "count": 10,
  "products": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "createdAt": "2026-07-13T05:24:10.351Z",
      "updatedAt": "2026-07-13T05:24:10.351Z",
      "__v": 0,
      "stockValue": 7998,
      "id": "6a54767af6123427d6e61d76"
    }
  ]
}
```

### Update a product

`PUT /api/products/:id` accepts any subset of the product fields and returns the updated product (`200 OK`).

### Adjust stock

```http
PATCH /api/products/:id/stock
Content-Type: application/json

{ "change": 10 }
```

- Positive `change` restocks, negative `change` sells stock.
- The update is atomic: a sale that would drop quantity below zero is rejected with `400` and the stock is left unchanged.
- Response `200 OK`:

```json
{
  "message": "Stock updated",
  "product": { "...": "updated product including stockValue and id" }
}
```

### Delete a product

Response `200 OK`:

```json
{ "message": "Product deleted", "id": "6a547727f6123427d6e61d7c" }
```

### Low-stock report

```http
GET /api/products/low-stock
```

Also available at `GET /api/products/reports/low-stock` with the same response.

Built with a MongoDB aggregation pipeline (`$match` + `$expr`, `$addFields`, `$sort`, `$project`); each item includes `shortfall` (`reorderLevel − quantity`).

Response `200 OK` — products where `quantity <= reorderLevel`, sorted by quantity:

```json
{
  "count": 4,
  "lowStockItems": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "stockValue": 7998,
      "shortfall": 2,
      "id": "6a54767af6123427d6e61d76"
    }
  ]
}
```

### Category-wise inventory summary

```http
GET /api/products/summary
```

Also available at `GET /api/products/reports/category-summary` with the same response.

Uses a MongoDB aggregation pipeline (`$group`, `$sum`, `$multiply`, `$avg`, `$sort`, `$project`).

Response `200 OK`:

```json
{
  "categories": 5,
  "summary": [
    {
      "_id": "Electronics",
      "totalItems": 4,
      "totalQuantity": 96,
      "totalStockValue": 343904,
      "avgPrice": 5636.5
    },
    {
      "_id": "Apparel",
      "totalItems": 2,
      "totalQuantity": 78,
      "totalStockValue": 75522,
      "avgPrice": 1399
    }
  ]
}
```

## Validation, Errors and Environment

- Field-level validation lives in the Mongoose schema; request-shape validation is handled by middleware before the controller runs.
- Unknown fields, wrong types, negative values and invalid query parameters are rejected with `400`.
- Duplicate SKUs return `409`.
- Invalid product IDs return `400`; missing products return `404`.
- All errors flow through one centralized error handler and share the shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["price cannot be negative"]
}
```

- Configuration is read from `.env` (`PORT`, `MONGO_URI`); `.env` is git-ignored.

## Postman

Import `postman/Inventory_API.postman_collection.json` into Postman. It contains all eight requests and uses `baseUrl` and `productId` collection variables.

## npm Scripts

| Script        | Description                                  |
| ------------- | -------------------------------------------- |
| `npm start`   | Start the API server                         |
| `npm run dev` | Start with nodemon (auto-restart on file changes) |
| `npm run seed`| Load 12 sample products across 5 categories  |
