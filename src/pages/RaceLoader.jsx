import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Zap } from 'lucide-react';

const RaceLoader = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const carName = searchParams.get('car') || 'MERCEDES-AMG GT';
  const customImg = searchParams.get('img');
  const carColor = searchParams.get('color') || '#00c8ff';
  const mapType = searchParams.get('map') || 'tokyo';

  const mapNames = {
    'tokyo': 'TOKYO EXPRESSWAY',
    'nevada': 'NEVADA DESERT',
    'alpine': 'ALPINE PASS'
  };

  const bgImage = customImg 
        ? `url('${customImg}')` 
        : `url('https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=1000&q=80')`;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate(`/race?car=${encodeURIComponent(carName)}&map=${mapType}&img=${encodeURIComponent(customImg || '')}&color=${encodeURIComponent(carColor)}`), 1500);
          return 100;
        }
        return prev + (Math.random() * 15);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: bgImage }}
    >
       <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
       
       <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center">
          <Zap className="w-16 h-16 text-cyan-500 mb-6 animate-pulse" />
          
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2 shadow-black drop-shadow-md">INITIALIZING</h2>
          <div className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] mb-12 flex flex-col items-center gap-1 shadow-black drop-shadow">
            <div className="flex justify-center items-center gap-2 mb-1">
              <Map className="w-4 h-4" /> {mapNames[mapType]}
            </div>
            <div className="text-white bg-black/50 px-2 py-1 rounded w-max">
               VEHICLE: {carName}
            </div>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/10">
            <div className="flex justify-between text-[10px] font-bold text-gray-300 tracking-widest mb-2">
              <span>LOADING ASSETS</span>
              <span>{Math.min(100, Math.floor(progress))}%</span>
            </div>
            <div className="h-1 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
               <div 
                 className="h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                 style={{ width: `${Math.min(100, progress)}%` }}
               ></div>
            </div>
          </div>
          
          {progress >= 100 && (
             <div className="mt-8 text-green-500 font-black italic tracking-widest animate-bounce drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                RACE STARTING...
             </div>
          )}
       </div>
    </div>
  );
};

export default RaceLoader;
