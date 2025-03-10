const { getConnection } = require("./db");

const updateUserClasses = async (userId, classesArray) => {
  const connection = await getConnection();
  // Convert array of classes to a comma-separated string
  const classesStr = classesArray.join(",");
  // Update the classes column in the 'users' table, not in logins
  const sql = `UPDATE users SET classes = ? WHERE user_id = ?`;
  await connection.query(sql, [classesStr, userId]);
};

module.exports = { updateUserClasses };
