import { Request, Response } from 'express';
import pool from '../config/db';

export interface GameSettingsMap {
  monster_speed_slow: number;
  monster_speed_medium: number;
  monster_speed_fast: number;
  monster_retreat_distance: number;
  monster_wait_seconds: number;
  consecutive_error_limit: number;
  max_lines_per_page: number;
  initial_hearts: number;
  coins_completion: number;
  coins_speed_bonus: number;
  coins_full_hearts_bonus: number;
  coins_stage1_reading: number;
  coins_stage3_matching: number;
  coins_review_multiplier: number;
  coins_vocab_reading: number;
  coins_vocab_spelling: number;
  monster_emojis: string[];
  ai_prompt_template?: string;
}

export const DEFAULT_AI_PROMPT_TEMPLATE = `You are an English education expert specializing in analyzing English picture books for elementary school students.

Your target audience: Chinese elementary school students who are reading RAZ (Reading A-Z) Level B–E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story is about and its educational value.
3. **vocabulary**: Extract a list of core practice vocabulary words (target ~18-25 words) from the story for typing and spelling practice (e.g. key nouns, verbs, adjectives).
   - Ensure all extracted vocabulary words actually appear in the story text.
   - Output ONLY the list of lowercase English words (e.g. ["pouch", "wallaby", "baby", "bilby"]).
   - Do NOT provide definitions, phonetics, translations, or example sentences during book import (these will be enriched later in the vocabulary editor).
4. **pages**: For each image (in order):
   - "illustration_box": Locate the main story illustration or photograph on this page and output its bounding box as [ymin, xmin, ymax, xmax] normalized integers from 0 to 1000. Exclude standalone text blocks, page numbers, and margins. If the page is text-only without any story picture, set to null.
   - "sentences": Extract ONLY the core narrative/story text. DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. Split into individual sentences. For each sentence provide:
     - "en": the original English sentence exactly as written
     - "zh": a faithful, word-for-word / phrase-for-phrase aligned Chinese translation designed for "Read Chinese & Speak English" (看中文说英文) recall practice:
       - **Every English word or phrase MUST have a clear corresponding Chinese meaning in the translation.** Do NOT omit, merge, or paraphrase away any words.
       - Explicitly translate all pronouns (he/she/it/they/my/our/this/that), articles/quantifiers when meaningful (a/one, some, many, every), adjectives (e.g. little, big, good), adverbs (e.g. too, very, now, again, up, down, away), prepositions (e.g. in, on, into, with, for), and modal/auxiliary nuances (e.g. can, will, want to, have to).
       - Avoid free/idiomatic translations that drop English words or add extra concepts not in the original sentence, so the student can reliably reconstruct every single English word just by looking at the Chinese sentence.
IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep sentence translations faithful and complete: prioritize 1-to-1 word/phrase cueing over literary paraphrasing, while keeping the Chinese understandable for children.
- If a page has no story text, still include it with an empty sentences array.
- Strictly ignore page numbers, header/footer titles, or post-reading activity questions when building the "pages" content.`;

export const DEFAULT_GAME_SETTINGS: GameSettingsMap = {
  monster_speed_slow: 1.5,
  monster_speed_medium: 2.5,
  monster_speed_fast: 4.0,
  monster_retreat_distance: 5,
  monster_wait_seconds: 5,
  consecutive_error_limit: 10,
  max_lines_per_page: 5,
  initial_hearts: 3,
  coins_completion: 150,
  coins_speed_bonus: 50,
  coins_full_hearts_bonus: 30,
  coins_stage1_reading: 100,
  coins_stage3_matching: 100,
  coins_review_multiplier: 0.2,
  coins_vocab_reading: 10,
  coins_vocab_spelling: 20,
  monster_emojis: ['dragon', 'ogre', 'goblin', 'wolf', 'mech', 'ghost', 'zombie', 'spider'],
  ai_prompt_template: DEFAULT_AI_PROMPT_TEMPLATE
};

const ALLOWED_MONSTER_IDS = new Set(DEFAULT_GAME_SETTINGS.monster_emojis);
const NUMERIC_SETTING_RULES: Record<string, { min: number; max: number; integer?: boolean }> = {
  monster_speed_slow: { min: 0.1, max: 20 },
  monster_speed_medium: { min: 0.1, max: 20 },
  monster_speed_fast: { min: 0.1, max: 20 },
  monster_retreat_distance: { min: 0, max: 100 },
  monster_wait_seconds: { min: 0, max: 120 },
  consecutive_error_limit: { min: 1, max: 100, integer: true },
  max_lines_per_page: { min: 1, max: 20, integer: true },
  initial_hearts: { min: 1, max: 20, integer: true },
  coins_completion: { min: 0, max: 100000, integer: true },
  coins_speed_bonus: { min: 0, max: 100000, integer: true },
  coins_full_hearts_bonus: { min: 0, max: 100000, integer: true },
  coins_stage1_reading: { min: 0, max: 100000, integer: true },
  coins_stage3_matching: { min: 0, max: 100000, integer: true },
  coins_review_multiplier: { min: 0, max: 1, integer: false },
  coins_vocab_reading: { min: 0, max: 10000, integer: true },
  coins_vocab_spelling: { min: 0, max: 10000, integer: true },
};
const MAX_AI_PROMPT_LENGTH = 20000;

/**
 * GET /api/game-settings
 * Retrieve all global game settings with fallback defaults.
 */
export const getGameSettings = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM game_settings');
    const settings: Record<string, any> = { ...DEFAULT_GAME_SETTINGS };

    for (const row of rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    res.json(settings);
  } catch (err: any) {
    console.error('Error fetching game settings:', err.message);
    res.status(500).json({ error: 'Failed to fetch game settings' });
  }
};

/**
 * PUT /api/game-settings
 * Update one or more global game settings.
 */
export const updateGameSettings = async (req: Request, res: Response) => {
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates) || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Valid settings object is required' });
  }

  const validKeys = Object.keys(DEFAULT_GAME_SETTINGS);
  const validatedUpdates: Record<string, any> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (!validKeys.includes(key)) {
      continue; // Ignore unknown settings
    }

    if (key === 'monster_emojis') {
      if (!Array.isArray(value) || value.length === 0) {
        return res.status(400).json({ error: 'monster_emojis must be a non-empty array of emoji strings' });
      }
      const cleanEmojis = value.map(e => String(e).trim()).filter(e => e.length > 0);
      if (cleanEmojis.length === 0) {
        return res.status(400).json({ error: 'monster_emojis must contain at least one valid emoji' });
      }
      const invalidIds = cleanEmojis.filter(id => !ALLOWED_MONSTER_IDS.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: `monster_emojis contains unsupported identifiers: ${invalidIds.join(', ')}` });
      }
      validatedUpdates[key] = cleanEmojis;
    } else if (key === 'ai_prompt_template') {
      if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({ error: 'ai_prompt_template must be a non-empty string' });
      }
      if (value.trim().length > MAX_AI_PROMPT_LENGTH) {
        return res.status(400).json({ error: `ai_prompt_template must be ${MAX_AI_PROMPT_LENGTH} characters or less` });
      }
      validatedUpdates[key] = value.trim();
    } else {
      const numVal = Number(value);
      const rule = NUMERIC_SETTING_RULES[key];
      if (!Number.isFinite(numVal) || !rule || numVal < rule.min || numVal > rule.max || (rule.integer && !Number.isInteger(numVal))) {
        return res.status(400).json({
          error: `${key} must be ${rule?.integer ? 'an integer' : 'a number'} between ${rule?.min} and ${rule?.max}`
        });
      }
      validatedUpdates[key] = numVal;
    }
  }

  if (Object.keys(validatedUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid setting keys provided for update' });
  }

  try {
    for (const [key, val] of Object.entries(validatedUpdates)) {
      const jsonVal = JSON.stringify(val);
      await pool.query(
        `INSERT INTO game_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, jsonVal]
      );
    }

    // Fetch and return the updated complete settings
    const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM game_settings');
    const settings: Record<string, any> = { ...DEFAULT_GAME_SETTINGS };

    for (const row of rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    res.json({
      success: true,
      message: 'Game settings updated successfully',
      settings
    });
  } catch (err: any) {
    console.error('Error updating game settings:', err.message);
    res.status(500).json({ error: 'Failed to update game settings' });
  }
};
