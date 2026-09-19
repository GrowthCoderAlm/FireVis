'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, useMap, Circle, CircleMarker, FeatureGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface FireData {
  lat: number;
  lon: number;
  confidence: string;
  acqTime: string;
  satellite?: string;
}

function ChangeMapView({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 8, { animate: true });
    }
  }, [center, map]);
  return null;
}

interface FiresMapProps {
  onSelectFire?: (fire: FireData | null) => void;
}

export default function FiresMap({ onSelectFire }: FiresMapProps) {
  const [fires, setFires] = useState<FireData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFireCoords, setSelectedFireCoords] = useState<[number, number] | null>(null);

  const loadFreshFiresData = () => {
    const params = new URLSearchParams({ t: Date.now().toString() });
    
    fetch('/api/nasa?' + params.toString())
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка сети: статус ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => b.acqTime.localeCompare(a.acqTime));
          setFires(sorted);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка периодической загрузки пожаров:', err);
      });
  };

  useEffect(() => {
    loadFreshFiresData();

    const updateTimer = setInterval(() => {
      loadFreshFiresData();
    }, 10000);

    return () => clearInterval(updateTimer);
  }, []);

  // ИСПРАВЛЕНО: Функция форматирования и перевода сырого времени NASA в Московское время (МСК)
  const formatFireTimeToMSK = (rawTime: string | number): string => {
    const timeStr = String(rawTime).trim();
    if (!timeStr) return '';
    
    // Дополняем нулями слева (например, "748" -> "0748")
    const padded = timeStr.padStart(4, '0');
    
    // Вытаскиваем часы и минуты из UTC строки от NASA
    let hours = parseInt(padded.substring(0, 2), 10);
    const minutesStr = padded.substring(2, 4);
    
    if (isNaN(hours)) return timeStr;

    // ПЕРЕВОД В МСК: Прибавляем 3 часа к международному времени
    hours = hours + 3;
    
    // Если вышли за пределы 24 часов (например, 23:00 UTC + 3 = 26:00), переносим на новые сутки
    if (hours >= 24) {
      hours = hours - 24;
    }

    // Собираем обратно в строку с красивыми ведущими нулями (например, 9 -> "09")
    const formattedHours = String(hours).padStart(2, '0');
    
    return formattedHours + ':' + minutesStr;
  };

  const calculateDangerRadius = (confidenceStr: string): number => {
    if (confidenceStr === 'Высокая') return 35000;   
    if (confidenceStr === 'Номинальная') return 20000; 
    
    const confNum = parseInt(confidenceStr, 10);
    if (!isNaN(confNum)) {
      if (confNum > 80) return 35000;
      if (confNum > 50) return 20000;
    }
    return 15000; 
  };

  const handleFireSelection = (fire: FireData) => {
    setSelectedFireCoords([fire.lat, fire.lon]);
    if (onSelectFire) onSelectFire(fire); 
  };

  if (loading) return <div className="p-6 text-slate-400 bg-[#29371e] h-full flex items-center justify-center rounded-lg">Загрузка ГИС-данных пожаров...</div>;

  return (
    <div className="h-full w-full relative flex flex-col">
      
      {/* ================= ПАНЕЛЬ ОПОВЕЩЕНИЙ ИЗ МАКЕТА ================= */}
      <div className="absolute top-16 left-16 z- max-w-sm w-full pointer-events-auto">
        <div className="bg-[#2f3e22]/95 backdrop-blur-sm p-3 rounded-xl border border-[#4d6639] shadow-2xl flex flex-col gap-2 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c87928]">
          
          {fires.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-4 bg-black/10 rounded-lg">Новых возгораний не обнаружено</p>
          ) : (
            fires.slice(0, 10).map((fire, index) => (
              <button
                key={`notif-${index}`}
                onClick={() => handleFireSelection(fire)}
                className="w-full text-left bg-[#c87928] hover:bg-[#b0651e] border border-[#a45e1a] px-4 py-3 rounded-lg shadow transition-all duration-200 flex items-start gap-2 group transform hover:scale-[1.01]"
              >
                <span className="font-bold text-white bg-black/20 rounded px-1 text-[11px] mt-0.5">&lt;!&gt;</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white block">Пожар {index + 1}</span>
                    {/* ТЕПЕРЬ ТУТ КРАСИВОЕ МСК ВРЕМЯ */}
                    <span className="text-[10px] text-orange-200 font-mono">{formatFireTimeToMSK(fire.acqTime)} МСК</span>
                  </div>
                  <span className="text-[11px] text-orange-100 block truncate mt-0.5">
                    Достоверность: {fire.confidence}
                  </span>
                </div>
              </button>
            ))
          )}

        </div>
      </div>

      {/* ================= КОНТЕЙНЕР КАРТЫ ================= */}
      <div className="flex-1 h-full w-full relative z-0">
        <MapContainer center={[62.0, 96.0]} zoom={3} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
          />
          
          <ChangeMapView center={selectedFireCoords} />

          {fires.map((fire, index) => {
            const dangerRadiusMeters = calculateDangerRadius(fire.confidence);

            return (
              <FeatureGroup key={`fire-group-${index}`}>
                <Circle
                  center={[fire.lat, fire.lon]}
                  radius={dangerRadiusMeters}
                  pathOptions={{
                    color: fire.confidence === 'Высокая' ? '#ef4444' : '#c87928', 
                    fillColor: fire.confidence === 'High' || fire.confidence === 'Высокая' ? '#ef4444' : '#c87928',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />

                <CircleMarker 
                  center={[fire.lat, fire.lon]} 
                  radius={5} 
                  pathOptions={{ 
                    color: fire.confidence === 'Высокая' ? '#b91c1c' : '#ef4444', 
                    fillColor: fire.confidence === 'High' || fire.confidence === 'Высокая' ? '#b91c1c' : '#ef4444', 
                    fillOpacity: 0.9 
                  }}
                  eventHandlers={{
                    click: () => handleFireSelection(fire)
                  }}
                >
                  <Popup>
                    <div className="font-sans text-xs text-slate-800">
                      <strong className="text-sm text-red-600 block mb-1">🔥 Подтвержденный очаг</strong>
                      {/* ТЕПЕРЬ И В ПОПАПЕ НА КАРТЕ ТОРЖЕСТВУЕТ МСК ВРЕМЯ */}
                      <b>Время обнаружения:</b> {formatFireTimeToMSK(fire.acqTime)} МСК<br />
                      <b>Траст-фактор:</b> <span className={fire.confidence === 'Высокая' ? 'text-red-600 font-bold' : 'text-orange-600'}>{fire.confidence}</span><br />
                      <b>Зона контроля:</b> {dangerRadiusMeters / 1000} км
                    </div>
                  </Popup>
                </CircleMarker>
              </FeatureGroup>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
}
