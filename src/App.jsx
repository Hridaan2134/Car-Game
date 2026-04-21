import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Garage from './pages/Garage';
import Shop from './pages/Shop';
import Profile from './pages/Profile';
import Races from './pages/Races';
import Maps from './pages/Maps';
import Cars from './pages/Cars';
import RaceLoader from './pages/RaceLoader';
import ActiveRace from './pages/ActiveRace';

import { useEffect } from 'react';
import { useStore } from './store/useStore';

const PlayTimeTracker = () => {
  const incrementPlayTime = useStore((s) => s.incrementPlayTime);
  
  useEffect(() => {
    const id = setInterval(() => incrementPlayTime(), 1000);
    return () => clearInterval(id);
  }, [incrementPlayTime]);
  
  return null;
};

function App() {
  return (
    <Router>
      <PlayTimeTracker />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="garage" element={<Garage />} />
          <Route path="shop" element={<Shop />} />
          <Route path="profile" element={<Profile />} />
          <Route path="races" element={<Races />} />
          <Route path="maps" element={<Maps />} />
          <Route path="cars" element={<Cars />} />
        </Route>
        <Route path="/race-loader" element={<RaceLoader />} />
        <Route path="/race" element={<ActiveRace />} />
      </Routes>
    </Router>
  );
}

export default App;
