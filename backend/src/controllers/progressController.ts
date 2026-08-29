import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * Recalculate stars for a specific user or all users based on completed subtasks (1 subtask = 1 star).
 * Uses a single atomic UPDATE JOIN query to prevent concurrent write drift.
 * Completed stages mask is masked with & 15 to strictly limit to 4 subtasks per island.
 */
export const recalculateUserStars = async (userId?: number): Promise<number | any> => {
  if (userId) {
    await pool.query(
      `UPDATE users u
       LEFT JOIN (
         SELECT 
           user_id,
           COALESCE(SUM(
             BIT_COUNT(
               (IF(
                 completed_stages_mask > 0, 
                 completed_stages_mask, 
                 CASE 
                   WHEN unlocked_stage = 2 THEN 1 
                   WHEN unlocked_stage = 3 THEN 3 
                   WHEN unlocked_stage = 4 THEN 7 
                   WHEN unlocked_stage >= 5 THEN 15 
                   ELSE 0 
                 END
               )) & 15
             )
           ), 0) AS total_subtasks
         FROM user_island_progress
         WHERE user_id = ?
         GROUP BY user_id
       ) prog ON u.id = prog.user_id
       SET u.stars = COALESCE(prog.total_subtasks, 0)
       WHERE u.id = ?`,
      [userId, userId]
    );
    const [rows]: any = await pool.query('SELECT stars FROM users WHERE id = ?', [userId]);
    return rows[0] ? Number(rows[0].stars || 0) : 0;
  } else {
    await pool.query(
      `UPDATE users u
       LEFT JOIN (
         SELECT 
           user_id,
           COALESCE(SUM(
             BIT_COUNT(
               (IF(
                 completed_stages_mask > 0, 
                 completed_stages_mask, 
                 CASE 
                   WHEN unlocked_stage = 2 THEN 1 
                   WHEN unlocked_stage = 3 THEN 3 
                   WHEN unlocked_stage = 4 THEN 7 
                   WHEN unlocked_stage >= 5 THEN 15 
                   ELSE 0 
                 END
               )) & 15
             )
           ), 0) AS total_subtasks
         FROM user_island_progress
         GROUP BY user_id
       ) prog ON u.id = prog.user_id
       SET u.stars = COALESCE(prog.total_subtasks, 0)`
    );
    return null;
  }
};

export const recalculateStars = recalculateUserStars;
export const recalculateAllUsersStars = async () => recalculateUserStars();

export const updateStage = async (req: Request, res: Response) => {
  const { user_id, island_id, stage, completed_stage } = req.body;
  const uid = parseInt(user_id, 10);
  const iid = parseInt(island_id, 10);

  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(iid) || iid <= 0) {
    return res.status(400).json({ error: 'Valid positive user_id and island_id are required' });
  }

  if (stage === undefined && completed_stage === undefined) {
    return res.status(400).json({ error: 'stage or completed_stage parameter is required' });
  }

  let cStage: number | undefined = undefined;
  if (completed_stage !== undefined && completed_stage !== null && completed_stage !== '') {
    const parsedCStage = Number(completed_stage);
    if (!Number.isInteger(parsedCStage) || parsedCStage < 1 || parsedCStage > 4) {
      return res.status(400).json({ error: 'completed_stage must be an integer between 1 and 4' });
    }
    cStage = parsedCStage;
  }

  let stg: number | undefined = undefined;
  if (stage !== undefined && stage !== null && stage !== '') {
    const parsedStage = Number(stage);
    if (!Number.isInteger(parsedStage) || parsedStage < 1 || parsedStage > 5) {
      return res.status(400).json({ error: 'stage must be an integer between 1 and 5' });
    }
    stg = parsedStage;
  }

  // Calculate stage bitmask (Stage 1 -> bit 1, Stage 2 -> bit 2, Stage 3 -> bit 4, Stage 4 -> bit 8)
  const targetCompletedStage = cStage || (stg ? stg - 1 : 0);
  const stageBit = targetCompletedStage >= 1 && targetCompletedStage <= 4 ? (1 << (targetCompletedStage - 1)) : 0;
  const targetUnlockedStage = stg || (cStage ? cStage + 1 : 1);

  try {
    await pool.query(
      `INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         unlocked_stage = GREATEST(unlocked_stage, VALUES(unlocked_stage)),
         completed_stages_mask = (completed_stages_mask | VALUES(completed_stages_mask)) & 15`,
      [uid, iid, targetUnlockedStage, stageBit]
    );

    // Atomically sync user stars based on 1 subtask = 1 star rule
    const totalStars = await recalculateUserStars(uid);

    const [rows]: any = await pool.query(
      'SELECT unlocked_stage, completed_stages_mask FROM user_island_progress WHERE user_id = ? AND island_id = ?',
      [uid, iid]
    );

    const rawUnlocked = rows[0]?.unlocked_stage || 1;
    let mask = (rows[0]?.completed_stages_mask || 0) & 15;
    if (mask === 0 && rawUnlocked > 1) {
      if (rawUnlocked === 2) mask = 1;
      else if (rawUnlocked === 3) mask = 3;
      else if (rawUnlocked === 4) mask = 7;
      else if (rawUnlocked >= 5) mask = 15;
    }
    mask = mask & 15;

    const [userRows]: any = await pool.query(
      'SELECT stars, spent_stars FROM users WHERE id = ?',
      [uid]
    );
    const userStars = userRows[0]?.stars ?? totalStars;
    const spentStars = userRows[0]?.spent_stars ?? 0;
    const starBalance = Math.max(0, userStars - spentStars);

    res.json({
      success: true,
      unlocked_stage: rawUnlocked,
      completed_stages_mask: mask,
      stars: userStars,
      total_stars: userStars,
      spent_stars: spentStars,
      star_balance: starBalance,
      balance: starBalance
    });
  } catch (err: any) {
    if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'User, island, or word not found' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getProgress = async (req: Request, res: Response) => {
  const rawUserId = req.query.user_id;

  try {
    if (rawUserId !== undefined && rawUserId !== null && rawUserId !== '') {
      const userId = parseInt(rawUserId as string, 10);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user_id: must be a positive integer' });
      }

      const [userRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (userRows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userRows[0];

      const [subtaskRows]: any = await pool.query(
        `SELECT 
           COALESCE(SUM(
             BIT_COUNT(
               (IF(
                 completed_stages_mask > 0, 
                 completed_stages_mask, 
                 CASE 
                   WHEN unlocked_stage = 2 THEN 1 
                   WHEN unlocked_stage = 3 THEN 3 
                   WHEN unlocked_stage = 4 THEN 7 
                   WHEN unlocked_stage >= 5 THEN 15 
                   ELSE 0 
                 END
               )) & 15
             )
           ), 0) AS total_subtasks
         FROM user_island_progress 
         WHERE user_id = ?`,
        [userId]
      );
      const completedSubtasks = Number(subtaskRows[0]?.total_subtasks || 0);
      const stars = user.stars ?? completedSubtasks;
      const spentStars = user.spent_stars || 0;
      const starBalance = Math.max(0, completedSubtasks - spentStars);

      return res.json({
        success: true,
        user_id: userId,
        stars: stars,
        total_stars: stars,
        completed_subtasks: completedSubtasks,
        spent_stars: spentStars,
        star_balance: starBalance,
        balance: starBalance
      });
    }

    // If no user_id query provided, return summary for all users
    const [allUsers]: any = await pool.query('SELECT * FROM users ORDER BY coins DESC, id ASC');
    const result = [];
    for (const u of allUsers) {
      const [subtaskRows]: any = await pool.query(
        `SELECT 
           COALESCE(SUM(
             BIT_COUNT(
               (IF(
                 completed_stages_mask > 0, 
                 completed_stages_mask, 
                 CASE 
                   WHEN unlocked_stage = 2 THEN 1 
                   WHEN unlocked_stage = 3 THEN 3 
                   WHEN unlocked_stage = 4 THEN 7 
                   WHEN unlocked_stage >= 5 THEN 15 
                   ELSE 0 
                 END
               )) & 15
             )
           ), 0) AS total_subtasks
         FROM user_island_progress 
         WHERE user_id = ?`,
        [u.id]
      );
      const completedSubtasks = Number(subtaskRows[0]?.total_subtasks || 0);
      const stars = u.stars ?? completedSubtasks;
      const spentStars = u.spent_stars || 0;
      result.push({
        user_id: u.id,
        username: u.username,
        stars: stars,
        total_stars: stars,
        completed_subtasks: completedSubtasks,
        spent_stars: spentStars,
        star_balance: Math.max(0, completedSubtasks - spentStars),
        balance: Math.max(0, completedSubtasks - spentStars)
      });
    }

    res.json({ success: true, users: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getStars = async (req: Request, res: Response) => {
  return getProgress(req, res);
};

export const recalculateStarsHandler = async (req: Request, res: Response) => {
  const rawUserId = req.body?.user_id !== undefined ? req.body.user_id : req.query?.user_id;

  if (rawUserId === undefined || rawUserId === null || rawUserId === '') {
    return res.status(400).json({ error: 'Valid positive user_id is required' });
  }

  const userId = parseInt(rawUserId as string, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user_id: must be a positive integer' });
  }

  try {
    const [userRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stars = await recalculateUserStars(userId);
    const [updatedUser]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const spentStars = updatedUser[0]?.spent_stars || 0;
    return res.json({
      success: true,
      message: `Stars recalculated successfully for user ${userId}`,
      user_id: userId,
      stars,
      total_stars: stars,
      spent_stars: spentStars,
      star_balance: Math.max(0, stars - spentStars),
      balance: Math.max(0, stars - spentStars)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const logError = async (req: Request, res: Response) => {
  const { user_id, word_id } = req.body;
  if (!user_id || !word_id) return res.status(400).json({ error: 'Missing parameters' });
  try {
    await pool.query(
      `INSERT INTO user_word_progress (user_id, word_id, error_count) 
       VALUES (?, ?, 1) 
       ON DUPLICATE KEY UPDATE error_count = error_count + 1`,
      [user_id, word_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'User, island, or word not found' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateTranslationStats = async (req: Request, res: Response) => {
  const { user_id, island_id, stats } = req.body;
  if (!user_id || !island_id || stats === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const statsJson = typeof stats === 'string' ? stats : JSON.stringify(stats);
    await pool.query(
      `INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, translation_stats_json) 
       VALUES (?, ?, 1, ?) 
       ON DUPLICATE KEY UPDATE translation_stats_json = VALUES(translation_stats_json)`,
      [user_id, island_id, statsJson]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTranslationStats = async (req: Request, res: Response) => {
  const { user_id, island_id } = req.query;
  if (!user_id || !island_id) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT translation_stats_json FROM user_island_progress WHERE user_id = ? AND island_id = ?',
      [user_id, island_id]
    );
    const statsJson = rows[0]?.translation_stats_json;
    const data = statsJson ? JSON.parse(statsJson) : {};
    res.json({ success: true, stats: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
