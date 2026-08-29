import { Request, Response } from 'express';
import pool from '../config/db';

export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM version_history ORDER BY release_date DESC, id DESC');
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching version history:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
