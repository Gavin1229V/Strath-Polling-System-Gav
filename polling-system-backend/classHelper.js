const { getConnection } = require("./db");

const updateUserClasses = async (userId, classesArray, year) => {
  const connection = await getConnection();
  
  // Debug log the inputs
  console.log(`[DEBUG] updateUserClasses called with:`, {
    userId,
    classesArray,
    year,
    yearType: typeof year
  });
  
  // Convert array of classes to a comma-separated string
  const classesStr = classesArray.join(",");
  
  // Make sure year is properly processed (could be coming as string or null)
  let yearValue = null;
  if (year !== undefined && year !== null) {
    yearValue = parseInt(year, 10);
    // If parsing failed, set to null
    if (isNaN(yearValue)) {
      yearValue = null;
    }
  }
  
  console.log(`[DEBUG] Updating user ${userId} with:`, {
    classes: classesStr,
    year_group: yearValue
  });
  
  // Update both the classes and year columns in the 'users' table
  const sql = `UPDATE users SET classes = ?, year_group = ? WHERE user_id = ?`;
  await connection.query(sql, [classesStr, yearValue, userId]);
  
  // Verify the update was successful
  const [result] = await connection.query(
    `SELECT classes, year_group FROM users WHERE user_id = ?`,
    [userId]
  );
  
  console.log(`[DEBUG] After update, user ${userId} has:`, result[0]);
};

module.exports = { updateUserClasses };
