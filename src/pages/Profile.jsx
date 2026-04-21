import { User, Shield, Trophy, Star, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';

const Profile = () => {
  const playerName = useStore((s) => s.playerName);
  const racePoints = useStore((s) => s.racePoints);
  const totalRaces = useStore((s) => s.totalRaces);
  const racesWon   = useStore((s) => s.racesWon);

  const winRate = totalRaces > 0 ? Math.round((racesWon / totalRaces) * 100) : 0;

  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-gray-200">
          DRIVER RECORD
        </h2>
        <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
          STATS & ACHIEVEMENTS
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">

        {/* Driver card */}
        <div className="bg-[#111218] border border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-900 to-gray-900 rounded-xl flex items-center justify-center border border-cyan-800/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <User className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter text-white">{playerName}</h3>
              <div className="text-cyan-400 font-bold tracking-widest text-[10px] mt-1">VELOCITY KINETIC DRIVER</div>
              <div className="text-gray-500 text-[10px] font-bold tracking-widest mt-0.5">
                {totalRaces} RACES COMPLETED
              </div>
            </div>
          </div>

          {/* Championship Points — hero stat */}
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700/30 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-[9px] text-purple-400 font-bold tracking-[0.3em] mb-0.5">CHAMPIONSHIP POINTS</div>
              <div className="text-4xl font-black text-white leading-none">{racePoints.toLocaleString()}</div>
            </div>
            <Trophy className="w-10 h-10 text-purple-400 opacity-60" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/50 p-3 rounded-xl border border-gray-800 text-center">
              <div className="text-[9px] text-gray-500 font-bold tracking-widest mb-1">RACES WON</div>
              <div className="text-2xl font-black text-amber-400">{racesWon}</div>
            </div>
            <div className="bg-black/50 p-3 rounded-xl border border-gray-800 text-center">
              <div className="text-[9px] text-gray-500 font-bold tracking-widest mb-1">TOTAL RACES</div>
              <div className="text-2xl font-black text-white">{totalRaces}</div>
            </div>
            <div className="bg-black/50 p-3 rounded-xl border border-gray-800 text-center">
              <div className="text-[9px] text-gray-500 font-bold tracking-widest mb-1">WIN RATE</div>
              <div className="text-2xl font-black text-cyan-400">{winRate}%</div>
            </div>
          </div>
        </div>

        {/* Points breakdown */}
        <div className="bg-[#111218] border border-gray-800 rounded-xl p-4 mb-4">
          <div className="text-[9px] text-gray-500 font-bold tracking-[0.2em] mb-3">POINTS PER POSITION</div>
          <div className="grid grid-cols-6 gap-1.5">
            {[{pos:'1ST',pts:25},{pos:'2ND',pts:18},{pos:'3RD',pts:15},{pos:'4TH',pts:12},{pos:'5TH',pts:10},{pos:'6TH',pts:8}].map(({pos,pts}) => (
              <div key={pos} className="bg-black/50 rounded p-2 text-center border border-white/5">
                <div className="text-[8px] text-gray-500 font-bold">{pos}</div>
                <div className="text-sm font-black text-purple-400">{pts}</div>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-[10px] text-gray-500 font-bold tracking-[0.2em] mb-3">RECENT BADGES</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: 'RACE WINNER', color: 'text-amber-500', bg: 'border-amber-900/30 bg-[#15100a]', unlocked: racesWon > 0 },
            { icon: Star,   label: 'POINT SCORER', color: 'text-purple-400', bg: 'border-purple-900/30 bg-[#0f0a15]', unlocked: racePoints > 0 },
            { icon: Zap,    label: 'NITRO KING', color: 'text-cyan-400', bg: 'border-cyan-900/30 bg-[#0a1015]', unlocked: totalRaces > 0 },
          ].map(({ icon: Icon, label, color, bg, unlocked }) => (
            <div key={label} className={`${bg} border p-4 rounded-xl flex flex-col items-center justify-center text-center transition-opacity ${unlocked ? '' : 'opacity-40'}`}>
              <Icon className={`w-8 h-8 ${color} mb-2`} />
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{label}</span>
              {!unlocked && <span className="text-[7px] text-gray-600 mt-1">LOCKED</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
