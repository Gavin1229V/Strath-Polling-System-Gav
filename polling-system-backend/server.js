require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");

// Use single router import if possible.
const pollRouter = require("./pollRouter");
const { getPolls, vote } = require("./polling");
const { registerAndSendEmail, verifyEmail } = require("./register");
const { loginUser } = require("./login");
const verificationRouter = require("./verify");
const { getAccountDetails } = require("./accountDetailGetter");
const { updateUserClasses } = require("./classHelper");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true,
  },
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

// Mount additional routers
app.use("/api", pollRouter);
app.use("/api", verificationRouter);
// Remove separate mounts and use the combined profilePicture route
app.use("/api", require("./profilePicture"));
// Mount the poll router to handle endpoints under /api/polls
app.use("/api/polls", pollRouter);

app.post("/api/register", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const loginId = await registerAndSendEmail(email, password, role || 1);
    res.status(200).json({ message: "User registered successfully! Please verify your email.", loginId });
  } catch (error) {
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
    verified ? res.send("Email verification successful. You can now log in.")
             : res.status(400).send("Email verification failed.");
  } catch (error) {
    res.status(400).send("Invalid or expired token.");
  }
});

// Login endpoint – only verified users can log in.
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { token, userDetails } = await loginUser(email, password);
    res.status(200).json({ message: "Login successful", token, userDetails });
  } catch (error) {
    res.status(400).json({ message: error.message || "Login failed" });
  }
});

app.post("/api/saveclasses", async (req, res) => {
  const { user_id, classes } = req.body;
  if (!user_id || !classes || !Array.isArray(classes)) {
    return res.status(400).json({ message: "user_id and an array of classes are required." });
  }
  try {
    await updateUserClasses(user_id, classes);
    res.status(200).json({ message: "Classes saved successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to save classes." });
  }
});

app.get("/accountDetails", async (req, res) => {
  const userId = req.query.userId; // In a real app, get user id via auth middleware.
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

const connectedClients = new Set(); // NEW: Track logged sockets

// NEW: Add caching for poll data to reduce db queries (cache duration: 3 seconds)
const CACHE_DURATION = 3000; // in milliseconds
let pollsCache = null;
let pollsCacheTimestamp = 0;

const getPollsCached = async () => {
  const now = Date.now();
  if (pollsCache && now - pollsCacheTimestamp < CACHE_DURATION) {
    return pollsCache;
  }
  pollsCache = await getPolls();
  pollsCacheTimestamp = now;
  return pollsCache;
};

// WebSocket connection handling
io.on("connection", async (socket) => {
  // Log connection only once per socket id
  if (!connectedClients.has(socket.id)) {
    console.log(`[INFO] New client connected: ${socket.id}`);
    connectedClients.add(socket.id);
  }
  try {
    const polls = await getPollsCached();
    socket.emit("pollsUpdated", polls);
  } catch (error) {
    console.error("[ERROR] Failed to fetch polls on connection:", error);
  }

  socket.on("disconnect", () => {
    console.log("[INFO] Client disconnected:", socket.id);
    connectedClients.delete(socket.id);
  });

  socket.on("newPoll", async (newPoll) => {
    try {
      // Invalidate cache on new poll creation
      pollsCache = null;
      const polls = await getPollsCached();
      io.emit("pollsUpdated", polls);
    } catch (error) { /* no logging */ }
  });

  socket.on("vote", async (optionId) => {
    try {
      await vote(optionId);
      // Invalidate cache on vote
      pollsCache = null;
      const polls = await getPollsCached();
      io.emit("pollsUpdated", polls);
    } catch (error) { /* no logging */ }
  });
});

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

  // After server.listen, add a scheduled deletion job:
  setInterval(async () => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    try {
      const { getConnection } = require("./db");
      const connection = await getConnection();
      // Delete expired polls (assuming ON DELETE CASCADE cleans up poll_options, otherwise add additional deletion)
      await connection.query("DELETE FROM polls WHERE expiry IS NOT NULL AND expiry <= ?", [now]);
      console.log(`[INFO] Expired polls deleted at ${now}`);
    } catch (err) {
      console.error("[ERROR] Deleting expired polls failed:", err);
    }
  }, 60000); // every 60 seconds
});