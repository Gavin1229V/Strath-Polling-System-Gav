require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const nodemailer = require("nodemailer");


const router = require("./router");
const adminRouter = require("./admin"); // Adjust the path if necessary
const { getPolls, vote } = require("./polling");
const { registerAndSendEmail, verifyEmail } = require("./register"); // Import functions from register.js
const verificationRouter = require("./verification");

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
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

// Routes
app.use("/api", router);
app.use("/admin", adminRouter);
app.use("/api", verificationRouter);

// Registration endpoint: only leave user in DB if the verification email is sent successfully.
app.post("/api/register", async (req, res) => {
    const { email, password, role } = req.body;
    console.log("[INFO] Received registration request for email:", email);

    let loginId;
    try {
        // Use registerAndSendEmail instead of registerUser
        loginId = await registerAndSendEmail(email, password, role || 1);
        console.log("[INFO] Registration successful for email:", email, "with login ID:", loginId);
        res.status(200).json({ message: "User registered successfully! Please verify your email.", loginId });
    } catch (error) {
        console.error("[ERROR] Registration error for email:", email, error);
        res.status(500).json({ message: error.message || "Registration failed" });
    }
});

// Email verification endpoint
app.get("/api/verify", async (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send("Verification token is missing.");
    }
    try {
        const verified = await verifyEmail(token);
        if (verified) {
            res.send("Email verification successful. You can now log in.");
        } else {
            res.status(400).send("Email verification failed.");
        }
    } catch (error) {
        console.error("[ERROR] Verification error:", error);
        res.status(400).send("Invalid or expired token.");
    }
});

// WebSocket connection
io.on("connection", async (socket) => {
    console.log("[INFO] New client connected:", socket.id);
    const polls = await getPolls();
    socket.emit("pollsUpdated", polls);

    socket.on("disconnect", () => {
        console.log("[INFO] Client disconnected:", socket.id);
    });

    socket.on("newPoll", async (newPoll) => {
        console.log("[INFO] Received new poll:", newPoll);
        // Insert new poll into the database (logic not shown here)
        const polls = await getPolls();
        io.emit("pollsUpdated", polls);
    });

    socket.on("vote", async (optionId) => {
        console.log("[INFO] Received vote for option ID:", optionId);
        await vote(optionId);
        const polls = await getPolls();
        io.emit("pollsUpdated", polls);
    });
});

// Function to get the local IP address
const getLocalIpAddress = () => {
    const { networkInterfaces } = require("os");
    const nets = networkInterfaces();
    let localIp = "localhost";
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                localIp = net.address;
                break;
            }
        }
        if (localIp !== "localhost") break;
    }
    return localIp;
};

// Start the server
server.listen(PORT, () => {
    const localIp = getLocalIpAddress();
    console.log(`[INFO] Server is running on port ${PORT}`);
    console.log(`[INFO] Connect to the server at http://${localIp}:${PORT}`);
});