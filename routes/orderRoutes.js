
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");

const {
  createOrder,
  getMyOrder,
  getMyOrders,
} = require("../controllers/orderController");

// CREATE NEW ORDER
router.post("/", authenticateToken, createOrder);

// GET ALL MY ORDERS (ORDER HISTORY)
router.get("/my-orders", authenticateToken, getMyOrders);

// GET SINGLE ORDER STATUS (LIVE TRACKING)
router.get("/:id", authenticateToken, getMyOrder);

module.exports = router;
