require("dotenv").config();
const { connectionPromise, getConnection } = require("./db"); // MySQL connection and promise
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// New helper function to generate an 8-digit unique user_id.
function generateUniqueUserId() {
  return Math.floor(10000000 + Math.random() * 90000000);
}

function createToken(loginId, email, verificationKey) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set.");
  }
  return jwt.sign({ loginId, email, jti: verificationKey }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

/**
 * @param {string} email - The user's email address.
 * @param {number} loginId - The login ID from the database.
 * @param {string} verificationKey - The unique key for this verification.
 */
const sendVerificationEmail = async (email, loginId, verificationKey) => {
  console.log("[DEBUG] Preparing to send verification email to:", email);
  
  // Generate a JWT token with the unique verification key included.
  const token = createToken(loginId, email, verificationKey);
  const verificationUrl = `${process.env.SERVER_URL}/api/verify?token=${encodeURIComponent(token)}`;
  const subject = "Verify Your Email Address";
  const bodyText = `Please verify your email by clicking the following link: ${verificationUrl}`;

  // Create a Nodemailer transporter using SMTP configuration.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: subject,
      text: bodyText,
      html: `<p>${bodyText}</p>`,
    });
    console.log("[INFO] Verification email sent to:", email, info);
  } catch (error) {
    console.error("[ERROR] Failed to send verification email:", error);
    throw error;
  }
};

/**
 * Register a user and send a verification email.
 * Generates a unique verification key, stores it in the database, and then uses it in the email token.
 */
const registerAndSendEmail = async (email, password, role = 1) => {
  console.log("[DEBUG] Starting registerAndSendEmail function.");

  // Get a valid connection by awaiting getConnection.
  const connection = await getConnection();
  console.log("[DEBUG] Obtained database connection:", connection.threadId || "No threadId available");

  if (!email || !password) {
    console.error("[DEBUG] Invalid input: Email or password are missing.", { email, password });
    throw new Error("Invalid input: Email and password are required.");
  }

  // Override the role based on email domain.
  const emailLower = email.toLowerCase();
  if (emailLower.endsWith("@uni.strath.ac.uk")) {
    role = 1; // Set student role to 1
  } else if (emailLower.endsWith("@strath.ac.uk")) {
    role = 3; // Lecturer
  }

  console.log("[DEBUG] Registering user with email:", email, "and role:", role);

  // Generate a unique 8-digit user_id.
  const userId = generateUniqueUserId();

  // Generate a unique verification key for this user.
  const verificationKey = crypto.randomBytes(16).toString("hex");

  try {
    await connection.beginTransaction();
    console.log("[DEBUG] Beginning transaction.");

    // Insert the new user with the unique user_id and verification key.
    const query = `INSERT INTO logins (user_id, email, password, role, is_verified, verification_key) VALUES (?, ?, ?, ?, 0, ?)`;
    console.log("[DEBUG] Executing SQL query:", query, "with values:", [userId, email, password, role, verificationKey]);
    const [result] = await connection.query(query, [userId, email, password, role, verificationKey]);
    const loginId = result.insertId;

    // NEW: Insert initial data into users table
    const usersQuery = `INSERT INTO users (user_id, email) VALUES (?, ?)`;
    await connection.query(usersQuery, [userId, email]);

    console.log("[DEBUG] User registered with login ID:", loginId);

    // Attempt to send the verification email with the unique verification key.
    await sendVerificationEmail(email, loginId, verificationKey);
    console.log("[DEBUG] Verification email sent, committing transaction.");
    await connection.commit();
    return loginId;
  } catch (error) {
    console.error("[ERROR] Error during registration/email sending, rolling back transaction:", error);
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("Email is already registered.");
    } else {
      throw new Error("Failed to register user.");
    }
  }
};

module.exports = {
  registerAndSendEmail,
  sendVerificationEmail,
  createToken,
};