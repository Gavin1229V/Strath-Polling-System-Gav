const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

// Test database connection
const testDatabaseConnection = async () => {
    console.log("[DEBUG] polling.js: Testing database connection...");
    try {
        await connectionPromise; // Ensure the connection is established
        const connection = getConnection(); // Get the connection

        // Test query to check if the connection is working
        const testQuery = `SELECT 1 + 1 AS solution`;
        const [rows] = await connection.query(testQuery);
        console.log("[DEBUG] Test query executed successfully:", rows);

        // Additional query to check if the polls table exists
        const checkPollsTableQuery = `SHOW TABLES LIKE 'polls'`;
        const [pollsTableRows] = await connection.query(checkPollsTableQuery);
        if (pollsTableRows.length > 0) {
            console.log("[DEBUG] Polls table exists.");

            // Fetch a row from the polls table
            const fetchPollQuery = `SELECT * FROM polls LIMIT 1`;
            const [pollRows] = await connection.query(fetchPollQuery);
            if (pollRows.length > 0) {
                console.log("[DEBUG] polling.js: Sample row from polls table:", pollRows[0]);
            } else {
                console.log("[DEBUG] No rows found in polls table.");
            }
        } else {
            console.log("[DEBUG] Polls table does not exist.");
        }
    } catch (err) {
        console.error("[ERROR] Failed to connect to MySQL:", err);
    }
};

// Call the test function immediately
testDatabaseConnection();

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
        console.log("[DEBUG] Executing query:", query);

        const [rows] = await connection.query(query);

        console.log("[DEBUG] Polls fetched:", rows);

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

        console.log("[DEBUG] Grouped polls:", polls);
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
        console.log("[DEBUG] Executing query:", query, { optionId });

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
