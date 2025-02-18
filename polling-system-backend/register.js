const { connectionPromise, getConnection } = require("./db"); // Import MySQL connection and connection promise

// register a new user using the logins table based on the SQL definition:
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

// Create a new user
const registerUser = async (email, password, role = 1) => {
    await connectionPromise; // Ensure the connection is established
    const connection = getConnection(); // Get the connection

    if (!email || !password) {
        console.error("[DEBUG] Invalid input: email or password are not valid.", { email, password });
        throw new Error("Invalid input: Email and password are required.");
    }

    console.log("[DEBUG] Registering user with email:", email);

    try {
        // Insert into logins table.
        // Here, we use 0 as a placeholder for user_id.
        const query = `INSERT INTO logins (user_id, email, password, role) VALUES (?, ?, ?, ?)`;
        const [result] = await connection.query(query, [0, email, password, role]);
        const loginId = result.insertId;

        console.log("[DEBUG] User registered with login ID:", loginId);

        return loginId;
    } catch (error) {
        console.error("[ERROR] Error registering user:", error);
        throw new Error("Failed to register user.");
    }
};

module.exports = { registerUser };