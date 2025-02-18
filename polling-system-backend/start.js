// login a new user using the logins table based on the SQL definition:
/* 
CREATE TABLE logins (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role INT NOT NULL,  -- 1 for student, 2 for student rep, 3 for lecturer
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    UNIQUE KEY unique_email (email)
);
*/
//login a user
const loginUser = async (email, password) => {
    await connectionPromise; // Ensure the connection is established
    const connection = getConnection(); // Get the connection

    if (!email || !password) {
        console.error("[DEBUG] Invalid input: email or password are not valid.", { email, password });
        throw new Error("Invalid input: Email and password are required.");
    }

    console.log("[DEBUG] Logging in user with email:", email);

    try {
        // Select from logins table.
        const query = `SELECT * FROM logins WHERE email = ? AND password = ?`;
        const [rows] = await connection.query(query, [email, password]);

        if (rows.length === 0) {
            console.error("[DEBUG] User not found.");
            throw new Error("User not found.");
        }

        const user = rows[0];
        console.log("[DEBUG] User logged in:", user);

        return user;
    } catch (error) {
        console.error("[ERROR] Error logging in user:", error);
        throw new Error("Failed to login user.");
    }
};