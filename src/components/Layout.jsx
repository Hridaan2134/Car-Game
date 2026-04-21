import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useStore } from '../store/useStore';

const Layout = () => {
  const driverBalance = useStore((state) => state.driverBalance);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white font-sans flex flex-col pb-24 overflow-x-hidden">
      {/* Global Header */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center overflow-hidden border border-red-500/50 relative shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent absolute"></div>
            <img src="https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=100&q=80" alt="Avatar" className="w-full h-full object-cover mix-blend-screen" />
          </div>
          <div className="leading-none pt-1">
            <h1 className="text-[22px] font-black italic tracking-tighter text-red-500 leading-none drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">VELOCITY</h1>
            <h1 className="text-[22px] font-black italic tracking-tighter text-yellow-500 leading-none drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">KINETIC</h1>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-yellow-500 font-black text-lg leading-none tracking-wider">${driverBalance.toLocaleString()}</div>
            <div className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5">DRIVER BALANCE</div>
          </div>
          
          <div className="w-px h-8 bg-gray-800 mx-1 border-r border-gray-900"></div>
          
          <div className="text-right">
            <div className="text-cyan-400 font-black text-lg leading-none">LVL 24</div>
            <div className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5">RANK</div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Background ambient light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
    </div>
  );
};

export default Layout;
