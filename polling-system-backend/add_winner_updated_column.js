const { getConnection } = require('./db.js');
require('dotenv').config();

async function migrate() {
  try {
    // Get the shared database connection
    const connection = await getConnection();

    console.log('Connected to database');

    // Add winner_updated column to elections table
    await connection.execute(`
      ALTER TABLE elections
      ADD COLUMN winner_updated TINYINT(1) DEFAULT 0
    `);

    console.log('Migration completed: Added winner_updated column to elections table');
    // Not closing the connection as it's managed by db.js

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
