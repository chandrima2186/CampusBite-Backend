
const bcrypt = require("bcrypt");
const readline = require("readline");
const db = require("../db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createAdmin() {
  try {
    console.log("\n===== CampusBite Admin Setup =====\n");

    const name = (await ask("Admin Name: ")).trim();
    const email = (await ask("Admin Email: ")).trim().toLowerCase();
    const password = await ask("Admin Password: ");
    const phone = (await ask("Admin Phone (optional): ")).trim();

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const [existingUsers] = await db.promise().query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      throw new Error("This email is already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.promise().query(
      `INSERT INTO users
       (name, email, password, role, institution_id, phone)
       VALUES (?, ?, ?, 'admin', NULL, ?)`,
      [
        name,
        email,
        hashedPassword,
        phone || null,
      ]
    );

    console.log("\nAdmin account created successfully!");
    console.log("Admin ID:", result.insertId);
    console.log("Admin Email:", email);
    console.log("Role: admin");

  } catch (error) {
    console.error("\nAdmin creation failed:", error.message);
  } finally {
    rl.close();
    db.end();
  }
}

createAdmin();
