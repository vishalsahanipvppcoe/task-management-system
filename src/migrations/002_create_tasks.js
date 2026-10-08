/**
 * Migration: 002_create_tasks
 * Creates the tasks table with foreign key constraint and status ENUM.
 */
module.exports = {
  name: '002_create_tasks',
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        status ENUM('Pending', 'In Progress', 'Testing', 'Completed') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tasks_user_id (user_id),
        CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },
  async down(connection) {
    await connection.query(`DROP TABLE IF EXISTS tasks;`);
  }
};
