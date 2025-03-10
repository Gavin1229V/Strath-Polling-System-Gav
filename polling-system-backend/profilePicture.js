const express = require("express");
const multer = require("multer");
const upload = multer(); // Use memory storage
const router = express.Router();
const { getConnection } = require("./db");

// POST endpoint for uploading profile picture
router.post("/uploadProfilePicture", upload.single("profile_picture"), async (req, res) => {
  console.log("Starting uploadProfilePicture process");
  console.log("Request body:", req.body);
  console.log("Uploaded file info:", req.file);
  try {
    const { user_id } = req.body;
    console.log(`Received upload request for user_id: ${user_id}`);

    if (!req.file || !req.file.buffer) {
      console.error("No image file provided or file buffer missing.");
      return res.json({ success: false, error: "No image file provided." });
    }
    
    const imageBuffer = req.file.buffer;
    const connection = await getConnection();
    // Update the users table with the binary image data
    const sql = `
      UPDATE users
      SET profile_picture = ?
      WHERE user_id = ?
    `;
    await connection.query(sql, [imageBuffer, user_id]);
    
    // Retrieve the stored image and convert to base64
    const [selectRows] = await connection.query("SELECT profile_picture FROM users WHERE user_id = ?", [user_id]);
    if (selectRows.length && selectRows[0].profile_picture) {
      const base64Image = selectRows[0].profile_picture.toString("base64");
      console.log(`Profile picture retrieved for user_id: ${user_id}`);
      return res.json({ success: true, profile_picture: "data:image/jpeg;base64," + base64Image });
    }
    res.json({ success: true, profile_picture: null });
    
  } catch (error) {
    console.error("Error in uploadProfilePicture:", error);
    res.json({ success: false, error: error.message });
  }
  console.log("Completed uploadProfilePicture process");
});

// New endpoint to remove profile picture
router.post("/removeProfilePicture", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.json({ success: false, error: "No user_id provided." });
  }
  try {
    const connection = await getConnection();
    const sql = "UPDATE users SET profile_picture = NULL WHERE user_id = ?";
    await connection.query(sql, [user_id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    res.json({ success: false, error: error.message });
  }
});

// GET endpoint for retrieving profile picture
router.get("/profilePicture", async (req, res) => {
  // Use logged-in user's id if available, otherwise use query parameter.
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
    console.error("Error fetching profile picture:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
