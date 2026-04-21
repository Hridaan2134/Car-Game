import { ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const Shop = () => {
  const buyCar = useStore((s) => s.buyCar);
  const ownedCars = useStore((s) => s.ownedCars);
  const balance = useStore((s) => s.driverBalance);

  return (
    <div className="px-6 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter mix-blend-screen leading-none text-amber-500">
            SHOWROOM
          </h2>
          <div className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-2">
            PURCHASE NEW VEHICLES
          </div>
        </div>
        <div className="text-right">
           <div className="text-[8px] text-gray-500 font-bold tracking-widest">CURRENT BALANCE</div>
           <div className="text-xl font-black text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">${balance.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
        <div className="grid grid-cols-1 gap-4">
          {[
            { name: "HAAS VF-25", class: "S+", type: "F1", price: 5500, image: "/images/haas.png", speed: "330 km/h", accel: "2.5s", handling: "10.0" },
            { name: "MUSTANG GT 2026", class: "A", type: "MUSCLE", price: 85, image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80", speed: "280 km/h", accel: "4.2s", handling: "8.2" },
            { name: "LAMBORGHINI SC20", class: "S", type: "HYPERCAR", price: 4200, image: "https://images.unsplash.com/photo-1583121274602-3e2820c69e88?w=800&q=80", speed: "350 km/h", accel: "2.8s", handling: "9.6" },
            { name: "PORSCHE 911 GT3 RS", class: "S", type: "TRACK", price: 280, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80", speed: "312 km/h", accel: "3.2s", handling: "9.8" },
            { name: "PAGANI HUAYRA R", class: "S", type: "HYPERCAR", price: 3800, image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80", speed: "380 km/h", accel: "2.7s", handling: "9.7" },
            { name: "FERRARI F8 TRIBUTO", class: "A", type: "SUPERCAR", price: 320, image: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80", speed: "340 km/h", accel: "2.9s", handling: "9.3" },
            { name: "KOENIGSEGG JESKO ABSOLUT", class: "S+", type: "HYPERCAR", price: 3400, image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80", speed: "480 km/h", accel: "2.5s", handling: "9.1" },
            { name: "BMW M4 COMPETITION", class: "B", type: "PERFORMANCE", price: 95, image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80", speed: "290 km/h", accel: "3.9s", handling: "8.8" },
            { name: "MERCEDES-AMG ONE", class: "S", type: "HYPERCAR", price: 2750, image: "/images/mercedes.png", speed: "352 km/h", accel: "2.9s", handling: "9.4" },
            { name: "ROLLS-ROYCE WRAITH", class: "B", type: "LUXURY", price: 345, image: "/images/rolls.png", speed: "250 km/h", accel: "4.4s", handling: "7.5" },
            { name: "BUGATTI CHIRON PUR SPORT", class: "S", type: "HYPERCAR", price: 3600, image: "", speed: "350 km/h", accel: "2.4s", handling: "9.2" },
            { name: "BENTLEY CONTINENTAL GT", class: "A", type: "LUXURY", price: 280, image: "", speed: "333 km/h", accel: "3.6s", handling: "8.5" }
          ].map((car, i) => {
            const isOwned = ownedCars.some(c => c.name === car.name);
            return (
              <div key={i} className={`relative rounded-xl border overflow-hidden p-4 group transition-all ${isOwned ? 'border-green-900/30 bg-green-950/10' : 'border-amber-900/30 bg-[#15100a]'}`}>
                <div className="absolute top-0 right-0 p-4 z-20">
                 <span className="text-xs font-black text-amber-500 italic tracking-wider">${car.price},000</span>
               </div>
               <div className="w-full h-32 bg-gradient-to-r from-gray-900 to-black rounded mb-3 flex items-center justify-center relative overflow-hidden">
                  {car.image ? (
                    <img src={car.image} alt={car.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-amber-500/30 relative z-10" />
                  )}
               </div>
               <div>
                  <h3 className="text-xl font-bold italic tracking-tighter">{car.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="bg-gray-800 text-[8px] px-2 py-0.5 rounded font-bold tracking-widest text-gray-400">CLASS {car.class}</span>
                    <span className="bg-gray-800 text-[8px] px-2 py-0.5 rounded font-bold tracking-widest text-gray-400">{car.type}</span>
                  </div>
               </div>
               <button 
                  disabled={isOwned}
                  onClick={() => buyCar(car)}
                  className={`w-full mt-4 font-black italic tracking-widest py-2 rounded transition-all flex items-center justify-center gap-2 ${isOwned ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.2)] hover:shadow-[0_0_20px_rgba(217,119,6,0.4)]'}`}
               >
                  {isOwned ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      OWNED
                    </>
                  ) : (
                    'PURCHASE'
                  )}
               </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default Shop;
