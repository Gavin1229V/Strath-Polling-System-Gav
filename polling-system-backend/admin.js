const express = require('express');
const { connectionPromise, getConnection } = require('./db'); // Import MySQL connection and connection promise

const router = express.Router();

// Middleware to ensure database connection
router.use(async (req, res, next) => {
    try {
        await connectionPromise; // Ensure the connection is established
        next();
    } catch (err) {
        console.error("[ERROR] Database connection failed:", err);
        res.status(500).send("Database connection failed");
    }
});

// Route to view all polls
router.get('/polls', async (req, res) => {
    try {
        const connection = getConnection();
        const [polls] = await connection.query('SELECT * FROM polls');
        res.json(polls);
    } catch (err) {
        console.error("[ERROR] Failed to fetch polls:", err);
        res.status(500).send("Failed to fetch polls");
    }
});

// Route to delete a poll by ID
router.delete('/polls/:id', async (req, res) => {
    const pollId = req.params.id;
    try {
        const connection = getConnection();
        await connection.query('DELETE FROM polls WHERE id = ?', [pollId]);
        res.send(`Poll with ID ${pollId} deleted successfully`);
    } catch (err) {
        console.error(`[ERROR] Failed to delete poll with ID ${pollId}:`, err);
        res.status(500).send(`Failed to delete poll with ID ${pollId}`);
    }
});

module.exports = router;