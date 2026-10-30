
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const { getMe } = require("../controllers/userController");

router.get("/me", authenticateToken, getMe);

module.exports = router;
