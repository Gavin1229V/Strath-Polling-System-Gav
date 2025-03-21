const express = require("express");
const router = express.Router();
const { createPoll, getPolls, vote } = require("./polling"); // Import functions from polling.js
const { getExpiredPolls } = require("./expiredPolls"); // Add this import

// API Routes
router.post("/", async (req, res) => {
    const { question, options, created_by, created_by_id, class: pollClass, expiry, year_group } = req.body;
    try {
        const pollId = await createPoll(question, options, created_by, created_by_id, pollClass, expiry, year_group);
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

// Add new endpoint for expired polls
router.get("/expired", async (req, res) => {
    try {
        const expiredPolls = await getExpiredPolls();
        res.json(expiredPolls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/vote", async (req, res) => {
    const { optionId, userId, isAnonymous } = req.body;
    
    // Normalize isAnonymous to 0 or 1
    const normalizedIsAnonymous = isAnonymous === true || isAnonymous === 1 || isAnonymous === "1" ? 1 : 0;
    
    try {
        const result = await vote(optionId, userId, normalizedIsAnonymous);
        res.status(200).json({ 
            message: "Vote registered",
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;