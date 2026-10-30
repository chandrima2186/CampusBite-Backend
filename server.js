
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", userRoutes);

// Root Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CampusBite Backend is running!",
  });
});

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CampusBite API is working!",
  });
});

// Database Test Route
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
