import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

// 只有在未设置 DB_HOST 时，才解析本地 .env 配置文件（用于本地单机开发）
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const isTest = process.env.NODE_ENV === 'test';

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: isTest
    ? (process.env.TEST_DB_NAME || 'wordquest_agent_test')
    : (process.env.DB_NAME || 'wordquest'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);
export default pool;
