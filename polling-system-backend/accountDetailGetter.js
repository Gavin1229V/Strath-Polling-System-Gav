const { getConnection } = require("./db");

const getAccountDetails = async (userId) => {
  const connection = await getConnection();
  // Updated query: fetch details from new "users" table, which stores classes and profile_picture
  const [rows] = await connection.query("SELECT * FROM users WHERE user_id = ?", [userId]);
  
  // Replace full object logging with a cleaner version that excludes binary data
  console.log(`[INFO] Retrieved account details for user_id: ${userId}, found ${rows.length} record(s)`);

  
  return rows;
};

const getAccountPP = async (userId) => {
  const connection = await getConnection();
  // Select only details for the specified user_id
  const [rows] = await connection.query("SELECT * FROM profile_picture WHERE user_id = ?", [userId]);
  
  // Replace full object logging with a cleaner version
  console.log(`[INFO] Retrieved profile picture for user_id: ${userId}, found ${rows.length} record(s)`);
  
  return rows;
};

module.exports = { 
  getAccountDetails, 
  getAccountPP 
};
