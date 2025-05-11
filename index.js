require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Initialize debug mode
const DEBUG = process.env.DEBUG === "true" || true;

// Enhanced logging
const logger = {
  info: (...args) => console.log(new Date().toISOString(), "[INFO]", ...args),
  error: (...args) =>
    console.error(new Date().toISOString(), "[ERROR]", ...args),
  debug: (...args) => {
    if (DEBUG) {
      console.log(new Date().toISOString(), "[DEBUG]", ...args);
    }
  },
};

// Routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Add file upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    abortOnLimit: true,
  })
);

// Serve static files from public directory
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, "public")));

// Add request logging for debugging
if (DEBUG) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });
}

// Make io available to routes
app.io = io;

// Check if data directory exists, if not create it
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  logger.info("Creating data directory...");
  fs.mkdirSync(dataDir);
}

// Ensure all required data files exist
const ensureDataFile = (filename, initialData) => {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    logger.info(`Creating ${filename} file...`);
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
    return true;
  }
  return false;
};

// Create initial products if needed
ensureDataFile("products.json", [
  {
    id: "1",
    name: "Milk",
    price: 2.99,
    rfidTag: "A1B2C3D4",
    quantity: 20,
  },
  {
    id: "2",
    name: "Bread",
    price: 1.99,
    rfidTag: "E5F6G7H8",
    quantity: 15,
  },
  {
    id: "3",
    name: "Eggs",
    price: 3.49,
    rfidTag: "I9J0K1L2",
    quantity: 30,
  },
  {
    id: "4",
    name: "Cheese",
    price: 4.99,
    rfidTag: "M3N4O5P6",
    quantity: 10,
  },
  {
    id: "5",
    name: "Apples",
    price: 0.99,
    rfidTag: "Q7R8S9T0",
    quantity: 50,
  },
]);

// Create initial users if needed
ensureDataFile("users.json", [
  { id: "1", username: "admin", password: "admin123", role: "admin" },
  {
    id: "2",
    username: "customer",
    password: "customer123",
    role: "customer",
  },
]);

// Create empty carts file if needed
ensureDataFile("carts.json", []);

// Add basic endpoint to check server status
app.get("/api/status", (req, res) => {
  const files = {
    products: fs.existsSync(path.join(dataDir, "products.json")),
    users: fs.existsSync(path.join(dataDir, "users.json")),
    carts: fs.existsSync(path.join(dataDir, "carts.json")),
  };

  res.json({
    status: "ok",
    version: "1.0",
    files,
    env: {
      nodeEnv: process.env.NODE_ENV || "production",
      debug: DEBUG,
      razorpayConfigured: !!process.env.RAZORPAY_KEY_ID,
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);

// Add global error handler middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);

  // Log the full error stack for debugging
  if (DEBUG) {
    console.error("Error stack:", err.stack);
  }

  // Handle common errors
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Your session has expired, please log in again",
      error: "Token expired",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid authentication token",
      error: "Invalid token",
    });
  }

  // Check for file system errors
  if (err.code === "ENOENT") {
    // Try to recover by creating missing data files
    try {
      ensureDataFile("carts.json", []);
      ensureDataFile("products.json", []);
      ensureDataFile("users.json", []);
      logger.info("Recovered from missing data file");
    } catch (recoverError) {
      logger.error("Failed to recover from file system error:", recoverError);
    }

    return res.status(500).json({
      message: "Data file was missing, please try again",
      error: DEBUG ? err.message : "Server error",
    });
  }

  res.status(500).json({
    message: "An unexpected error occurred",
    error: DEBUG ? err.message : "Server error",
  });
});

// Socket.IO for real-time updates
io.on("connection", (socket) => {
  logger.info("New client connected:", socket.id);

  // NodeMCU cart connection
  socket.on("nodemcu_connect", (data) => {
    logger.debug("NodeMCU cart connection request:", data);

    if (!data.deviceId) {
      socket.emit("error", { message: "Device ID is required" });
      return;
    }

    // Store the socket ID for this device for direct communication
    socket.deviceId = data.deviceId;

    // Emit cart connected event to all clients
    io.emit("cart_connected", {
      success: true,
      deviceId: data.deviceId,
      message: "Physical cart connected successfully",
    });

    // Acknowledge the connection
    socket.emit("nodemcu_connection_success", {
      deviceId: data.deviceId,
      message: "Successfully connected to server",
    });
    3.366
  });

  // NodeMCU RFID scan event (when the physical cart scans a product)
  socket.on("nodemcu_rfid_scan", (data) => {
    console.log("NodeMCU RFID scan:", data);

    if (!data.rfidTag || !data.deviceId) {
      socket.emit("error", { message: "RFID tag and device ID are required" });
      return;
    }

    // Find the cart associated with this device
    const carts = JSON.parse(fs.readFileSync(path.join(dataDir, "carts.json")));
    const cart = carts.find((cart) => cart.deviceId === data.deviceId);

    if (!cart) {
      socket.emit("error", { message: "No cart found for this device" });
      return;
    }

    // Find the product by RFID tag
    const products = JSON.parse(
      fs.readFileSync(path.join(dataDir, "products.json"))
    );
    const product = products.find((p) => p.rfidTag === data.rfidTag);

    if (!product) {
      socket.emit("error", { message: "Product not found" });
      io.emit("product_not_found", {
        deviceId: data.deviceId,
        rfidTag: data.rfidTag,
      });
      return;
    }

    // Process the scan with default action "add"
    const action = data.action || "add";

    // Update cart and emit product scanned event
    processRfidScan(product, action, cart.userId, cart.deviceId);
  });

  // Listen for RFID scans
  socket.on("rfid_scan", (data) => {
    console.log("RFID scan received:", data);

    // Read products from JSON file
    const products = JSON.parse(
      fs.readFileSync(path.join(dataDir, "products.json"))
    );

    // Find product with matching RFID tag
    const product = products.find((p) => p.rfidTag === data.rfidTag);

    if (product) {
      processRfidScan(product, data.action, data.userId, data.deviceId);
    } else {
      socket.emit("error", { message: "Product not found" });
    }
  });

  // Listen for inventory updates
  socket.on("inventory_update", (data) => {
    console.log("Inventory update received:", data);

    // Update product quantity
    const products = JSON.parse(
      fs.readFileSync(path.join(dataDir, "products.json"))
    );
    const productIndex = products.findIndex((p) => p.id === data.productId);

    if (productIndex !== -1) {
      products[productIndex].quantity = data.quantity;
      fs.writeFileSync(
        path.join(dataDir, "products.json"),
        JSON.stringify(products)
      );

      // Emit updated inventory to all clients
      io.emit("inventory_updated", { products });
    }
  });

  // Listen for payment events
  socket.on("payment_completed", (data) => {
    console.log("Payment completed:", data);

    // Clear the user's cart
    const carts = JSON.parse(fs.readFileSync(path.join(dataDir, "carts.json")));
    const cartIndex = carts.findIndex((cart) => cart.userId === data.userId);

    if (cartIndex !== -1) {
      // Update inventory quantities
      const products = JSON.parse(
        fs.readFileSync(path.join(dataDir, "products.json"))
      );

      carts[cartIndex].items.forEach((item) => {
        const productIndex = products.findIndex((p) => p.id === item.id);
        if (productIndex !== -1) {
          products[productIndex].quantity -= item.quantity;
        }
      });

      // Save updated inventory
      fs.writeFileSync(
        path.join(dataDir, "products.json"),
        JSON.stringify(products)
      );

      // Remove the cart
      carts.splice(cartIndex, 1);
      fs.writeFileSync(path.join(dataDir, "carts.json"), JSON.stringify(carts));

      // Emit updates
      io.emit("cart_updated", { userId: data.userId, carts });
      io.emit("inventory_updated", { products });
    }
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected:", socket.id);

    // If this was a NodeMCU device, notify clients
    if (socket.deviceId) {
      io.emit("cart_disconnected", {
        deviceId: socket.deviceId,
        message: "Physical cart disconnected",
      });
    }
  });
});

// Helper function to process RFID scans and update carts
function processRfidScan(product, action, userId, deviceId = null) {
  // Emit product details to all connected clients
  io.emit("product_scanned", { product, action, deviceId });

  // Update cart based on action (add/remove)
  const carts = JSON.parse(fs.readFileSync(path.join(dataDir, "carts.json")));
  const cartIndex = carts.findIndex((cart) => cart.userId === userId);

  if (cartIndex === -1 && action === "add") {
    // Create new cart if it doesn't exist
    carts.push({
      id: `cart_${Date.now()}`,
      userId: userId,
      deviceId: deviceId,
      items: [{ ...product, quantity: 1 }],
      total: product.price,
    });
  } else if (cartIndex !== -1) {
    const cart = carts[cartIndex];
    // Add deviceId to cart if provided
    if (deviceId && !cart.deviceId) {
      cart.deviceId = deviceId;
    }

    const itemIndex = cart.items.findIndex((item) => item.id === product.id);

    if (action === "add") {
      if (itemIndex === -1) {
        cart.items.push({ ...product, quantity: 1 });
      } else {
        cart.items[itemIndex].quantity += 1;
      }
      cart.total = parseFloat((cart.total + product.price).toFixed(2));
    } else if (action === "remove" && itemIndex !== -1) {
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        cart.items.splice(itemIndex, 1);
      }
      cart.total = parseFloat((cart.total - product.price).toFixed(2));

      // Remove cart if empty
      if (cart.items.length === 0) {
        carts.splice(cartIndex, 1);
      }
    }
  }

  fs.writeFileSync(path.join(dataDir, "carts.json"), JSON.stringify(carts));

  // Emit updated cart to all clients
  io.emit("cart_updated", { userId: userId, carts });
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
