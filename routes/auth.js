const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Load users from JSON file
const getUsersFromFile = () => {
  const usersFilePath = path.join(__dirname, "..", "data", "users.json");
  if (fs.existsSync(usersFilePath)) {
    return JSON.parse(fs.readFileSync(usersFilePath));
  }
  return [];
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "smartcart_secret_key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = user;
      next();
    }
  );
};

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const users = getUsersFromFile();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || "smartcart_secret_key",
    { expiresIn: "24h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

// Get current user route
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Export middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;
