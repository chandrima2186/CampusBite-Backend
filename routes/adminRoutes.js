
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getDashboardStats,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} = require("../controllers/adminController");

// All routes require Admin authentication
router.use(authenticateToken);
router.use(adminMiddleware);

// Dashboard Statistics
router.get("/dashboard", getDashboardStats);

// Get All Orders
router.get("/orders", getAllOrders);

// Get Single Order Details
router.get("/orders/:id", getOrderDetails);

// Update Order Status
router.patch("/orders/:id/status", updateOrderStatus);

module.exports = router;
