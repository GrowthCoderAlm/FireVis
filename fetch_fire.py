import os
import sqlite3
import io
import pandas as pd
import requests

# Очищаем прокси из памяти процесса Windows
os.environ.pop('http_proxy', None)
os.environ.pop('https_proxy', None)
os.environ.pop('HTTP_PROXY', None)
os.environ.pop('HTTPS_PROXY', None)

DB_NAME = "fires.db"

# Функция для безопасного чтения ключа из .env.local
def get_api_key_from_env():
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "NASA_FIRMS_API_KEY" in line and "=" in line:
                    parts = line.split("=")
                    if len(parts) > 1:
                        # Забираем только сам чистый ключ
                        raw_key = parts[1].strip().strip("'").strip('"')
                        # Защита: если туда случайно закрался nasa.gov — очищаем его
                        clean_key = raw_key.replace("https://nasa.gov", "").replace("http://nasa.gov", "").strip()
                        return clean_key
                
    return None

def main():
    print("[PYTHON] START SCANNING NASA FIRMS...")
    
    apiKey = get_api_key_from_env()
    if not apiKey:
        print("[PYTHON] ERROR: NOT FOUND KEY IN .ENV.LOCAL")
        return
        
    print("[PYTHON] READED KEY FROM ENV: " + apiKey[:6] + "..." + apiKey[-6:])

    # СТРУКТУРА URL: Собираем строго по официальной спецификации NASA FIRMS Area API
    # Домен + Считанный из env Ключ + Спутник + Границы лесов РФ + Количество дней (1)
    url = "https://firms.modaps.eosdis.nasa.gov/" + apiKey + "/VIIRS_SNPP_NRT/25,45,170,75/1"
    
    print("[PYTHON] TARGET URL: " + url)
    print("--------------------------------------------------")
    
    try:
        # Инициализация базы данных SQLite
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fire_points (
                id TEXT PRIMARY KEY,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                confidence TEXT,
                acq_time TEXT,
                satellite TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

        print("[PYTHON] DOWNLOADING CSV FROM NASA...")
        headers_dict = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cache-Control': 'no-cache'
        }
        
        response = requests.get(url, headers=headers_dict, proxies={"http": None, "https": None}, timeout=30)
        print("[PYTHON] NASA STATUS CODE: " + str(response.status_code) + " " + response.reason)
        
        if response.status_code != 200:
            print("[PYTHON] ERROR: NASA SERVER REFUSED ACCESS")
            return

        csv_data = response.text

        # Проверка на реальное превышение лимитов
        if "transaction" in csv_data.lower() or "limit" in csv_data.lower() or "<html" in csv_data.lower():
            print("[PYTHON] WARNING: NASA LIMIT EXCEEDED FOR THIS NEW KEY")
            print(csv_data.strip()[:200] + "...")
            return

        df = pd.read_csv(io.StringIO(csv_data))
        if df.empty:
            print("[PYTHON] WARNING: NO ACTIVE FIRES DETECTED BY SATELLITE IN РФ")
            return

        print("[PYTHON] RAW FIRES COUNT FROM NASA: " + str(len(df)))
        
        # Отметаем всё, что меньше 40% траст-фактора
        df['confidence'] = df['confidence'].astype(str).str.strip().str.lower()
        df_filtered = df[df['confidence'].apply(lambda val: int(val) >= 40 if val.isdigit() else val in ['n', 'h'])].copy()
        print("[PYTHON] TRUSTED FIRES COUNT (40%+): " + str(len(df_filtered)))

        # Запись в SQL база данных fires.db
        new_records = 0
        for _, row in df_filtered.iterrows():
            lat = float(row['latitude'])
            lon = float(row['longitude'])
            acq_time = str(row['acq_time'])
            conf_raw = row['confidence']
            confidence = 'Высокая' if conf_raw == 'h' else 'Номинальная' if conf_raw == 'n' else conf_raw + '%'
            satellite_name = str(row['satellite'])
            
            unique_id = str(lat) + "_" + str(lon) + "_" + acq_time
            
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO fire_points (id, lat, lon, confidence, acq_time, satellite)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (unique_id, lat, lon, confidence, acq_time, satellite_name))
                if cursor.rowcount > 0:
                    new_records += 1
            except Exception:
                continue
                
        conn.commit()
        print("[PYTHON] SQL TRANSACTION SUCCESS. ADDED NEW RECORDS: " + str(new_records))
        
        cursor.execute("SELECT COUNT(*) FROM fire_points")
        print("[PYTHON] TOTAL RECORDS IN LOCAL DATABASE: " + str(cursor.fetchone()[0]))
        
        conn.close()
        print("[PYTHON] WORK FINISHED SUCCESSFULLY\n")

    except Exception as err:
        print("[PYTHON] CRITICAL ERROR: " + str(err))

if __name__ == "__main__":
    main()
