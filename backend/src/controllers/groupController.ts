import { Request, Response } from 'express';
import pool from '../config/db';

export const isReservedGroupName = (name: string): boolean => {
  return name.trim().toUpperCase() === 'ALL';
};

export const getGroups = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        g.id,
        g.name,
        g.created_at,
        COUNT(i.id) AS story_count
      FROM story_groups g
      LEFT JOIN islands i ON (
        i.group_name = g.name 
        OR (g.name = 'General' AND (i.group_name IS NULL OR i.group_name = ''))
      )
      GROUP BY g.id, g.name, g.created_at
      ORDER BY (g.name = 'General') DESC, g.name ASC
    `;
    const [rows]: any = await pool.query(query);
    res.json(rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      story_count: Number(r.story_count) || 0
    })));
  } catch (err: any) {
    console.error('Error fetching story groups:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required and cannot be blank.' });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Group name must be 100 characters or less.' });
    }
    if (isReservedGroupName(trimmedName)) {
      return res.status(400).json({ error: `Group name "${trimmedName}" is reserved. Please choose a different name.` });
    }

    // Check if group already exists
    const [existing]: any = await pool.query('SELECT id FROM story_groups WHERE name = ?', [trimmedName]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Group "${trimmedName}" already exists.` });
    }

    const [result]: any = await pool.query('INSERT INTO story_groups (name) VALUES (?)', [trimmedName]);
    res.status(201).json({
      id: result.insertId,
      name: trimmedName,
      story_count: 0
    });
  } catch (err: any) {
    console.error('Error creating story group:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required and cannot be blank.' });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Group name must be 100 characters or less.' });
    }
    if (isReservedGroupName(trimmedName)) {
      return res.status(400).json({ error: `Group name "${trimmedName}" is reserved. Please choose a different name.` });
    }

    const [targetGroup]: any = await pool.query('SELECT * FROM story_groups WHERE id = ?', [id]);
    if (targetGroup.length === 0) {
      return res.status(404).json({ error: 'Story group not found.' });
    }

    const oldName = targetGroup[0].name;
    if (oldName === 'General' && trimmedName !== 'General') {
      return res.status(400).json({ error: 'The default group "General" cannot be renamed.' });
    }

    if (oldName === trimmedName) {
      return res.json({ id: targetGroup[0].id, name: trimmedName, message: 'No changes made.' });
    }

    // Check if another group has the new name
    const [duplicate]: any = await pool.query('SELECT id FROM story_groups WHERE name = ? AND id != ?', [trimmedName, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: `Group with name "${trimmedName}" already exists.` });
    }

    // Cascade update islands
    await pool.query('UPDATE islands SET group_name = ? WHERE group_name = ?', [trimmedName, oldName]);
    await pool.query('UPDATE story_groups SET name = ? WHERE id = ?', [trimmedName, id]);

    res.json({
      id: Number(id),
      name: trimmedName,
      message: `Group renamed from "${oldName}" to "${trimmedName}" successfully.`
    });
  } catch (err: any) {
    console.error('Error updating story group:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [targetGroup]: any = await pool.query('SELECT * FROM story_groups WHERE id = ?', [id]);
    if (targetGroup.length === 0) {
      return res.status(404).json({ error: 'Story group not found.' });
    }

    const groupName = targetGroup[0].name;
    if (groupName === 'General') {
      return res.status(400).json({ error: 'The default group "General" cannot be deleted.' });
    }

    // Reassign all islands in this group to 'General' (Option A2)
    const [reassigned]: any = await pool.query(
      'UPDATE islands SET group_name = ? WHERE group_name = ?',
      ['General', groupName]
    );

    await pool.query('DELETE FROM story_groups WHERE id = ?', [id]);

    res.json({
      message: `Group "${groupName}" deleted successfully. ${reassigned.affectedRows || 0} story(ies) reassigned to General.`,
      reassigned_count: reassigned.affectedRows || 0
    });
  } catch (err: any) {
    console.error('Error deleting story group:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
