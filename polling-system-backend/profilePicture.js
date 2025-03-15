const express = require("express");
const multer = require("multer");
const upload = multer(); // Use memory storage
const router = express.Router();
const { getConnection } = require("./db");

// POST endpoint for uploading profile picture
router.post("/uploadProfilePicture", upload.single("profile_picture"), async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!req.file) {
      return res.json({ success: false, error: "No image file provided." });
    }
    
    const imageBuffer = req.file.buffer;
    const connection = await getConnection();
    
    await connection.query(
      "UPDATE users SET profile_picture = ? WHERE user_id = ?", 
      [imageBuffer, user_id]
    );
    
    const [selectRows] = await connection.query("SELECT profile_picture FROM users WHERE user_id = ?", [user_id]);
    if (selectRows.length && selectRows[0].profile_picture) {
      const base64Image = selectRows[0].profile_picture.toString("base64");
      return res.json({ success: true, profile_picture: "data:image/jpeg;base64," + base64Image });
    }
    res.json({ success: true, profile_picture: null });
    
  } catch (error) {
    console.error("Error:", error);
    res.json({ success: false, error: "Upload failed" });
  }
});

// New endpoint to remove profile picture
router.post("/removeProfilePicture", async (req, res) => {
  const { user_id } = req.body;
  try {
    const connection = await getConnection();
    await connection.query("UPDATE users SET profile_picture = NULL WHERE user_id = ?", [user_id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// GET endpoint for retrieving profile picture
router.get("/profilePicture", async (req, res) => {
  const userId = req.user ? req.user.user_id : req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }
  
  try {
    const connection = await getConnection();
    const [rows] = await connection.query("SELECT profile_picture FROM users WHERE user_id = ?", [userId]);
    if (rows.length && rows[0].profile_picture) {
      const base64Image = rows[0].profile_picture.toString("base64");
      return res.json({ profile_picture: "data:image/jpeg;base64," + base64Image });
    } else {
      return res.json({ profile_picture: null });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
