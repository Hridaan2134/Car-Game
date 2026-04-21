import { MapPin, Trophy, Timer, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

const Maps = () => {
  const { activeCar } = useStore();
  const navigate = useNavigate();

  const handleSelectMap = (mapType) => {
    navigate(`/race-loader?car=${encodeURIComponent(activeCar?.name || 'MERCEDES-AMG GT')}&map=${mapType}&img=${encodeURIComponent(activeCar?.image || '')}`);
  };

  const maps = [
    { id: 'tokyo', name: 'TOKYO EXPRESSWAY', region: 'ASIA', length: '12.4 KM', difficulty: 'MODERATE', color: 'cyan' },
    { id: 'nevada', name: 'NEVADA DESERT', region: 'NA', length: '24.1 KM', difficulty: 'EASY', color: 'orange' },
    { id: 'alpine', name: 'ALPINE PASS', region: 'EU', length: '8.2 KM', difficulty: 'HARD', color: 'indigo' }
  ];

  return (
    <div className="px-6 relative h-full flex flex-col">
      {/* Dynamic Car Header */}
      <div className="mb-6 bg-gradient-to-r from-black/60 to-transparent p-4 rounded-xl border border-white/5 backdrop-blur-sm relative overflow-hidden group">
        <div 
          className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-40 h-40 opacity-20 blur-2xl pointer-events-none"
          style={{ backgroundColor: activeCar?.color || '#06b6d4' }}
        ></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-12 bg-gray-900/80 rounded flex items-center justify-center p-1 border border-white/10">
            <img src={activeCar?.image || '/images/mercedes.png'} alt={activeCar?.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-[8px] font-black text-gray-500 tracking-[0.3em] mb-0.5">SELECTED VEHICLE</div>
            <h3 className="text-lg font-black italic tracking-tighter text-white leading-none">{activeCar?.name}</h3>
            <div className="flex gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Timer className="w-2 h-2 text-cyan-400" />
                <span className="text-[7px] font-bold text-gray-400">{activeCar?.accel}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-2 h-2 text-yellow-400" />
                <span className="text-[7px] font-bold text-gray-400">{activeCar?.speed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-black italic tracking-tighter mix-blend-screen leading-none text-white">
          TRACK SELECTION
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar space-y-4">
        {maps.map((map, i) => (
          <div 
            key={i} 
            onClick={() => handleSelectMap(map.id)}
            className="group cursor-pointer relative rounded-xl border border-white/5 bg-[#111218] overflow-hidden transition-all hover:border-white/20 hover:scale-[1.01] active:scale-[0.99]"
          >
             <div className="h-28 bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center p-4">
                <MapPin className="w-12 h-12 text-white/5 absolute opacity-50 transition-transform group-hover:scale-110" />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="text-[8px] font-black text-cyan-400 tracking-widest mb-0.5 uppercase">{map.region}</div>
                  <h3 className="text-[22px] font-black italic tracking-tighter text-white drop-shadow-lg leading-none">{map.name}</h3>
                </div>
                
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-white" />
                </div>
             </div>
             
             <div className="px-4 py-2 bg-black/50 backdrop-blur-sm flex justify-between items-center text-[9px] font-black tracking-widest text-gray-500 border-t border-white/5">
               <div className="flex items-center gap-4">
                 <span>LEN: <span className="text-white">{map.length}</span></span>
                 <span>DIFF: <span className={
                    map.difficulty === 'HARD' ? 'text-red-500' :
                    map.difficulty === 'MODERATE' ? 'text-yellow-500' : 'text-green-500'
                 }>{map.difficulty}</span></span>
               </div>
               <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">START RACE</div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Maps;
