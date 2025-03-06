require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");

const router = require("./pollRouter");
const { getPolls, vote } = require("./polling");
const { registerAndSendEmail, verifyEmail } = require("./register");
const { loginUser } = require("./login");
const verificationRouter = require("./verify");
const { getAccountDetails } = require("./accountDetailGetter");

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
app.use("/api", router);
app.use("/api", verificationRouter);

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

app.get("/accountDetails", async (req, res) => {
  const userId = req.query.userId; // In a real app, get user id via auth middleware.
  if (!userId) {
    return res.status(400).send("User ID is required.");
  }
  try {
    const details = await getAccountDetails(userId);
    res.json(details);
    console.log(details);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// WebSocket connection handling
io.on("connection", async (socket) => {
  console.log("[INFO] New client connected:", socket.id);
  try {
    const polls = await getPolls();
    socket.emit("pollsUpdated", polls);
  } catch (error) {
    console.error("[ERROR] Failed to fetch polls on connection:", error);
  }

  socket.on("disconnect", () => {
    console.log("[INFO] Client disconnected:", socket.id);
  });

  socket.on("newPoll", async (newPoll) => {
    console.log("[INFO] Received new poll:", newPoll);
    try {
      const polls = await getPolls();
      io.emit("pollsUpdated", polls);
    } catch (error) {
      console.error("[ERROR] Error handling new poll:", error);
    }
  });

  socket.on("vote", async (optionId) => {
    console.log("[INFO] Received vote for option ID:", optionId);
    try {
      await vote(optionId);
      const polls = await getPolls();
      io.emit("pollsUpdated", polls);
    } catch (error) {
      console.error("[ERROR] Error processing vote:", error);
    }
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
});