const { pool } = require('../config/database');
const { hashPassword } = require('../utils/password');

const defaultUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    name: 'Test User',
    email: 'user@example.com',
    password: 'User@123',
    role: 'user'
  }
];

async function seedDatabase() {
  console.log('[Seeder] Starting database seeding...');
  const connection = await pool.getConnection();

  try {
    for (const user of defaultUsers) {
      // Check if user already exists
      const [existing] = await connection.execute(
        'SELECT id, email, role FROM users WHERE email = ?',
        [user.email]
      );

      const hashedPassword = await hashPassword(user.password);

      if (existing.length > 0) {
        // Update user to ensure credentials match seeder specification
        await connection.execute(
          'UPDATE users SET name = ?, password = ?, role = ? WHERE email = ?',
          [user.name, hashedPassword, user.role, user.email]
        );
        console.log(`[Seeder] Updated existing user: ${user.email} (Role: ${user.role})`);
      } else {
        // Insert new user
        await connection.execute(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          [user.name, user.email, hashedPassword, user.role]
        );
        console.log(`[Seeder] Created user: ${user.email} (Role: ${user.role})`);
      }
    }

    console.log('[Seeder] Database seeding completed successfully.');
  } catch (error) {
    console.error('[Seeder] Seeding failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    // If run directly as a script, close the pool so process exits
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
