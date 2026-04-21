import { CarFront, Filter, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CARS } from '../data/cars';
import { useNavigate } from 'react-router-dom';

const Cars = () => {
  const { activeCar, setActiveCar } = useStore();
  const navigate = useNavigate();

  const handleSelectCar = (car) => {
    setActiveCar(car);
    // Dynamic transition feel: small delay or just navigate
    navigate('/maps');
  };

  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-white">
            VEHICLE DB
          </h2>
          <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
            SELECT YOUR MACHINE
          </div>
        </div>
        <button className="bg-gray-900/50 p-2 rounded border border-white/5 hover:border-white/20 transition-colors">
           <Filter className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {CARS.map((car, i) => {
            const isSelected = activeCar?.name === car.name;
            return (
              <div 
                key={i} 
                onClick={() => handleSelectCar(car)}
                className={`group cursor-pointer bg-[#111218] border transition-all duration-300 rounded-xl p-3 flex flex-col items-center text-center overflow-hidden relative shadow-lg ${
                  isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/50 scale-[1.02]' : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Glow Effect for Selected */}
                {isSelected && (
                  <div className="absolute inset-0 bg-cyan-500/5 blur-xl pointer-events-none"></div>
                )}

                <div className="w-full h-18 bg-gray-900/50 rounded-lg relative mb-3 flex items-center justify-center overflow-hidden border border-white/5">
                  {car.image ? (
                    <img 
                      src={car.image} 
                      alt={car.name} 
                      className={`w-full h-full object-contain p-1 transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} 
                    />
                  ) : (
                    <CarFront className="w-8 h-8 text-gray-700" />
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-cyan-500 p-1 rounded-full shadow-lg">
                      <ChevronRight className="w-2 h-2 text-black" />
                    </div>
                  )}
                </div>

                <h4 className={`font-black text-[10px] leading-tight transition-colors min-h-[24px] flex items-center justify-center relative z-10 ${
                  isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                }`}>
                  {car.name}
                </h4>
                
                <div className="flex items-center gap-2 mt-1 relative z-10">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                    car.class === 'S+' ? 'bg-red-500/20 text-red-400' : 
                    car.class === 'S' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {car.class}
                  </span>
                  <span className="text-[7px] text-gray-500 font-bold tracking-widest uppercase">
                    {car.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Cars;
