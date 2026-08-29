import { Request, Response } from 'express';
import pool from '../config/db';

// 解析简易的 CSV 内容，支持双引号包裹以处理包含逗号的句子，并处理保留的双引号
const parseCSV = (csvText: string): Array<{ word: string; translation: string; sentence: string; sentence_translation: string }> => {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  // 跳过首行 header (word,translation,sentence,sentence_translation)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts: string[] = [];
    let j = 0;
    while (j < line.length) {
      // Skip leading spaces before field
      while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
        j++;
      }
      if (j >= line.length) {
        parts.push('');
        break;
      }
      
      if (line[j] === '"') {
        j++; // skip opening quote
        let field = '';
        while (j < line.length) {
          const char = line[j];
          if (char === '"') {
            if (j + 1 < line.length && line[j + 1] === '"') {
              field += '"';
              j += 2; // skip both quotes
            } else {
              j++; // skip closing quote
              break;
            }
          } else {
            field += char;
            j++;
          }
        }
        parts.push(field);
        // Skip until the next comma
        while (j < line.length && line[j] !== ',') {
          j++;
        }
        if (j < line.length && line[j] === ',') {
          j++;
          if (j === line.length) {
            parts.push(''); // trailing empty field
          }
        }
      } else {
        let field = '';
        while (j < line.length && line[j] !== ',') {
          field += line[j];
          j++;
        }
        parts.push(field.trim());
        if (j < line.length && line[j] === ',') {
          j++;
          if (j === line.length) {
            parts.push(''); // trailing empty field
          }
        }
      }
    }

    if (parts.length >= 2) {
      const word = parts[0].trim();
      const translation = parts[1].trim();
      const sentence = (parts[2] || `This is a ${word}.`).trim();
      const sentence_translation = (parts[3] || `这是一个${translation}。`).trim();
      result.push({ word, translation, sentence, sentence_translation });
    }
  }
  return result;
};

const isReservedGroupName = (name: any): boolean => {
  if (typeof name !== 'string') return false;
  const upper = name.trim().toUpperCase();
  return upper === 'ALL' || upper === '__ALL__';
};

export const createOrUpdateIsland = async (req: Request, res: Response) => {
  const { name, group_name, story_title, story_passage, story_passage_json, story_questions, words } = req.body;
  if (!name) return res.status(400).json({ error: 'Island name is required' });

  // Reject reserved group names 'ALL' and '__ALL__' (case-insensitive)
  if (group_name !== undefined && isReservedGroupName(group_name)) {
    return res.status(400).json({ error: `Group name "${group_name}" is reserved. Please choose a different group name.` });
  }

  // When group_name is omitted (undefined), pass null so that ON DUPLICATE KEY UPDATE keeps the existing group_name
  const groupParam = group_name !== undefined
    ? ((typeof group_name === 'string' && group_name.trim()) ? group_name.trim() : 'General')
    : null;
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO islands (name, group_name, story_title, story_passage, story_passage_json, story_questions) 
       VALUES (?, COALESCE(?, 'General'), ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         group_name = COALESCE(?, group_name),
         story_title = VALUES(story_title), 
         story_passage = VALUES(story_passage), 
         story_passage_json = VALUES(story_passage_json),
         story_questions = VALUES(story_questions)`,
      [
        name, 
        groupParam,
        story_title || '', 
        story_passage || '', 
        story_passage_json ? JSON.stringify(story_passage_json) : null,
        JSON.stringify(story_questions || []),
        groupParam
      ]
    );

    const [rows]: any = await connection.query('SELECT id FROM islands WHERE name = ?', [name]);
    const islandId = rows[0].id;

    if (groupParam) {
      await connection.query('INSERT IGNORE INTO story_groups (name) VALUES (?)', [groupParam]);
    }

    // If there are words provided in the request body, insert or update them
    if (words && Array.isArray(words)) {
      for (const w of words) {
        const lowercaseWord = (w.word || '').toLowerCase().trim();
        if (!lowercaseWord) continue;
        await connection.query(
          `INSERT INTO words (island_id, word, translation, sentence, sentence_translation)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             translation = VALUES(translation), 
             sentence = VALUES(sentence), 
             sentence_translation = VALUES(sentence_translation)`,
          [
            islandId,
            lowercaseWord,
            w.translation || '',
            w.sentence || '',
            w.sentence_translation || ''
          ]
        );
      }
    }

    if (req.body.user_ids && Array.isArray(req.body.user_ids)) {
      await connection.query('DELETE FROM user_island_access WHERE island_id = ?', [islandId]);
      for (const uid of req.body.user_ids) {
        await connection.query(
          'INSERT IGNORE INTO user_island_access (user_id, island_id) VALUES (?, ?)',
          [uid, islandId]
        );
      }
    }

    await connection.commit();

    // Fetch the fully updated island data to return
    const [updatedRows]: any = await pool.query('SELECT * FROM islands WHERE id = ?', [islandId]);
    const island = updatedRows[0];

    const [accessRows]: any = await pool.query('SELECT user_id FROM user_island_access WHERE island_id = ?', [islandId]);
    const assigned_user_ids = accessRows.map((r: any) => r.user_id);
    
    // Format JSON fields back for frontend convenience
    res.json({
      ...island,
      group_name: island.group_name || 'General',
      story_passage_json: typeof island.story_passage_json === 'string' ? JSON.parse(island.story_passage_json) : island.story_passage_json,
      story_questions: typeof island.story_questions === 'string' ? JSON.parse(island.story_questions) : island.story_questions,
      assigned_user_ids
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Transaction rollback failed', rollbackErr);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const getIslands = async (req: Request, res: Response) => {
  const userId = req.query.user_id;
  const groupQuery = typeof req.query.group === 'string' ? req.query.group.trim() : (typeof req.query.group_name === 'string' ? req.query.group_name.trim() : '');
  const hasGroupFilter = groupQuery !== '' && !isReservedGroupName(groupQuery);

  try {
    let isAdmin = false;
    if (userId) {
      const [userRows]: any = await pool.query('SELECT username, is_admin FROM users WHERE id = ?', [userId]);
      if (userRows.length > 0) {
        const user = userRows[0];
        if (user.is_admin === 1 || (user.username && user.username.toLowerCase() === 'admin')) {
          isAdmin = true;
        }
      }
    }

    let islands: any[] = [];
    if (isAdmin || !userId) {
      if (hasGroupFilter) {
        if (groupQuery === 'General') {
          const [rows]: any = await pool.query(
            "SELECT * FROM islands WHERE group_name = ? OR group_name IS NULL OR group_name = '' ORDER BY sort_order ASC, id ASC",
            [groupQuery]
          );
          islands = rows;
        } else {
          const [rows]: any = await pool.query(
            'SELECT * FROM islands WHERE group_name = ? ORDER BY sort_order ASC, id ASC',
            [groupQuery]
          );
          islands = rows;
        }
      } else {
        const [rows]: any = await pool.query('SELECT * FROM islands ORDER BY sort_order ASC, id ASC');
        islands = rows;
      }
    } else {
      // Regular user: check user_island_access
      const [accessRows]: any = await pool.query(
        'SELECT island_id FROM user_island_access WHERE user_id = ?',
        [userId]
      );
      if (accessRows.length > 0) {
        const allowedIds = accessRows.map((r: any) => r.island_id);
        if (hasGroupFilter) {
          if (groupQuery === 'General') {
            const [rows]: any = await pool.query(
              "SELECT * FROM islands WHERE id IN (?) AND (group_name = ? OR group_name IS NULL OR group_name = '') ORDER BY sort_order ASC, id ASC",
              [allowedIds, groupQuery]
            );
            islands = rows;
          } else {
            const [rows]: any = await pool.query(
              'SELECT * FROM islands WHERE id IN (?) AND group_name = ? ORDER BY sort_order ASC, id ASC',
              [allowedIds, groupQuery]
            );
            islands = rows;
          }
        } else {
          const [rows]: any = await pool.query(
            'SELECT * FROM islands WHERE id IN (?) ORDER BY sort_order ASC, id ASC',
            [allowedIds]
          );
          islands = rows;
        }
      } else {
        // Fallback to all islands if no specific assignments exist
        if (hasGroupFilter) {
          if (groupQuery === 'General') {
            const [rows]: any = await pool.query(
              "SELECT * FROM islands WHERE group_name = ? OR group_name IS NULL OR group_name = '' ORDER BY sort_order ASC, id ASC",
              [groupQuery]
            );
            islands = rows;
          } else {
            const [rows]: any = await pool.query(
              'SELECT * FROM islands WHERE group_name = ? ORDER BY sort_order ASC, id ASC',
              [groupQuery]
            );
            islands = rows;
          }
        } else {
          const [rows]: any = await pool.query('SELECT * FROM islands ORDER BY sort_order ASC, id ASC');
          islands = rows;
        }
      }
    }
    
    if (islands.length === 0) {
      return res.json([]);
    }

    const islandIds = islands.map((island: any) => island.id);

    // 一次性查询所有单词
    const [allWords]: any = await pool.query(
      'SELECT * FROM words WHERE island_id IN (?) ORDER BY id ASC',
      [islandIds]
    );

    // 一次性查询用户的通关状态与各关卡完成 bitmask
    let progressMap: Record<number, { unlocked_stage: number; completed_stages_mask: number }> = {};
    if (userId) {
      const [progRows]: any = await pool.query(
        'SELECT island_id, unlocked_stage, completed_stages_mask FROM user_island_progress WHERE user_id = ? AND island_id IN (?)',
        [userId, islandIds]
      );
      for (const row of progRows) {
        const rawUnlocked = row.unlocked_stage || 1;
        let mask = row.completed_stages_mask || 0;
        if (mask === 0 && rawUnlocked > 1) {
          if (rawUnlocked === 2) mask = 1;
          else if (rawUnlocked === 3) mask = 3;
          else if (rawUnlocked === 4) mask = 7;
          else if (rawUnlocked >= 5) mask = 15;
        }
        progressMap[row.island_id] = {
          unlocked_stage: rawUnlocked,
          completed_stages_mask: mask
        };
      }
    }

    // 一次性查询所有岛屿的已关联用户 IDs
    const [accessMapRows]: any = await pool.query(
      'SELECT island_id, user_id FROM user_island_access WHERE island_id IN (?)',
      [islandIds]
    );
    const accessMap: Record<number, number[]> = {};
    for (const row of accessMapRows) {
      if (!accessMap[row.island_id]) {
        accessMap[row.island_id] = [];
      }
      accessMap[row.island_id].push(row.user_id);
    }

    // 内存中建立映射
    const wordsByIslandId: Record<number, any[]> = {};
    for (const id of islandIds) {
      wordsByIslandId[id] = [];
    }
    for (const w of allWords) {
      if (wordsByIslandId[w.island_id]) {
        wordsByIslandId[w.island_id].push({
          id: w.id,
          word: w.word,
          translation: w.translation,
          sentence: w.sentence,
          sentence_translation: w.sentence_translation
        });
      }
    }

    const result = islands.map((island: any) => {
      const prog = userId ? progressMap[island.id] : null;
      const unlockedStage = prog ? prog.unlocked_stage : 1;
      const completedMask = prog ? prog.completed_stages_mask : 0;
      return {
        id: island.id,
        name: island.name,
        group_name: island.group_name || 'General',
        story_title: island.story_title,
        story_passage: island.story_passage,
        story_passage_json: typeof island.story_passage_json === 'string' ? JSON.parse(island.story_passage_json) : island.story_passage_json,
        story_questions: typeof island.story_questions === 'string' ? JSON.parse(island.story_questions) : island.story_questions,
        words: wordsByIslandId[island.id],
        unlocked_stage: unlockedStage,
        completed_stages_mask: completedMask,
        assigned_user_ids: accessMap[island.id] || []
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateIslandAccess = async (req: Request, res: Response) => {
  const islandId = parseInt(req.params.id, 10);
  const { user_ids } = req.body;
  if (isNaN(islandId)) {
    return res.status(400).json({ error: 'Invalid island ID' });
  }
  if (!Array.isArray(user_ids)) {
    return res.status(400).json({ error: 'user_ids must be an array' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [islands]: any = await connection.query('SELECT id FROM islands WHERE id = ?', [islandId]);
    if (islands.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Island not found' });
    }

    await connection.query('DELETE FROM user_island_access WHERE island_id = ?', [islandId]);

    for (const uid of user_ids) {
      await connection.query(
        'INSERT IGNORE INTO user_island_access (user_id, island_id) VALUES (?, ?)',
        [uid, islandId]
      );
    }

    await connection.commit();
    res.json({ success: true, island_id: islandId, user_ids });
  } catch (err: any) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

export const uploadIslandWords = async (req: Request, res: Response) => {
  const { island_name, group_name } = req.body;
  if (!island_name) return res.status(400).json({ error: 'Island name is required' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Reject reserved group names 'ALL' and '__ALL__' (case-insensitive)
  if (group_name !== undefined && isReservedGroupName(group_name)) {
    return res.status(400).json({ error: `Group name "${group_name}" is reserved. Please choose a different group name.` });
  }

  const csvContent = req.file.buffer.toString('utf-8');
  const records = parseCSV(csvContent);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const groupParam = group_name !== undefined
      ? ((typeof group_name === 'string' && group_name.trim()) ? group_name.trim() : 'General')
      : null;

    // 获取或创建岛屿
    await connection.query(
      `INSERT INTO islands (name, group_name) VALUES (?, COALESCE(?, 'General')) 
       ON DUPLICATE KEY UPDATE group_name = COALESCE(?, group_name)`,
      [island_name, groupParam, groupParam]
    );
    const [islandRows]: any = await connection.query('SELECT id FROM islands WHERE name = ?', [island_name]);
    const islandId = islandRows[0].id;

    if (groupParam) {
      await connection.query('INSERT IGNORE INTO story_groups (name) VALUES (?)', [groupParam]);
    }

    // 导入单词
    for (const rec of records) {
      await connection.query(
        `INSERT INTO words (island_id, word, translation, sentence, sentence_translation) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE translation = VALUES(translation), sentence = VALUES(sentence), sentence_translation = VALUES(sentence_translation)`,
        [islandId, rec.word, rec.translation, rec.sentence, rec.sentence_translation]
      );
    }

    await connection.commit();
    res.json({ success: true, message: `Successfully imported ${records.length} words to ${island_name}` });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed', rollbackErr);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

const escapeCSVField = (val: string): string => {
  return val.replace(/"/g, '""');
};

export const exportErrors = async (req: Request, res: Response) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
    const [rows]: any = await pool.query(
      `SELECT w.word, w.translation, uwp.error_count 
       FROM user_word_progress uwp
       JOIN words w ON uwp.word_id = w.id
       WHERE uwp.user_id = ? AND uwp.error_count > 0
       ORDER BY uwp.error_count DESC`,
      [userId]
    );

    // 生成错词 CSV
    let csvContent = 'word,translation,error_count\n';
    const promptWords: string[] = [];
    rows.forEach((row: any) => {
      const escapedWord = escapeCSVField(row.word);
      const escapedTranslation = escapeCSVField(row.translation);
      csvContent += `"${escapedWord}","${escapedTranslation}",${row.error_count}\n`;
      promptWords.push(`${row.word}(${row.translation})`);
    });

    // 生成推荐 Prompt
    const prompt = `您好，我的孩子最近经常拼错的英语单词是：${promptWords.join('，')}。
请使用这些单词，为小学四年级的学生编写一篇包含这些词的趣味情景小故事。
要求：
1. 故事生动，句式简单。
2. 针对故事提出 2-3 个英文阅读理解问题。
3. 请为每个问题提供：问题文本、正确的回答完整句子（以及提示句子结构，例如 "He met a/an [动物] in the forest."）。
4. 故事正文里这些高频错词请特别标记出来。`;

    res.json({
      csv: csvContent,
      prompt: prompt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const parseStoryCSV = (csvText: string): Array<{ paragraph_num: number; sentence_num: number; sentence_text: string; translation: string }> => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) {
    throw new Error('CSV is empty');
  }

  // Validate headers: paragraph_num,sentence_num,sentence_text,translation
  const headers = lines[0].trim().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const expectedHeaders = ['paragraph_num', 'sentence_num', 'sentence_text', 'translation'];
  
  if (headers.length !== expectedHeaders.length || !headers.every((h, idx) => h === expectedHeaders[idx])) {
    throw new Error('CSV headers must be exactly: paragraph_num, sentence_num, sentence_text, translation');
  }

  const result: Array<{ paragraph_num: number; sentence_num: number; sentence_text: string; translation: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts: string[] = [];
    let j = 0;
    while (j < line.length) {
      // Skip leading spaces before field
      while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
        j++;
      }
      if (j >= line.length) {
        parts.push('');
        break;
      }
      
      if (line[j] === '"') {
        j++; // skip opening quote
        let field = '';
        while (j < line.length) {
          const char = line[j];
          if (char === '"') {
            if (j + 1 < line.length && line[j + 1] === '"') {
              field += '"';
              j += 2; // skip both quotes
            } else {
              j++; // skip closing quote
              break;
            }
          } else {
            field += char;
            j++;
          }
        }
        parts.push(field);
        // Skip until the next comma
        while (j < line.length && line[j] !== ',') {
          j++;
        }
        if (j < line.length && line[j] === ',') {
          j++;
          if (j === line.length) {
            parts.push(''); // trailing empty field
          }
        }
      } else {
        let field = '';
        while (j < line.length && line[j] !== ',') {
          field += line[j];
          j++;
        }
        parts.push(field.trim());
        if (j < line.length && line[j] === ',') {
          j++;
          if (j === line.length) {
            parts.push(''); // trailing empty field
          }
        }
      }
    }

    if (parts.length < 4) {
      throw new Error(`Row ${i + 1} does not have all required fields`);
    }

    const pNumStr = parts[0].trim();
    const sNumStr = parts[1].trim();
    const sentenceText = parts[2];
    const translation = parts[3];

    // Check if the strings represent integers (digits only, optionally signed)
    const intRegex = /^-?\d+$/;
    if (!intRegex.test(pNumStr) || !intRegex.test(sNumStr)) {
      throw new Error(`Row ${i + 1}: numeric fields paragraph_num and sentence_num must be integers`);
    }

    const paragraph_num = parseInt(pNumStr, 10);
    const sentence_num = parseInt(sNumStr, 10);

    result.push({
      paragraph_num,
      sentence_num,
      sentence_text: sentenceText.trim(),
      translation: translation.trim()
    });
  }

  return result;
};

export const uploadStoryCSV = async (req: Request, res: Response) => {
  const { island_id } = req.body;
  if (!island_id) {
    return res.status(400).json({ error: 'Island ID is required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const islandIdNum = parseInt(island_id, 10);
  if (isNaN(islandIdNum)) {
    return res.status(400).json({ error: 'Island ID must be an integer' });
  }

  try {
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parseStoryCSV(csvContent);

    // Sort by paragraph_num ascending, then sentence_num ascending
    records.sort((a, b) => {
      if (a.paragraph_num !== b.paragraph_num) {
        return a.paragraph_num - b.paragraph_num;
      }
      return a.sentence_num - b.sentence_num;
    });

    // Check if the island exists first
    const [islandRows]: any = await pool.query('SELECT id FROM islands WHERE id = ?', [islandIdNum]);
    if (islandRows.length === 0) {
      return res.status(400).json({ error: 'Island not found' });
    }

    // Update story_passage_json
    await pool.query(
      'UPDATE islands SET story_passage_json = ? WHERE id = ?',
      [JSON.stringify(records), islandIdNum]
    );

    res.json({
      success: true,
      message: `Successfully uploaded and sorted story CSV for island ID ${islandIdNum}`,
      data: records
    });
  } catch (err: any) {
    // Intercept database/validation errors and return 400
    return res.status(400).json({ error: err.message });
  }
};

export const getAIModels = async (req: Request, res: Response) => {
  const cli = (req.query.cli as string) || 'agy';
  try {
    const aiAgentUrl = process.env.AI_AGENT_URL || 'http://localhost:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${aiAgentUrl}/models?cli=${encodeURIComponent(cli)}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `AI Agent returned error: ${errorText}` });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching AI models:', err);
    // Return fallback list so frontend never breaks
    if (cli === 'codex') {
      return res.json({
        success: true,
        cli: 'codex',
        models: [
          { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', description: 'Codex Flagship multimodal model (Default)' },
          { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI Flagship multimodal model' },
        ],
        default_model: 'gpt-5.6-sol',
      });
    }
    return res.json({
      success: true,
      cli: 'agy',
      models: [
        { id: 'gemini-3.7-flash-high', name: 'Gemini 3.7 Flash (High)', description: 'High capability, recommended (Default)' },
        { id: 'gemini-3.7-flash-medium', name: 'Gemini 3.7 Flash (Medium)', description: 'Medium reasoning effort' },
        { id: 'gemini-3.7-flash-low', name: 'Gemini 3.7 Flash (Low)', description: 'Fastest low reasoning' },
        { id: 'gemini-3.6-flash-high', name: 'Gemini 3.6 Flash (High)', description: 'High performance' },
        { id: 'gemini-3.6-flash-medium', name: 'Gemini 3.6 Flash (Medium)', description: 'Balanced performance' },
        { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)', description: 'Lightweight' },
        { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)', description: 'Standard fast' },
        { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', description: 'Strongest capability' },
      ],
      default_model: 'gemini-3.7-flash-high',
    });
  }
};

export const importAIStory = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  let questionCount = parseInt(req.body.question_count || '5', 10);
  if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
    questionCount = 5;
  }
  const island_name = req.body.island_name;
  const model = req.body.model || '';
  const cli = req.body.cli || 'agy';
  const rawCustomPrompt = typeof req.body.custom_prompt === 'string' ? req.body.custom_prompt.trim() : '';
  const rawPrompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
  const effectivePrompt = rawCustomPrompt || rawPrompt || '';

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one image.' });
  }

  try {
    const aiAgentUrl = process.env.AI_AGENT_URL || 'http://localhost:8000';
    const formData = new FormData();
    formData.append('question_count', String(questionCount));
    formData.append('cli', cli);
    if (model) {
      formData.append('model', model);
    }
    if (effectivePrompt) {
      formData.append('prompt', effectivePrompt);
      formData.append('custom_prompt', effectivePrompt);
    }
    for (const file of files) {
      const blob = new Blob([file.buffer as any], { type: file.mimetype });
      formData.append('images', blob, file.originalname);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

    let response: any;
    try {
      response = await fetch(`${aiAgentUrl}/parse`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('AI 解析服务请求超时，请稍后重试');
      }
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `AI Agent returned error: ${errorText}` });
    }

    const responseData: any = await response.json();
    if (!responseData.success) {
      return res.status(400).json({ error: responseData.error || 'AI Agent parsing failed' });
    }

    const aiData = responseData.data;
    if (!aiData) {
      return res.status(400).json({ error: 'AI Agent returned empty data' });
    }

    // Directly return the parsed content to the frontend for manual confirmation and adjustment
    const requestedGroupName = (typeof req.body.group_name === 'string' && req.body.group_name.trim()) 
      ? req.body.group_name.trim() 
      : 'General';

    return res.json({
      success: true,
      message: 'AI successfully analyzed the picture book pages. Content populated below.',
      data: {
        title: aiData.title || '',
        theme: aiData.theme || '',
        group_name: requestedGroupName,
        vocabulary: aiData.vocabulary || [],
        pages: aiData.pages || [],
        questions: aiData.questions || []
      }
    });

  } catch (fetchErr: any) {
    return res.status(500).json({ error: `Failed to communicate with AI Agent: ${fetchErr.message}` });
  }
};
