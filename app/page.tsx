'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Описываем структуру данных пожара для главной страницы
interface FireData {
  lat: number;
  lon: number;
  confidence: string;
  acqTime: string;
  satellite?: string;
}

// Напрямую загружаем интерактивную карту из компонентов
const FiresMap = dynamic(() => import('@/components/FiresMap'), {
  ssr: false,
  loading: () => (
    <div className="p-12 text-center text-slate-400 bg-[#29371e] h-full flex items-center justify-center rounded-lg">
      <p className="animate-pulse text-lg">🛰️ Соединение со спутниками NASA FIRMS...</p>
    </div>
  )
});

export default function Home() {
  // Управляет тем, какой экран макета сейчас активен ('main', 'map' или 'info')
  const [activeTab, setActiveTab] = useState<'main' | 'map' | 'info'>('main');
  
  // Стейт для хранения информации о выбранном оператором пожаре
  const [currentFireInfo, setCurrentFireInfo] = useState<FireData | null>(null);

  return (
    <div className="min-h-screen bg-[#1b2313] flex flex-col font-sans text-slate-100 selection:bg-[#c87928] selection:text-white">
      
      {/* ================= ШАПКА САЙТА ================= */}
      <header className="bg-[#2f3e22] px-6 py-4 flex items-center justify-between border-b border-[#3f532e] shadow-md sticky top-0 z-50">
        <div className="text-xl font-black text-[#b5cb99] tracking-wider uppercase">
          FireVisonar
        </div>
        
        {/* Кнопки переключения экранов */}
        <nav className="flex gap-2 text-sm font-semibold">
          <button 
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 rounded-md transition duration-200 ${activeTab === 'main' ? 'bg-[#c87928] text-white shadow' : 'hover:bg-[#3f532e] text-slate-300'}`}
          >
            Главная
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-md transition duration-200 ${activeTab === 'map' ? 'bg-[#c87928] text-white shadow' : 'hover:bg-[#3f532e] text-slate-300'}`}
          >
            Карта пожаров
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-md transition duration-200 ${activeTab === 'info' ? 'bg-[#c87928] text-white shadow' : 'hover:bg-[#3f532e] text-slate-300'}`}
          >
            Инфо сайта
          </button>
        </nav>
      </header>

      {/* ================= ОСНОВНОЙ КОНТЕНТ (ПЕРЕКЛЮЧАЕМЫЙ) ================= */}
      <main className="flex-1 flex flex-col">
        
        {/* ЭКРАН 1: ГЛАВНАЯ (ЛЕНДИНГ С КАРТИНКОЙ ЛЕСА) */}
        {activeTab === 'main' && (
          <div 
            className="flex-1 bg-cover bg-center flex flex-col justify-center relative px-8 md:px-20 py-24 min-h-[calc(100vh-73px)]"
            style={{ 
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url('/forest-bg.jpg')`,
              backgroundColor: '#1b2313' 
            }}
          >
            <div className="max-w-2xl">
              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4 text-white">
                FireVisonar
              </h1>
              <p className="text-2xl md:text-3xl text-slate-200 font-light mb-10 leading-relaxed border-l-4 border-[#c87928] pl-4">
                Оперативное тушение<br />лесных пожаров
              </p>
              <button 
                onClick={() => setActiveTab('map')}
                className="bg-[#c87928] hover:bg-[#b0651e] text-white text-lg font-bold px-10 py-4 rounded-xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
              >
                Перейти к пожарам
              </button>
            </div>
          </div>
        )}
                {/* ЭКРАН 2: ИНТЕРФЕЙС С КАРТОЙ И БОКОВОЙ ПАНЕЛЬЮ СЛОЕВ */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-73px)] relative z-10">
            {/* Окно карты Leaflet */}
            <div className="flex-1 h-[500px] md:h-auto relative bg-[#1b2313]">
              <FiresMap onSelectFire={(fire) => setCurrentFireInfo(fire)} />
            </div>
            
            {/* Боковая панель управления слоями из макета */}
            <aside className="w-full md:w-80 bg-[#3a4d2b] p-6 border-t md:border-t-0 md:border-l border-[#4d6639] flex flex-col gap-5 shadow-inner">
              <div>
                <h2 className="text-lg font-black text-[#b5cb99] uppercase tracking-wider pb-2 border-b border-[#4d6639]">
                  Информация по точке
                </h2>
                <p className="text-xs text-slate-400 mt-1">Данные о возгорании</p>
              </div>
              
              <div className="w-full bg-[#2f3e22] rounded-lg border border-[#4d6639] p-4 text-xs text-slate-200 font-sans shadow-md">
                {currentFireInfo ? (
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-[#4d6639] pb-1.5">
                      <span className="text-slate-400">Широта:</span>
                      <span className="font-mono font-bold text-white">{currentFireInfo.lat.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#4d6639] pb-1.5">
                      <span className="text-slate-400">Долгота:</span>
                      <span className="font-mono font-bold text-white">{currentFireInfo.lon.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#4d6639] pb-1.5">
                      <span className="text-slate-400">Время обнаружения:</span>
                      <span className="font-mono font-bold text-orange-300">
                        {(() => {
                          const timeStr = String(currentFireInfo.acqTime).trim();
                          if (!timeStr) return '';
                          const padded = timeStr.padStart(4, '0');
                          let hours = parseInt(padded.substring(0, 2), 10);
                          const mins = padded.substring(2, 4);
                          if (!isNaN(hours)) {
                            hours = hours + 3;
                            if (hours >= 24) hours = hours - 24;
                            return String(hours).padStart(2, '0') + ':' + mins + ' МСК';
                          }
                          return timeStr;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#4d6639] pb-1.5">
                      <span className="text-slate-400">Достоверность:</span>
                      <span className="font-bold text-red-400">{currentFireInfo.confidence}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Источник:</span>
                      <span className="text-emerald-400 font-medium">{currentFireInfo.satellite || 'Спутник NASA'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 font-light leading-relaxed">
                    🎯 <span className="block mt-1">Кликните по маркеру пожара или по карточке уведомления, чтобы загрузить данные ландшафта</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}


        {/* ЭКРАН 3: ТЕКСТОВЫЕ БЛОКИ ИНФОРМАЦИИ */}
        {activeTab === 'info' && (
          <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-16 flex flex-col gap-8">
            <section className="bg-[#3a4d2b] p-6 rounded-xl border border-[#4d6639] shadow-lg">
              <h2 className="text-2xl font-black text-[#b5cb99] mb-3 uppercase tracking-wide">Инфо проекта</h2>
              <p className="text-sm leading-relaxed text-slate-200 font-light">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Minima nostrum tenetur voluptate nam earum ipsam fugit vero nihil dolorem? Repellendus omnis recusandae unde necessitatibus pariatur reiciendis hic eveniet maxime perferendis.
              </p>
            </section>

            <section className="bg-[#2f3e22] p-6 rounded-xl border border-[#3f532e] shadow-lg">
              <h2 className="text-2xl font-black text-[#b5cb99] mb-3 uppercase tracking-wide">Инфа про команду</h2>
              <p className="text-sm leading-relaxed text-slate-200 font-light">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit. Atque odit est, mollitia maiores dolore praesentium possimus quaerat perferendis enim consequuntur, vel temporibus porro molestiae? Recusandae dolores facilis qui eum asperiores.
              </p>
            </section>

            <section className="bg-[#3a4d2b] p-6 rounded-xl border border-[#4d6639] shadow-lg">
              <h2 className="text-2xl font-black text-[#b5cb99] mb-4 uppercase tracking-wide">Ссылки на ресурсы</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                <a href="https://nasa.gov" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#c87928] hover:text-[#e08b3a] transition underline decoration-dotted">
                  <span>🚀</span> Спутниковые данные NASA FIRMS
                </a>
                <a href="https://openstreetmap.org" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#c87928] hover:text-[#e08b3a] transition underline decoration-dotted">
                  <span>🗺️</span> Географическая основа OpenStreetMap
                </a>
              </div>
            </section>
          </div>
        )}

      </main>

      {/* ================= ПОДВАЛ САЙТА ================= */}
      <footer className="bg-[#12180c] text-slate-400 text-xs py-8 px-6 border-t border-[#1f2816] shadow-2xl">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 items-center sm:items-start text-sm">
            <button onClick={() => setActiveTab('info')} className="hover:text-white transition text-left">Инфо о проекте</button>
            <button onClick={() => setActiveTab('info')} className="hover:text-white transition text-left">О нашей команде</button>
            <a href="mailto:support@firevisonar.ru" className="hover:text-white transition">Связаться с разработчиками</a>
          </div>
          
          <div className="flex flex-col items-center sm:items-end gap-2">
            <a href="https://t.me" target="_blank" rel="noreferrer" className="bg-[#2f3e22] p-2.5 rounded-full text-lg hover:bg-[#c87928] hover:text-white text-[#b5cb99] transition shadow-md">
              ✈️
            </a>
            <p className="font-semibold text-slate-500 mt-1">FireVisonar © {new Date().getFullYear()}</p>
            <p className="text-[10px] text-slate-700 hover:text-slate-500 cursor-pointer transition">Политика конфиденциальности</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
