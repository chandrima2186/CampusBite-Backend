
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getAvailableFoods,
  getAllFoodsForAdmin,
  addFood,
  updateFood,
  updateFoodAvailability,
  deleteFood,
} = require("../controllers/foodController");

// Public route: Student / Teacher can see available foods
router.get("/", getAvailableFoods);

// Admin routes: Authentication + Admin permission required
router.get("/admin", authenticateToken, adminMiddleware, getAllFoodsForAdmin);

router.post("/admin", authenticateToken, adminMiddleware, addFood);

router.put("/admin/:id", authenticateToken, adminMiddleware, updateFood);

router.patch(
  "/admin/:id/availability",
  authenticateToken,
  adminMiddleware,
  updateFoodAvailability
);

router.delete("/admin/:id", authenticateToken, adminMiddleware, deleteFood);

module.exports = router;
