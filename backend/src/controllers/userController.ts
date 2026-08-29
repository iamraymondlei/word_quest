import { Request, Response } from 'express';
import pool from '../config/db';

export const loginOrRegister = async (req: Request, res: Response) => {
  const { username, avatar } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const isAdmin = username.toLowerCase() === 'admin' ? 1 : 0;

    // 自动创建或登录
    // Use COALESCE and NULLIF to prevent resetting existing avatar to default 🦖
    await connection.query(
      `INSERT INTO users (username, avatar, is_admin) VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         avatar = COALESCE(NULLIF(?, ''), avatar),
         is_admin = IF(? = 1, 1, is_admin)`,
      [username, avatar || '🦖', isAdmin, avatar || '', isAdmin]
    );

    const [rows]: any = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    // 为新用户初始化所有岛屿的关卡进度（默认 stage=1） - Optimized single query
    await connection.query(
      `INSERT IGNORE INTO user_island_progress (user_id, island_id, unlocked_stage) 
       SELECT ?, id, 1 FROM islands`,
      [user.id]
    );

    await connection.commit();
    res.json(user);
  } catch (err: any) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM users ORDER BY coins DESC, id ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addCoins = async (req: Request, res: Response) => {
  const { user_id, coins } = req.body;
  if (!user_id || coins === undefined) return res.status(400).json({ error: 'Missing parameters' });
  try {
    const [result]: any = await pool.query('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [rows]: any = await pool.query('SELECT coins FROM users WHERE id = ?', [user_id]);
    res.json({ success: true, coins: rows[0]?.coins || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'User ID is required' });
  try {
    const [result]: any = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAvatar = async (req: Request, res: Response) => {
  const { user_id, avatar } = req.body;
  if (!user_id || !avatar) return res.status(400).json({ error: 'Missing user_id or avatar' });
  try {
    const [result]: any = await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [user_id]);
    res.json({ success: true, user: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
