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

// Initialize Razorpay with valid test credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_2uPofgQZUz39Kk",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "eBwb1G3nKpGXAzFHR9a1vH0e",
});

// Create order for payment
router.post("/create-order", authRoutes.authenticateToken, async (req, res) => {
  try {
    // Get user's cart
    const carts = getCartsFromFile();
    const userCart = carts.find((cart) => cart.userId === req.user.id);

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
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
    // Get user's cart
    const carts = getCartsFromFile();
    const cartIndex = carts.findIndex((cart) => cart.userId === req.user.id);

    if (cartIndex === -1) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const userCart = carts[cartIndex];

    // Update inventory
    const products = getProductsFromFile();
    let inventoryUpdated = false;

    userCart.items.forEach((cartItem) => {
      const productIndex = products.findIndex((p) => p.id === cartItem.id);
      if (productIndex !== -1) {
        products[productIndex].quantity -= cartItem.quantity;
        inventoryUpdated = true;
      }
    });

    if (inventoryUpdated) {
      saveProductsToFile(products);
    }

    // Clear the user's cart
    carts.splice(cartIndex, 1);
    saveCartsToFile(carts);

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
