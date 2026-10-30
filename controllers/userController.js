
const db = require("../db");

// GET LOGGED-IN USER API
async function getMe(req, res) {
  try {
    const [users] = await db.promise().query(
      `SELECT id, name, email, role, institution_id, phone
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get user information.",
    });
  }
}

module.exports = { getMe };
