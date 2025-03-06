const express = require("express");
const jwt = require("jsonwebtoken");
const { getConnection } = require("./db");
const router = express.Router();

router.get("/verify", async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send("Verification token is missing.");
  }
  try {
    console.log("[DEBUG] Received token:", token);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { loginId, email, jti } = payload;
    console.log("[DEBUG] Token payload:", payload);

    // Use await for getConnection to ensure a valid connection object.
    const connection = await getConnection();
    const updateQuery = "UPDATE logins SET is_verified = 1 WHERE login_id = ? AND email = ? AND verification_key = ?";
    // Use execute instead of query
    const [result] = await connection.execute(updateQuery, [loginId, email, jti]);

    if (result.affectedRows === 0) {
      throw new Error("Verification key does not match or user not found.");
    }

    console.log("[INFO] Email verification successful for login ID:", loginId);
    res.send("Email verification successful. You can now log in.");
  } catch (error) {
    console.error("[ERROR] Email verification error:", error);
    res.status(400).send("Invalid or expired token. " + error.message);
  }
});

module.exports = router;