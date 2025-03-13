const express = require("express");
const router = express.Router();
const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

const createPoll = async (question, options, created_by, created_by_id, pollClass, expiry) => {
    console.log("createPoll called with expiry:", expiry); // <--- Extra log added
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!question || !Array.isArray(options) || options.length < 2) {
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log("Created at:", createdAt); // <--- Log the createdAt timestamp

    try {
        // Updated query uses STR_TO_DATE to convert expiry string into DATETIME
        const query = `INSERT INTO polls (question, created_by, created_by_id, created_at, class, expiry) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'))`;
        // Log before executing the query:
        console.log("Executing insert query with expiry:", expiry);
        const [result] = await connection.query(query, [question, created_by, created_by_id, createdAt, pollClass, expiry]);
        const pollId = result.insertId;
        console.log("Poll inserted with id:", pollId);

        // Detailed logging for expiry calculations
        console.log(`Received expiry: ${expiry}`);
        const expiryDate = new Date(expiry);
        const now = new Date();
        console.log("Computed expiryDate:", expiryDate, "Current time:", now);
        const diffMs = expiryDate - now;
        console.log("Difference in ms:", diffMs);
        const seconds = Math.floor((diffMs/1000) % 60);
        const minutes = Math.floor((diffMs/60000) % 60);
        const hours = Math.floor((diffMs/(1000*60*60)) % 24);
        const days = Math.floor(diffMs/(1000*60*60*24));
        console.log(`Poll ${pollId} created. Time left: ${days}d ${hours}h ${minutes}m ${seconds}s`);

        // Insert options into the database
        const optionQueries = options.map((option, index) => {
            return connection.query(
                `INSERT INTO poll_options (poll_id, option_index, option_text) VALUES (?, ?, ?)`,
                [pollId, index, option]
            );
        });

        await Promise.all(optionQueries);

        return pollId;
    } catch (error) {
        console.error("Error in createPoll:", error);
        throw new Error("Failed to create poll.");
    }
};

// Get all polls with their options
const getPolls = async () => {
    await connectionPromise; // Ensure the connection is established
    try {
        const connection = await getConnection();
        // Removed debug log to prevent spam
        // console.log("[DEBUG] Fetching all polls with their options");

        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, p.class AS pollClass, p.expiry,
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count,
                   u.profile_picture
            FROM polls p 
            LEFT JOIN poll_options po ON p.id = po.poll_id
            LEFT JOIN users u ON p.created_by_id = u.user_id
            ORDER BY p.id, po.option_index
        `;

        const [rows] = await connection.query(query);

        // Convert BLOB profile_picture to base64 URL if needed before grouping polls
        const polls = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
                acc[row.id] = { 
                    id: row.id, 
                    question: row.question, 
                    created_by: row.created_by,
                    created_by_id: row.created_by_id,
                    pollClass: row.pollClass || "", // new field for poll class
                    expiry: row.expiry, // <--- add expiry field here
                    profile_picture: row.profile_picture 
                      ? (Buffer.isBuffer(row.profile_picture)
                          ? "data:image/png;base64," + row.profile_picture.toString("base64")
                          : row.profile_picture)
                      : null,
                    created_at: row.created_at,
                    options: [] 
                };
            }
            acc[row.id].options.push({
                id: row.option_id,
                index: row.option_index,
                text: row.option_text,
                votes: row.vote_count || 0,
            });
            return acc;
        }, {});

        return Object.values(polls);
    } catch (error) {
        console.error("Failed to fetch polls on connection:", error);
        throw new Error("Failed to fetch polls.");
    }
};

// Vote for an option
const vote = async (optionId) => {
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!optionId) {
        throw new Error("Invalid input: Option ID is required.");
    }

    try {
        const query = `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?`;

        const [result] = await connection.query(query, [optionId]);

        if (result.affectedRows === 0) {
            throw new Error("No option found with the given ID.");
        }
    } catch (error) {
        throw new Error("Failed to register vote.");
    }
};

// Define Express endpoints using the above functions
router.post("/", async (req, res) => {
    // Destructure expiry from req.body along with pollClass
    const { question, options, created_by, created_by_id, class: pollClass, expiry } = req.body;
    try {
        const pollId = await createPoll(question, options, created_by, created_by_id, pollClass, expiry);
        res.status(201).json({ pollId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const polls = await getPolls();
        res.json(polls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/vote", async (req, res) => {
    const { optionId } = req.body;
    try {
        await vote(optionId);
        res.status(200).json({ message: "Vote registered" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;