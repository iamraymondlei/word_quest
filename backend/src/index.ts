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
import illustrationRoutes from './routes/illustrationRoutes';
import roadmapRoutes from './routes/roadmapRoutes';
import songRoutes from './routes/songRoutes';
import wordBookRoutes from './routes/wordBookRoutes';
import grammarRoutes from './routes/grammarRoutes';
import { DEFAULT_GAME_SETTINGS } from './controllers/settingController';

// Configure global undici dispatcher to avoid default 300s socket timeout for long-running AI requests
try {
  // @ts-ignore
  const { setGlobalDispatcher, Agent } = require('undici');
  if (setGlobalDispatcher && Agent) {
    setGlobalDispatcher(
      new Agent({
        headersTimeout: 20 * 60 * 1000, // 20 minutes
        bodyTimeout: 20 * 60 * 1000,
        connectTimeout: 60 * 1000
      })
    );
  }
} catch {
  // Fallback if undici is not available
}

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 8010;

console.log('Environment variables:');
console.log('PORT (Backend):', PORT);
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
    
    // 1. Ensure is_admin and password columns exist in users table
    const [cols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
    );
    if (cols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0');
      console.log('Migration: Added is_admin column to users table');
    }

    const [pwdCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'"
    );
    if (pwdCols.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT 'admin'");
      console.log('Migration: Added password column to users table');
    }
    await pool.query("UPDATE users SET password = 'admin' WHERE (username = 'Admin' OR is_admin = 1) AND (password IS NULL OR password = '')");

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

    // 5.1 Ensure stage1_answers_json column exists in user_island_progress table
    const [answersCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_island_progress' AND COLUMN_NAME = 'stage1_answers_json'"
    );
    if (answersCols.length === 0) {
      await pool.query('ALTER TABLE user_island_progress ADD COLUMN stage1_answers_json TEXT NULL');
      console.log('Migration: Added stage1_answers_json column to user_island_progress table');
    }

    // 5.2 Backfill stage1_answers_json for historical records where Stage 1 is completed but answers are missing
    try {
      const [needsBackfill]: any = await pool.query(`
        SELECT uip.user_id, uip.island_id, uip.unlocked_stage, uip.completed_stages_mask, i.story_questions
        FROM user_island_progress uip
        JOIN islands i ON uip.island_id = i.id
        WHERE (uip.stage1_answers_json IS NULL OR uip.stage1_answers_json = '')
          AND (
            (uip.completed_stages_mask & 1) != 0
            OR (uip.completed_stages_mask = 0 AND uip.unlocked_stage > 1)
          )
      `);

      for (const row of needsBackfill) {
        let answers: string[] = [];
        let parsedQuestions: any = [];
        if (row.story_questions) {
          try {
            parsedQuestions = typeof row.story_questions === 'string' ? JSON.parse(row.story_questions) : row.story_questions;
          } catch (e) {}
        }

        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
          answers = parsedQuestions.map((q: any) => q.answer || '');
        } else {
          // Fallback to words sentences
          const [islandWords]: any = await pool.query('SELECT sentence FROM words WHERE island_id = ? ORDER BY id ASC LIMIT 3', [row.island_id]);
          answers = islandWords.map((w: any) => w.sentence || '');
        }

        if (answers.length > 0) {
          await pool.query(
            'UPDATE user_island_progress SET stage1_answers_json = ? WHERE user_id = ? AND island_id = ?',
            [JSON.stringify(answers), row.user_id, row.island_id]
          );
        }
      }
      if (needsBackfill.length > 0) {
        console.log(`Migration: Backfilled stage1_answers_json for ${needsBackfill.length} historical completed record(s)`);
      }
    } catch (bfErr: any) {
      console.warn('Migration: Non-fatal error backfilling stage1_answers_json:', bfErr.message);
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
    // Upgrade legacy ai_prompt_template to the simplified vocabulary extraction prompt
    if (DEFAULT_GAME_SETTINGS.ai_prompt_template) {
      await pool.query(
        `UPDATE game_settings SET setting_value = ? WHERE setting_key = 'ai_prompt_template' AND (setting_value LIKE '%question_count%' OR setting_value LIKE '%clear and accurate Chinese translation%')`,
        [JSON.stringify(DEFAULT_GAME_SETTINGS.ai_prompt_template)]
      );
    }
    console.log('Migration: Ensured game_settings table and default seeds');

    // 10. Ensure project_roadmap_tasks table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_roadmap_tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        category_label VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        version VARCHAR(50) DEFAULT '',
        date_str VARCHAR(50) DEFAULT '',
        summary TEXT,
        steps_json JSON,
        affected_files_json JSON,
        technical_notes TEXT,
        verification TEXT,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        discard_reason TEXT,
        alternative_solution TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Migration: Ensured project_roadmap_tasks table');

    // 11. Ensure song learning content table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        artist VARCHAR(200) NOT NULL,
        album VARCHAR(200) DEFAULT '',
        duration_seconds DECIMAL(10,3) NULL,
        audio_url VARCHAR(500) NOT NULL,
        lrc_text MEDIUMTEXT NULL,
        lrc_source VARCHAR(50) NULL,
        lrclib_id INT NULL,
        match_duration_seconds DECIMAL(10,3) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_LYRICS',
        segments_json JSON NULL,
        translation_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_songs_title_artist (title, artist)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [songTargetWordCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'songs' AND COLUMN_NAME = 'target_words_json'"
    );
    if (songTargetWordCols.length === 0) {
      await pool.query('ALTER TABLE songs ADD COLUMN target_words_json JSON NULL');
      console.log('Migration: Added target_words_json column to songs table');
    }
    const [songTranslationCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'songs' AND COLUMN_NAME = 'translation_json'"
    );
    if (songTranslationCols.length === 0) {
      await pool.query('ALTER TABLE songs ADD COLUMN translation_json JSON NULL');
      console.log('Migration: Added translation_json column to songs table');
    }
    console.log('Migration: Ensured songs table');

    // 11.1 Ensure user_song_access table exists (Song ownership/access)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_song_access (
        user_id INT NOT NULL,
        song_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, song_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Migration: Ensured user_song_access table');

    // 12. Ensure word_books and vocabulary_words tables exist (Phase 9)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS word_books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        island_id INT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NULL,
        tags VARCHAR(255) NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_word_books_category (category),
        INDEX idx_word_books_island (island_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure category and island_id columns exist in existing word_books
    try {
      await pool.query("ALTER TABLE word_books ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'General' AFTER id, ADD INDEX idx_word_books_category (category)");
      console.log('Migration: Added category column to word_books');
    } catch (e: any) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        // column already exists
      }
    }

    try {
      const [islandCols]: any = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'word_books' AND COLUMN_NAME = 'island_id'"
      );
      if (islandCols.length === 0) {
        await pool.query('ALTER TABLE word_books ADD COLUMN island_id INT NULL AFTER category, ADD INDEX idx_word_books_island (island_id)');
        console.log('Migration: Added island_id column to word_books');
      }
    } catch (e: any) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        // column already exists
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vocabulary_words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        word VARCHAR(100) NOT NULL,
        phonetic VARCHAR(100) NULL,
        translation VARCHAR(255) NOT NULL,
        fun_sentences_json JSON NULL,
        antonyms VARCHAR(255) NULL,
        synonyms VARCHAR(255) NULL,
        root_affixes TEXT NULL,
        etymology TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
        INDEX idx_vocab_book_word (book_id, word)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
        user_id INT NOT NULL,
        vocab_id INT NOT NULL,
        error_count INT DEFAULT 0,
        mastered TINYINT(1) DEFAULT 0,
        reading_passed TINYINT(1) DEFAULT 0,
        listening_passed TINYINT(1) DEFAULT 0,
        spelling_passed TINYINT(1) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, vocab_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vocab_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13. Ensure user_word_book_access table exists (Word Book ownership)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_word_book_access (
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, book_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13.1 Ensure user_word_book_progress table exists (Word Book stage progress & stars)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_word_book_progress (
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        completed_stages_mask INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, book_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 14. Ensure vocabulary_attempts and user_vocabulary_mode_stats tables exist (Task 12.1)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vocabulary_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        vocab_id INT NOT NULL,
        mode VARCHAR(32) NOT NULL,
        is_correct TINYINT(1) NOT NULL,
        answer VARCHAR(255) NULL,
        duration_ms INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_client (user_id, client_id),
        INDEX idx_user_vocab (user_id, vocab_id),
        INDEX idx_user_mode_time (user_id, mode, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vocab_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_vocabulary_mode_stats (
        user_id INT NOT NULL,
        vocab_id INT NOT NULL,
        mode VARCHAR(32) NOT NULL,
        correct_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        streak INT DEFAULT 0,
        mastered TINYINT(1) DEFAULT 0,
        last_result TINYINT(1) NULL,
        last_practiced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, vocab_id, mode),
        INDEX idx_user_mode (user_id, mode),
        INDEX idx_user_mode_score (user_id, mode, error_count, streak),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vocab_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed initial word book if empty
    const [bookRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM word_books');
    if (bookRows[0]?.cnt === 0) {
      const [insertBookRes]: any = await pool.query(
        'INSERT INTO word_books (category, title, description, tags, sort_order) VALUES (?, ?, ?, ?, ?)',
        ['General', 'RAZ Level E 冒险核心词', '精选适读探险词汇，搭配生动生活与奇幻例句、构词拆解及词源故事', 'RAZ,自然拼读,高频词', 1]
      );
      const bookId = insertBookRes.insertId;

      const sampleWords = [
        {
          word: 'curious',
          phonetic: '/ˈkjʊəriəs/',
          translation: '好奇的；奇妙的',
          fun_sentences_json: JSON.stringify([
            { en: 'The curious kitten pressed the big red button and vanished!', zh: '那只充满好奇心的小猫按下了大红按钮，然后瞬间消失了！' },
            { en: 'Scientists are always curious about what aliens eat for breakfast.', zh: '科学家总是对“外星人早餐吃什么”充满好奇。' }
          ]),
          antonyms: 'indifferent, unconcerned',
          synonyms: 'inquisitive, eager to know',
          root_affixes: JSON.stringify({
            en: 'cur- / cure (care, concern) + -ious (adjective suffix: full of)',
            zh: 'cur- / cure (关心、在意) + -ious (形容词后缀: 充满...的)'
          }),
          etymology: JSON.stringify({
            en: 'From Latin cura (care). In ancient times, it referred to someone who took deep care to inspect and understand things.',
            zh: '来自拉丁语 cura（关怀、照料）。古时候指“对事物极度上心想要探究明白”。'
          })
        },
        {
          word: 'ancient',
          phonetic: '/ˈeɪnʃənt/',
          translation: '古老的；古代的',
          fun_sentences_json: JSON.stringify([
            { en: 'We discovered an ancient golden dragon coin in the dark cave!', zh: '我们在幽暗的山洞里发现了一枚古老的金龙硬币！' }
          ]),
          antonyms: 'modern, fresh',
          synonyms: 'antique, primitive',
          root_affixes: JSON.stringify({
            en: 'ante- (before, in front of) + -ient',
            zh: 'ante- (前面、早先) + -ient'
          }),
          etymology: JSON.stringify({
            en: 'From Latin ante, pointing back to distant times long before our own.',
            zh: '源自拉丁语 ante 前方的时光，指遥远过去的岁月。'
          })
        },
        {
          word: 'resilient',
          phonetic: '/rɪˈzɪliənt/',
          translation: '有韧性的；迅速恢复的',
          fun_sentences_json: JSON.stringify([
            { en: 'The little rubber ball is super resilient and bounced over the moon!', zh: '那个小橡胶球超有韧性，直接弹过了月亮！' }
          ]),
          antonyms: 'fragile, brittle',
          synonyms: 'flexible, tough',
          root_affixes: JSON.stringify({
            en: 're- (back, again) + salire (to leap, jump)',
            zh: 're- (回) + salire (跳跃)'
          }),
          etymology: JSON.stringify({
            en: 'Literally meaning to bounce or leap back, describing an object or mind that bounces right back after being pushed down.',
            zh: '字面意为‘反弹跳回’，形容物体或心态在受挫后迅速复原、极具韧性。'
          })
        },
        {
          word: 'mysterious',
          phonetic: '/mɪˈstɪəriəs/',
          translation: '神秘莫测的；难以理解的',
          fun_sentences_json: JSON.stringify([
            { en: 'A mysterious whisper echoed in the foggy forest.', zh: '神秘的低语在迷雾森林中久久回荡。' }
          ]),
          antonyms: 'obvious, familiar',
          synonyms: 'secretive, puzzling',
          root_affixes: JSON.stringify({
            en: 'mystery (secret, rite) + -ous (adjective suffix)',
            zh: 'mystery (秘密) + -ous (形容词后缀)'
          }),
          etymology: JSON.stringify({
            en: 'From Greek mystērion (secret ritual), evoking wondrous hidden truths.',
            zh: '源于希腊语 mystērion（秘密仪式），引申为令人遐想的未解之谜。'
          })
        },
        {
          word: 'courageous',
          phonetic: '/kəˈreɪdʒəs/',
          translation: '勇敢的；有胆量的',
          fun_sentences_json: JSON.stringify([
            { en: 'The courageous knight faced the giant dragon with a wooden spoon!', zh: '勇敢的骑士拿着一把木勺勇敢地面对巨龙！' }
          ]),
          antonyms: 'cowardly, fearful',
          synonyms: 'brave, fearless',
          root_affixes: JSON.stringify({
            en: 'cour- / cor (heart) + -age + -ous',
            zh: 'cour- / cor (心) + -age + -ous'
          }),
          etymology: JSON.stringify({
            en: 'Ancient people believed true bravery springs directly from a stout, steadfast heart (cor).',
            zh: '古人认为勇气发端自纯粹而坚定的内心（Cor）。'
          })
        }
      ];

      for (const w of sampleWords) {
        await pool.query(
          `INSERT INTO vocabulary_words (book_id, word, phonetic, translation, fun_sentences_json, antonyms, synonyms, root_affixes, etymology)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [bookId, w.word, w.phonetic, w.translation, w.fun_sentences_json, w.antonyms, w.synonyms, w.root_affixes, w.etymology]
        );
      }
      console.log('Migration: Seeded default word book with sample vocabulary');
    }
    console.log('Migration: Ensured word_books and vocabulary_words tables');

    // 15. Initial migration: sync story islands into word_books
    try {
      const [existingIslandBooks]: any = await pool.query(
        'SELECT id FROM word_books WHERE island_id IS NOT NULL LIMIT 1'
      );
      if (!existingIslandBooks || existingIslandBooks.length === 0) {
        const { syncAllIslandsToWordBooks } = await import('./controllers/wordBookController');
        const syncRes = await syncAllIslandsToWordBooks(pool);
        console.log(`Migration: Initial sync: created ${syncRes.totalBooks} picture book word books (${syncRes.totalWords} words) into Word Bank`);
      } else {
        // Ensure any newly added islands without word books get synced
        const [islandsWithoutBooks]: any = await pool.query(
          `SELECT i.id FROM islands i
           LEFT JOIN word_books b ON b.island_id = i.id
           WHERE b.id IS NULL`
        );
        if (islandsWithoutBooks && islandsWithoutBooks.length > 0) {
          const { syncIslandToWordBook } = await import('./controllers/wordBookController');
          for (const isl of islandsWithoutBooks) {
            await syncIslandToWordBook(pool, isl.id);
          }
          console.log(`Migration: Ensured word books for ${islandsWithoutBooks.length} story islands`);
        }
      }
    } catch (syncErr: any) {
      console.warn('Migration: Picture book to Word Bank sync warning:', syncErr.message);
    }

    // 16. Align word_books category with story groups (Phase 4)
    try {
      await pool.query(`
        UPDATE word_books b
        JOIN islands i ON b.island_id = i.id
        SET b.category = COALESCE(NULLIF(TRIM(i.group_name), ''), 'General')
        WHERE b.island_id IS NOT NULL
      `);
      console.log('Migration: Aligned picture book word_books category with story_groups');
    } catch (alignErr: any) {
      console.warn('Migration: Word books category alignment warning:', alignErr.message);
    }

    // 17. Sync Word Matching 朗读跟读 (bit 4) to 挑战测试 (bit 16) if completed
    try {
      const [updateResult]: any = await pool.query(`
        UPDATE user_island_progress
        SET completed_stages_mask = completed_stages_mask | 16
        WHERE (completed_stages_mask & 4) != 0 AND (completed_stages_mask & 16) = 0
      `);
      if (updateResult.affectedRows > 0) {
        console.log(`Migration: Backfilled 挑战测试 (bit 16) for ${updateResult.affectedRows} record(s) where 朗读跟读 (bit 4) was completed`);
      }
    } catch (syncErr: any) {
      console.warn('Migration: Word matching challenge bit sync warning:', syncErr.message);
    }

    // 17. Ensure user_grammar_quiz_records table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_grammar_quiz_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'present_simple',
        quiz_id VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        total_questions INT NOT NULL,
        correct_count INT NOT NULL,
        coins_awarded INT NOT NULL DEFAULT 0,
        stars_awarded INT NOT NULL DEFAULT 0,
        user_answers JSON NULL,
        wrong_details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_quiz (user_id, quiz_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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
app.use('/api/illustrations', illustrationRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api', wordBookRoutes);

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
