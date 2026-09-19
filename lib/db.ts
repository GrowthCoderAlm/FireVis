import Database from 'better-sqlite3';
import path from 'path';

// Создаем или открываем файл базы данных в корне проекта
const dbPath = path.resolve(process.cwd(), 'fires.db');
const db = new Database(dbPath);

// Инициализируем SQL-таблицу для хранения точек пожаров
db.exec(`
  CREATE TABLE IF NOT EXISTS fire_points (
    id TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    confidence TEXT,
    acq_time TEXT,
    satellite TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
