const express = require("express");
const router = express.Router();
const { getConnection } = require("./db"); // Import MySQL connection

/**
 * Creates a new poll in the database
 */
const createPoll = async (question, options, created_by, created_by_id, pollClass, expiry) => {
    const connection = await getConnection();

    if (!question || !Array.isArray(options) || options.length < 2) {
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
        // Insert the poll with proper datetime formatting for the expiry
        const query = `INSERT INTO polls (question, created_by, created_by_id, created_at, class, expiry) 
                       VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'))`;
        const [result] = await connection.query(query, [
            question, created_by, created_by_id, createdAt, pollClass, expiry
        ]);
        const pollId = result.insertId;

        // Insert all options for this poll
        await Promise.all(options.map((option, index) => {
            return connection.query(
                `INSERT INTO poll_options (poll_id, option_index, option_text) VALUES (?, ?, ?)`,
                [pollId, index, option]
            );
        }));

        return pollId;
    } catch (error) {
        console.error("Error in createPoll:", error);
        throw new Error("Failed to create poll.");
    }
};

// Get all polls with their options
const getPolls = async () => {
    try {
        const connection = await getConnection();

        // Join polls with poll_options and users tables to get all needed data
        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, 
                   p.class AS pollClass, p.expiry,
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count,
                   u.profile_picture
            FROM polls p 
            LEFT JOIN poll_options po ON p.id = po.poll_id
            LEFT JOIN users u ON p.created_by_id = u.user_id
            ORDER BY p.id, po.option_index
        `;

        const [rows] = await connection.query(query);

        // Group options by poll and convert profile picture to proper format
        const polls = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
                acc[row.id] = { 
                    id: row.id, 
                    question: row.question, 
                    created_by: row.created_by,
                    created_by_id: row.created_by_id,
                    pollClass: row.pollClass || "",
                    expiry: row.expiry,
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
        console.error("Failed to fetch polls:", error);
        throw new Error("Failed to fetch polls.");
    }
};

// Vote for an option
const vote = async (optionId) => {
    const connection = await getConnection();

    if (!optionId) {
        throw new Error("Invalid input: Option ID is required.");
    }

    try {
        // Use COALESCE to handle NULL vote counts
        const query = `UPDATE poll_options SET vote_count = COALESCE(vote_count, 0) + 1 WHERE id = ?`;
        const [result] = await connection.query(query, [optionId]);

        if (result.affectedRows === 0) {
            throw new Error("No option found with the given ID.");
        }
    } catch (error) {
        console.error(`Vote update failed for option: ${optionId}`, error);
        throw new Error("Failed to register vote.");
    }
};

// API Routes
router.post("/", async (req, res) => {
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