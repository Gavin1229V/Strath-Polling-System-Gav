const express = require('express');
const router = express.Router();
const { verifyEmail } = require('./register');

router.get('/verify', async (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send("Verification token is missing.");
    }
    try {
        const verified = await verifyEmail(token);
        if (verified) {
            res.send("Email verification successful. You can now log in.");
        } else {
            res.status(400).send("Email verification failed.");
        }
    } catch (error) {
        console.error("[ERROR] Verification error:", error);
        res.status(400).send("Invalid or expired token.");
    }
});

module.exports = router;