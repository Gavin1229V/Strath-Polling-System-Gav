require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const router = require("./router");
const adminRouter = require('./admin'); // Adjust the path if necessary

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
        credentials: true // Allow cookies if needed
    }
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true // Allow cookies if needed
}));
app.use(express.json()); // Parse JSON request bodies

// Logging middleware
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    res.on('finish', () => {
        console.log(`[RESPONSE] ${res.statusCode} ${res.statusMessage}`);
    });
    next();
});

let polls = [];

// Routes
app.use("/api", router);
app.use("/admin", adminRouter);

app.get("/api/polls", (req, res) => {
    res.json(polls);
});

app.post("/api/polls", (req, res) => {
    const newPoll = req.body;
    polls.push(newPoll);
    io.emit("pollsUpdated", polls); // Emit update
    console.log("Emitting pollsUpdated event with data:", polls);
    res.status(201).json(newPoll);
});

app.post("/api/vote/:optionId", (req, res) => {
    const optionId = parseInt(req.params.optionId, 10);
    polls = polls.map(poll => {
        poll.options = poll.options.map(option => {
            if (option.id === optionId) {
                option.votes += 1;
            }
            return option;
        });
        return poll;
    });
    io.emit("pollsUpdated", polls); // Emit update
    console.log("Emitting pollsUpdated event with data:", polls);
    res.status(200).send();
});

// WebSocket connection
io.on("connection", (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`New client connected from IP: ${clientIp}`);
    socket.emit("pollsUpdated", polls);

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });

    socket.on("newPoll", (newPoll) => {
        polls.push(newPoll);
        io.emit("pollsUpdated", polls); // Emit update
        console.log("Emitting pollsUpdated event with data:", polls);
    });

    socket.on("vote", (optionId) => {
        polls = polls.map(poll => {
            poll.options = poll.options.map(option => {
                if (option.id === optionId) {
                    option.votes += 1;
                }
                return option;
            });
            return poll;
        });
        io.emit("pollsUpdated", polls); // Emit update
        console.log("Emitting pollsUpdated event with data:", polls);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});