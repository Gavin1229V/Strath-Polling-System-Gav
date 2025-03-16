const { connectionPromise, getConnection } = require("./db");

// Create a new poll
const createPoll = async (question, options, created_by, created_by_id, pollClass, expiry) => {
    await connectionPromise;
    const connection = await getConnection();

    if (!question || !Array.isArray(options) || options.length < 2) {
        throw new Error("Invalid input: Poll must have a question and at least two options.");
    }

    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
        const query = `INSERT INTO polls (question, created_by, created_by_id, created_at, class, expiry) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await connection.query(query, [question, created_by, created_by_id, createdAt, pollClass, expiry]);
        const pollId = result.insertId;

        // Insert options into the database
        await Promise.all(options.map((option, index) => {
            return connection.query(
                `INSERT INTO poll_options (poll_id, option_index, option_text) VALUES (?, ?, ?)`,
                [pollId, index, option]
            );
        }));

        return pollId;
    } catch (error) {
        throw new Error("Failed to create poll.");
    }
};

// Get all polls with their options
const getPolls = async () => {
    await connectionPromise;
    try {
        const connection = await getConnection();

        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, p.class, p.expiry,
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count, po.voters, po.anonymous,
                   u.profile_picture
            FROM polls p 
            LEFT JOIN poll_options po ON p.id = po.poll_id
            LEFT JOIN users u ON p.created_by_id = u.user_id
            ORDER BY p.id, po.option_index
        `;

        const [rows] = await connection.query(query);

        // Extract voter IDs
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
                `SELECT user_id, email, profile_picture FROM users WHERE user_id IN (?)`,
                [voterIds]
            );
            
            voters.forEach(voter => {
                const nameParts = parseNameFromEmail(voter.email || "");
                
                voterMap[voter.user_id] = {
                    id: voter.user_id,
                    username: voter.username,
                    first_name: nameParts.firstName,
                    last_name: nameParts.lastName,
                    email: voter.email,
                    profile_picture: voter.profile_picture
                        ? Buffer.isBuffer(voter.profile_picture)
                            ? "data:image/png;base64," + voter.profile_picture.toString("base64")
                            : voter.profile_picture
                        : null
                };
            });
        }

        // Group polls by ID
        const polls = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
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
                    voters: []
                };
            }
            
            acc[row.id].options.push({
                id: row.option_id,
                index: row.option_index,
                text: row.option_text,
                votes: row.vote_count || 0,
                voters: row.voters || "",
                anonymous: row.anonymous || ""
            });

            return acc;
        }, {});
        
        // Process voters for each poll
        Object.values(polls).forEach(poll => {
            const pollOptions = rows.filter(r => r.id === poll.id);
            
            pollOptions.forEach(row => {
                if (row.voters) {
                    const voterIds = row.voters.split(',');
                    const anonymousFlags = row.anonymous ? row.anonymous.split(',') : [];
                    
                    while (anonymousFlags.length < voterIds.length) {
                        anonymousFlags.push('0');
                    }
                    
                    voterIds.forEach((voterId, index) => {
                        const trimmedId = voterId.trim();
                        const isAnonymous = anonymousFlags[index] === '1';
                        
                        const existingVoterIndex = poll.voters.findIndex(v => v.id === trimmedId);
                        
                        if (existingVoterIndex === -1) {
                            poll.voters.push({
                                id: trimmedId,
                                first_name: voterMap[trimmedId]?.first_name || "",
                                last_name: voterMap[trimmedId]?.last_name || "",
                                email: voterMap[trimmedId]?.email || "",
                                username: voterMap[trimmedId]?.username || (isAnonymous ? "Anonymous" : `User ${trimmedId}`),
                                profile_picture: voterMap[trimmedId]?.profile_picture,
                                isAnonymous: isAnonymous
                            });
                        }
                    });
                }
            });
        });

        return Object.values(polls);
    } catch (error) {
        console.error("Failed to fetch polls:", error);
        throw new Error("Failed to fetch polls.");
    }
};

// Helper function to parse name from email
function parseNameFromEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return { firstName: "", lastName: "" };
    }
    
    try {
        const localPart = email.split('@')[0];
        const parts = localPart.split('.');
        
        if (parts.length >= 2) {
            let firstName = parts[0];
            let lastName = parts[1];
            
            lastName = lastName.replace(/\d+$/, '');
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
            
            return { firstName, lastName };
        } else {
            return { firstName: localPart, lastName: "" };
        }
    } catch (e) {
        return { firstName: "", lastName: "" };
    }
}

// Vote for an option
const vote = async (optionId, userId, isAnonymous = 0) => {
    await connectionPromise;
    const connection = await getConnection();

    if (!optionId || !userId) {
        throw new Error("Invalid input: Option ID and User ID are required.");
    }

    try {
        // Get poll_id and current vote data
        const [optionRows] = await connection.query(
            `SELECT poll_id, vote_count, voters, anonymous FROM poll_options WHERE id = ?`,
            [optionId]
        );

        if (optionRows.length === 0) {
            throw new Error("No option found with the given ID.");
        }

        const pollId = optionRows[0].poll_id;

        // Check if user already voted in this poll
        const [allPollOptions] = await connection.query(
            `SELECT id, voters FROM poll_options WHERE poll_id = ?`,
            [pollId]
        );
        
        for (const option of allPollOptions) {
            const votersList = option.voters ? option.voters.split(',').map(v => v.trim()) : [];
            
            if (votersList.includes(userId.toString())) {
                return { alreadyVoted: true, message: "You have already voted in this poll" };
            }
        }

        // Add current vote
        const currentVoters = optionRows[0].voters ? optionRows[0].voters.split(',') : [];
        const currentAnonymous = optionRows[0].anonymous ? optionRows[0].anonymous.split(',') : [];
        
        currentVoters.push(userId.toString());
        currentAnonymous.push(isAnonymous.toString());
        
        const newVoters = currentVoters.join(',');
        const newAnonymous = currentAnonymous.join(',');
        
        const query = `UPDATE poll_options 
                      SET vote_count = COALESCE(vote_count, 0) + 1, 
                          voters = ?, 
                          anonymous = ?
                      WHERE id = ?`;
        await connection.query(query, [newVoters, newAnonymous, optionId]);

        return { success: true };
    } catch (error) {
        throw new Error("Failed to register vote: " + error.message);
    }
};

module.exports = { createPoll, getPolls, vote };
