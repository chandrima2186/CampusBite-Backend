
const db = require("../db");

// 1. ADMIN DASHBOARD STATISTICS
async function getDashboardStats(req, res) {
  try {
    const [foodStats] = await db.promise().query(`
      SELECT
        COALESCE(SUM(is_available = 1), 0) AS totalFoods,
        COALESCE(SUM(is_available = 1), 0) AS availableFoods,
        COALESCE(SUM(is_available = 0), 0) AS unavailableFoods
      FROM foods
    `);

    const [orderStats] = await db.promise().query(`
      SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(status = 'pending'), 0) AS pendingOrders,
        COALESCE(SUM(status = 'preparing'), 0) AS preparingOrders,
        COALESCE(SUM(status = 'ready'), 0) AS readyOrders,
        COALESCE(SUM(status = 'completed'), 0) AS completedOrders,
        COALESCE(SUM(status = 'cancelled'), 0) AS cancelledOrders,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'completed' THEN total_price
              ELSE 0
            END
          ), 0
        ) AS totalSales
      FROM orders
    `);

    res.json({
      success: true,
      dashboard: {
        totalFoods: Number(foodStats[0].totalFoods),
        availableFoods: Number(foodStats[0].availableFoods),
        unavailableFoods: Number(foodStats[0].unavailableFoods),
        totalOrders: Number(orderStats[0].totalOrders),
        pendingOrders: Number(orderStats[0].pendingOrders),
        preparingOrders: Number(orderStats[0].preparingOrders),
        readyOrders: Number(orderStats[0].readyOrders),
        completedOrders: Number(orderStats[0].completedOrders),
        cancelledOrders: Number(orderStats[0].cancelledOrders),
        totalSales: Number(orderStats[0].totalSales),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load dashboard statistics.",
    });
  }
}

// 2. GET ALL ORDERS
async function getAllOrders(req, res) {
  try {
    const [orders] = await db.promise().query(`
      SELECT
        o.*,
        COUNT(oi.id) AS totalItems
      FROM orders o
      LEFT JOIN order_items oi
        ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load orders.",
    });
  }
}

// 3. GET SINGLE ORDER DETAILS
async function getOrderDetails(req, res) {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const [orders] = await db.promise().query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const [items] = await db.promise().query(
      `SELECT
        oi.food_id,
        f.name AS food_name,
        f.emoji,
        oi.quantity,
        oi.price,
        oi.subtotal
      FROM order_items oi
      LEFT JOIN foods f
        ON oi.food_id = f.id
      WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({
      success: true,
      order: orders[0],
      items,
    });
  } catch (error) {
    console.error("Order details error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load order details.",
    });
  }
}

// 4. UPDATE ORDER STATUS
async function updateOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];

    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const [result] = await db.promise().query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      const [existingOrder] = await db.promise().query(
        "SELECT id FROM orders WHERE id = ?",
        [orderId]
      );

      if (existingOrder.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Order status updated successfully!",
    });
  } catch (error) {
    console.error("Update status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update order status.",
    });
  }
}

module.exports = {
  getDashboardStats,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
};
