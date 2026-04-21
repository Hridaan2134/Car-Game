import { create } from 'zustand';

// Points awarded by finishing position (1st → 12th)
const POSITION_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 3, 2, 1, 0];

export const useStore = create((set) => ({
  driverBalance: 1000000,
  playerName: 'ANON_RACER',
  racePoints: 0,
  totalRaces: 0,
  racesWon: 0,
  ownedCars: [
    { name: "ROLLS-ROYCE WRAITH", class: "B", type: "LUXURY", price: 345, image: "/images/rolls.png", speed: "250 km/h", accel: "4.4s", handling: "7.5" },
    { name: "HAAS VF-25", class: "S+", type: "F1", price: 5500, image: "/images/haas.png", speed: "330 km/h", accel: "2.5s", handling: "10.0" },
  ],
  activeCar: { name: "ROLLS-ROYCE WRAITH", class: "B", type: "LUXURY", price: 345, image: "/images/rolls.png", speed: "250 km/h", accel: "4.4s", handling: "7.5" },

  setPlayerName: (name) => set({ playerName: name.toUpperCase() }),
  setActiveCar: (car) => set({ activeCar: car }),

  addPrizeMoney: (amount) =>
    set((state) => ({ driverBalance: state.driverBalance + amount })),

  addRacePoints: (position) =>
    set((state) => ({
      racePoints:  state.racePoints + (POSITION_POINTS[position - 1] ?? 0),
      totalRaces:  state.totalRaces + 1,
      racesWon:    state.racesWon + (position === 1 ? 1 : 0),
    })),

  buyCar: (car) => set((state) => {
    const cost = car.price * 1000;
    if (state.driverBalance < cost) {
      alert("INSUFFICIENT FUNDS");
      return state;
    }
    if (state.ownedCars.some(c => c.name === car.name)) {
      alert("VEHICLE ALREADY OWNED");
      return state;
    }
    return {
      driverBalance: state.driverBalance - cost,
      ownedCars: [...state.ownedCars, car]
    };
  }),
}));
