const { getConnection } = require("./db");

const getAccountDetails = async (userId) => {
  const connection = await getConnection();
  // Select only details for the specified user_id
  const [rows] = await connection.query("SELECT * FROM logins WHERE user_id = ?", [userId]);
  console.log(rows);
  return rows;
};

module.exports = { getAccountDetails };
