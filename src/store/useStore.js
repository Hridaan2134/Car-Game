import { create } from 'zustand';
import { CARS } from '../data/cars';

// Helper to get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Points awarded by finishing position (1st → 12th)
const POSITION_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 3, 2, 1, 0];

// Randomized initial state
const initialBalance = randomRange(50000, 1500000);
const initialPoints = randomRange(0, 500);

// Select 2-3 random starting cars
const shuffledCars = [...CARS].sort(() => 0.5 - Math.random());
const initialOwned = shuffledCars.slice(0, randomRange(2, 3));
const initialActive = initialOwned[0];

export const useStore = create((set) => ({
  driverBalance: initialBalance,
  playerName: 'ANON_RACER',
  racePoints: initialPoints,
  totalRaces: Math.floor(initialPoints / 25), // Statistical sanity check
  racesWon: Math.floor(initialPoints / 100),
  ownedCars: initialOwned,
  activeCar: initialActive,
  totalPlayTime: 0, // In seconds
  loyaltyRewardClaimed: false,

  incrementPlayTime: () => set((state) => {
    const newPlayTime = state.totalPlayTime + 1;
    // Auto-check reward at 3600 seconds (1 hour)
    if (newPlayTime >= 3600 && !state.loyaltyRewardClaimed) {
      return { 
        totalPlayTime: newPlayTime,
        driverBalance: state.driverBalance + 10000,
        loyaltyRewardClaimed: true
      };
    }
    return { totalPlayTime: newPlayTime };
  }),

  setPlayerName: (name) => set({ playerName: name.toUpperCase() }),
  setActiveCar: (car) => set({ activeCar: car }),

  addPrizeMoney: (amount) =>
    set((state) => ({ 
      driverBalance: Math.max(0, state.driverBalance + amount) 
    })),

  addRacePoints: (position) =>
    set((state) => {
      const basePoints = POSITION_POINTS[position - 1] ?? 0;
      let momentumBonus = 0;
      let balanceChange = 0;

      // Win Momentum (1st - 3rd)
      if (position <= 3) {
        momentumBonus = (4 - position) * 10; // Extra points
        balanceChange = (4 - position) * 25000; // Extra win bonus
      } 
      // Loss Momentum (9th - 12th)
      else if (position >= 9) {
        momentumBonus = -15; // Point deduction
        balanceChange = -50000; // Repair cost / Penalty
      }

      const newPoints = Math.max(0, state.racePoints + basePoints + momentumBonus);
      const newBalance = Math.max(0, state.driverBalance + balanceChange);

      return {
        racePoints: newPoints,
        driverBalance: newBalance,
        totalRaces: state.totalRaces + 1,
        racesWon: state.racesWon + (position === 1 ? 1 : 0),
      };
    }),

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
