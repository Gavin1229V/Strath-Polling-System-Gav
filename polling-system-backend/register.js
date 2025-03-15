require("dotenv").config();
const { connectionPromise, getConnection } = require("./db");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

function generateUniqueUserId() {
  return Math.floor(10000000 + Math.random() * 90000000);
}

function createToken(loginId, email, verificationKey) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set.");
  }
  return jwt.sign({ loginId, email, jti: verificationKey }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

const sendVerificationEmail = async (email, loginId, verificationKey) => {
  const token = createToken(loginId, email, verificationKey);
  const verificationUrl = `${process.env.SERVER_URL}/api/verify?token=${encodeURIComponent(token)}`;
  const subject = "Verify Your Email Address";
  const bodyText = `Please verify your email by clicking the following link: ${verificationUrl}`;

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
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: subject,
      text: bodyText,
      html: `<p>${bodyText}</p>`,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

const registerAndSendEmail = async (email, password, role = 1) => {
  const connection = await getConnection();

  // Override the role based on email domain.
  const emailLower = email.toLowerCase();
  if (emailLower.endsWith("@uni.strath.ac.uk")) {
    role = 1; // Student
  } else if (emailLower.endsWith("@strath.ac.uk")) {
    role = 3; // Lecturer
  }

  // Generate a unique 8-digit user_id.
  const userId = generateUniqueUserId();
  const verificationKey = crypto.randomBytes(16).toString("hex");

  try {
    await connection.beginTransaction();

    // Insert the new user with the unique user_id and verification key.
    // Removed role from logins table
    const query = `INSERT INTO logins (user_id, email, password, is_verified, verification_key) VALUES (?, ?, ?, 0, ?)`;
    const [result] = await connection.query(query, [userId, email, password, verificationKey]);
    const loginId = result.insertId;

    // Insert initial data into users table with role
    const usersQuery = `INSERT INTO users (user_id, email, role) VALUES (?, ?, ?)`;
    await connection.query(usersQuery, [userId, email, role]);

    await sendVerificationEmail(email, loginId, verificationKey);
    await connection.commit();
    return loginId;
  } catch (error) {
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