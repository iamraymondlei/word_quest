import dotenv from 'dotenv';
if (!process.env.DB_HOST) {
  dotenv.config();
}
import express from 'express';
import cors from 'cors';
import pool, { dbConfig } from './config/db';
import wordRoutes from './routes/wordRoutes';
import progressRoutes from './routes/progressRoutes';
import userRoutes from './routes/userRoutes';
import islandRoutes from './routes/islandRoutes';
import versionRoutes from './routes/versionRoutes';
import groupRoutes from './routes/groupRoutes';
import settingRoutes from './routes/settingRoutes';
import { DEFAULT_GAME_SETTINGS } from './controllers/settingController';

const app = express();
const PORT = process.env.PORT || 8000;

console.log('Environment variables:');
console.log('DB_HOST:', dbConfig.host);
console.log('DB_PORT:', dbConfig.port);
console.log('DB_USER:', dbConfig.user);
console.log('DB_NAME (Active):', dbConfig.database);

app.use(cors());
app.use(express.json());

// Test database connection and initialize schema on startup
export async function initializeDatabaseSchema() {
  try {
    console.log('Running automatic database migrations...');
    
    // 1. Ensure is_admin column exists in users table
    const [cols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
    );
    if (cols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0');
      console.log('Migration: Added is_admin column to users table');
    }

    // 2. Ensure user_island_access table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_island_access (
        user_id INT NOT NULL,
        island_id INT NOT NULL,
        PRIMARY KEY (user_id, island_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Ensure Admin account exists with is_admin = 1
    await pool.query(
      `INSERT INTO users (username, avatar, is_admin) VALUES ('Admin', '👑', 1)
       ON DUPLICATE KEY UPDATE is_admin = 1`
    );

    // 4. Ensure translation_stats_json column exists in user_island_progress table
    const [progressCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_island_progress' AND COLUMN_NAME = 'translation_stats_json'"
    );
    if (progressCols.length === 0) {
      await pool.query('ALTER TABLE user_island_progress ADD COLUMN translation_stats_json TEXT NULL');
      console.log('Migration: Added translation_stats_json column to user_island_progress table');
    }

    // 5. Ensure completed_stages_mask column exists in user_island_progress table
    const [maskCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_island_progress' AND COLUMN_NAME = 'completed_stages_mask'"
    );
    if (maskCols.length === 0) {
      await pool.query('ALTER TABLE user_island_progress ADD COLUMN completed_stages_mask INT DEFAULT 0');
      console.log('Migration: Added completed_stages_mask column to user_island_progress table');
    }

    // 6. Ensure group_name column exists in islands table
    const [islandGroupCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'islands' AND COLUMN_NAME = 'group_name'"
    );
    if (islandGroupCols.length === 0) {
      await pool.query("ALTER TABLE islands ADD COLUMN group_name VARCHAR(100) DEFAULT 'General'");
      console.log('Migration: Added group_name column to islands table');
    }
    await pool.query("UPDATE islands SET group_name = 'General' WHERE group_name IS NULL OR group_name = ''");

    // 7. Ensure stars and spent_stars columns exist in users table
    const [starCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'stars'"
    );
    if (starCols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN stars INT DEFAULT 0');
      console.log('Migration: Added stars column to users table');
    }

    const [spentStarCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'spent_stars'"
    );
    if (spentStarCols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN spent_stars INT DEFAULT 0');
      console.log('Migration: Added spent_stars column to users table');
    }

    // 8. Ensure story_groups table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query("INSERT IGNORE INTO story_groups (name) VALUES ('General')");
    await pool.query("INSERT IGNORE INTO story_groups (name) SELECT DISTINCT group_name FROM islands WHERE group_name IS NOT NULL AND group_name != ''");
    console.log('Migration: Ensured story_groups table and default seeds');

    // 9. Ensure game_settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    for (const [key, val] of Object.entries(DEFAULT_GAME_SETTINGS)) {
      await pool.query(
        `INSERT IGNORE INTO game_settings (setting_key, setting_value) VALUES (?, ?)`,
        [key, JSON.stringify(val)]
      );
    }
    console.log('Migration: Ensured game_settings table and default seeds');

    // Recalculate historical stars based on completed subtasks
    const { recalculateAllUsersStars } = await import('./controllers/progressController');
    await recalculateAllUsersStars();

    console.log('Database migrations completed successfully');
  } catch (err: any) {
    console.error('Database migration error:', err.message);
  }
}

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const [rows] = await pool.query('SELECT 1');
    console.log('Database connection successful');
    await initializeDatabaseSchema();
  } catch (err: any) {
    console.error('Database connection failed:', err.message);
    console.error('Please ensure MySQL is running on', process.env.DB_HOST || '127.0.0.1:', process.env.DB_PORT || '3307');
  }
}

if (process.env.NODE_ENV !== 'test') {
  testDatabaseConnection();
}

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.use('/api/words', wordRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/islands', islandRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/game-settings', settingRoutes);
app.use('/api/versions', versionRoutes);

import multer from 'multer';

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size allowed is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit...');
    process.exit(1);
  }, 5000);
  forceExitTimeout.unref();

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database pool closed.');
        clearTimeout(forceExitTimeout);
        process.exit(0);
      } catch (err: any) {
        console.error('Error closing database pool:', err);
        clearTimeout(forceExitTimeout);
        process.exit(1);
      }
    });
  } else {
    try {
      await pool.end();
      console.log('Database pool closed.');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    } catch (err: any) {
      console.error('Error closing database pool:', err);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export { app };
export default app;



