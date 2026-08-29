jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import pool from '../src/config/db';
import {
  getProgress,
  recalculateUserStars,
  updateStage
} from '../src/controllers/progressController';

const queryMock = pool.query as jest.Mock;

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Progress star accounting', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('awards exactly one star for each completed subtask and ignores an uncompleted subtask', async () => {
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT INTO user_island_progress')) {
        expect(params).toEqual([21, 7, 4, 4]);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE users u') && sql.includes('WHERE u.id = ?')) {
        expect(params).toEqual([21, 21]);
        return [{ affectedRows: 1 }];
      }
      if (sql === 'SELECT stars FROM users WHERE id = ?') {
        expect(params).toEqual([21]);
        return [[{ stars: 3 }]];
      }
      if (sql.includes('SELECT unlocked_stage, completed_stages_mask')) {
        expect(params).toEqual([21, 7]);
        return [[{ unlocked_stage: 4, completed_stages_mask: 7 }]];
      }
      if (sql.includes('SELECT stars, spent_stars')) {
        expect(params).toEqual([21]);
        return [[{ stars: 3, spent_stars: 0 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const req: any = {
      body: {
        user_id: 21,
        island_id: 7,
        completed_stage: 3
      }
    };
    const res = createResponse();

    await updateStage(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      unlocked_stage: 4,
      completed_stages_mask: 7,
      stars: 3,
      total_stars: 3,
      spent_stars: 0,
      star_balance: 3,
      balance: 3
    }));

    const atomicStarUpdate = queryMock.mock.calls.find(
      ([sql]) => sql.includes('UPDATE users u') && sql.includes('WHERE u.id = ?')
    );
    expect(atomicStarUpdate).toBeDefined();
    expect(atomicStarUpdate[1]).toEqual([21, 21]);
    expect(atomicStarUpdate[0]).toContain(
      'SET u.stars = COALESCE(prog.total_subtasks, 0)'
    );
  });

  it('recalculates a historical user with 15 completed subtasks to exactly 15 stars', async () => {
    queryMock
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ stars: '15' }]]);

    const result = await recalculateUserStars(42);

    expect(result).toBe(15);
    expect(queryMock).toHaveBeenCalledTimes(2);

    const calculationSql = queryMock.mock.calls[0][0] as string;
    expect(calculationSql).toContain('UPDATE users u');
    expect(calculationSql).toContain('BIT_COUNT');
    expect(calculationSql).toContain('completed_stages_mask');
    expect(calculationSql).toContain('WHEN unlocked_stage = 2 THEN 1');
    expect(calculationSql).toContain('WHEN unlocked_stage = 3 THEN 3');
    expect(calculationSql).toContain('WHEN unlocked_stage = 4 THEN 7');
    expect(calculationSql).toContain('WHEN unlocked_stage >= 5 THEN 15');
    expect(calculationSql).toContain(')) & 15');
    expect(calculationSql).toContain(
      'SET u.stars = COALESCE(prog.total_subtasks, 0)'
    );
    expect(queryMock.mock.calls[0][1]).toEqual([42, 42]);
    expect(queryMock.mock.calls[1]).toEqual([
      'SELECT stars FROM users WHERE id = ?',
      [42]
    ]);
  });

  it('remains idempotent when the same user is recalculated three times', async () => {
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('UPDATE users u') && sql.includes('WHERE u.id = ?')) {
        expect(params).toEqual([55, 55]);
        return [{ affectedRows: 1 }];
      }
      if (sql === 'SELECT stars FROM users WHERE id = ?') {
        expect(params).toEqual([55]);
        return [[{ stars: 6 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const first = await recalculateUserStars(55);
    const second = await recalculateUserStars(55);
    const third = await recalculateUserStars(55);

    expect([first, second, third]).toEqual([6, 6, 6]);

    const updates = queryMock.mock.calls.filter(
      ([sql]) => sql.includes('UPDATE users u') && sql.includes('WHERE u.id = ?')
    );
    const reads = queryMock.mock.calls.filter(
      ([sql]) => sql === 'SELECT stars FROM users WHERE id = ?'
    );

    expect(updates).toHaveLength(3);
    expect(reads).toHaveLength(3);
    expect(updates.every(([, params]) =>
      params[0] === 55 && params[1] === 55
    )).toBe(true);
    expect(updates.every(([sql]) =>
      sql.includes('SET u.stars = COALESCE(prog.total_subtasks, 0)')
    )).toBe(true);
  });

  it('uses an absolute assignment for all-user recalculation instead of accumulating stars', async () => {
    queryMock.mockResolvedValueOnce([{ affectedRows: 4 }]);

    await recalculateUserStars();

    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('SET u.stars = COALESCE(prog.total_subtasks, 0)');
    expect(sql).toContain(')) & 15');
    expect(sql).not.toMatch(/SET\s+u\.stars\s*=\s*u\.stars\s*\+/i);
  });

  it('returns store balance as completed subtasks minus spent stars', async () => {
    queryMock
      .mockResolvedValueOnce([[
        { id: 73, username: 'store-user', stars: 8, spent_stars: 3 }
      ]])
      .mockResolvedValueOnce([[{ total_subtasks: 8 }]]);

    const req: any = {
      query: { user_id: '73' }
    };
    const res = createResponse();

    await getProgress(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      user_id: 73,
      stars: 8,
      total_stars: 8,
      completed_subtasks: 8,
      spent_stars: 3,
      star_balance: 5,
      balance: 5
    });

    const aggregateSql = queryMock.mock.calls[1][0] as string;
    expect(aggregateSql).toContain('BIT_COUNT');
    expect(aggregateSql).toContain(')) & 15');
    expect(queryMock.mock.calls[1][1]).toEqual([73]);
  });

  it('never exposes a negative store balance', async () => {
    queryMock
      .mockResolvedValueOnce([[
        { id: 74, username: 'legacy-store-user', stars: 2, spent_stars: 5 }
      ]])
      .mockResolvedValueOnce([[{ total_subtasks: 2 }]]);

    const req: any = {
      query: { user_id: '74' }
    };
    const res = createResponse();

    await getProgress(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      completed_subtasks: 2,
      spent_stars: 5,
      star_balance: 0,
      balance: 0
    }));
  });
});
