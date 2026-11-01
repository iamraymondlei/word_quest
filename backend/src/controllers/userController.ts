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

export const adminLogin = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.trim().toLowerCase() !== 'admin') {
    return res.status(401).json({ error: '账号或密码错误 (Invalid username or password)' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      'SELECT * FROM users WHERE LOWER(username) = ? AND is_admin = 1',
      ['admin']
    );

    let adminUser = rows[0];
    if (!adminUser) {
      await connection.query(
        `INSERT INTO users (username, avatar, is_admin, password) VALUES ('Admin', '🦖', 1, 'admin')
         ON DUPLICATE KEY UPDATE is_admin = 1`
      );
      const [newRows]: any = await connection.query('SELECT * FROM users WHERE username = ?', ['Admin']);
      adminUser = newRows[0];
    }

    const expectedPassword = adminUser.password || 'admin';
    if (password !== expectedPassword) {
      await connection.rollback();
      return res.status(401).json({ error: '账号或密码错误 (Invalid username or password)' });
    }

    await connection.commit();
    const { password: _, ...userWithoutPassword } = adminUser;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (err: any) {
    if (connection) await connection.rollback();
    return res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { user_id, old_password, new_password } = req.body;
  const uid = Number(user_id);
  if (!uid || !old_password || !new_password) {
    return res.status(400).json({ error: '用户ID、原密码和新密码均不能为空' });
  }

  const trimmedNew = String(new_password).trim();
  if (trimmedNew.length < 3) {
    return res.status(400).json({ error: '新密码长度至少需要3个字符' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows]: any = await connection.query('SELECT * FROM users WHERE id = ?', [uid]);
    if (!rows || rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '未找到该用户' });
    }

    const user = rows[0];
    const currentPassword = user.password || 'admin';
    if (old_password !== currentPassword) {
      await connection.rollback();
      return res.status(401).json({ error: '原密码不正确，请重新输入' });
    }

    await connection.query('UPDATE users SET password = ? WHERE id = ?', [trimmedNew, uid]);
    await connection.commit();
    return res.json({ success: true, message: '密码修改成功' });
  } catch (err: any) {
    if (connection) await connection.rollback();
    return res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, username, coins, stars, spent_stars, avatar, is_admin, created_at FROM users ORDER BY coins DESC, id ASC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addCoins = async (req: Request, res: Response) => {
  const { user_id, coins } = req.body;
  const uid = Number(user_id);
  const deltaCoins = Number(coins);

  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(deltaCoins)) {
    return res.status(400).json({ error: 'Valid user_id and integer coins amount are required' });
  }

  // Security guard: coins increment must be positive and not exceed reasonable single-action threshold (50,000)
  if (deltaCoins < 0 || deltaCoins > 50000) {
    return res.status(400).json({ error: 'Coins increment must be between 0 and 50,000' });
  }

  if (deltaCoins === 0) {
    const [rows]: any = await pool.query('SELECT coins FROM users WHERE id = ?', [uid]);
    return res.json({ success: true, coins: rows[0]?.coins || 0 });
  }

  try {
    const [result]: any = await pool.query('UPDATE users SET coins = coins + ? WHERE id = ?', [deltaCoins, uid]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [rows]: any = await pool.query('SELECT coins FROM users WHERE id = ?', [uid]);
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
