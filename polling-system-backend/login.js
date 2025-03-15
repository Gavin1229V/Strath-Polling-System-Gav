require("dotenv").config();
const { connectionPromise, getConnection } = require("./db");
const jwt = require("jsonwebtoken");
// Remove bcryptjs dependency
// const bcrypt = require("bcryptjs");

// Login function that now properly joins with users table to get the role
const login = async (email, password) => {
  const connection = await getConnection();
  try {
    // Modified query to join with users table to get the role
    // Change l.id to l.login_id or another valid column name
    const query = `
      SELECT l.login_id, l.user_id, l.email, l.password, l.is_verified, 
             l.verification_key, l.created_at, u.role 
      FROM logins l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.email = ?
    `;
    
    const [rows] = await connection.query(query, [email]);

    if (rows.length === 0) {
      throw new Error("Invalid email or password.");
    }

    const user = rows[0];

    // Temporary solution: Direct password comparison
    // WARNING: This is not secure for production! Use only for development
    const isPasswordValid = password === user.password;
    // Replace the bcrypt comparison with direct comparison
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error("Invalid email or password.");
    }

    if (!user.is_verified) {
      throw new Error("Please verify your email before logging in.");
    }

    // Create a token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email,
        role: user.role // Include role from users table in the token
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    return {
      token,
      userDetails: {
        login_id: user.login_id,
        user_id: user.user_id,
        email: user.email,
        role: user.role, // Include role from users table in response
        is_verified: user.is_verified,
        created_at: user.created_at
      }
    };
  } catch (error) {
    throw error;
  }
};

// Change the export to match what server.js is trying to call
module.exports = { loginUser: login };