require("dotenv").config();
const { connectionPromise, getConnection } = require("./db"); // MySQL connection and promise
const jwt = require("jsonwebtoken");

/**
 * Log a user in by verifying credentials and ensuring their email is verified.
 * @param {string} email - The user’s email address.
 * @param {string} password - The user’s password.
 * @returns {string} A JWT token for the session.
 * @throws {Error} If the user is not found, password is incorrect, or email isn’t verified.
 */
const loginUser = async (email, password) => {
  await connectionPromise; // Ensure the database connection is ready
  const connection = getConnection();
  
  // Query the database for a user with the given email
  const query = "SELECT login_id, password, is_verified FROM logins WHERE email = ?";
  const [rows] = await connection.query(query, [email]);
  
  if (rows.length === 0) {
    throw new Error("User not found.");
  }
  
  const user = rows[0];
  
  // Validate password (in production, use hashed passwords and a secure comparison)
  if (user.password !== password) {
    throw new Error("Incorrect password.");
  }
  
  // Ensure the user's email has been verified
  if (user.is_verified !== 1) {
    throw new Error("Email not verified. Please check your inbox for the verification email.");
  }
  
  // Create and return a session JWT token
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set.");
  }
  
  const token = jwt.sign(
    { loginId: user.login_id, email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  return token;
};

module.exports = { loginUser };