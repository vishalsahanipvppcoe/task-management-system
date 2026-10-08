const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { dbConfig } = require('../config/database');

async function runMigrations() {
  console.log('[Migration] Starting database migration process...');

  // Step 1: Ensure database exists by connecting to MySQL server without selecting DB first
  const adminConnection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });

  try {
    console.log(`[Migration] Ensuring database '${dbConfig.database}' exists...`);
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } finally {
    await adminConnection.end();
  }

  // Step 2: Connect directly to target database
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Step 3: Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Fetch already executed migrations
    const [executedRows] = await connection.query('SELECT name FROM schema_migrations;');
    const executedMigrations = new Set(executedRows.map(row => row.name));

    // Step 4: Scan and sort migration files
    const migrationsDir = __dirname;
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'runner.js')
      .sort();

    let migratedCount = 0;

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migration = require(migrationPath);
      const migrationName = migration.name || file.replace('.js', '');

      if (executedMigrations.has(migrationName)) {
        console.log(`[Migration] Skipping ${migrationName} (already executed)`);
        continue;
      }

      console.log(`[Migration] Applying ${migrationName}...`);
      await migration.up(connection);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?);', [migrationName]);
      console.log(`[Migration] Applied ${migrationName} successfully.`);
      migratedCount++;
    }

    if (migratedCount === 0) {
      console.log('[Migration] Database is already up to date. No new migrations.');
    } else {
      console.log(`[Migration] Finished. Successfully applied ${migratedCount} migration(s).`);
    }
  } catch (error) {
    console.error('[Migration] Failed to run migrations:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Execute directly if run as CLI script
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
