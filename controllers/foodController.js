
const db = require("../db");

// Validate image URL (only http and https are allowed)
function isValidImageUrl(url) {
  if (!url) return true;

  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
      url.length <= 1000
    );
  } catch {
    return false;
  }
}

// 1. GET AVAILABLE FOODS (Student / Teacher)
async function getAvailableFoods(req, res) {
  try {
    const [foods] = await db.promise().query(`
      SELECT id, name, description, price, category, image_url, is_available
      FROM foods
      WHERE is_available = 1
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      foods,
    });
  } catch (error) {
    console.error("Get foods error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load foods.",
    });
  }
}

// 2. GET ALL FOODS (Admin)
async function getAllFoodsForAdmin(req, res) {
  try {
    const [foods] = await db.promise().query(`
      SELECT id, name, description, price, category, image_url, is_available
      FROM foods
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      foods,
    });
  } catch (error) {
    console.error("Admin get foods error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load food list.",
    });
  }
}

// 3. ADD NEW FOOD (Admin)
async function addFood(req, res) {
  try {
    const { name, description, price, category, image_url } = req.body;

    if (!name || !name.trim() || price === undefined || price === "") {
      return res.status(400).json({
        success: false,
        message: "Food name and price are required.",
      });
    }

    const foodPrice = Number(price);
    const foodImage = image_url ? image_url.trim() : null;

    if (!Number.isFinite(foodPrice) || foodPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid food price.",
      });
    }

    if (!isValidImageUrl(foodImage)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid image URL (http or https).",
      });
    }

    const [result] = await db.promise().query(
      `INSERT INTO foods
       (name, description, price, category, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        name.trim(),
        description || null,
        foodPrice,
        category || null,
        foodImage,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Food added successfully!",
      foodId: result.insertId,
    });
  } catch (error) {
    console.error("Add food error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add food.",
    });
  }
}

// 4. UPDATE FOOD (Admin)
async function updateFood(req, res) {
  try {
    
    const foodId = Number(req.params.id);
    const { name, description, price, category, image_url } = req.body;

    if (!Number.isInteger(foodId) || foodId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    if (!name || !name.trim() || price === undefined || price === "") {
      return res.status(400).json({
        success: false,
        message: "Food name and price are required.",
      });
    }

    const foodPrice = Number(price);
    const foodImage = image_url ? image_url.trim() : null;

    if (!Number.isFinite(foodPrice) || foodPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid food price.",
      });
    }

    if (!isValidImageUrl(foodImage)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid image URL (http or https).",
      });
    }

    const [result] = await db.promise().query(
      `UPDATE foods
       SET name = ?,
           description = ?,
           price = ?,
           category = ?,
           image_url = ?
       WHERE id = ?`,
      [
        name.trim(),
        description || null,
        foodPrice,
        category || null,
        foodImage,
        foodId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.promise().query(
        "SELECT id FROM foods WHERE id = ?",
        [foodId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Food not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Food updated successfully!",
    });
  } catch (error) {
    console.error("Update food error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update food.",
    });
  }
}

// 5. CHANGE FOOD AVAILABILITY (Admin)
async function updateFoodAvailability(req, res) {
  try {
    const foodId = Number(req.params.id);
    const { is_available } = req.body;

    if (!Number.isInteger(foodId) || foodId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    if (
      is_available !== 0 &&
      is_available !== 1 &&
      is_available !== false &&
      is_available !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability value.",
      });
    }

    const [result] = await db.promise().query(
      "UPDATE foods SET is_available = ? WHERE id = ?",
      [Number(is_available), foodId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.promise().query(
        "SELECT id FROM foods WHERE id = ?",
        [foodId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Food not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Food availability updated successfully!",
    });
  } catch (error) {
    console.error("Availability error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update food availability.",
    });
  }
}

// 6. DELETE FOOD (Soft Delete)
async function deleteFood(req, res) {
  try {
    const foodId = Number(req.params.id);

    if (!Number.isInteger(foodId) || foodId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    // Keep the database record to protect old order history.
    const [result] = await db.promise().query(
      "UPDATE foods SET is_available = 0 WHERE id = ?",
      [foodId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.promise().query(
        "SELECT id FROM foods WHERE id = ?",
        [foodId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Food not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Food removed from menu successfully!",
    });
  } catch (error) {
    console.error("Delete food error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not remove food.",
    });
  }
}

module.exports = {
  getAvailableFoods,
  getAllFoodsForAdmin,
  addFood,
  updateFood,
  updateFoodAvailability,
  deleteFood,
};
