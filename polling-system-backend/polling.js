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
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, p.class, p.expiry,
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count, po.voters,
                   u.profile_picture
            FROM polls p 
            LEFT JOIN poll_options po ON p.id = po.poll_id
            LEFT JOIN users u ON p.created_by_id = u.user_id
            ORDER BY p.id, po.option_index
        `;

        const [rows] = await connection.query(query);

        // Get all voter information for these polls
        const allVoterIds = new Set();
        rows.forEach(row => {
            if (row.voters) {
                row.voters.split(',').forEach(id => {
                    if (id && id.trim()) allVoterIds.add(id.trim());
                });
            }
        });
        
        // Fetch user info for all voters
        const voterMap = {};
        if (allVoterIds.size > 0) {
            const voterIds = Array.from(allVoterIds);
            const [voters] = await connection.query(
                `SELECT user_id, username, profile_picture FROM users WHERE user_id IN (?)`,
                [voterIds]
            );
            
            voters.forEach(voter => {
                voterMap[voter.user_id] = {
                    id: voter.user_id,
                    username: voter.username,
                    profile_picture: voter.profile_picture
                        ? Buffer.isBuffer(voter.profile_picture)
                            ? "data:image/png;base64," + voter.profile_picture.toString("base64")
                            : voter.profile_picture
                        : null
                };
            });
        }

        // Convert BLOB profile_picture to base64 URL if needed before grouping polls
        const polls = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
                // Create a set of unique voter IDs across all options in this poll
                const pollVoterIds = new Set();
                rows
                    .filter(r => r.id === row.id && r.voters)
                    .forEach(r => {
                        r.voters.split(',').forEach(id => {
                            if (id && id.trim()) pollVoterIds.add(id.trim());
                        });
                    });
                
                // Map voter IDs to voter objects with profile pictures
                const voters = Array.from(pollVoterIds)
                    .map(id => voterMap[id] || { id })
                    .filter(voter => voter);
                
                acc[row.id] = { 
                    id: row.id, 
                    question: row.question, 
                    created_by: row.created_by,
                    created_by_id: row.created_by_id,
                    pollClass: row.class || "",
                    expiry: row.expiry,
                    profile_picture: row.profile_picture 
                      ? (Buffer.isBuffer(row.profile_picture)
                          ? "data:image/png;base64," + row.profile_picture.toString("base64")
                          : row.profile_picture)
                      : null,
                    created_at: row.created_at,
                    options: [],
                    voters: voters // Add voters array to poll object
                };
            }
            acc[row.id].options.push({
                id: row.option_id,
                index: row.option_index,
                text: row.option_text,
                votes: row.vote_count || 0,
                voters: row.voters || ""
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
const vote = async (optionId, userId) => {
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!optionId || !userId) {
        throw new Error("Invalid input: Option ID and User ID are required.");
    }

    try {
        console.log(`[DEBUG] Attempting vote update for option: ${optionId} by user: ${userId}`);
        
        // First, get current voters list for this option
        const [optionRows] = await connection.query(
            `SELECT vote_count, voters FROM poll_options WHERE id = ?`,
            [optionId]
        );

        if (optionRows.length === 0) {
            throw new Error("No option found with the given ID.");
        }

        const currentVoters = optionRows[0].voters ? optionRows[0].voters.split(',') : [];
        
        // Check if user already voted for this option
        if (currentVoters.includes(userId.toString())) {
            console.log(`[INFO] User ${userId} already voted for option ${optionId}`);
            return { alreadyVoted: true };
        }

        // Add user to voters list and update vote count
        currentVoters.push(userId.toString());
        const newVoters = currentVoters.join(',');
        
        const query = `UPDATE poll_options 
                      SET vote_count = COALESCE(vote_count, 0) + 1, 
                          voters = ? 
                      WHERE id = ?`;
        const [result] = await connection.query(query, [newVoters, optionId]);

        console.log(`[INFO] Vote update succeeded for option: ${optionId} by user: ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`[ERROR] Vote update failed for option: ${optionId}`, error);
        throw new Error("Failed to register vote.");
    }
};

module.exports = { createPoll, getPolls, vote };
