import { Flag, Play, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Races = () => {
  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-red-500">
            CIRCUITS
          </h2>
          <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
            SELECT EVENT
          </div>
        </div>
        <Link to="/maps" className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded text-xs font-bold tracking-widest text-gray-300">
           <MapIcon className="w-3 h-3" />
           ALL MAPS
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar space-y-4">
         <div className="relative rounded-xl border border-red-900/50 bg-[#150a0a] overflow-hidden p-4">
            <div className="absolute inset-0 bg-red-600/5"></div>
             <div className="relative z-10 flex justify-between items-center">
               <div>
                 <div className="text-[10px] text-red-500 font-bold tracking-widest mb-1 flex items-center gap-1">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div> LIVE EVENT
                 </div>
                 <h3 className="text-xl font-black italic tracking-tighter">NEON NIGHT RUN</h3>
                 <p className="text-xs text-gray-400 font-bold tracking-wider">Tokyo Expressway</p>
               </div>
               <Link to="/race-loader?car=HAAS VF-25&img=/images/haas.png&map=tokyo" className="bg-red-600 hover:bg-red-500 w-12 h-12 rounded-full flex items-center justify-center pl-1 shrink-0 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                 <Play className="w-5 h-5 text-white" />
               </Link>
             </div>
         </div>
         
         {[
           { title: "DESERT DRIFT", map: "nevada", reward: "$15,000" },
           { title: "MOUNTAIN SPRINT", map: "alpine", reward: "$22,000" },
           { title: "TOKYO CIRCUIT", map: "tokyo", reward: "$30,000" }
         ].map((race, i) => (
           <div key={i} className="bg-[#111218] border border-gray-800 p-4 rounded-xl flex justify-between items-center group transition-colors hover:border-gray-600">
             <div>
               <div className="text-[10px] text-cyan-500 font-bold tracking-widest mb-1">CAREER MODE</div>
               <h3 className="text-lg font-black italic tracking-tighter">{race.title}</h3>
               <p className="text-xs text-gray-500 font-bold tracking-wider">Reward: {race.reward}</p>
             </div>
             <Link to={`/race-loader?map=${race.map}`} className="bg-gray-800 group-hover:bg-cyan-600 w-12 h-12 rounded-full flex items-center justify-center pl-1 shrink-0 transition-colors">
               <Play className="w-5 h-5 text-white" />
             </Link>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Races;
