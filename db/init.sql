CREATE DATABASE IF NOT EXISTS wordquest;
USE wordquest;

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

CREATE TABLE IF NOT EXISTS user_island_access (
  user_id INT NOT NULL,
  island_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, island_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS user_island_progress (
  user_id INT NOT NULL,
  island_id INT NOT NULL,
  unlocked_stage INT DEFAULT 1,
  completed_stages_mask INT DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS version_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  release_date DATE NOT NULL,
  features JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO version_history (version, release_date, features) VALUES
('v1.0.0', '2026-07-11', '["Core WordQuest system architecture with User Profiles, Star Map Navigation, and 3 gameplay terminals.", "Passage Decryption: hover translation tooltips with TTS speaker feedback.", "Acoustic Dictation: listening write-up challenges.", "Matrix Hack: space matrix falling speed typing game.", "Database schema for progress tracking and vocabulary records."]'),
('v1.1.0', '2026-07-18', '["Upgraded to Tailwind CSS v4.0 and customized global futuristic style theme.", "Refactored login portal (UserSelect) to futuristic theme with user card profiles and avatar selection.", "Refactored Star Map (AdventureMap) to dark neon capsules with orbital traces.", "Refactored Admin Console (ParentDashboard) with Gemini AI Multimodal Synthesis Engine (picture build) and CSV bulk imports.", "Decoupled local dev ports (5174/8010/8020) and production Docker ports (5173/8000/8080) to support concurrent execution."]'),
('v1.1.1', '2026-07-19', '["Fixed Matrix Hack falling animation freeze by removing CSS transition conflicts.", "Resolved WSL2 Docker Compose gateway proxy timeout for Gemini API calls.", "Refactored dictation inputs to support cursor movement, insertion, and backspace editing.", "Displayed punctuation marks directly in listening dictation mode (no underline hiding).", "Added Global TTS Voice Speed Controller (0.5x - 1.5x) next to header to control reading and dictation audio speed.", "Expanded all gameplay terminals (reading, dictation, typing) to max-w-7xl dynamic width on desktop."]')
ON DUPLICATE KEY UPDATE release_date=VALUES(release_date), features=VALUES(features);
