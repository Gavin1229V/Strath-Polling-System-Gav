require("dotenv").config();
const { connectionPromise, getConnection } = require("./db"); // MySQL connection and promise
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/**
 * Log a user in by verifying credentials and ensuring their email is verified.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Object} An object containing a JWT token for the session and user details.
 * @throws {Error} If the user is not found, password is incorrect, or email isn't verified.
 */
const loginUser = async (email, password) => {
  await connectionPromise; // Ensure the database connection is ready
  const connection = await getConnection(); // Await the connection
  
  // Updated query: join logins with users to get classes from users table
  const query = `
    SELECT l.login_id, l.user_id, l.email, l.password, l.role, l.is_verified,
           COALESCE(u.classes, '') AS classes, l.verification_key, l.created_at
    FROM logins l
    LEFT JOIN users u ON l.user_id = u.user_id
    WHERE l.email = ?
  `;
  const [rows] = await connection.query(query, [email]);
  
  if (rows.length === 0) {
    throw new Error("User not found.");
  }
  
  const user = rows[0];
  console.log("[DEBUG] Retrieved user classes:", user.classes); // Debug log
  
  // Validate password: use bcrypt only if the stored password is hashed
  let passwordMatch;
  if (user.password.startsWith('$2')) { // assumes bcrypt hash signature
    passwordMatch = await bcrypt.compare(password, user.password);
  } else {
    passwordMatch = (password === user.password);
  }
  
  if (!passwordMatch) {
    throw new Error("Incorrect password.");
  }
  
  // Ensure the user's email has been verified
  if (user.is_verified !== 1) {
    throw new Error("Email not verified. Please check your inbox for the verification email.");
  }
  
  // Create token payload (you can include minimal info for the token)
  const tokenPayload = { login_id: user.login_id, email: user.email, role: user.role };
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
  
  // Remove sensitive details if desired (here we remove the password)
  delete user.password;
  
  return { token, userDetails: user };
};

module.exports = { loginUser };