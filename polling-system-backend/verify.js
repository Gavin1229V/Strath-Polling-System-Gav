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
    // Decode the token to retrieve loginId, email, and the unique verification key (jti)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { loginId, email, jti } = payload;
    console.log("[DEBUG] Token verified for login ID:", loginId, "and email:", email, "with unique key:", jti);

    const connection = getConnection();
    // Update the user's record
    const updateQuery = "UPDATE logins SET is_verified = 1 WHERE login_id = ? AND email = ? AND verification_key = ?";
    console.log("[DEBUG] Executing email verification SQL query:", updateQuery, "with values:", loginId, email, jti);
    const [result] = await connection.query(updateQuery, [loginId, email, jti]);

    // Check if a record was updated.
    if (result.affectedRows === 0) {
      throw new Error("Verification key does not match or user not found.");
    }

    console.log("[INFO] Email verification successful for login ID:", loginId);
    res.send("Email verification successful. You can now log in.");
  } catch (error) {
    console.error("[ERROR] Email verification error:", error);
    res.status(400).send("Invalid or expired token.");
  }
});

module.exports = router;