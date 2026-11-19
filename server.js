
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const foodRoutes = require("./routes/foodRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Authentication Routes
app.use("/api", authRoutes);

// Order Routes
app.use("/api/orders", orderRoutes);

// User Routes
app.use("/api", userRoutes);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Food Routes
app.use("/api/foods", foodRoutes);

// Home Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusBite Backend is running!",
  });
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CampusBite API is working!",
  });
});

// Database Test
app.get("/api/db-test", (req, res) => {
  db.query("SHOW TABLES", (error, results) => {
    if (error) {
      console.error("Database test error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Database query failed",
      });
    }

    res.json({
      success: true,
      message: "CampusBite database is working!",
      tables: results,
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(
    `CampusBite backend running at http://localhost:${PORT}`
  );
});
