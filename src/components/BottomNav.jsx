import { Link, useLocation } from 'react-router-dom';
import { Gauge, CarFront, ShoppingCart, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'TERMINAL', icon: Gauge, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500' },
    { path: '/garage', label: 'GARAGE', icon: CarFront, color: 'text-gray-400', bg: '', border: 'border-transparent' },
    { path: '/shop', label: 'SHOP', icon: ShoppingCart, color: 'text-gray-400', bg: '', border: 'border-transparent' },
    { path: '/profile', label: 'PROFILE', icon: User, color: 'text-gray-400', bg: '', border: 'border-transparent' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Status Bar above Nav */}
      <div className="bg-[#111218] border-t border-gray-800 px-4 py-2 flex justify-between text-[10px] text-gray-500 font-mono tracking-wider">
        <div className="flex flex-col">
          <span className="opacity-50">SYNC STATUS</span>
          <span className="text-green-500 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            ONLINE
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="opacity-50">REGION</span>
          <span className="text-gray-300">EU-WEST-1</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="opacity-50">LATENCY</span>
          <span className="text-cyan-400 font-bold">14 MS</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="opacity-50">SERVER CLOCK</span>
          <span className="text-gray-300">23:59:12</span>
        </div>
      </div>

      {/* Main Nav Items */}
      <div className="bg-[#0b0c10] border-t border-gray-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full border-t-2 transition-all duration-300 ${
                  isActive ? `${item.border} ${item.bg}` : 'border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? item.color : 'text-gray-500'}`} />
                <span className={`text-[10px] font-bold tracking-widest ${isActive ? item.color : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
