import { Link } from 'react-router-dom';
import { CarFront, ShoppingCart, Landmark, Map, ChevronRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="px-6 relative h-full flex flex-col">
      {/* Title Area */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="text-[11px] text-cyan-400 font-black tracking-[0.2em] mb-1 flex items-center gap-2">
            SYSTEM STATUS: NOMINAL 
          </div>
          <h2 className="text-[40px] font-black italic tracking-tighter leading-none text-white drop-shadow-md">
            TERMINAL<br/>HUB
          </h2>
        </div>
        
        <div className="text-right bg-white/5 border border-white/10 p-2 px-3 rounded-lg backdrop-blur-sm self-center">
          <div className="text-[9px] text-gray-400 font-bold tracking-widest">GARAGE OCCUPANCY</div>
          <div className="text-xl font-black mt-1 tracking-tighter leading-none">
            <span className="text-white">124</span>
            <span className="text-gray-500 text-sm"> / 300</span>
          </div>
        </div>
      </div>

      {/* Main Grid - Staggered Mobile Layout */}
      <div className="grid grid-cols-2 gap-4 flex-1 mb-4">
        {/* Garage Card - Tall */}
        <Link to="/garage" className="relative group block rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0c] transition-all hover:border-cyan-500/50 min-h-[220px] shadow-lg">
          {/* Supercar Background Image */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80')] bg-cover bg-center bg-no-repeat mix-blend-luminosity opacity-40 group-hover:opacity-60 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="absolute inset-0 flex flex-col justify-end p-5 z-10">
            <CarFront className="w-8 h-8 text-cyan-400 mb-3 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <h3 className="text-[22px] font-black italic tracking-tighter text-white mb-1 leading-none drop-shadow-lg">GARAGE</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest leading-tight">MANAGE FLEET<br/>& TUNING</p>
          </div>
        </Link>
        
        <div className="flex flex-col gap-4">
          {/* Showroom / Shop - Red Tinted Background */}
          <Link to="/shop" className="relative group flex-1 rounded-2xl overflow-hidden border border-white/10 bg-[#110505] transition-all hover:border-yellow-500/50 flex flex-col justify-end p-4 shadow-lg min-h-[102px]">
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=800&q=80')] bg-cover bg-center mix-blend-color-dodge opacity-50 group-hover:opacity-70 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
             <div className="relative z-10">
              <ShoppingCart className="w-6 h-6 text-yellow-500 mb-2 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
              <h3 className="text-xl font-black italic tracking-tighter text-white mb-0.5 leading-none drop-shadow-md">SHOWROOM</h3>
              <p className="text-[9px] text-gray-400 font-bold tracking-widest truncate">PURCHASE VEHICLES</p>
             </div>
          </Link>
          
          {/* Drive Bank - Dark Interior Background */}
          <Link to="/profile" className="relative group flex-1 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0f14] transition-all hover:border-red-500/50 flex flex-col justify-end p-4 shadow-lg min-h-[102px]">
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80')] bg-cover bg-center mix-blend-luminosity opacity-30 group-hover:opacity-50 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
             <div className="relative z-10">
              <Landmark className="w-6 h-6 text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <h3 className="text-xl font-black italic tracking-tighter text-white mb-0.5 leading-none drop-shadow-md">DRIVERS BANK</h3>
             </div>
          </Link>
        </div>

        {/* Circuit Access - Realistic Asphalt Background */}
        <div className="col-span-2 relative mt-1 rounded-2xl border border-white/10 bg-[#0a0a0c] overflow-hidden min-h-[160px] shadow-xl group">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80')] bg-cover bg-[center_top] mix-blend-luminosity opacity-60 group-hover:opacity-80 transition-opacity"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
           <div className="p-6 relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="text-[11px] text-cyan-400 font-black tracking-[0.2em] mb-2 drop-shadow-md">CIRCUIT ACCESS</div>
                <h3 className="text-[34px] font-black italic tracking-tighter text-white leading-none drop-shadow-lg">
                  TRACK SELECTION
                </h3>
              </div>
              
              <Link to="/cars" className="self-start mt-4 flex items-center bg-red-600 hover:bg-red-500 text-white py-3 px-8 rounded-lg font-black italic tracking-widest transition-colors shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400/50">
                RACE NOW
                <ChevronRight className="w-5 h-5 ml-2 transition-transform" />
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
