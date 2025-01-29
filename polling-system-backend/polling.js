const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

// Create a new poll
const createPoll = async (question, options) => {
    await connectionPromise; // Ensure the connection is established
    const connection = getConnection(); // Get the connection

    if (!question || !Array.isArray(options) || options.length < 2) {
        console.error("[DEBUG] Invalid input: question or options are not valid.", { question, options });
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    console.log("[DEBUG] Creating poll with question:", question);
    console.log("[DEBUG] Options provided:", options);

    try {
        // Insert poll into the database
        const query = `INSERT INTO polls (question) VALUES (?)`;
        const [result] = await connection.query(query, [question]);
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
    const connection = getConnection(); // Get the connection

    console.log("[DEBUG] Fetching all polls with their options");

    try {
        const query = `SELECT p.id, p.question, po.id AS option_id, po.option_index, po.option_text, po.vote_count 
                       FROM polls p 
                       LEFT JOIN poll_options po ON p.id = po.poll_id
                       ORDER BY p.id, po.option_index`;

        const [rows] = await connection.query(query);


        // Group polls and their options
        const polls = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
                acc[row.id] = { id: row.id, question: row.question, options: [] };
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
        console.error("[ERROR] Error fetching polls:", error);
        throw new Error("Failed to fetch polls.");
    }
};

// Vote for an option
const vote = async (optionId) => {
    await connectionPromise; // Ensure the connection is established
    const connection = getConnection(); // Get the connection

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

module.exports = { createPoll, getPolls, vote };
