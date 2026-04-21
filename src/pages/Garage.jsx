import { CarFront, Link2, Wrench, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const Garage = () => {
  const activeCar = useStore((s) => s.activeCar);
  const setActiveCar = useStore((s) => s.setActiveCar);
  const ownedCars = useStore((s) => s.ownedCars);
  
  const standbyCars = ownedCars.filter(c => c.name !== (activeCar?.name || ''));
  const navigate = useNavigate();

  const handleStartRace = () => {
    navigate(`/race-loader?car=${encodeURIComponent(activeCar.name)}&img=${encodeURIComponent(activeCar.image || '')}`);
  };

  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-red-500">
          MY GARAGE
        </h2>
        <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
          FLEET MANAGEMENT & TUNING
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        {/* Main Current Car */}
        <div className="relative rounded-xl border border-red-900/50 bg-[#150a0a] overflow-hidden mb-6 group cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.1)]">
          <div className="h-48 bg-gradient-to-br from-red-600/20 to-black relative flex items-center justify-center">
            {activeCar.image ? (
              <img src={activeCar.image} alt={activeCar.name} className="absolute inset-0 w-full h-full object-cover opacity-90" />
            ) : (
              <CarFront className="w-24 h-24 text-red-500/50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
              <div>
                <h3 className="text-2xl font-black italic tracking-tighter shadow-black drop-shadow-lg">{activeCar.name}</h3>
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider bg-black/50 px-2 rounded w-max">Class {activeCar.class}</p>
              </div>
              <div className="bg-red-600 px-3 py-1 rounded tracking-wider font-bold text-xs italic shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                ACTIVE
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-red-900/50 grid grid-cols-3 gap-2 text-center bg-black/60 relative z-10 text-white shadow-xl backdrop-blur">
             <div>
               <div className="text-[9px] text-gray-400 font-bold tracking-widest">TOP SPEED</div>
               <div className="text-sm font-bold text-white">{activeCar.speed}</div>
             </div>
             <div className="border-l border-r border-red-900/30">
               <div className="text-[9px] text-gray-400 font-bold tracking-widest">ACCEL</div>
               <div className="text-sm font-bold text-white">{activeCar.accel}</div>
             </div>
             <div>
               <div className="text-[9px] text-gray-400 font-bold tracking-widest">HANDLING</div>
               <div className="text-sm font-bold text-white">{activeCar.handling}</div>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button 
            onClick={() => alert(`Opening Tuning Shop for ${activeCar.name}...`)}
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 p-3 rounded-lg transition-colors"
          >
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-widest">TUNE / UPGRADE</span>
          </button>
          <Link to="/cars" className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 p-3 rounded-lg transition-colors">
            <Link2 className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold tracking-widest">ALL CARS LIST</span>
          </Link>
        </div>
        
        <button 
           onClick={handleStartRace} 
           className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.3)] p-4 rounded-lg transition-colors mb-6"
        >
          <Play className="w-5 h-5 text-white fill-current" />
          <span className="text-sm font-black italic tracking-widest text-white">RACE CURRENT CAR</span>
        </button>

        {/* Other Cars */}
        <h3 className="text-[10px] text-gray-500 font-bold tracking-[0.2em] mb-3">STANDBY FLEET</h3>
        <div className="space-y-3">
           {standbyCars.map((car, i) => (
             <div key={i} className="flex items-center gap-4 bg-[#111218] border border-gray-800 p-3 rounded-lg shadow-lg">
                <div className="w-16 h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden relative">
                  {car.image ? (
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover select-none" />
                  ) : (
                    <CarFront className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold italic tracking-tight">{car.name}</h4>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">Class {car.class}</p>
                </div>
                <button 
                  onClick={() => setActiveCar(car)} 
                  className="text-xs font-bold text-cyan-500 hover:text-cyan-300 tracking-wider bg-cyan-900/20 px-3 py-1.5 rounded transition-colors"
                >
                  SELECT
                </button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Garage;
