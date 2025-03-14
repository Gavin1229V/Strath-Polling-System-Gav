require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const NodeCache = require("node-cache");

const router = require("./pollRouter");
const pollRouter = require("./pollRouter");
const electionRouter = require("./electionRouter"); // Add this line
const { getPolls, vote } = require("./polling");
const { registerAndSendEmail, verifyEmail } = require("./register");
const { loginUser } = require("./login");
const verificationRouter = require("./verify");
const { getAccountDetails } = require("./accountDetailGetter");
const { updateUserClasses } = require("./classHelper");

// Create a cache with 5 minute TTL
const pollCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Express app setup
const app = express();
const server = http.createServer(app);

// Socket.IO setup with optimized configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: 60000, // Increased timeout (60 seconds)
  pingInterval: 25000, // How often to ping (25 seconds)
  transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
  maxHttpBufferSize: 1e6, // 1MB max payload
  connectTimeout: 45000, // 45 second timeout
  allowEIO3: true, // Allow Engine.IO 3 compatibility
});

const PORT = process.env.PORT || 3001;

// Enhanced middleware setup
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(compression()); // Response compression
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Separate rate limiters for different endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// More generous rate limiter for polling operations
const pollsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (1 per second)
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many poll requests, please try again later.",
});

// Apply rate limiting with the right limiter for each route
app.use("/api/polls", pollsLimiter);
app.use("/api", apiLimiter);

// Debug middleware for socket.io issues
app.use((req, res, next) => {
  if (req.url.includes('/socket.io')) {
    console.log(`[DEBUG] Socket.IO request: ${req.method} ${req.url}`);
  }
  next();
});

// Debug middleware for elections API
app.use((req, res, next) => {
  if (req.url.includes('/api/elections')) {
    console.log(`[DEBUG] Elections API request: ${req.method} ${req.url}`);
  }
  next();
});

// Mount additional routers
app.use("/api", router);
app.use("/api", verificationRouter);
app.use("/api", require("./profilePicture"));
app.use("/api/polls", pollRouter);
app.use("/api/elections", electionRouter); // Add this line

// Cached version of getPolls function
const getCachedPolls = async () => {
  const cacheKey = 'all_polls';
  let polls = pollCache.get(cacheKey);
  
  if (polls === undefined) {
    console.log("[CACHE] Poll cache miss, fetching from database");
    polls = await getPolls();
    pollCache.set(cacheKey, polls);
  } else {
    console.log("[CACHE] Poll cache hit");
  }
  
  return polls;
};

// Clear poll cache when votes or new polls happen
const invalidatePollCache = () => {
  console.log("[CACHE] Invalidating poll cache");
  pollCache.del('all_polls');
};

// Registration endpoint
app.post("/api/register", async (req, res) => {
  const { email, password, role } = req.body;
  console.log("[INFO] Received registration request for email:", email);

  try {
    const loginId = await registerAndSendEmail(email, password, role || 1);
    console.log("[INFO] Registration successful for email:", email, "with login ID:", loginId);
    res.status(200).json({ message: "User registered successfully! Please verify your email.", loginId });
  } catch (error) {
    console.error("[ERROR] Registration error for email:", email, error);
    res.status(500).json({ message: error.message || "Registration failed" });
  }
});

// Email verification endpoint (if not entirely handled in the verificationRouter)
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

// Login endpoint – only verified users can log in.
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("[INFO] Login request for email:", email);
  try {
    const { token, userDetails } = await loginUser(email, password);
    res.status(200).json({ message: "Login successful", token, userDetails });
  } catch (error) {
    console.error("[ERROR] Login error for email:", email, error);
    res.status(400).json({ message: error.message || "Login failed" });
  }
});

// Save classes endpoint
app.post("/api/saveclasses", async (req, res) => {
  const { user_id, classes } = req.body;
  if (!user_id || !classes || !Array.isArray(classes)) {
    return res.status(400).json({ message: "user_id and an array of classes are required." });
  }
  try {
    await updateUserClasses(user_id, classes);
    res.status(200).json({ message: "Classes saved successfully." });
  } catch (error) {
    console.error("[ERROR] Saving classes:", error);
    res.status(500).json({ message: error.message || "Failed to save classes." });
  }
});

// Get account details endpoint
app.get("/accountDetails", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send("User ID is required.");
  }
  try {
    const details = await getAccountDetails(userId);
    res.json(details);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Socket.IO connection throttling
let connectionCounter = 0;
const connectionThrottle = {};

// Determine if we should bypass throttling based on environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// WebSocket connection handling with optimized event handling
io.on("connection", async (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  
  // Significantly less aggressive connection throttling, especially in development
  const now = Date.now();
  if (!isDevelopment && connectionThrottle[clientIp] && now - connectionThrottle[clientIp] < 500) {
    console.log(`[THROTTLE] Rejecting rapid connection from ${clientIp}`);
    socket.emit("error", { message: "Connection rate limited. Please try again in a moment." });
    socket.disconnect(true);
    return;
  }
  connectionThrottle[clientIp] = now;
  
  // Connection tracking
  connectionCounter++;
  console.log(`[INFO] New client connected: ${socket.id} (IP: ${clientIp}) (Total: ${connectionCounter})`);
  
  // Initial data load with better error handling
  try {
    const polls = await getCachedPolls();
    if (socket.connected) {
      socket.emit("pollsUpdated", polls);
    }
  } catch (error) {
    console.error("[ERROR] Failed to fetch polls on connection:", error);
    if (socket.connected) {
      socket.emit("error", { message: "Failed to load polls" });
    }
  }

  // Vote throttling
  const voteThrottle = {};
  
  socket.on("disconnect", () => {
    connectionCounter--;
    console.log(`[INFO] Client disconnected: ${socket.id} (Total: ${connectionCounter})`);
  });

  socket.on("newPoll", async (newPoll) => {
    console.log("[INFO] Received new poll:", newPoll);
    try {
      // Invalidate cache when a new poll is created
      invalidatePollCache();
      const polls = await getCachedPolls();
      io.emit("pollsUpdated", polls);
    } catch (error) {
      console.error("[ERROR] Error handling new poll:", error);
      socket.emit("error", { message: "Failed to create poll" });
    }
  });

  socket.on("vote", async (optionId) => {
    // Implement vote throttling
    if (voteThrottle[optionId] && now - voteThrottle[optionId] < 2000) {
      console.log(`[THROTTLE] Rejecting rapid vote for option ${optionId}`);
      socket.emit("voteResponse", { 
        success: false, 
        message: "Please wait before voting again" 
      });
      return;
    }
    voteThrottle[optionId] = now;
    
    console.log("[INFO] Received vote for option ID:", optionId);
    try {
      await vote(optionId);
      // Invalidate cache when a vote is cast
      invalidatePollCache();
      const polls = await getCachedPolls();
      io.emit("pollsUpdated", polls);
      // Send success response back to the voting client
      socket.emit("voteResponse", { 
        success: true, 
        message: "Vote registered successfully",
        optionId: optionId
      });
    } catch (error) {
      console.error("[ERROR] Error processing vote:", error);
      socket.emit("voteResponse", { 
        success: false,
        message: "Failed to process your vote. Please try again."
      });
    }
  });
});

// Clean up old connection throttle entries more frequently
setInterval(() => {
  const now = Date.now();
  for (const ip in connectionThrottle) {
    if (now - connectionThrottle[ip] > 10000) { // 10 seconds (down from 1 minute)
      delete connectionThrottle[ip];
    }
  }
}, 10000); // Run every 10 seconds instead of every minute

// Utility to get the local IP address (for easy access during development)
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

  // Update the .env file (line containing SERVER_URL) to the new local IP and port.
  const envPath = path.join(__dirname, ".env");
  try {
    let envContent = fs.readFileSync(envPath, "utf-8");
    // Replace the SERVER_URL line (using a regex that matches a line starting with SERVER_URL=)
    const newServerUrl = `SERVER_URL=http://${localIp}:${PORT}`;
    envContent = envContent.replace(/^SERVER_URL=.*$/m, newServerUrl);
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log(`[INFO] Updated .env file with new SERVER_URL: ${newServerUrl}`);
  } catch (err) {
    console.error("[ERROR] Unable to update .env file", err);
  }
});

// Add graceful shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('[INFO] Received shutdown signal, closing server...');
  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
  
  // Force close if it takes too long
  setTimeout(() => {
    console.log('[ERROR] Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
}