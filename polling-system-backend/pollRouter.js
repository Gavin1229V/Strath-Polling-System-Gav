const express = require("express");
const router = express.Router();
const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

const createPoll = async (question, options, created_by, created_by_id, pollClass) => {
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!question || !Array.isArray(options) || options.length < 2) {
        console.error("[DEBUG] Invalid input: question or options are not valid.", { question, options });
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log("[DEBUG] Creating poll with question:", question);
    console.log("[DEBUG] Options provided:", options);
    console.log("[DEBUG] Poll author:", created_by);
    console.log("[DEBUG] Class:", pollClass);

    try {
        // Updated query to include created_by_id column
        const query = `INSERT INTO polls (question, created_by, created_by_id, created_at, class) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await connection.query(query, [question, created_by, created_by_id, createdAt, pollClass]);
        const pollId = result.insertId;

        console.log("[DEBUG] Poll created with ID:", pollId);

        // Insert options into the database
        const optionQueries = options.map((option, index) => {
            console.log("[DEBUG] Inserting option:", { pollId, index, option });
            return connection.query(
                `INSERT INTO poll_options (poll_id, option_index, option_text) VALUES (?, ?, ?)`,
                [pollId, index, option]
            );
        });

        await Promise.all(optionQueries);
        console.log("[DEBUG] Options inserted for poll ID:", pollId);

        return pollId;
    } catch (error) {
        console.error("[ERROR] Error creating poll:", error);
        throw new Error("Failed to create poll.");
    }
};

// Get all polls with their options
const getPolls = async () => {
    await connectionPromise; // Ensure the connection is established
    try {
        const connection = await getConnection(); // Updated: await getConnection

        console.log("[DEBUG] Fetching all polls with their options");

        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, p.class AS pollClass,
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
        console.error("[DEBUG] Invalid input: Option ID is required.");
        throw new Error("Invalid input: Option ID is required.");
    }

    console.log("[DEBUG] Registering vote for option ID:", optionId);

    try {
        const query = `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?`;

        const [result] = await connection.query(query, [optionId]);

        if (result.affectedRows === 0) {
            console.warn("[DEBUG] No option found with the given ID:", optionId);
            throw new Error("No option found with the given ID.");
        }

        console.log("[DEBUG] Vote registered for option ID:", optionId);
    } catch (error) {
        console.error("[ERROR] Error registering vote:", error);
        throw new Error("Failed to register vote.");
    }
};

// Define Express endpoints using the above functions
router.post("/", async (req, res) => {
    // Destructure "class" from req.body and rename it to pollClass
    const { question, options, created_by, created_by_id, class: pollClass } = req.body;
    try {
        const pollId = await createPoll(question, options, created_by, created_by_id, pollClass);
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