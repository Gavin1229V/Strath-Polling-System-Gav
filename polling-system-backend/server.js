require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const router = require("./router");
const adminRouter = require('./admin'); // Adjust the path if necessary

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: "http://localhost:3000" })); // Allow front-end origin
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

