import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * Get user's grammar progress summary across all quiz cards
 * GET /api/grammar/progress/:userId
 */
export const getGrammarProgress = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT id, category, quiz_id, score, total_questions, correct_count,
              coins_awarded, stars_awarded, user_answers, wrong_details, created_at
       FROM user_grammar_quiz_records
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    // Group by quiz_id
    const summary: Record<string, any> = {};

    for (const row of rows) {
      const qId = row.quiz_id;
      if (!summary[qId]) {
        summary[qId] = {
          quizId: qId,
          category: row.category,
          attemptsCount: 0,
          bestScore: 0,
          isPassed: false,
          latestRecord: null,
        };
      }

      summary[qId].attemptsCount += 1;
      if (row.score > summary[qId].bestScore) {
        summary[qId].bestScore = row.score;
      }
      if (summary[qId].bestScore >= 80) {
        summary[qId].isPassed = true;
      }

      // First encountered in DESC order is the latest record
      if (!summary[qId].latestRecord) {
        let parsedAnswers = row.user_answers;
        if (typeof parsedAnswers === 'string') {
          try {
            parsedAnswers = JSON.parse(parsedAnswers);
          } catch (e) {}
        }

        let parsedWrongs = row.wrong_details;
        if (typeof parsedWrongs === 'string') {
          try {
            parsedWrongs = JSON.parse(parsedWrongs);
          } catch (e) {}
        }

        summary[qId].latestRecord = {
          id: row.id,
          score: row.score,
          totalQuestions: row.total_questions,
          correctCount: row.correct_count,
          coinsAwarded: row.coins_awarded,
          starsAwarded: row.stars_awarded,
          userAnswers: parsedAnswers || {},
          wrongDetails: parsedWrongs || [],
          createdAt: row.created_at,
        };
      }
    }

    res.json(summary);
  } catch (err: any) {
    console.error('Error in getGrammarProgress:', err.message);
    res.status(500).json({ error: 'Failed to fetch grammar progress' });
  }
};

/**
 * Submit grammar quiz attempt, grade & reward coins/stars
 * POST /api/grammar/submit
 */
export const submitGrammarQuiz = async (req: Request, res: Response) => {
  const {
    userId,
    category = 'present_simple',
    quizId,
    score,
    totalQuestions,
    correctCount,
    userAnswers = {},
    wrongDetails = [],
  } = req.body;

  if (!userId || !quizId || typeof score !== 'number') {
    return res.status(400).json({ error: 'userId, quizId, and valid score are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check user's previous best score on this quiz
    const [existingRows]: any = await connection.query(
      `SELECT MAX(score) AS max_score FROM user_grammar_quiz_records WHERE user_id = ? AND quiz_id = ?`,
      [userId, quizId]
    );

    const prevMaxScore = existingRows[0]?.max_score !== null ? Number(existingRows[0].max_score) : null;

    let coinsAwarded = 0;
    let starsAwarded = 0;

    // Incentive Rule:
    // If score >= 80%:
    // First time passing (prevMaxScore == null or < 80) -> 50 Coins + 1 Star
    // Repeated passing (prevMaxScore >= 80) -> 10 Coins
    if (score >= 80) {
      if (prevMaxScore === null || prevMaxScore < 80) {
        coinsAwarded = 50;
        starsAwarded = 1;
      } else {
        coinsAwarded = 10;
        starsAwarded = 0;
      }
    }

    // Update user coins and stars
    if (coinsAwarded > 0 || starsAwarded > 0) {
      await connection.query(
        `UPDATE users SET coins = coins + ?, stars = stars + ? WHERE id = ?`,
        [coinsAwarded, starsAwarded, userId]
      );
    }

    // Insert historical submission record
    const [insertResult]: any = await connection.query(
      `INSERT INTO user_grammar_quiz_records
        (user_id, category, quiz_id, score, total_questions, correct_count, coins_awarded, stars_awarded, user_answers, wrong_details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        category,
        quizId,
        score,
        totalQuestions || 0,
        correctCount || 0,
        coinsAwarded,
        starsAwarded,
        JSON.stringify(userAnswers),
        JSON.stringify(wrongDetails),
      ]
    );

    // Fetch updated user info
    const [userRows]: any = await connection.query(
      `SELECT id, username, coins, stars, spent_stars, avatar, is_admin FROM users WHERE id = ?`,
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      recordId: insertResult.insertId,
      score,
      coinsAwarded,
      starsAwarded,
      isFirstPass: score >= 80 && (prevMaxScore === null || prevMaxScore < 80),
      user: userRows[0] || null,
    });
  } catch (err: any) {
    await connection.rollback();
    console.error('Error in submitGrammarQuiz:', err.message);
    res.status(500).json({ error: 'Failed to submit grammar quiz' });
  } finally {
    connection.release();
  }
};

/**
 * Get historical submission records for a specific quiz
 * GET /api/grammar/history/:userId/:quizId
 */
export const getGrammarHistory = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const quizId = req.params.quizId;

  if (!userId || !quizId) {
    return res.status(400).json({ error: 'Valid userId and quizId are required' });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT id, score, total_questions, correct_count, coins_awarded, stars_awarded, created_at
       FROM user_grammar_quiz_records
       WHERE user_id = ? AND quiz_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [userId, quizId]
    );

    res.json(rows);
  } catch (err: any) {
    console.error('Error in getGrammarHistory:', err.message);
    res.status(500).json({ error: 'Failed to fetch grammar history' });
  }
};
