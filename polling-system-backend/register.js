require("dotenv").config();
const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

function createToken(loginId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set.");
  }
  return jwt.sign({ loginId }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

// Function to send a verification email using Nodemailer
const sendVerificationEmail = async (email, loginId) => {
    console.log("[DEBUG] Preparing to send verification email to:", email);

    // Generate a JWT token with the loginId
    const token = createToken(loginId);
    const verificationUrl = `${process.env.SERVER_URL}/api/verify?token=${encodeURIComponent(token)}`;
    const subject = "Verify Your Email Address";
    const bodyText = `Please verify your email by clicking the following link: ${verificationUrl}`;

    // Create a Nodemailer transporter using SMTP configuration
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // e.g., "smtp.office365.com"
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // Set to true if using port 465
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM, // Sending from this email address
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

// Function to verify the email (update is_verified from 0 to 1)
const verifyEmail = async (token) => {
    console.log("[DEBUG] Starting email verification with token.");
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const loginId = payload.loginId;
        console.log("[DEBUG] Token verified for login ID:", loginId);

        const connection = getConnection();
        const updateQuery = "UPDATE logins SET is_verified = 1 WHERE login_id = ?";
        console.log("[DEBUG] Executing email verification SQL query:", updateQuery, "with loginId:", loginId);
        const [result] = await connection.query(updateQuery, [loginId]);

        console.log("[DEBUG] Email verified for login ID:", loginId, "Result:", result);
        return true;
    } catch (error) {
        console.error("[ERROR] Email verification error:", error);
        throw new Error("Invalid or expired token.");
    }
};

// Combined function to register a user and send verification email in one transaction
const registerAndSendEmail = async (email, password, role = 1) => {
    console.log("[DEBUG] Starting registerAndSendEmail function.");

    await connectionPromise; // Ensure the connection is established
    const connection = getConnection();
    console.log("[DEBUG] Obtained database connection:", connection.threadId || "No threadId available");

    if (!email || !password) {
        console.error("[DEBUG] Invalid input: Email or password are missing.", { email, password });
        throw new Error("Invalid input: Email and password are required.");
    }

    console.log("[DEBUG] Registering user with email:", email, "and role:", role);

    try {
        await connection.beginTransaction();
        console.log("[DEBUG] Beginning transaction.");

        console.log("[DEBUG] Preparing SQL query for inserting a new user.");
        const query = `INSERT INTO logins (user_id, email, password, role, is_verified) VALUES (?, ?, ?, ?, 0)`;
        console.log("[DEBUG] Executing SQL query:", query, "with values:", [0, email, password, role]);
        const [result] = await connection.query(query, [0, email, password, role]);
        const loginId = result.insertId;
        console.log("[DEBUG] User registered with login ID:", loginId);

        // Attempt to send the verification email
        await sendVerificationEmail(email, loginId);
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

module.exports = { registerAndSendEmail, sendVerificationEmail, verifyEmail, createToken };

// Example usage:
const sampleLoginId = 123; // Replace with your loginId
const token = createToken(sampleLoginId);
console.log("Generated token:", token);