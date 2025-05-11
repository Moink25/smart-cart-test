const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const authRoutes = require("./auth");

// Get products from file
const getProductsFromFile = () => {
  const productsFilePath = path.join(__dirname, "..", "data", "products.json");
  if (fs.existsSync(productsFilePath)) {
    return JSON.parse(fs.readFileSync(productsFilePath));
  }
  return [];
};

// Save products to file
const saveProductsToFile = (products) => {
  const productsFilePath = path.join(__dirname, "..", "data", "products.json");
  fs.writeFileSync(productsFilePath, JSON.stringify(products));
};

// Admin middleware - checks if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
  next();
};

// Get all products
router.get("/", (req, res) => {
  const products = getProductsFromFile();
  res.json(products);
});

// Get product by ID
router.get("/:id", (req, res) => {
  const products = getProductsFromFile();
  const product = products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
});

// Create new product (admin only)
router.post("/", authRoutes.authenticateToken, isAdmin, (req, res) => {
  const { name, price, rfidTag, quantity } = req.body;

  if (!name || !price || !rfidTag || quantity === undefined) {
    return res
      .status(400)
      .json({ message: "Name, price, RFID tag, and quantity are required" });
  }

  const products = getProductsFromFile();

  // Check if RFID tag already exists
  if (products.some((p) => p.rfidTag === rfidTag)) {
    return res
      .status(400)
      .json({ message: "Product with this RFID tag already exists" });
  }

  // Generate new ID
  const newId = (
    Math.max(...products.map((p) => parseInt(p.id)), 0) + 1
  ).toString();

  const newProduct = {
    id: newId,
    name,
    price: parseFloat(price),
    rfidTag,
    quantity: parseInt(quantity),
  };

  products.push(newProduct);
  saveProductsToFile(products);

  res.status(201).json(newProduct);
});

// Update product (admin only)
router.put("/:id", authRoutes.authenticateToken, isAdmin, (req, res) => {
  const { name, price, rfidTag, quantity } = req.body;
  const products = getProductsFromFile();
  const productIndex = products.findIndex((p) => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Check if RFID tag already exists on another product
  if (
    rfidTag &&
    products.some((p) => p.rfidTag === rfidTag && p.id !== req.params.id)
  ) {
    return res
      .status(400)
      .json({ message: "Another product with this RFID tag already exists" });
  }

  // Update product
  products[productIndex] = {
    ...products[productIndex],
    name: name || products[productIndex].name,
    price:
      price !== undefined ? parseFloat(price) : products[productIndex].price,
    rfidTag: rfidTag || products[productIndex].rfidTag,
    quantity:
      quantity !== undefined
        ? parseInt(quantity)
        : products[productIndex].quantity,
  };

  saveProductsToFile(products);

  res.json(products[productIndex]);
});

// Delete product (admin only)
router.delete("/:id", authRoutes.authenticateToken, isAdmin, (req, res) => {
  const products = getProductsFromFile();
  const productIndex = products.findIndex((p) => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  const deletedProduct = products[productIndex];
  products.splice(productIndex, 1);

  saveProductsToFile(products);

  res.json({
    message: "Product deleted successfully",
    product: deletedProduct,
  });
});

// Get product by RFID tag
router.get("/rfid/:tag", (req, res) => {
  const products = getProductsFromFile();
  const product = products.find((p) => p.rfidTag === req.params.tag);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
});

module.exports = router;
