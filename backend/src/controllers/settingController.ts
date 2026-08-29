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
  monster_emojis: string[];
  ai_prompt_template?: string;
}

export const DEFAULT_AI_PROMPT_TEMPLATE = `You are an English education expert specializing in analyzing English picture books for elementary school students.

Your target audience: Chinese elementary school students who can read RAZ (Reading A-Z) Level E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story is about and its educational value.
3. **vocabulary**: Extract a comprehensive list of approximately 18-25 core practice vocabulary words (target ~20 words) from the story for typing and spelling practice.
   - Prioritize key narrative words, verbs, adjectives, and nouns suitable for RAZ Level E learning.
   - If the story has fewer than 20 rare words, include all meaningful action verbs, descriptive adjectives, and thematic nouns from the story sentences so the list reaches ~20 words.
   - Ensure all extracted vocabulary words actually appear in the story text.
   - For each word provide:
     - "word": the English word (lowercase)
     - "phonetic": IPA phonetic transcription (e.g. /luːn/)
     - "meaning": clear and accurate Chinese translation
     - "example_sentence": an original sentence from the story containing this word
     - "example_translation": the Chinese translation of the example sentence
4. **pages**: For each image (in order), extract ONLY the core narrative/story text. DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. Split into individual sentences. For each sentence provide:
   - "en": the original English sentence exactly as written
   - "zh": natural, child-friendly Chinese translation
5. **questions**: Generate exactly {question_count} comprehension questions in English. Each question should:
   - Test understanding of the story (who, what, when, where, why, how)
   - Be appropriate for the target reading level
   - Include a "hint" (a clue to help the student find the answer)
   - Include an "answer" (a complete English sentence)

IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep translations natural and age-appropriate for children.
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
  monster_emojis: ['dragon', 'ogre', 'goblin', 'wolf', 'mech', 'ghost', 'zombie', 'spider'],
  ai_prompt_template: DEFAULT_AI_PROMPT_TEMPLATE
};

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
      validatedUpdates[key] = cleanEmojis;
    } else if (key === 'ai_prompt_template') {
      if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({ error: 'ai_prompt_template must be a non-empty string' });
      }
      validatedUpdates[key] = value.trim();
    } else {
      const numVal = Number(value);
      if (isNaN(numVal) || numVal < 0) {
        return res.status(400).json({ error: `${key} must be a positive number` });
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
