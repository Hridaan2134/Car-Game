import { MapPin } from 'lucide-react';

const Maps = () => {
  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-cyan-400">
          GLOBAL MAPS
        </h2>
        <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
          EXPLORE ENVIRONMENTS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar space-y-6">
        {[
          { name: 'TOKYO EXPRESSWAY', region: 'ASIA', length: '12.4 KM' },
          { name: 'NEVADA DESERT', region: 'NA', length: '24.1 KM' },
          { name: 'ALPINE PASS', region: 'EU', length: '8.2 KM' }
        ].map((map, i) => (
          <div key={i} className="relative rounded-xl border border-cyan-900/30 bg-[#111218] overflow-hidden group">
             <div className="h-32 bg-gradient-to-br from-cyan-900/20 to-black relative flex items-center justify-center p-4">
                <MapPin className="w-12 h-12 text-cyan-500/30 absolute opacity-50" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-transparent">
                  <h3 className="text-xl font-black italic tracking-tighter text-white">{map.name}</h3>
                </div>
             </div>
             <div className="p-3 bg-black flex justify-between items-center text-[10px] font-bold tracking-widest text-gray-400">
               <span>REGION: <span className="text-cyan-400">{map.region}</span></span>
               <span>{map.length}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Maps;
