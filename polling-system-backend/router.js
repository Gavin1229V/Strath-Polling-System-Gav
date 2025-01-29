const express = require("express");
const { createPoll, getPolls, vote } = require("./polling");

const router = express.Router();

router.get("/polls", async (req, res) => {
    console.log("GET /polls request received");

    try {
        const polls = await getPolls();
        console.log("Polls data sent to client:", polls);
        res.json(polls);
    } catch (err) {
        console.error("Error fetching polls:", err);
        res.status(500).send("Error fetching polls");
    }
});

router.post("/polls", async (req, res) => {
    const { question, options } = req.body;

    if (!question || !Array.isArray(options)) {
        console.error("Invalid input:", req.body);
        return res.status(400).send("Invalid input");
    }

    try {
        const pollId = await createPoll(question, options);
        console.log("Poll created with ID:", pollId);
        res.status(201).json({ id: pollId });
    } catch (err) {
        console.error("Error creating poll:", err);
        res.status(500).send("Error creating poll");
    }
});

router.post("/vote/:optionId", async (req, res) => {
    const { optionId } = req.params;

    try {
        await vote(optionId);
        console.log("Vote counted for option ID:", optionId);
        res.status(200).send("Vote counted");
    } catch (err) {
        console.error("Error voting:", err);
        res.status(500).send("Error voting");
    }
});

module.exports = router;
