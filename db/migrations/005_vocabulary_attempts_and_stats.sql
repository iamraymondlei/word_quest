-- Migration: 005_vocabulary_attempts_and_stats.sql
-- Description: Add vocabulary_attempts and user_vocabulary_mode_stats tables for progress tracking & weak words mastery

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
