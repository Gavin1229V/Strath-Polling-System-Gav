const { connectionPromise, getConnection } = require("./db");

// Function to get all expired polls with their options
const getExpiredPolls = async () => {
    await connectionPromise;
    try {
        const connection = await getConnection();

        const query = `
            SELECT p.id, p.question, p.created_by, p.created_by_id, p.created_at, p.class, p.expiry,
                   p.year_group, p.moved_at,
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count, po.voters, po.anonymous,
                   u.profile_picture
            FROM expired_polls p 
            LEFT JOIN expired_polls_options po ON p.id = po.poll_id
            LEFT JOIN users u ON p.created_by_id = u.user_id
            ORDER BY p.moved_at DESC, p.id, po.option_index
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
                    year_group: row.year_group,
                    profile_picture: row.profile_picture 
                      ? (Buffer.isBuffer(row.profile_picture)
                          ? "data:image/png;base64," + row.profile_picture.toString("base64")
                          : row.profile_picture)
                      : null,
                    created_at: row.created_at,
                    moved_at: row.moved_at,
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
        console.error("Failed to fetch expired polls:", error);
        throw new Error("Failed to fetch expired polls: " + error.message);
    }
};

// Helper function to parse name from email (copied from polling.js)
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

// Function to move expired polls to the expired polls table
const moveExpiredPoll = async (pollId) => {
    await connectionPromise;
    try {
        const connection = await getConnection();
        
        // Start a transaction
        await connection.beginTransaction();
        
        try {
            // Get poll data
            const [pollRows] = await connection.query(
                `SELECT * FROM polls WHERE id = ?`,
                [pollId]
            );
            
            if (pollRows.length === 0) {
                throw new Error(`Poll with ID ${pollId} not found`);
            }
            
            const poll = pollRows[0];
            
            // Get poll options
            const [optionRows] = await connection.query(
                `SELECT * FROM poll_options WHERE poll_id = ?`,
                [pollId]
            );
            
            // Insert into expired_polls
            await connection.query(
                `INSERT INTO expired_polls (id, question, created_by, created_by_id, created_at, class, expiry, year_group, moved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [poll.id, poll.question, poll.created_by, poll.created_by_id, poll.created_at, poll.class, poll.expiry, poll.year_group]
            );
            
            // Insert options
            for (const option of optionRows) {
                await connection.query(
                    `INSERT INTO expired_polls_options (id, poll_id, option_index, option_text, vote_count, voters, anonymous)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [option.id, option.poll_id, option.option_index, option.option_text, option.vote_count, option.voters, option.anonymous]
                );
            }
            
            // Delete from original tables
            await connection.query(
                `DELETE FROM poll_options WHERE poll_id = ?`,
                [pollId]
            );
            
            await connection.query(
                `DELETE FROM polls WHERE id = ?`,
                [pollId]
            );
            
            // Commit the transaction
            await connection.commit();
            
            return { success: true };
        } catch (error) {
            // Rollback on error
            await connection.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Failed to move expired poll:", error);
        throw new Error("Failed to move expired poll: " + error.message);
    }
};

// Function to check and move all expired polls
const checkAndMoveExpiredPolls = async () => {
    await connectionPromise;
    try {
        const connection = await getConnection();
        
        // Find all expired polls that haven't been moved yet
        // Added index check for optimization when running every minute
        const [expiredPolls] = await connection.query(
            `SELECT id FROM polls 
             WHERE expiry < NOW() 
             ORDER BY id 
             LIMIT 10`  // Process in batches to avoid long-running transactions
        );
        
        if (expiredPolls.length === 0) {
            // Return early if no expired polls
            return { total: 0, moved: 0 };
        }
        
        console.log(`Found ${expiredPolls.length} expired polls to move`);
        
        // Move each expired poll
        let movedCount = 0;
        for (const poll of expiredPolls) {
            try {
                await moveExpiredPoll(poll.id);
                movedCount++;
            } catch (error) {
                console.error(`Error moving poll ${poll.id}:`, error);
            }
        }
        
        return { total: expiredPolls.length, moved: movedCount };
    } catch (error) {
        console.error("Failed to check and move expired polls:", error);
        throw new Error("Failed to check and move expired polls: " + error.message);
    }
};

module.exports = { getExpiredPolls, moveExpiredPoll, checkAndMoveExpiredPolls };
