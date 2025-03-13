const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

// Create a new poll with author and created_at
const createPoll = async (question, options, created_by, created_by_id, pollClass, expiry, global) => {
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!question || !Array.isArray(options) || options.length < 2) {
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    // Replace the old Date format with MySQL datetime format
    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
        // Updated: Insert poll with question, created_by, created_by_id, created_at, class, and expiry
        const query = `INSERT INTO polls (question, created_by, created_by_id, created_at, class, expiry) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await connection.query(query, [question, created_by, created_by_id, createdAt, pollClass, expiry]);
        const pollId = result.insertId;

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
        throw new Error("Failed to create poll.");
    }
};

// Get all polls with their options
const getPolls = async () => {
    await connectionPromise; // Ensure the connection is established
    try {
        const connection = await getConnection(); // Updated: await getConnection

        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, 
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
        console.log(`[DEBUG] Attempting vote update for option: ${optionId}`);
        // Updated: use COALESCE to ensure vote_count increments properly even if NULL
        const query = `UPDATE poll_options SET vote_count = COALESCE(vote_count, 0) + 1 WHERE id = ?`;
        const [result] = await connection.query(query, [optionId]);

        if (result.affectedRows === 0) {
            throw new Error("No option found with the given ID.");
        }
        console.log(`[INFO] Vote update succeeded for option: ${optionId}`);
    } catch (error) {
        console.error(`[ERROR] Vote update failed for option: ${optionId}`, error);
        throw new Error("Failed to register vote.");
    }
};

module.exports = { createPoll, getPolls, vote };
