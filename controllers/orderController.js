
const db = require("../db");

// Save an order and its items in one database transaction
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
          (customer_name, institution_id, role, phone,
           location, location_details, pickup_time, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const orderValues = [
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

module.exports = { createOrder };
