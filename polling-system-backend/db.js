const mysql = require("mysql2/promise");
const { setupSSHTunnel } = require("./ssh_tunnel.js"); // Import SSH tunneling logic

// MySQL Configuration
const dbConfig = {
    host: "127.0.0.1", // Localhost since it's tunneled
    user: process.env.DB_USER, // MySQL username
    password: process.env.DB_PASSWORD, // MySQL password
    database: process.env.DB_NAME, // MySQL database name
    port: 3306, // Default MySQL port
    connectTimeout: 10000, // Timeout for connection attempts
};

let connection;

const connectToDatabase = async () => {
    try {
        const stream = await setupSSHTunnel(3306, "devweb2024.cis.strath.ac.uk", 3306);
        connection = await mysql.createConnection({
            ...dbConfig,
            stream, // Use the SSH tunnel stream
        });
        console.log("Connected to MySQL successfully!");

        // Test query to check if the connection is working
        const testQuery = `SELECT 1 + 1 AS solution`;
        const [rows] = await connection.query(testQuery);
        console.log("[DEBUG] Test query executed successfully:", rows);

        // Additional query to check if the polls table exists
        const checkPollsTableQuery = `SHOW TABLES LIKE 'polls'`;
        const [pollsTableRows] = await connection.query(checkPollsTableQuery);
        if (pollsTableRows.length > 0) {
            console.log("[DEBUG] Polls table exists.");

            // Fetch a row from the polls table
            const fetchPollQuery = `SELECT * FROM polls LIMIT 1`;
            const [pollRows] = await connection.query(fetchPollQuery);
            if (pollRows.length > 0) {
                console.log("[DEBUG] Sample row from polls table:", pollRows[0]);
            } else {
                console.log("[DEBUG] No rows found in polls table.");
            }
        } else {
            console.log("[DEBUG] Polls table does not exist.");
        }
    } catch (err) {
        console.error("Failed to set up SSH tunnel or connect to MySQL:", err);
        process.exit(1);
    }
};

const connectionPromise = connectToDatabase();

const getConnection = () => {
    if (!connection) {
        throw new Error("Connection not established");
    }
    return connection;
};

module.exports = { connectionPromise, getConnection };