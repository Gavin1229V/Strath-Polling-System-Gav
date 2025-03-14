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
        u.first_name AS creator_first_name,
        u.last_name AS creator_last_name,
        e.year_group
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
      SELECT * FROM elections WHERE id = ?
    `, [req.params.id]);
    
    if (elections.length === 0) {
      return res.status(404).json({ error: "Election not found" });
    }
    
    const election = elections[0];
    
    const [candidates] = await connection.query(`
      SELECT c.*, u.first_name, u.last_name, u.profile_picture, u.year_group,
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
    res.json(election);
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new election
router.post("/", async (req, res) => {
  // For lecturer check, we'll need to get the user information from the request
  // This assumes user information is passed in the request body
  const { title, description, class_code, end_date, year_group, userId, userRole } = req.body;
  
  // Check if the user is a lecturer (role !== 0)
  if (userRole === 0) {
    return res.status(403).json({ error: "Only lecturers can create elections" });
  }
  
  if (!title || !class_code || !end_date || !year_group || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const connection = await getConnection();
    const [result] = await connection.query(`
      INSERT INTO elections (title, description, class_code, created_by, end_date, year_group)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, class_code, userId, end_date, year_group]);
    
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({ error: error.message });
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

// Get elections by class code
router.get("/class/:code", async (req, res) => {
  try {
    const connection = await getConnection();
    const [elections] = await connection.query(`
      SELECT e.*, 
        COUNT(c.id) AS candidate_count
      FROM elections e
      LEFT JOIN election_candidates c ON e.id = c.election_id
      WHERE e.class_code = ?
      GROUP BY e.id
      ORDER BY e.end_date DESC
    `, [req.params.code]);
    
    res.json(elections);
  } catch (error) {
    console.error("Error fetching elections by class:", error);
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

module.exports = router;
