import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';

  // Load .env
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const testDbName = process.env.TEST_DB_NAME || 'wordquest_agent_test';

  console.log(`\n[Jest GlobalSetup] Initializing dedicated test database '${testDbName}' on ${host}:${port}...`);

  let connection: mysql.Connection | null = null;
  try {
    // 1. Connect without database to ensure wordquest_agent_test exists
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${testDbName}\`;`);

    // 2. Initialize all necessary tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        coins INT DEFAULT 0,
        stars INT DEFAULT 0,
        spent_stars INT DEFAULT 0,
        avatar VARCHAR(50) DEFAULT '🦖',
        is_admin TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS islands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        group_name VARCHAR(100) DEFAULT 'General',
        story_title VARCHAR(200) DEFAULT '',
        story_passage TEXT,
        story_passage_json JSON DEFAULT NULL,
        story_questions JSON DEFAULT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        island_id INT NOT NULL,
        word VARCHAR(100) NOT NULL,
        translation VARCHAR(100) NOT NULL,
        sentence TEXT NOT NULL,
        sentence_translation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE,
        UNIQUE KEY unique_island_word (island_id, word)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS user_island_access (
        user_id INT NOT NULL,
        island_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, island_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS user_island_progress (
        user_id INT NOT NULL,
        island_id INT NOT NULL,
        unlocked_stage INT DEFAULT 1,
        completed_stages_mask INT DEFAULT 0,
        translation_stats_json TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, island_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS user_word_progress (
        user_id INT NOT NULL,
        word_id INT NOT NULL,
        error_count INT DEFAULT 0,
        mastered TINYINT(1) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, word_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS story_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS game_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS version_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(20) NOT NULL UNIQUE,
        release_date DATE NOT NULL,
        features JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`[Jest GlobalSetup] Dedicated test database '${testDbName}' is verified and ready.\n`);
  } catch (err: any) {
    console.error(`[Jest GlobalSetup] Warning: Could not initialize test database '${testDbName}':`, err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
