
const db = require("../db");

// SAVE ORDER AND ORDER ITEMS
function insertOrder(order, items) {
  return new Promise((resolve, reject) => {
    db.getConnection((connectionError, connection) => {
      if (connectionError) {
        return reject(connectionError);
      }

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          return reject(transactionError);
        }

        const orderSql = `
          INSERT INTO orders
          (user_id, customer_name, institution_id, role, phone,
           location, location_details, pickup_time, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const orderValues = [
          order.user_id,
          order.customer_name,
          order.institution_id || null,
          order.role,
          order.phone,
          order.location,
          order.location_details || null,
          order.pickup_time,
          order.total_price,
        ];

        connection.query(orderSql, orderValues, (orderError, result) => {
          if (orderError) {
            return connection.rollback(() => {
              connection.release();
              reject(orderError);
            });
          }

          const orderId = result.insertId;

          const itemSql = `
            INSERT INTO order_items
            (order_id, food_id, quantity, price, subtotal)
            VALUES ?
          `;

          const itemValues = items.map((item) => [
            orderId,
            item.food_id,
            item.quantity,
            item.price,
            item.price * item.quantity,
          ]);

          connection.query(itemSql, [itemValues], (itemError) => {
            if (itemError) {
              return connection.rollback(() => {
                connection.release();
                reject(itemError);
              });
            }

            connection.commit((commitError) => {
              if (commitError) {
                return connection.rollback(() => {
                  connection.release();
                  reject(commitError);
                });
              }

              connection.release();
              resolve(orderId);
            });
          });
        });
      });
    });
  });
}

// CREATE ORDER API
async function createOrder(req, res) {
  try {
    const {
      customer_name,
      institution_id,
      role,
      phone,
      location,
      location_details,
      pickup_time,
      items,
    } = req.body;

    if (
      !customer_name?.trim() ||
      !["student", "teacher"].includes(role) ||
      !phone?.trim() ||
      !location?.trim() ||
      !pickup_time?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Required order information is missing.",
      });
    }

    if (
      items.some(
        (item) =>
          !Number.isInteger(item.food_id) ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid food item or quantity.",
      });
    }

    const foodIds = [...new Set(items.map((item) => item.food_id))];
    const placeholders = foodIds.map(() => "?").join(",");

    const [foods] = await db.promise().query(
      `SELECT id, price, is_available
       FROM foods
       WHERE id IN (${placeholders})`,
      foodIds
    );

    if (
      foods.length !== foodIds.length ||
      foods.some((food) => !food.is_available)
    ) {
      return res.status(400).json({
        success: false,
        message: "A food item is unavailable or does not exist.",
      });
    }

    const foodMap = new Map(
      foods.map((food) => [food.id, Number(food.price)])
    );

    const normalizedItems = items.map((item) => ({
      food_id: item.food_id,
      quantity: item.quantity,
      price: foodMap.get(item.food_id),
    }));

    const totalPrice = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const orderId = await insertOrder(
      {
        user_id: req.user.id,
        customer_name: customer_name.trim(),
        institution_id,
        role,
        phone: phone.trim(),
        location: location.trim(),
        location_details,
        pickup_time,
        total_price: totalPrice,
      },
      normalizedItems
    );

    return res.status(201).json({
      success: true,
      message: "Order saved successfully!",
      orderId,
      totalPrice,
    });
  } catch (error) {
    console.error("Order save failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not save the order.",
    });
  }
}

// GET MY ORDER STATUS API
async function getMyOrder(req, res) {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;

    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const [orders] = await db.promise().query(
      `SELECT id, status, total_price, created_at, pickup_time
       FROM orders
       WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order: orders[0],
    });
  } catch (error) {
    console.error("Order tracking failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch order status.",
    });
  }
}

// GET ALL MY ORDERS (ORDER HISTORY)
async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await db.promise().query(
      `SELECT
          o.id AS order_id,
          o.status,
          o.total_price,
          o.created_at,
          o.pickup_time,
          oi.food_id,
          f.name AS food_name,
          oi.quantity,
          oi.price AS item_price,
          oi.subtotal
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN foods f ON oi.food_id = f.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );

    const orderMap = new Map();

    rows.forEach((row) => {
      if (!orderMap.has(row.order_id)) {
        orderMap.set(row.order_id, {
          id: row.order_id,
          status: row.status,
          total_price: row.total_price,
          created_at: row.created_at,
          pickup_time: row.pickup_time,
          items: [],
        });
      }

      if (row.food_id !== null) {
        orderMap.get(row.order_id).items.push({
          food_id: row.food_id,
          food_name: row.food_name || "Unavailable food",
          quantity: row.quantity,
          price: row.item_price,
          subtotal: row.subtotal,
        });
      }
    });

    return res.status(200).json({
      success: true,
      orders: Array.from(orderMap.values()),
    });
  } catch (error) {
    console.error("Order history failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch order history.",
    });
  }
}

module.exports = {
  createOrder,
  getMyOrder,
  getMyOrders,
};
