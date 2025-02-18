const mysql = require("mysql2/promise");
const { setupSSHTunnel } = require("./ssh_tunnel.js");

// MySQL Configuration
const dbConfig = {
    host: "127.0.0.1", // Localhost since it's tunneled
    user: process.env.DB_USER, // MySQL username
    password: process.env.DB_PASSWORD, // MySQL password
    database: process.env.DB_NAME, // MySQL database name
    port: 3306,
    connectTimeout: 10000,
};

let connection;

const connectToDatabase = async () => {
    try {
        const stream = await setupSSHTunnel(3306, "devweb2024.cis.strath.ac.uk", 3306);
        connection = await mysql.createConnection({
            ...dbConfig,
            stream, // Use the SSH tunnel stream
        });
    } catch (err) {
        console.error("Database connection failed:", err);
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