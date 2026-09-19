import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';

// Переменная в памяти сервера, чтобы не запускать питон дублирующими процессами при каждом тике
let isPythonRunning = false;

export async function GET() {
  // АВТОЗАПУСК: Если карта запросила данные, а питон еще не спит/не запущен — пробуждаем его
  if (!isPythonRunning) {
    isPythonRunning = true;
    
    // ИСПРАВЛЕНО: Указываем точное имя вашего рабочего Python-скрипта fetch_fire.py
    const scriptPath = path.resolve(process.cwd(), 'fetch_fire.py');
    
    console.log('🚀 БЭКЕНД: Пользователь открыл карту. Запускаем фоновый Python-сканер NASA...');
    
    // Запускаем скрипт load.py как независимый фоновый процесс Windows
    exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
      // Когда скрипт полностью завершит работу (скачает и отфильтрует данные), флаг сбросится
      isPythonRunning = false;
      
      if (error) {
        console.error(`❌ БЭКЕНД: Ошибка фонового запуска Python: ${error.message}`);
        return;
      }
      if (stderr) {
        console.warn(`⚠️ БЭКЕНД Python предупреждение: ${stderr}`);
        return;
      }
      console.log(`📡 БЭКЕНД: Фоновый Python-сканер успешно завершил цикл обновления базы. Результат:\n${stdout}`);
    });
  }

  try {
    // Читаем готовые отфильтрованные точки из базы данных fires.db
    const selectStatement = db.prepare(`
      SELECT lat, lon, confidence, acq_time as acqTime, satellite 
      FROM fire_points 
      ORDER BY created_at DESC 
      LIMIT 2500
    `);
    
    const firesFromDatabase = selectStatement.all();
    
    // Моментально отдаем их на фронтенд карты
    const response = NextResponse.json(firesFromDatabase);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;

  } catch (error: any) {
    console.error('Ошибка чтения SQL базы в Next.js роуте:', error);
    return NextResponse.json([]);
  }
}
