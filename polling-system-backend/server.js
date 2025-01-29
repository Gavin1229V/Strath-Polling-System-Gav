require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const router = require("./router");
const adminRouter = require('./admin'); // Adjust the path if necessary
const { getPolls, vote } = require("./polling");

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

// Routes
app.use("/api", router);
app.use("/admin", adminRouter);

// WebSocket connection
io.on("connection", async (socket) => {
    console.log("New client connected");
    const polls = await getPolls();
    socket.emit("pollsUpdated", polls);

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });

    socket.on("newPoll", async (newPoll) => {
        // Insert new poll into the database (not shown here)
        const polls = await getPolls();
        io.emit("pollsUpdated", polls); // Emit update
    });

    socket.on("vote", async (optionId) => {
        console.log("Received vote for option ID:", optionId);
        await vote(optionId);
        const polls = await getPolls();
        io.emit("pollsUpdated", polls); // Emit update
    });
});

// Function to get the local IP address
const getLocalIpAddress = () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let localIp = 'localhost';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
            }
        }
    }
    return localIp;
};

// Start the server
server.listen(PORT, () => {
    const localIp = getLocalIpAddress();
    console.log(`Server is running on port ${PORT}`);
    console.log(`Connect to the server at http://${localIp}:${PORT}`);
});