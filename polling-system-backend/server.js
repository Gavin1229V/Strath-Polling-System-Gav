require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const router = require("./router");
const adminRouter = require('./admin'); // Adjust the path if necessary

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        "http://localhost:3000",          // React app
        "http://localhost:8081",         // Expo local host
        "http://192.168.0.230:8081",     // Example IP of your local network
        "http://192.168.0.230",          // General IP for Expo
    ],
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true                     // Allow cookies if needed
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

// Mount API routes
app.use("/api", router);
app.use('/admin', adminRouter);

// Start the server
app.listen(PORT, "0.0.0.0", () => { // Bind to all network interfaces
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});