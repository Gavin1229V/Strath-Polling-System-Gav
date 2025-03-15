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
        const voterMap = {}; // Define voterMap here
        if (allVoterIds.size > 0) {
            const voterIds = Array.from(allVoterIds);
            const [voters] = await connection.query(
                `SELECT user_id, email, profile_picture FROM users WHERE user_id IN (?)`,
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
                    options: [],
                    voters: [] // Initialize as an empty array
                };
            }
            acc[row.id].options.push({
                id: row.option_id,
                index: row.option_index,
                text: row.option_text,
                votes: row.vote_count || 0,
                voters: row.voters || ""
            });

            // Add voters to the poll object - improved handling for anonymous voters
            if (row.voters) {
                const voterIds = row.voters.split(',');
                voterIds.forEach(voterId => {
                    const trimmedId = voterId.trim();
                    if (trimmedId === "1") {
                        // For anonymous users, add a new entry each time to count them individually
                        acc[row.id].voters.push({ id: "1", username: "Anonymous" });
                    } else if (voterMap[trimmedId] && !acc[row.id].voters.some(v => v.id === trimmedId)) {
                        // For logged-in users, avoid duplicates within the poll
                        acc[row.id].voters.push(voterMap[trimmedId]);
                    }
                });
            }

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
    const connection = await getConnection();

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
    const { optionId, userId } = req.body;
    try {
        const result = await vote(optionId, userId);
        res.status(200).json({ 
            message: "Vote registered",
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;