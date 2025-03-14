const { getConnection } = require("./db");

const updateUserClasses = async (userId, classesArray, year) => {
  const connection = await getConnection();
  // Convert array of classes to a comma-separated string
  const classesStr = classesArray.join(",");
  // Update both the classes and year columns in the 'users' table
  const sql = `UPDATE users SET classes = ?, year_group = ? WHERE user_id = ?`;
  await connection.query(sql, [classesStr, year, userId]);
};

module.exports = { updateUserClasses };
