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
                   po.id AS option_id, po.option_index, po.option_text, po.vote_count, po.voters, po.anonymous,
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
        
        // Fetch user info for all voters - remove non-existent columns
        const voterMap = {};
        if (allVoterIds.size > 0) {
            const voterIds = Array.from(allVoterIds);
            const [voters] = await connection.query(
                `SELECT user_id, email, profile_picture FROM users WHERE user_id IN (?)`,
                [voterIds]
            );
            
            voters.forEach(voter => {
                // Parse name from email (format: firstname.lastname.number@...)
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
                    voters: [] // Initialize as an empty array
                };
            }
            acc[row.id].options.push({
                id: row.option_id,
                index: row.option_index,
                text: row.option_text,
                votes: row.vote_count || 0,
                voters: row.voters || "",
                anonymous: row.anonymous || ""  // Add anonymous flags
            });

            // Don't add voters here - we'll collect them separately after processing all rows
            return acc;
        }, {});
        
        // Now process all voters for each poll after all options have been added
        Object.values(polls).forEach(poll => {
            // Get all options for this poll
            const pollOptions = rows.filter(r => r.id === poll.id);
            
            // Process each option's voters with their anonymous status
            pollOptions.forEach(row => {
                if (row.voters) {
                    const voterIds = row.voters.split(',');
                    const anonymousFlags = row.anonymous ? row.anonymous.split(',') : [];
                    
                    // Make sure we have matching anonymous flags (or default to 0)
                    while (anonymousFlags.length < voterIds.length) {
                        anonymousFlags.push('0');
                    }
                    
                    voterIds.forEach((voterId, index) => {
                        const trimmedId = voterId.trim();
                        const isAnonymous = anonymousFlags[index] === '1';
                        
                        // Only add each voter once, prioritizing their first appearance
                        const existingVoterIndex = poll.voters.findIndex(v => v.id === trimmedId);
                        
                        if (existingVoterIndex === -1) {
                            // Add new voter with name from parsed email
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
            
            console.log(`[DEBUG] Poll ${poll.id} final voters list structure:`, JSON.stringify(poll.voters.map(v => ({
                id: v.id, 
                username: v.username,
                isAnonymous: v.isAnonymous
            }))));
        });

        return Object.values(polls);
    } catch (error) {
        console.error("Failed to fetch polls:", error);
        throw new Error("Failed to fetch polls.");
    }
};

// Helper function to parse first and last name from email address
function parseNameFromEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return { firstName: "", lastName: "" };
    }
    
    try {
        // Extract the part before the @ symbol
        const localPart = email.split('@')[0];
        
        // Split by dots and remove any numeric suffix
        const parts = localPart.split('.');
        
        // Handle different email formats
        if (parts.length >= 2) {
            // Format: firstname.lastname.number@... or firstname.lastname@...
            let firstName = parts[0];
            let lastName = parts[1];
            
            // Check if lastName contains numbers at the end and remove them
            lastName = lastName.replace(/\d+$/, '');
            
            // Capitalize first letter
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
            
            return { firstName, lastName };
        } else {
            // Format: username@... with no dots
            return { firstName: localPart, lastName: "" };
        }
    } catch (e) {
        console.error("Error parsing email:", e);
        return { firstName: "", lastName: "" };
    }
}

// Vote for an option
const vote = async (optionId, userId, isAnonymous = 0) => {
    await connectionPromise; // Ensure the connection is established
    const connection = await getConnection(); // Updated: await getConnection

    if (!optionId || !userId) {
        throw new Error("Invalid input: Option ID and User ID are required.");
    }

    try {
        console.log(`[DEBUG] Attempting vote for option: ${optionId} by user: ${userId}, anonymous: ${isAnonymous}`);
        
        // First, get the poll_id for this option along with current vote data
        const [optionRows] = await connection.query(
            `SELECT poll_id, vote_count, voters, anonymous FROM poll_options WHERE id = ?`,
            [optionId]
        );

        if (optionRows.length === 0) {
            console.log(`[ERROR] No option found with ID ${optionId}`);
            throw new Error("No option found with the given ID.");
        }

        const pollId = optionRows[0].poll_id;
        console.log(`[DEBUG] Found poll_id: ${pollId} for option: ${optionId}`);

        // Fetch all options for this poll to check for existing votes
        const [allPollOptions] = await connection.query(
            `SELECT id, voters FROM poll_options WHERE poll_id = ?`,
            [pollId]
        );
        
        console.log(`[DEBUG] Found ${allPollOptions.length} options for poll ${pollId}`);
        
        // Check if this user has already voted in this poll
        let userAlreadyVoted = false;
        let alreadyVotedOptionId = null;
        
        for (const option of allPollOptions) {
            const votersList = option.voters ? option.voters.split(',').map(v => v.trim()) : [];
            
            if (votersList.includes(userId.toString())) {
                userAlreadyVoted = true;
                alreadyVotedOptionId = option.id;
                console.log(`[DEBUG] User ${userId} already voted for option ${option.id} in this poll`);
                break;
            }
        }
        
        if (userAlreadyVoted) {
            console.log(`[INFO] User ${userId} already voted in poll ${pollId} (option: ${alreadyVotedOptionId})`);
            return { alreadyVoted: true, message: "You have already voted in this poll" };
        }

        // Add current vote - update both voters and anonymous columns
        const currentVoters = optionRows[0].voters ? optionRows[0].voters.split(',') : [];
        const currentAnonymous = optionRows[0].anonymous ? optionRows[0].anonymous.split(',') : [];
        
        currentVoters.push(userId.toString());
        currentAnonymous.push(isAnonymous.toString());
        
        const newVoters = currentVoters.join(',');
        const newAnonymous = currentAnonymous.join(',');
        
        console.log(`[DEBUG] Updating option ${optionId} with user ${userId}, anonymous ${isAnonymous}`);
        console.log(`[DEBUG] New voters: ${newVoters}`);
        console.log(`[DEBUG] New anonymous flags: ${newAnonymous}`);
        
        const query = `UPDATE poll_options 
                      SET vote_count = COALESCE(vote_count, 0) + 1, 
                          voters = ?, 
                          anonymous = ?
                      WHERE id = ?`;
        const [result] = await connection.query(query, [newVoters, newAnonymous, optionId]);

        console.log(`[INFO] Vote successful for option: ${optionId} by user: ${userId}, anonymous: ${isAnonymous}, affected rows: ${result.affectedRows}`);
        return { success: true };
    } catch (error) {
        console.error(`[ERROR] Vote failed for option: ${optionId} by user: ${userId}:`, error);
        throw new Error("Failed to register vote: " + error.message);
    }
};

module.exports = { createPoll, getPolls, vote };
