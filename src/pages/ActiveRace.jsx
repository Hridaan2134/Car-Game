import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PerspectiveCamera, Stars, Html, useProgress, Sky } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRACK_LENGTH  = 14000;
const ROAD_WIDTH    = 26;
const NITRO_MAX     = 100;
const PRIZE_MONEY   = 150000;

const getPhysicsForCar = (carName) => {
  const isGodCar = carName === "HAAS VF-25" || carName === "LAMBORGHINI SC20";
  return {
    mass: 1400,
    engineForce: isGodCar ? (carName === "HAAS VF-25" ? 95000 : 85000) : 14000,
    nitroForce: isGodCar ? 45000 : 26000,
    brakeForce: 25000,
    dragCoeff: 0.32,
    rollingResist: 0.012,
    maxSteer: 0.045,
    wheelBase: 2.8,
    maxSpeed: isGodCar ? 140 : 96,
    gears: [0, 16, 32, 48, 64, 82, 100],
  };
};

const getTrackX = (z, mapType) => {
  const isNurb = mapType === 'nurburg';
  const isDora = mapType === 'dora';
  const freq = isNurb ? 0.0012 : isDora ? 0.0018 : 0.0008;
  const amp  = isNurb ? 35 : isDora ? 45 : 20;
  if (mapType === 'gp' || mapType === 'tokyo') return 0;
  return Math.sin(z * freq) * amp + Math.cos(z * freq * 0.5) * (amp * 0.4);
};

const getObstacles = (mapType) => {
  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const items = [];
  const spacing = 450;
  for (let z = 1200; z < TRACK_LENGTH - 1000; z += spacing) {
    const rnd = seededRandom(z);
    const type = rnd < 0.33 ? 'tree' : rnd < 0.66 ? 'wreck' : 'sand';
    const x = getTrackX(z, mapType) + (seededRandom(z + 1) - 0.5) * (ROAD_WIDTH - 8);
    items.push({ z, x, type, id: z });
  }
  return items;
};

const AI_NAMES = ['APEX HUNTER','GHOST RIDER','BLAZE FX','IRON SHIFT','NEON WOLF','TURBO KAI','DARK DRIVE','STORM ACE','VOID RACER','SECTOR 9','SHADOW LINE'];
const AI_COLORS = ['#e63946','#f4a261','#2ec4b6','#9b5de5','#f15bb5','#fee440','#00bbf9','#e9c46a','#ff6b6b','#06d6a0','#118ab2'];
const AI_IMAGES = ['https://images.unsplash.com/photo-1596251268686-2182745778a8?w=1000&q=80', 'https://images.unsplash.com/photo-1621135802920-133df287f89c?w=1000&q=80'];

// ── Components ────────────────────────────────────────────────────────────────

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="w-64 h-1 bg-gray-900 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-cyan-400 font-black mt-2 tracking-widest uppercase italic">Initializing Simulation {Math.floor(progress)}%</div>
      </div>
    </Html>
  );
};

const SkidMarks = ({ playerDistance }) => {
  const marks = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    x: (Math.random() - 0.5) * (ROAD_WIDTH - 4),
    z: 200 + i * (TRACK_LENGTH / 30) + Math.random() * 50,
    len: 10 + Math.random() * 40
  })), []);
  return (
    <group>
      {marks.map((m, i) => (
        <mesh key={i} position={[m.x, 0.03, m.z]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[0.2, m.len]} />
          <meshStandardMaterial color="#000" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const Obstacles = ({ items }) => (
  <group>
    {items.map((obs) => (
      <group key={obs.id} position={[obs.x, 0, obs.z]}>
        {obs.type === 'tree' ? (
          <group>
            <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.4, 0.6, 3]} /><meshStandardMaterial color="#3a2a1a" /></mesh>
            <mesh position={[0, 3.5, 0]}><coneGeometry args={[2, 4]} /><meshStandardMaterial color="#1a2e1a" /></mesh>
          </group>
        ) : obs.type === 'wreck' ? (
          <mesh position={[0, 0.4, 0]} rotation={[0, 0.7, 0]}><boxGeometry args={[4.5, 1.8, 8]} /><meshStandardMaterial color="#333" metalness={0.8} /></mesh>
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[12, 12]} /><meshStandardMaterial color="#c2b280" opacity={0.6} transparent /></mesh>
        )}
      </group>
    ))}
  </group>
);

const CarBody = ({ color, imgUrl, isPlayer, isBraking, speed }) => {
  const dims = { bodyW: 1.9, bodyH: 0.9, bodyL: 4.8 };
  return (
    <group>
      {/* Chassis */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[dims.bodyW, dims.bodyH, dims.bodyL]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Image Texturing */}
      {imgUrl && (
        <mesh position={[0, 1.01, 0.2]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[1.6, 2.2]} />
          <Suspense fallback={null}><ImageContent url={imgUrl} /></Suspense>
        </mesh>
      )}
      {/* Underglow (Player Only) */}
      {isPlayer && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[2.5, 5]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )}
      {/* Brakelights */}
      {[-0.65, 0.65].map((x) => (
        <group key={x} position={[x, 0.6, -(dims.bodyL / 2 + 0.02)]}>
          <mesh><boxGeometry args={[0.22, 0.08, 0.04]} /><meshBasicMaterial color={isBraking ? '#ff1111' : '#3a0000'} /></mesh>
          <pointLight color="#ff1111" intensity={isBraking ? 15 : 0.5} distance={isBraking ? 20 : 3} />
        </group>
      ))}
    </group>
  );
};

const ImageContent = ({ url }) => {
  const tex = useMemo(() => new THREE.TextureLoader().load(url), [url]);
  return <meshBasicMaterial map={tex} transparent />;
};

const PlayerCar = ({ controls, setSpeed, setDistance, setGear, setRpm, setFinished, setChromatic, setBraking, setNitro, playerImg, carColor, raceStarted, carName, mapType, obstacles }) => {
  const meshRef = useRef();
  const vel = useRef(0);
  const posX = useRef(0);
  const posZ = useRef(10);
  const steer = useRef(0);
  const nitroFuel = useRef(NITRO_MAX);
  const finished = useRef(false);
  const speedDisplay = useRef(0);
  const raceStartedRef = useRef(false);

  useEffect(() => { raceStartedRef.current = raceStarted; }, [raceStarted]);

  const camPos = useRef(new THREE.Vector3(0, 4.5, -3));
  const camLook = useRef(new THREE.Vector3(0, 1.5, 30));
  const camFov = useRef(80);

  const physics = useMemo(() => getPhysicsForCar(carName), [carName]);

  useFrame((state, delta) => {
    if (!raceStartedRef.current || finished.current) return;
    const dt = Math.min(delta, 0.033);

    if (posZ.current >= TRACK_LENGTH) {
      finished.current = true;
      setFinished(true);
      return;
    }

    const useNitro = controls.current.nitro && nitroFuel.current > 0;
    if (useNitro) nitroFuel.current = Math.max(0, nitroFuel.current - 40 * dt);
    else if (!controls.current.nitro) nitroFuel.current = Math.min(NITRO_MAX, nitroFuel.current + 14 * dt);
    setNitro(nitroFuel.current);

    const force = controls.current.forward ? (useNitro ? physics.nitroForce : physics.engineForce) : 0;
    const brakeF = controls.current.backward ? physics.brakeForce : 0;
    const drag = physics.dragCoeff * vel.current * Math.abs(vel.current);
    const rolling = physics.rollingResist * vel.current * physics.mass * 9.81;
    let accel = (force - brakeF * Math.sign(vel.current) - drag - rolling) / physics.mass;

    if (vel.current < -5 && accel < 0) accel = 0;
    vel.current = Math.max(-8, Math.min(physics.maxSpeed, vel.current + accel * dt));
    if (!controls.current.forward && !controls.current.backward && Math.abs(vel.current) < 0.3) vel.current = 0;

    const absVel = Math.abs(vel.current);
    setSpeed(absVel * 3.6);
    speedDisplay.current = vel.current;
    setBraking(controls.current.backward && vel.current > 2);

    let gear = 1;
    for (let g = 1; g < physics.gears.length; g++) { if (absVel >= physics.gears[g]) gear = g; }
    setGear(gear);
    const gL = physics.gears[gear] || 0;
    const gH = physics.gears[gear+1] || physics.maxSpeed;
    const rpm = 1000 + ((absVel - gL) / Math.max(gH - gL, 1)) * 7000;
    setRpm(Math.min(8000, Math.max(800, rpm)));

    const tX = getTrackX(posZ.current, mapType);
    const sMax = physics.maxSteer * (1 - 0.6 * (absVel / physics.maxSpeed));
    const sTarget = controls.current.left ? sMax : controls.current.right ? -sMax : 0;
    steer.current += (sTarget - steer.current) * 0.18;
    posX.current += steer.current * vel.current * dt * physics.wheelBase * 10;
    posX.current = Math.max(tX - (ROAD_WIDTH/2 - 1.6), Math.min(tX + (ROAD_WIDTH/2 - 1.6), posX.current));

    for (const obs of obstacles) {
      if (Math.abs(posZ.current - obs.z) < 3.5 && Math.abs(posX.current - obs.x) < 4.5) {
        if (obs.type === 'sand') vel.current *= 0.98;
        else { vel.current *= 0.4; posX.current += (posX.current > obs.x ? 2.5 : -2.5); }
      }
    }

    posZ.current += vel.current * dt;
    setDistance(posZ.current);

    if (meshRef.current) {
      meshRef.current.position.x = posX.current;
      meshRef.current.position.z = posZ.current;
      meshRef.current.rotation.y += (steer.current * 2.5 - meshRef.current.rotation.y) * dt * 10;
      meshRef.current.rotation.z += (-steer.current * 1.5 - meshRef.current.rotation.z) * dt * 12;
    }

    const camZ = useNitro ? -22 : -11 - absVel * 0.035;
    camFov.current += ((useNitro ? 115 : 78 + absVel * 0.16) - camFov.current) * dt * 5;
    camPos.current.lerp(new THREE.Vector3(posX.current * 0.5, 3.6, posZ.current + camZ), dt * 8);
    camLook.current.lerp(new THREE.Vector3(posX.current * 0.3, 1.4, posZ.current + 30), dt * 8);

    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camLook.current);
    state.camera.rotateZ(-steer.current * 0.5);
    state.camera.fov = camFov.current;
    state.camera.updateProjectionMatrix();
    setChromatic(useNitro ? 0.006 : 0);
  });

  return (
    <group ref={meshRef} position={[0, 0, 10]}>
      <CarBody color={carColor} imgUrl={playerImg} isPlayer isBraking={controls.current.backward} speed={speedDisplay.current} />
    </group>
  );
};

const AICars = ({ playerDistance, raceStarted, onUpdate, carName, mapType, obstacles }) => {
  const cars = useRef(AI_NAMES.map((name, i) => ({
    name, z: 20 + i * 25, x: (i % 2 === 0 ? 5 : -5), speed: 65 + Math.random() * 20, color: AI_COLORS[i % AI_COLORS.length], isWrecked: false
  })));
  const pPhys = getPhysicsForCar(carName);
  const aiBase = Math.max(75, pPhys.maxSpeed * 0.82);

  useFrame((_, dt) => {
    if (!raceStarted) return;
    cars.current.forEach((car, i) => {
      if (car.isWrecked) { car.speed *= 0.95; return; }
      if (obstacles.find(o => Math.abs(o.z - car.z) < 12) && Math.random() < 0.004) { car.isWrecked = true; car.speed *= 0.4; }
      const tX = getTrackX(car.z, mapType) + (i % 2 === 0 ? 6 : -6);
      car.x += (tX - car.x) * 2 * dt;
      car.z += car.speed * dt;
      const rubber = car.z - playerDistance < -150 ? 8 : car.z - playerDistance > 150 ? -8 : 0;
      car.speed = Math.min(aiBase + 20, Math.max(aiBase - 20, car.speed + rubber * dt));
    });
    onUpdate(cars.current.map(c => ({ name: c.name, z: c.z, color: c.color })));
  });

  return (
    <group>
      {cars.current.map((c, i) => (
        <mesh key={i} position={[c.x, 0.4, c.z]}>
          <boxGeometry args={[4, 2, 8]} /><meshStandardMaterial color={c.color} />
        </mesh>
      ))}
    </group>
  );
};

// ── Track Components ──────────────────────────────────────────────────────────

const TokyoTrack = ({ playerDistance, tod }) => {
  const SEG = 80; const COUNT = 60; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(getTrackX(z, 'tokyo'), 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.2 : 0.1} />
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}>
          <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH, SEG+1]} /><meshStandardMaterial color="#111" /></mesh>
          {[-14, 14].map(x => <mesh key={x} position={[x, 15, 0]}><boxGeometry args={[1, 30, 2]} /><meshStandardMaterial color="#222" /></mesh>)}
        </group>
      ))}
    </group>
  );
};

const NevadaTrack = ({ playerDistance, tod }) => {
  const SEG = 100; const COUNT = 50; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(getTrackX(z, 'nevada'), 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.5 : 0.05} />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.5, TRACK_LENGTH/2]}><planeGeometry args={[1000, TRACK_LENGTH+1000]} /><meshStandardMaterial color="#d2a679" /></mesh>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}><mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH, SEG+1]} /><meshStandardMaterial color="#222" /></mesh></group>
      ))}
    </group>
  );
};

const AlpineTrack = ({ playerDistance, tod }) => {
  const SEG = 100; const COUNT = 50; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(getTrackX(z, 'alpine'), 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.3 : 0.1} />
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}><mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH, SEG+1]} /><meshStandardMaterial color="#111" /></mesh></group>
      ))}
    </group>
  );
};

const DoraTrack = ({ playerDistance, tod }) => {
  const SEG = 100; const COUNT = 50; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(getTrackX(z, 'dora'), 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.4 : 0.1} />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.2, TRACK_LENGTH/2]}><planeGeometry args={[800, TRACK_LENGTH+800]} /><meshStandardMaterial color="#2d5a27" /></mesh>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}><mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH, SEG+1]} /><meshStandardMaterial color="#222" /></mesh></group>
      ))}
    </group>
  );
};

const NurburgTrack = ({ playerDistance, tod }) => {
  const SEG = 100; const COUNT = 60; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(getTrackX(z, 'nurburg'), 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.1 : 0.05} />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.2, TRACK_LENGTH/2]}><planeGeometry args={[1000, TRACK_LENGTH+1000]} /><meshStandardMaterial color="#051a05" /></mesh>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}><mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH-2, SEG+1]} /><meshStandardMaterial color="#1a1a1a" /></mesh></group>
      ))}
    </group>
  );
};

const GPTrack = ({ playerDistance, tod }) => {
  const SEG = 100; const COUNT = 40; const LOOP = SEG * COUNT; const refs = useRef([]);
  useFrame(() => {
    refs.current.forEach((ref, i) => { if (!ref) return; const z = playerDistance - 250 + ((i * SEG - (playerDistance - 250)) % LOOP + LOOP) % LOOP; ref.position.set(0, 0, z); });
  });
  return (
    <group>
      <ambientLight intensity={tod === 'day' ? 1.7 : 0.2} />
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={el => refs.current[i] = el}>
          <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[ROAD_WIDTH+10, SEG+1]} /><meshStandardMaterial color="#111" /></mesh>
          {[-18, 18].map(x => <mesh key={x} position={[x, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[3, SEG]} /><meshStandardMaterial color={i%2===0?"#fff":"#f00"} /></mesh>)}
        </group>
      ))}
    </group>
  );
};

// ── HUD & Keyboard ────────────────────────────────────────────────────────────

const useKeyboard = () => {
  const keys = useRef({ forward:false, backward:false, left:false, right:false, nitro:false });
  useEffect(() => {
    const dn = (e) => {
      if (['KeyW','ArrowUp'].includes(e.code)) keys.current.forward = true;
      if (['KeyS','ArrowDown'].includes(e.code)) keys.current.backward = true;
      if (['KeyA','ArrowLeft'].includes(e.code)) keys.current.left = true;
      if (['KeyD','ArrowRight'].includes(e.code)) keys.current.right = true;
      if (e.code === 'Space') { e.preventDefault(); keys.current.nitro = true; }
    };
    const up = (e) => {
      if (['KeyW','ArrowUp'].includes(e.code)) keys.current.forward = false;
      if (['KeyS','ArrowDown'].includes(e.code)) keys.current.backward = false;
      if (['KeyA','ArrowLeft'].includes(e.code)) keys.current.left = false;
      if (['KeyD','ArrowRight'].includes(e.code)) keys.current.right = false;
      if (e.code === 'Space') keys.current.nitro = false;
    };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);
  return keys;
};

const HUD = ({ speed, distance, isFinished, isBraking, navigate, nitro, elapsedTime, countdown, position, aiPositions, playerDistance, gear, rpm, playerName, racePoints, addRacePoints, addPrizeMoney }) => {
  const pPct = Math.min((distance / TRACK_LENGTH) * 100, 100);
  const kmh = Math.abs(Math.round(speed));
  const fmt = (t) => { const m = Math.floor(t/60); const s = Math.floor(t%60); const ms = Math.floor((t%1)*100); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; };
  const ord = (n) => { const s = ['TH','ST','ND','RD']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
  const stnd = [{ name: playerName || 'YOU', z: playerDistance, isPlayer: true }, ...(aiPositions||[])].sort((a,b)=>b.z-a.z);
  const awarded = useRef(false);
  useEffect(() => { if (isFinished && !awarded.current) { awarded.current = true; addRacePoints(position); addPrizeMoney(PRIZE_MONEY); } }, [isFinished]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none">
      {countdown > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="text-[9px] text-gray-400 font-bold tracking-[0.4em] mb-4 uppercase">Race Starts In</div>
          <div className={`font-black italic leading-none transition-all duration-300 ${countdown === 1 ? 'text-[130px] text-green-400 drop-shadow-[0_0_40px_rgba(0,255,0,0.9)]' : 'text-[120px] text-white'}`}>{countdown === 1 ? 'GO!' : countdown - 1}</div>
        </div>
      )}
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl min-w-[220px]">
        <div className="text-[8px] text-cyan-400 font-bold tracking-[0.3em] mb-1 uppercase">Race Time</div>
        <div className="text-3xl font-black text-white font-mono mb-3">{fmt(elapsedTime)}</div>
        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 shadow-[0_0_8px_cyan]" style={{ width:`${pPct}%` }} /></div>
      </div>
      <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xl min-w-[160px]">
        {stnd.slice(0, 8).map((r, idx) => (
          <div key={r.name} className={`flex justify-between items-center text-[10px] font-bold py-[2px] border-b border-white/5 last:border-0 ${r.isPlayer ? 'text-cyan-300' : 'text-gray-400'}`}>
            <span>{idx + 1}. {r.name}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur rounded-2xl px-6 py-3 border border-white/10 shadow-xl text-center">
        <div className="text-[8px] text-gray-500 font-bold tracking-widest uppercase">Position</div>
        <div className="text-4xl font-black text-white italic">{ord(position)}</div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="flex items-end gap-3">
          <div className="bg-black/75 backdrop-blur rounded-xl p-3 border border-white/10"><div className="text-[10px] text-cyan-400 font-black italic">{kmh} KM/H</div></div>
          <div className="bg-amber-500 text-black font-black px-3 py-2 rounded-xl text-xl italic">{gear}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-[10px] text-amber-400 font-black tracking-widest italic">NITRO</div>
          <div className="w-48 h-3 bg-gray-950 rounded-full border border-amber-900 overflow-hidden"><div className="h-full bg-amber-400" style={{ width:`${nitro}%` }} /></div>
        </div>
      </div>
      {isFinished && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
          <div className="text-center border border-white/10 px-14 py-12 rounded-3xl bg-black/70 shadow-[0_0_80px_rgba(6,182,212,0.1)] max-w-lg w-full mx-4">
            <h1 className="text-7xl font-black italic tracking-tighter text-white mb-6 uppercase">{ord(position)} Place</h1>
            <button onClick={() => navigate('/races')} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl italic tracking-widest text-lg shadow-[0_0_30px_rgba(6,182,212,0.5)]">CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────

const ActiveRace = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mapType = params.get('map') || 'tokyo';
  const carName = params.get('car') || 'MERCEDES-AMG GT';
  const playerImg = params.get('img') || null;
  const carColor = params.get('color') || '#00c8ff';

  const todFactor = useMemo(() => Math.random() < 0.7 ? 'day' : 'night', []);
  const obstacles = useMemo(() => getObstacles(mapType), [mapType]);

  const playerName = useStore(s => s.playerName);
  const racePoints = useStore(s => s.racePoints);
  const addRacePoints = useStore(s => s.addRacePoints);
  const addPrizeMoney = useStore(s => s.addPrizeMoney);

  const controls = useKeyboard();
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isFinished, setFinished] = useState(false);
  const [chromatic, setChromatic] = useState(0);
  const [isBraking, setBraking] = useState(false);
  const [nitro, setNitro] = useState(NITRO_MAX);
  const [gear, setGear] = useState(1);
  const [rpm, setRpm] = useState(800);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [raceStarted, setRaceStarted] = useState(false);
  const [aiPositions, setAiPositions] = useState([]);
  const [position, setPosition] = useState(1);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => {
      const next = countdown - 1;
      setCountdown(next);
      if (next === 0) setRaceStarted(true);
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (!raceStarted || isFinished) return;
    const id = setInterval(() => setElapsedTime(t => parseFloat((t + 0.1).toFixed(1))), 100);
    return () => clearInterval(id);
  }, [raceStarted, isFinished]);

  const handleAiUpdate = (data) => {
    setAiPositions(data);
    setPosition(data.filter(d => d.z > distance).length + 1);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <HUD
        speed={speed} distance={distance} isFinished={isFinished} isBraking={isBraking}
        navigate={navigate} nitro={nitro} elapsedTime={elapsedTime} countdown={countdown}
        position={position} aiPositions={aiPositions} playerDistance={distance} gear={gear} rpm={rpm}
        playerName={playerName} racePoints={racePoints} addRacePoints={addRacePoints} addPrizeMoney={addPrizeMoney}
      />
      <Canvas shadows gl={{ antialias: true }}>
        <Suspense fallback={<Loader />}>
          <PerspectiveCamera makeDefault fov={80} near={0.1} far={2000} />
          {todFactor === 'day' ? <Sky sunPosition={[100, 100, 20]} intensity={1.5} /> : <><color attach="background" args={['#010105']} /><Stars radius={150} depth={80} count={5000} factor={4} /></>}
          {mapType === 'tokyo' && <TokyoTrack playerDistance={distance} tod={todFactor} />}
          {mapType === 'nevada' && <NevadaTrack playerDistance={distance} tod={todFactor} />}
          {mapType === 'alpine' && <AlpineTrack playerDistance={distance} tod={todFactor} />}
          {mapType === 'dora' && <DoraTrack playerDistance={distance} tod={todFactor} />}
          {mapType === 'nurburg' && <NurburgTrack playerDistance={distance} tod={todFactor} />}
          {mapType === 'gp' && <GPTrack playerDistance={distance} tod={todFactor} />}
          <Obstacles items={obstacles} />
          <PlayerCar
            controls={controls} setSpeed={setSpeed} setDistance={setDistance} setGear={setGear} setRpm={setRpm}
            setFinished={setFinished} setChromatic={setChromatic} setBraking={setBraking} setNitro={setNitro}
            playerImg={playerImg} carColor={carColor} raceStarted={raceStarted} carName={carName} mapType={mapType} obstacles={obstacles}
          />
          <AICars playerDistance={distance} raceStarted={raceStarted} onUpdate={handleAiUpdate} carName={carName} mapType={mapType} obstacles={obstacles} />
          <EffectComposer>
            <Bloom luminanceThreshold={1.5} intensity={0.15} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[chromatic, chromatic]} />
            <Vignette darkness={0.9} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ActiveRace;
