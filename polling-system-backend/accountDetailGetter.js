const { getConnection } = require("./db");

const getAccountDetails = async (userId) => {
  const connection = await getConnection();
  // Updated query: fetch details from new "users" table, which stores classes and profile_picture
  const [rows] = await connection.query("SELECT * FROM users WHERE user_id = ?", [userId]);
  console.log(rows);
  return rows;
};

const getAccountPP = async (userId) => {
  const connection = await getConnection();
  // Select only details for the specified user_id
  const [rows] = await connection.query("SELECT * FROM profile_picture WHERE user_id = ?", [userId]);
  console.log(rows);
  return rows;
};

module.exports = { 
  getAccountDetails, 
  getAccountPP 
};
