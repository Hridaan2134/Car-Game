import { CarFront, Filter } from 'lucide-react';

const Cars = () => {
  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-white">
            VEHICLE DB
          </h2>
          <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
            ALL AVAILABLE CARS
          </div>
        </div>
        <button className="bg-gray-900 p-2 rounded">
           <Filter className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "HAAS VF-25", class: "S+", image: "/images/haas.png" },
            { name: "MUSTANG GT 2026", class: "A", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80" },
            { name: "LAMBORGHINI SC20", class: "S", image: "https://images.unsplash.com/photo-1583121274602-3e2820c69e88?w=800&q=80" },
            { name: "PORSCHE 911 GT3 RS", class: "S", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80" },
            { name: "PAGANI HUAYRA R", class: "S", image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80" },
            { name: "FERRARI F8 TRIBUTO", class: "A", image: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80" },
            { name: "KOENIGSEGG JESKO ABSOLUT", class: "S+", image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80" },
            { name: "BMW M4 COMPETITION", class: "B", image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80" },
            { name: "MERCEDES-AMG ONE", class: "S", image: "/images/mercedes.png" },
            { name: "MERCEDES-BENZ SLS AMG", class: "A", image: "" },
            { name: "ROLLS-ROYCE WRAITH", class: "B", image: "/images/rolls.png" },
            { name: "BENTLEY CONTINENTAL GT", class: "A", image: "" },
            { name: "LAMBORGHINI AVENTADOR SVJ", class: "S", image: "/images/svj.png" },
            { name: "BUGATTI CHIRON PUR SPORT", class: "S", image: "" },
            { name: "PORSCHE 911 GT3 RS", class: "A", image: "" },
            { name: "FERRARI SF90 STRADALE", class: "S", image: "" },
            { name: "MCLAREN P1", class: "S", image: "" },
            { name: "ASTON MARTIN VANTAGE", class: "B", image: "" }
          ].map((car, i) => (
            <div key={i} className="bg-[#111218] border border-gray-800 rounded p-3 flex flex-col items-center text-center overflow-hidden relative shadow-lg">
              <div className="w-full h-16 bg-gray-800 rounded relative mb-2 flex items-center justify-center overflow-hidden">
                {car.image ? (
                  <img src={car.image} alt={car.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <CarFront className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <h4 className="font-bold text-[10px] leading-tight text-gray-300 min-h-[24px] flex items-center justify-center relative z-10">{car.name}</h4>
              <p className="text-[8px] text-gray-500 font-bold tracking-widest mt-1 relative z-10">CLASS {car.class}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cars;
