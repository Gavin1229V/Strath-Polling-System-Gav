const express = require("express");
const router = express.Router();
const { getConnection } = require("./db");


// Get all elections
router.get("/", async (req, res) => {
  try {
    const connection = await getConnection();
    const [elections] = await connection.query(`
      SELECT e.*, 
        COUNT(c.id) AS candidate_count,
        u.email AS creator_email,
        e.year_group,
        e.end_date < NOW() AS is_expired,
        (SELECT c2.id FROM election_candidates c2 
         LEFT JOIN election_votes v ON c2.id = v.candidate_id 
         WHERE c2.election_id = e.id 
         GROUP BY c2.id 
         ORDER BY COUNT(v.id) DESC 
         LIMIT 1) AS winner_id
      FROM elections e
      LEFT JOIN election_candidates c ON e.id = c.election_id
      LEFT JOIN users u ON e.created_by = u.user_id
      GROUP BY e.id
      ORDER BY e.end_date DESC
    `);
    
    res.json(elections);
  } catch (error) {
    console.error("Error fetching elections:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific election with candidates
router.get("/:id", async (req, res) => {
  try {
    const connection = await getConnection();
    const [elections] = await connection.query(`
      SELECT *, end_date < NOW() as is_expired FROM elections WHERE id = ?
    `, [req.params.id]);
    
    if (elections.length === 0) {
      return res.status(404).json({ error: "Election not found" });
    }
    
    const election = elections[0];
    const isExpired = election.is_expired === 1;
    
    // For expired elections, only get the winning candidate
    if (isExpired) {
      const [candidates] = await connection.query(`
        SELECT c.*, u.email, u.profile_picture, u.year_group,
          COUNT(v.id) AS vote_count
        FROM election_candidates c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN election_votes v ON c.id = v.candidate_id
        WHERE c.election_id = ?
        GROUP BY c.id
        ORDER BY vote_count DESC
        LIMIT 1
      `, [req.params.id]);

      // Convert profile pictures to base64 if needed
      candidates.forEach(candidate => {
        if (candidate.profile_picture && Buffer.isBuffer(candidate.profile_picture)) {
          candidate.profile_picture = "data:image/png;base64," + candidate.profile_picture.toString("base64");
        }
      });
      
      election.candidates = candidates;
      election.winner = candidates.length > 0 ? candidates[0] : null;
      
      // Update the winner's role to 2 (representative) if we have a winner
      // and they haven't been marked as winner yet
      if (election.winner && candidates.length > 0) {
        // Check if the winner already has role set to 2
        const [winnerRole] = await connection.query(`
          SELECT role, winner_updated 
          FROM users u
          LEFT JOIN elections e ON e.id = ? 
          WHERE u.user_id = ?
        `, [election.id, candidates[0].user_id]);
        
        // If winner needs role update and hasn't been marked as updated for this election
        if (winnerRole.length > 0 && 
            winnerRole[0].role !== 2 && 
            !winnerRole[0].winner_updated) {
          
          // Update the user role to 2 (representative)
          await connection.query(`
            UPDATE users 
            SET role = 2 
            WHERE user_id = ?
          `, [candidates[0].user_id]);
          
          // Mark this election as having updated its winner
          await connection.query(`
            UPDATE elections 
            SET winner_updated = 1 
            WHERE id = ?
          `, [election.id]);
          
          console.log(`[INFO] Updated user ${candidates[0].user_id} role to representative after winning election ${election.id}`);
        }
      }
    } else {
      // For active elections, get all candidates
      const [candidates] = await connection.query(`
        SELECT c.*, u.email, u.profile_picture, u.year_group,
          COUNT(v.id) AS vote_count
        FROM election_candidates c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN election_votes v ON c.id = v.candidate_id
        WHERE c.election_id = ?
        GROUP BY c.id
        ORDER BY vote_count DESC
      `, [req.params.id]);
      
      // Convert profile pictures to base64 if needed
      candidates.forEach(candidate => {
        if (candidate.profile_picture && Buffer.isBuffer(candidate.profile_picture)) {
          candidate.profile_picture = "data:image/png;base64," + candidate.profile_picture.toString("base64");
        }
      });
      
      election.candidates = candidates;
    }
    
    res.json(election);
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new election
router.post("/", async (req, res) => {
  console.log("[INFO] Creating new election:", req.body);
  
  try {
    // Extract user information from the request body
    const { title, description, end_date, year_group, userId } = req.body;
    
    // Validate all required fields
    if (!title) {
      return res.status(400).json({ error: "Election title is required" });
    }
    
    if (!end_date) {
      return res.status(400).json({ error: "End date is required" });
    }
    
    if (!year_group) {
      return res.status(400).json({ error: "Year group is required" });
    }
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const connection = await getConnection();
    
    // Check if an active election already exists for this year group
    const [existingElections] = await connection.query(
      "SELECT * FROM elections WHERE year_group = ? AND end_date > NOW()",
      [year_group]
    );
    
    if (existingElections.length > 0) {
      return res.status(400).json({ 
        error: `An active election for Year ${year_group} already exists. Only one active election per year group is allowed.`
      });
    }
    
    // Only verify the user exists (removed role check)
    const [userCheck] = await connection.query(
      "SELECT * FROM users WHERE user_id = ?",
      [userId]
    );
    
    if (userCheck.length === 0) {
      return res.status(403).json({ error: "User not found" });
    }
    
    // Validate that the year group is between 1 and 5
    if (year_group < 1 || year_group > 5) {
      return res.status(400).json({ error: "Year group must be between 1 and 5" });
    }
    
    // Format the end date properly for MySQL
    let formattedEndDate;
    try {
      // Try to format the date for MySQL (YYYY-MM-DD HH:MM:SS)
      const endDate = new Date(end_date);
      formattedEndDate = endDate.toISOString().slice(0, 19).replace('T', ' ');
      console.log("[INFO] Formatted end date:", formattedEndDate);
    } catch (dateError) {
      console.error("[ERROR] Invalid date format:", dateError);
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    console.log("[INFO] Inserting election with values:", {
      title,
      description: description || null,
      created_by: userId,
      end_date: formattedEndDate,
      year_group
    });
    
    const [result] = await connection.query(
      `INSERT INTO elections (title, description, created_by, end_date, year_group)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, userId, formattedEndDate, year_group]
    );
    
    console.log("[INFO] Election created successfully with ID:", result.insertId);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("[ERROR] Error creating election:", error);
    // Send detailed error for debugging
    res.status(500).json({ 
      error: "Failed to create election",
      details: error.message,
      code: error.code 
    });
  }
});

// Apply as a candidate
router.post("/:id/candidates", async (req, res) => {
  const { statement, userId } = req.body;
  const electionId = req.params.id;
  
  if (!userId || !statement) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const connection = await getConnection();
    
    // Check if election exists and is still open
    const [elections] = await connection.query(`
      SELECT * FROM elections WHERE id = ? AND end_date > NOW()
    `, [electionId]);
    
    if (elections.length === 0) {
      return res.status(404).json({ error: "Election not found or already closed" });
    }
    
    const election = elections[0];
    
    // Check if user's year group matches the election's year group
    const [userDetails] = await connection.query(`
      SELECT year_group FROM users WHERE user_id = ?
    `, [userId]);
    
    if (userDetails.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userYearGroup = userDetails[0].year_group;
    
    if (userYearGroup !== election.year_group) {
      return res.status(403).json({ 
        error: `You can only apply as a candidate for your own year (Year ${userYearGroup}). This election is for Year ${election.year_group}.` 
      });
    }
    
    // Check if user is already a candidate
    const [existingCandidates] = await connection.query(`
      SELECT * FROM election_candidates
      WHERE election_id = ? AND user_id = ?
    `, [electionId, userId]);
    
    if (existingCandidates.length > 0) {
      return res.status(400).json({ error: "You are already a candidate in this election" });
    }
    
    // Add the candidate
    await connection.query(`
      INSERT INTO election_candidates (election_id, user_id, statement)
      VALUES (?, ?, ?)
    `, [electionId, userId, statement]);
    
    res.status(201).json({ message: "Successfully applied as a candidate" });
  } catch (error) {
    console.error("Error applying as candidate:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vote in an election
router.post("/:id/votes", async (req, res) => {
  const { candidateId, userId } = req.body;
  const electionId = req.params.id;
  
  if (!userId || !candidateId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const connection = await getConnection();
    
    // Check if election exists and is still open
    const [elections] = await connection.query(`
      SELECT * FROM elections WHERE id = ? AND end_date > NOW()
    `, [electionId]);
    
    if (elections.length === 0) {
      return res.status(404).json({ error: "Election not found or already closed" });
    }
    
    // Check if candidate exists in this election
    const [candidates] = await connection.query(`
      SELECT * FROM election_candidates
      WHERE election_id = ? AND id = ?
    `, [electionId, candidateId]);
    
    if (candidates.length === 0) {
      return res.status(404).json({ error: "Candidate not found in this election" });
    }
    
    // Check if user already voted
    const [existingVotes] = await connection.query(`
      SELECT * FROM election_votes
      WHERE election_id = ? AND voter_id = ?
    `, [electionId, userId]);
    
    if (existingVotes.length > 0) {
      return res.status(400).json({ error: "You have already voted in this election" });
    }
    
    // Record the vote
    await connection.query(`
      INSERT INTO election_votes (election_id, candidate_id, voter_id)
      VALUES (?, ?, ?)
    `, [electionId, candidateId, userId]);
    
    res.status(201).json({ message: "Vote recorded successfully" });
  } catch (error) {
    console.error("Error recording vote:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new endpoint to get elections by year group
router.get("/year/:yearGroup", async (req, res) => {
  try {
    const connection = await getConnection();
    const [elections] = await connection.query(`
      SELECT e.*, 
        COUNT(c.id) AS candidate_count,
        u.email AS creator_email
      FROM elections e
      LEFT JOIN election_candidates c ON e.id = c.election_id
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.year_group = ?
      GROUP BY e.id
      ORDER BY e.end_date DESC
    `, [req.params.yearGroup]);
    
    res.json(elections);
  } catch (error) {
    console.error("Error fetching elections by year group:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user has voted
router.get("/:id/hasVoted", async (req, res) => {
  const electionId = req.params.id;
  const userId = req.query.userId; // Get userId from query parameter
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  
  try {
    const connection = await getConnection();
    const [votes] = await connection.query(`
      SELECT candidate_id FROM election_votes
      WHERE election_id = ? AND voter_id = ?
    `, [electionId, userId]);
    
    if (votes.length > 0) {
      res.json({ hasVoted: true, candidateId: votes[0].candidate_id });
    } else {
      res.json({ hasVoted: false });
    }
  } catch (error) {
    console.error("Error checking vote status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's year group for eligibility check
router.get("/user/yearGroup", async (req, res) => {
  const userId = req.query.userId; // Get userId from query parameter
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  
  try {
    const connection = await getConnection();
    const [userDetails] = await connection.query(`
      SELECT year_group FROM users WHERE user_id = ?
    `, [userId]);
    
    if (userDetails.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ yearGroup: userDetails[0].year_group });
  } catch (error) {
    console.error("Error fetching user year group:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint to handle election endings and role updates
router.post("/check-expired-elections", async (req, res) => {
  try {
    const connection = await getConnection();
    
    // Get all expired elections that haven't had their winners updated yet
    const [expiredElections] = await connection.query(`
      SELECT id 
      FROM elections 
      WHERE end_date < NOW() 
      AND (winner_updated IS NULL OR winner_updated = 0)
    `);
    
    if (expiredElections.length === 0) {
      return res.json({ message: "No newly expired elections found" });
    }
    
    let updatedCount = 0;
    
    // Process each expired election
    for (const election of expiredElections) {
      // Find the winner for this election
      const [winners] = await connection.query(`
        SELECT c.user_id, COUNT(v.id) AS vote_count
        FROM election_candidates c
        LEFT JOIN election_votes v ON c.id = v.candidate_id
        WHERE c.election_id = ?
        GROUP BY c.user_id
        ORDER BY vote_count DESC
        LIMIT 1
      `, [election.id]);
      
      // If we found a winner with at least one vote
      if (winners.length > 0 && winners[0].vote_count > 0) {
        const winnerId = winners[0].user_id;
        
        // Update the winner's role to 2 (representative)
        await connection.query(`
          UPDATE users 
          SET role = 2 
          WHERE user_id = ?
        `, [winnerId]);
        
        // Mark this election as having updated its winner
        await connection.query(`
          UPDATE elections 
          SET winner_updated = 1 
          WHERE id = ?
        `, [election.id]);
        
        updatedCount++;
        console.log(`[INFO] Updated user ${winnerId} role to representative after winning election ${election.id}`);
      }
    }
    
    res.json({ 
      message: `Processed ${expiredElections.length} expired elections, updated ${updatedCount} winners to representative role` 
    });
  } catch (error) {
    console.error("Error checking expired elections:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
