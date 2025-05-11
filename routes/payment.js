const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");
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

// Initialize Razorpay with valid test credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_2uPofgQZUz39Kk",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "eBwb1G3nKpGXAzFHR9a1vH0e",
});

// Create order for payment
router.post("/create-order", authRoutes.authenticateToken, async (req, res) => {
  try {
    // Log authenticated user info for debugging
    console.log("User authenticated for payment:", req.user);

    if (!req.user || !req.user.id) {
      console.error("Invalid user session");
      return res.status(401).json({ message: "Invalid user session" });
    }

    // Get user's cart directly with helper function
    const userCart = getUserCart(req.user.id);
    console.log("User cart found:", userCart);

    // Validate cart items
    if (!userCart.items || userCart.items.length === 0) {
      console.log("Cart exists but is empty");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Verify cart total exists and is valid
    if (
      typeof userCart.total !== "number" ||
      isNaN(userCart.total) ||
      userCart.total <= 0
    ) {
      console.log("Invalid cart total:", userCart.total);

      // Try to fix the total by recalculating it
      const fixedTotal = userCart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (fixedTotal > 0) {
        userCart.total = parseFloat(fixedTotal.toFixed(2));

        // Save the fixed cart
        const carts = getCartsFromFile();
        const cartIndex = carts.findIndex(
          (cart) => cart.userId === req.user.id
        );
        if (cartIndex !== -1) {
          carts[cartIndex] = userCart;
        } else {
          carts.push(userCart);
        }
        saveCartsToFile(carts);

        console.log("Fixed cart total:", userCart.total);
      } else {
        return res.status(400).json({ message: "Invalid cart total" });
      }
    }

    // Create order with Razorpay
    const options = {
      amount: Math.round(userCart.total * 100), // amount in smallest currency unit (paise for INR)
      currency: "INR",
      receipt: `order_${Date.now()}_${req.user.id}`,
      payment_capture: 1, // auto capture
    };

    console.log("Creating Razorpay order with options:", options);

    try {
      const order = await razorpay.orders.create(options);
      console.log("Order created successfully:", order);

      res.json({
        orderId: order.id,
        amount: order.amount / 100, // Convert back to main currency unit
        currency: order.currency,
        cartTotal: userCart.total,
      });
    } catch (razorpayError) {
      console.error("Razorpay error:", razorpayError);

      // Send more detailed error information for debugging
      res.status(500).json({
        message: "Failed to create Razorpay order",
        error: razorpayError.message,
        details: razorpayError,
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Failed to create payment order",
      error: error.message,
    });
  }
});

// Verify payment
router.post("/verify", authRoutes.authenticateToken, (req, res) => {
  const { paymentId, orderId, signature } = req.body;

  // In a real implementation, you would verify the signature here
  // For this demo, we'll assume the payment is valid

  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    // Get user's cart
    const userCart = getUserCart(req.user.id);

    if (!userCart || !userCart.items || userCart.items.length === 0) {
      return res.status(404).json({ message: "Cart not found or empty" });
    }

    // Update inventory
    const products = getProductsFromFile();
    let inventoryUpdated = false;

    userCart.items.forEach((cartItem) => {
      const productIndex = products.findIndex((p) => p.id === cartItem.id);
      if (productIndex !== -1) {
        products[productIndex].quantity = Math.max(
          0,
          products[productIndex].quantity - cartItem.quantity
        );
        inventoryUpdated = true;
      }
    });

    if (inventoryUpdated) {
      saveProductsToFile(products);
    }

    // Clear the user's cart
    const carts = getCartsFromFile();
    const cartIndex = carts.findIndex((cart) => cart.userId === req.user.id);
    if (cartIndex !== -1) {
      carts.splice(cartIndex, 1);
      saveCartsToFile(carts);
    }

    res.json({
      success: true,
      message: "Payment successful and order processed",
      orderId,
      paymentId,
      amount: userCart.total,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res
      .status(500)
      .json({ message: "Failed to process payment", error: error.message });
  }
});

// Get payment key - use the same test key as above
router.get("/key", (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || "rzp_test_2uPofgQZUz39Kk" });
});

module.exports = router;
