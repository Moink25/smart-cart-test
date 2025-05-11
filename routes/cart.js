const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const authRoutes = require("./auth");

// Get carts from file
const getCartsFromFile = () => {
  const cartsFilePath = path.join(__dirname, "..", "data", "carts.json");
  if (fs.existsSync(cartsFilePath)) {
    return JSON.parse(fs.readFileSync(cartsFilePath));
  }
  return [];
};

// Save carts to file
const saveCartsToFile = (carts) => {
  const cartsFilePath = path.join(__dirname, "..", "data", "carts.json");
  fs.writeFileSync(cartsFilePath, JSON.stringify(carts));
};

// Get products from file
const getProductsFromFile = () => {
  const productsFilePath = path.join(__dirname, "..", "data", "products.json");
  if (fs.existsSync(productsFilePath)) {
    return JSON.parse(fs.readFileSync(productsFilePath));
  }
  return [];
};

// Get users from file
const getUsersFromFile = () => {
  const usersFilePath = path.join(__dirname, "..", "data", "users.json");
  if (fs.existsSync(usersFilePath)) {
    return JSON.parse(fs.readFileSync(usersFilePath));
  }
  return [];
};

// Save products to file
const saveProductsToFile = (products) => {
  const productsFilePath = path.join(__dirname, "..", "data", "products.json");
  fs.writeFileSync(productsFilePath, JSON.stringify(products));
};

// Get user's cart or create it if it doesn't exist
const getUserCart = (userId) => {
  const carts = getCartsFromFile();
  let cart = carts.find((cart) => cart.userId === userId);

  // If user doesn't have a cart, create an empty one
  if (!cart) {
    cart = {
      userId,
      items: [],
      total: 0,
    };
    carts.push(cart);
    saveCartsToFile(carts);
  }

  return cart;
};

// Get user's cart
router.get("/", authRoutes.authenticateToken, (req, res) => {
  try {
    const cart = getUserCart(req.user.id);

    // Always make sure cart has required fields
    if (!cart.items) cart.items = [];
    if (cart.total === undefined) cart.total = 0;

    res.json(cart);
  } catch (error) {
    console.error("Error getting cart:", error);
    res
      .status(500)
      .json({ message: "Failed to get cart", error: error.message });
  }
});

// Add item to cart
router.post("/add", authRoutes.authenticateToken, (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Get product details
    const products = getProductsFromFile();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock available" });
    }

    // Get or create user's cart
    const userCart = getUserCart(req.user.id);

    // Update the cart
    const itemIndex = userCart.items.findIndex((item) => item.id === productId);

    if (itemIndex === -1) {
      // Add new item
      userCart.items.push({ ...product, quantity });
    } else {
      // Update existing item
      userCart.items[itemIndex].quantity += quantity;
    }

    // Recalculate total
    userCart.total = userCart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    userCart.total = parseFloat(userCart.total.toFixed(2));

    // Save updated carts
    const carts = getCartsFromFile();
    const cartIndex = carts.findIndex((cart) => cart.userId === req.user.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = userCart;
    } else {
      carts.push(userCart);
    }
    saveCartsToFile(carts);

    res.json(userCart);
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res
      .status(500)
      .json({ message: "Failed to add item to cart", error: error.message });
  }
});

// Remove item from cart
router.post("/remove", authRoutes.authenticateToken, (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  // Get carts
  const carts = getCartsFromFile();
  const cartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

  if (cartIndex === -1) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const cart = carts[cartIndex];
  const itemIndex = cart.items.findIndex((item) => item.id === productId);

  if (itemIndex === -1) {
    return res.status(404).json({ message: "Item not found in cart" });
  }

  // Update quantity or remove item
  if (cart.items[itemIndex].quantity <= quantity) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity -= quantity;
  }

  // Recalculate total
  cart.total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  cart.total = parseFloat(cart.total.toFixed(2));

  // Remove cart if empty
  if (cart.items.length === 0) {
    carts.splice(cartIndex, 1);
    saveCartsToFile(carts);
    return res.json({ userId: req.user.id, items: [], total: 0 });
  }

  saveCartsToFile(carts);
  res.json(cart);
});

// Clear cart
router.delete("/clear", authRoutes.authenticateToken, (req, res) => {
  const carts = getCartsFromFile();
  const cartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

  if (cartIndex !== -1) {
    carts.splice(cartIndex, 1);
    saveCartsToFile(carts);
  }

  res.json({ userId: req.user.id, items: [], total: 0 });
});

// Clear cart for physical device
router.post("/clear", (req, res) => {
  const { cartId, deviceId } = req.body;
  let userId = "2"; // Default to customer ID if no cartId provided

  // Get carts
  const carts = getCartsFromFile();

  // Find cart by cartId or deviceId
  let cartIndex = -1;
  if (cartId) {
    cartIndex = carts.findIndex((cart) => cart.id === cartId);
    if (cartIndex !== -1) {
      userId = carts[cartIndex].userId;
    }
  }

  // If cartId not found, try deviceId mapping (implement your device-to-user mapping)

  if (cartIndex !== -1) {
    carts.splice(cartIndex, 1);
    saveCartsToFile(carts);
  }

  // Return success response
  res.json({
    success: true,
    message: "Cart cleared successfully",
    userId: userId,
    items: [],
    total: 0,
  });
});

// RFID scan from physical device (no auth required)
router.post("/device/rfid-scan", (req, res) => {
  const { rfidTag, action = "add", deviceId, userId = "2" } = req.body;

  // Log the incoming request
  console.log("Received RFID scan from device:", {
    rfidTag,
    action,
    deviceId,
    userId,
    timestamp: new Date().toISOString(),
  });

  if (!rfidTag) {
    return res.status(400).json({
      success: false,
      message: "RFID tag is required",
      rfidTag,
    });
  }

  // Get product by RFID tag
  const products = getProductsFromFile();
  const product = products.find(
    (p) => p.rfidTag.toLowerCase() === rfidTag.toLowerCase()
  );

  // Special handling for TEST_TAG
  if (rfidTag === "TEST_TAG") {
    console.log("TEST_TAG detected - returning success without modifying cart");
    return res.json({
      success: true,
      message:
        "Test scan successful. This is just a test and no products were modified.",
      test: true,
      deviceId: deviceId || null,
    });
  }

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
      rfidTag,
    });
  }

  // Check inventory
  if (action === "add" && product.quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Product out of stock",
      product,
    });
  }

  // Update inventory (only if non-test tag)
  if (action === "add") {
    product.quantity -= 1;
  } else if (action === "remove") {
    product.quantity += 1;
  }
  saveProductsToFile(products);

  // Update cart
  const carts = getCartsFromFile();

  // First check if this device is already connected to a user
  const connectedCart = carts.find((cart) => cart.deviceId === deviceId);

  // If device is connected to a user, use that user's cart
  const effectiveUserId = connectedCart ? connectedCart.userId : userId;

  const cartIndex = carts.findIndex((cart) => cart.userId === effectiveUserId);

  console.log(
    `Cart operation: User ${effectiveUserId}, Device ${deviceId}, Operation: ${action}, Product: ${product.name}`
  );

  let updatedCart;

  if (cartIndex === -1 && action === "add") {
    // Create new cart with ID
    const newCart = {
      id: `cart_${Date.now()}`,
      userId: effectiveUserId,
      deviceId: deviceId || null,
      items: [{ ...product, quantity: 1 }],
      total: product.price,
    };
    carts.push(newCart);
    updatedCart = newCart;

    console.log(
      `Created new cart for user ${effectiveUserId} with device ${deviceId}`
    );
  } else if (cartIndex !== -1) {
    const cart = carts[cartIndex];

    // Add deviceId if not present
    if (deviceId && !cart.deviceId) {
      cart.deviceId = deviceId;
      console.log(
        `Associated device ${deviceId} with existing cart for user ${effectiveUserId}`
      );
    }

    // Add cart ID if not present
    if (!cart.id) {
      cart.id = `cart_${Date.now()}`;
    }

    const itemIndex = cart.items.findIndex((item) => item.id === product.id);

    if (action === "add") {
      if (itemIndex === -1) {
        cart.items.push({ ...product, quantity: 1 });
        console.log(`Added new product ${product.name} to cart`);
      } else {
        cart.items[itemIndex].quantity += 1;
        console.log(`Increased quantity of ${product.name} in cart`);
      }
      cart.total = parseFloat((cart.total + product.price).toFixed(2));
    } else if (action === "remove" && itemIndex !== -1) {
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
        console.log(`Decreased quantity of ${product.name} in cart`);
      } else {
        cart.items.splice(itemIndex, 1);
        console.log(`Removed ${product.name} from cart`);
      }
      cart.total = parseFloat((cart.total - product.price).toFixed(2));

      // Remove cart if empty
      if (cart.items.length === 0) {
        carts.splice(cartIndex, 1);
        saveCartsToFile(carts);
        console.log(
          `Cart for user ${effectiveUserId} is now empty and has been removed`
        );
        return res.json({
          success: true,
          message: `Product ${
            action === "add" ? "added to" : "removed from"
          } cart`,
          cart: { id: cart.id, userId: effectiveUserId, items: [], total: 0 },
          product,
        });
      }
    } else if (action === "remove" && itemIndex === -1) {
      console.log(
        `Attempted to remove ${product.name} but it's not in the cart`
      );
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    updatedCart = cart;
  } else if (cartIndex === -1 && action === "remove") {
    console.log(
      `Attempted to remove from non-existent cart for user ${effectiveUserId}`
    );
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }

  saveCartsToFile(carts);

  // Notify connected clients via socket if available
  if (req.app.io) {
    console.log(`Emitting socket events for cart update`);
    req.app.io.emit("product_scanned", {
      product,
      action,
      userId: effectiveUserId,
      deviceId,
    });

    req.app.io.emit("cart_updated", {
      userId: effectiveUserId,
      carts,
    });
  }

  console.log(`Successfully processed RFID scan for ${product.name}`);

  res.json({
    success: true,
    message: `Product ${action === "add" ? "added to" : "removed from"} cart`,
    cart: updatedCart,
    product,
  });
});

// Alias for the device RFID scan endpoint to handle the simplified path
// used by the NodeMCU (for compatibility)
router.post("/rfid-scan", (req, res) => {
  // Forward to the device endpoint handler
  const { rfidTag, action = "add", deviceId } = req.body;

  console.log(`RFID scan request received at /rfid-scan:`, req.body);

  // If this has a token but no deviceId, it's likely a regular user request
  if (req.headers.authorization && !deviceId) {
    console.log("Authenticated user RFID scan request detected");
    // Authenticate and handle as a user request
    authRoutes.authenticateToken(req, res, () => {
      // Use the user's ID from the token
      req.body.userId = req.user.id;
      console.log(`Authenticated as user ${req.user.id}`);
      // Handle like the regular RFID scan endpoint
      handleUserRfidScan(req, res);
    });
  } else {
    // Handle as a device request
    console.log(
      "Handling HTTP request from NodeMCU device or unauthenticated request"
    );
    // Forward to the device endpoint handler
    req.url = "/device/rfid-scan";
    req.app._router.handle(req, res);
  }
});

// Helper function for user RFID scans
function handleUserRfidScan(req, res) {
  const { rfidTag, action = "add", userId } = req.body;

  if (!rfidTag) {
    return res.status(400).json({ message: "RFID tag is required" });
  }

  // Get product by RFID tag
  const products = getProductsFromFile();
  const product = products.find(
    (p) => p.rfidTag.toLowerCase() === rfidTag.toLowerCase()
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Check inventory
  if (action === "add" && product.quantity <= 0) {
    return res.status(400).json({ message: "Product out of stock" });
  }

  // Update inventory
  if (action === "add") {
    product.quantity -= 1;
  } else if (action === "remove") {
    product.quantity += 1;
  }
  saveProductsToFile(products);

  // Update cart
  const carts = getCartsFromFile();
  const cartIndex = carts.findIndex((cart) => cart.userId === userId);

  let updatedCart;

  if (cartIndex === -1 && action === "add") {
    // Create new cart
    carts.push({
      userId: userId,
      items: [{ ...product, quantity: 1 }],
      total: product.price,
    });
    updatedCart = carts[carts.length - 1];
  } else if (cartIndex !== -1) {
    const cart = carts[cartIndex];
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
        saveCartsToFile(carts);
        return res.json({ userId: userId, items: [], total: 0 });
      }
    } else if (action === "remove" && itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    updatedCart = cart;
  } else if (cartIndex === -1 && action === "remove") {
    return res.status(404).json({ message: "Cart not found" });
  }

  saveCartsToFile(carts);

  // Notify connected clients via socket if available
  if (req.app.io) {
    req.app.io.emit("product_scanned", {
      product,
      action,
      userId,
    });

    req.app.io.emit("cart_updated", {
      userId,
      carts,
    });
  }

  res.json(updatedCart);
}

// Connect physical cart to user
router.post("/connect-device", authRoutes.authenticateToken, (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: "Device ID is required",
    });
  }

  // Get carts
  const carts = getCartsFromFile();

  // Check if device is already connected to another user
  const existingCartIndex = carts.findIndex(
    (cart) => cart.deviceId === deviceId && cart.userId !== req.user.id
  );

  if (existingCartIndex !== -1) {
    // Transfer cart to this user
    const existingCart = carts[existingCartIndex];
    existingCart.userId = req.user.id;
    saveCartsToFile(carts);

    // Emit socket event to notify about connection
    req.app.io.emit("cart_connected", {
      success: true,
      userId: req.user.id,
      deviceId: deviceId,
      message: "Physical cart connected successfully",
    });

    return res.json({
      success: true,
      message: "Cart connection initiated",
      cart: existingCart,
    });
  }

  // Find user's cart
  let userCartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

  if (userCartIndex !== -1) {
    // Add deviceId to user's existing cart
    carts[userCartIndex].deviceId = deviceId;
  } else {
    // Create new empty cart with deviceId
    carts.push({
      id: `cart_${Date.now()}`,
      userId: req.user.id,
      deviceId: deviceId,
      items: [],
      total: 0,
    });
    userCartIndex = carts.length - 1;
  }

  saveCartsToFile(carts);

  // Attempt to send a request to the NodeMCU cart device
  // This is a placeholder - implement actual NodeMCU communication logic here
  // For demonstration, we'll simulate a successful connection after a delay
  setTimeout(() => {
    req.app.io.emit("cart_connected", {
      success: true,
      userId: req.user.id,
      deviceId: deviceId,
      message: "Physical cart connected successfully",
    });
  }, 2000);

  res.json({
    success: true,
    message: "Cart connection initiated",
    cart: carts[userCartIndex],
  });
});

// Disconnect physical cart from user
router.post("/disconnect-device", authRoutes.authenticateToken, (req, res) => {
  // Get carts
  const carts = getCartsFromFile();

  // Find user's cart
  const userCartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

  if (userCartIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }

  // Remove deviceId from cart
  carts[userCartIndex].deviceId = null;

  saveCartsToFile(carts);

  res.json({
    success: true,
    message: "Cart disconnected successfully",
    cart: carts[userCartIndex],
  });
});

// Checkout process
router.post("/checkout", authRoutes.authenticateToken, (req, res) => {
  // Get carts
  const carts = getCartsFromFile();

  // Find user's cart
  const userCartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

  if (userCartIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Cart not found",
    });
  }

  const cart = carts[userCartIndex];

  // Update product inventory
  const products = getProductsFromFile();

  // Update inventory quantities
  cart.items.forEach((item) => {
    const productIndex = products.findIndex((p) => p.id === item.id);
    if (productIndex !== -1) {
      // Ensure we don't go below zero
      products[productIndex].quantity = Math.max(
        0,
        products[productIndex].quantity - item.quantity
      );
    }
  });

  // Save updated product inventory
  saveProductsToFile(products);

  // Process items in cart
  const orderDetails = {
    orderId: `order_${Date.now()}`,
    userId: req.user.id,
    items: cart.items,
    total: cart.total,
    date: new Date().toISOString(),
    deviceId: cart.deviceId || null,
  };

  // Save order details (would typically go to orders.json)
  const ordersFilePath = path.join(__dirname, "..", "data", "orders.json");
  let orders = [];

  if (fs.existsSync(ordersFilePath)) {
    orders = JSON.parse(fs.readFileSync(ordersFilePath));
  }

  orders.push(orderDetails);
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders));

  // If this was connected to a physical cart, notify it
  if (cart.deviceId) {
    // Send checkout completed signal to the physical cart
    // This is a placeholder - implement actual NodeMCU communication here
    req.app.io.emit("checkout_complete", {
      deviceId: cart.deviceId,
      message: "Checkout completed successfully",
    });
  }

  // Remove the cart
  carts.splice(userCartIndex, 1);
  saveCartsToFile(carts);

  res.json({
    success: true,
    message: "Checkout successful",
    order: orderDetails,
  });
});

// Get cart status by device ID
router.get("/device/:deviceId", (req, res) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: "Device ID is required",
    });
  }

  // Get carts
  const carts = getCartsFromFile();
  const cart = carts.find((cart) => cart.deviceId === deviceId);

  if (!cart) {
    return res.json({
      success: true,
      message: "No active cart for this device",
      connected: false,
      cart: null,
    });
  }

  // Get user info
  const users = getUsersFromFile();
  const user = users.find((user) => user.id === cart.userId);

  res.json({
    success: true,
    message: "Cart found",
    connected: true,
    cart: cart,
    user: user ? { id: user.id, username: user.username } : null,
  });
});

// Get connected devices
router.get("/connected-devices", authRoutes.authenticateToken, (req, res) => {
  const carts = getCartsFromFile();
  const connectedDevices = carts
    .filter((cart) => cart.deviceId)
    .map((cart) => ({
      deviceId: cart.deviceId,
      userId: cart.userId,
      cartId: cart.id,
    }));

  res.json({
    success: true,
    devices: connectedDevices,
  });
});

module.exports = router;
