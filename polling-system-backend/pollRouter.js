const express = require("express");
const router = express.Router();
const { createPoll, getPolls, vote } = require("./polling"); // Import functions from polling.js

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