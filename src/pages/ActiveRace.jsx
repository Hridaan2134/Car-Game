import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PerspectiveCamera, Stars, Html, useProgress, Sky } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

// ── Constants ─────────────────────────────────────────────────────────────────
// 14 000 m track — at ~70 m/s avg this is ~200 s (>2 min) for any racer
const TRACK_LENGTH  = 14000;
const ROAD_WIDTH    = 26;
const NITRO_MAX     = 100;
const PRIZE_MONEY   = 150000;

// Realistic car physics params
const PHYSICS = {
  mass:           1400,       // kg
  engineForce:    14000,      // N
  nitroForce:     26000,      // N  
  brakeForce:     22000,      // N
  dragCoeff:      0.32,
  rollingResist:  0.015,
  downforce:      0.008,
  maxSteer:       0.055,      // rad per frame @ 60fps
  steerReturn:    0.08,
  gripFront:      1.4,
  gripRear:       1.2,
  wheelBase:      2.6,
  maxSpeed:       110,        // m/s ≈ 396 km/h raw cap
  gears:          [0, 18, 35, 58, 82, 108, 140], // speed thresholds m/s for gear shifts
};

const AI_NAMES = [
  'APEX HUNTER','GHOST RIDER','BLAZE FX','IRON SHIFT',
  'NEON WOLF','TURBO KAI','DARK DRIVE','STORM ACE',
  'VOID RACER','SECTOR 9','SHADOW LINE'
];

const AI_COLORS = ['#e63946','#f4a261','#2ec4b6','#9b5de5','#f15bb5','#fee440','#00bbf9','#e9c46a','#ff6b6b','#06d6a0','#118ab2'];
const AI_IMAGES = ['/images/haas.png', '/images/svj.png', '/images/amg.png', '/images/rolls.png'];

// ── Keyboard hook ─────────────────────────────────────────────────────────────
const useKeyboard = () => {
  const keys = useRef({ forward:false, backward:false, left:false, right:false, nitro:false });
  useEffect(() => {
    const dn = (e) => {
      if (['KeyW','ArrowUp'].includes(e.code))    keys.current.forward  = true;
      if (['KeyS','ArrowDown'].includes(e.code))  keys.current.backward = true;
      if (['KeyA','ArrowLeft'].includes(e.code))  keys.current.left     = true;
      if (['KeyD','ArrowRight'].includes(e.code)) keys.current.right    = true;
      if (e.code === 'Space') { e.preventDefault(); keys.current.nitro = true; }
    };
    const up = (e) => {
      if (['KeyW','ArrowUp'].includes(e.code))    keys.current.forward  = false;
      if (['KeyS','ArrowDown'].includes(e.code))  keys.current.backward = false;
      if (['KeyA','ArrowLeft'].includes(e.code))  keys.current.left     = false;
      if (['KeyD','ArrowRight'].includes(e.code)) keys.current.right    = false;
      if (e.code === 'Space') keys.current.nitro = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown',dn); window.removeEventListener('keyup',up); };
  }, []);
  return keys;
};

// ── Loading screen ────────────────────────────────────────────────────────────
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', color:'white', fontFamily:'sans-serif' }}>
        <div style={{ width:70, height:70, border:'5px solid #00e5ff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', marginBottom:14 }} />
        <div style={{ fontSize:32, fontWeight:900, color:'#00e5ff', letterSpacing:'0.1em' }}>{Math.floor(progress)}%</div>
        <div style={{ fontSize:11, letterSpacing:'0.25em', marginTop:6, color:'#aaa' }}>LOADING RACE ENGINE</div>
      </div>
    </Html>
  );
}

// ── Rotating Wheel ────────────────────────────────────────────────────────────
const Wheel = ({ position, speed }) => {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += (speed / 0.34) * delta; // circumference = 2π×r
  });
  return (
    <group position={position}>
      <mesh ref={ref} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.26, 28]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.27, 10]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Tyre wall */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.06, 8, 24]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
    </group>
  );
};

// ── Car-specific geometry profiles ────────────────────────────────────────────
const getCarProfile = (imgUrl) => {
  if (!imgUrl) return 'sports';
  const url = imgUrl.toLowerCase();
  if (url.includes('haas') || url.includes('f1') || url.includes('vf25')) return 'f1';
  if (url.includes('mustang') || url.includes('muscle') || url.includes('m4')) return 'muscle';
  if (url.includes('jesko') || url.includes('huayra') || url.includes('hyper') || url.includes('sc20')) return 'hyper';
  if (url.includes('svj') || url.includes('aventador') || url.includes('lambo') || url.includes('f8')) return 'supercar';
  if (url.includes('rolls') || url.includes('phantom')) return 'luxury';
  if (url.includes('amg') || url.includes('mercedes') || url.includes('gt')) return 'gt';
  if (url.includes('bentley') || url.includes('continental')) return 'gran';
  return 'sports';
};

// ── Car Body Geometry ─────────────────────────────────────────────────────────
const CarBody = ({ color, imgUrl, isPlayer, isBraking, speed }) => {
  const texture = useMemo(() => {
    if (!imgUrl) return null;
    try {
      const t = new THREE.TextureLoader().load(imgUrl);
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    } catch { return null; }
  }, [imgUrl]);

  const profile = getCarProfile(imgUrl);

  const dims = useMemo(() => {
    switch (profile) {
      case 'f1': return { // Formula 1 - narrow, open-wheel, huge wings
        bodyW:0.8, bodyH:0.35, bodyL:5.2, sillW:1.6, sillH:0.12,
        cabinW:0.55, cabinH:0.32, cabinL:1.2, cabinZ:-0.4,
        wingH:0.85, wingW:1.9, wheelY:0.32, wheelBase:1.75,
        diffH:0.12, splitterH:0.04, neonW:1.4,
      };
      case 'hyper': return { // High-end hypercars - Pagani/Koenigsegg
        bodyW:2.12, bodyH:0.34, bodyL:4.9, sillW:2.2, sillH:0.18,
        cabinW:1.45, cabinH:0.32, cabinL:1.9, cabinZ:-0.2,
        wingH:0.95, wingW:2.15, wheelY:0.30, wheelBase:1.5,
        diffH:0.16, splitterH:0.06, neonW:1.9,
      };
      case 'muscle': return { // Mustang/BMW M4 - tall front, boxy
        bodyW:1.88, bodyH:0.58, bodyL:4.7, sillW:1.95, sillH:0.22,
        cabinW:1.6, cabinH:0.48, cabinL:2.4, cabinZ:-0.2,
        wingH:1.15, wingW:1.85, wheelY:0.36, wheelBase:1.4,
        diffH:0.12, splitterH:0.08, neonW:1.6,
      };
      case 'supercar': return { // Lamborghini Aventador SVJ
        bodyW:2.05, bodyH:0.38, bodyL:4.8, sillW:2.15, sillH:0.18,
        cabinW:1.55, cabinH:0.32, cabinL:1.8, cabinZ:-0.2,
        wingH:0.92, wingW:2.1, wheelY:0.30, wheelBase:1.45,
        diffH:0.14, splitterH:0.06, neonW:1.8,
      };
      case 'luxury': return { // Rolls-Royce Phantom
        bodyW:1.98, bodyH:0.72, bodyL:5.4, sillW:2.05, sillH:0.28,
        cabinW:1.75, cabinH:0.72, cabinL:2.8, cabinZ:-0.3,
        wingH:1.52, wingW:1.9, wheelY:0.40, wheelBase:1.70,
        diffH:0.12, splitterH:0.05, neonW:1.7,
      };
      case 'gt': return { // Mercedes-AMG GT
        bodyW:1.92, bodyH:0.48, bodyL:4.7, sillW:2.02, sillH:0.22,
        cabinW:1.55, cabinH:0.42, cabinL:1.9, cabinZ:-0.15,
        wingH:1.02, wingW:1.96, wheelY:0.33, wheelBase:1.38,
        diffH:0.13, splitterH:0.07, neonW:1.65,
      };
      case 'gran': return { // Bentley Continental GT
        bodyW:1.96, bodyH:0.55, bodyL:5.0, sillW:2.06, sillH:0.24,
        cabinW:1.68, cabinH:0.52, cabinL:2.3, cabinZ:-0.25,
        wingH:1.12, wingW:2.0, wheelY:0.36, wheelBase:1.55,
        diffH:0.12, splitterH:0.06, neonW:1.68,
      };
      default: return { // Generic sports car
        bodyW:1.82, bodyH:0.52, bodyL:4.6, sillW:2.0, sillH:0.22,
        cabinW:1.5, cabinH:0.44, cabinL:2.1, cabinZ:-0.1,
        wingH:1.05, wingW:1.85, wheelY:0.34, wheelBase:1.28,
        diffH:0.10, splitterH:0.06, neonW:1.55,
      };
    }
  }, [profile]);

  const suspY = useRef(0);
  useFrame(() => { suspY.current = Math.sin(Date.now() * 0.003) * (speed > 5 ? 0.012 : 0); });

  const bodyY  = dims.bodyH / 2 + dims.wheelY - 0.05 + suspY.current;
  const sillY  = dims.sillH / 2 + dims.wheelY - 0.18;
  const cabinY = bodyY + dims.bodyH / 2 + dims.cabinH / 2 - 0.04;

  return (
    <group>
      {/* Main body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[dims.bodyW, dims.bodyH, dims.bodyL]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Side livery panels – show the real car photo as a texture */}
      {texture && [-1, 1].map((side) => (
        <mesh key={side} position={[side * (dims.bodyW / 2 + 0.002), bodyY, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <planeGeometry args={[dims.bodyL * 0.72, dims.bodyH * 1.2]} />
          <meshStandardMaterial map={texture} transparent alphaTest={0.05} metalness={0.3} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Hood top – also shows image */}
      {texture && (
        <mesh position={[0, bodyY + dims.bodyH / 2 + 0.003, dims.bodyL * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[dims.bodyW * 0.86, dims.bodyL * 0.52]} />
          <meshStandardMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Sill */}
      <mesh position={[0, sillY, 0]} castShadow>
        <boxGeometry args={[dims.sillW, dims.sillH, dims.bodyL * 0.88]} />
        <meshStandardMaterial color={color} metalness={0.78} roughness={0.2} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, cabinY, dims.cabinZ]} castShadow>
        <boxGeometry args={[dims.cabinW, dims.cabinH, dims.cabinL]} />
        <meshStandardMaterial color="#050507" metalness={0.95} roughness={0.05} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, cabinY - 0.02, dims.cabinZ + dims.cabinL / 2 + 0.01]}>
        <boxGeometry args={[dims.cabinW - 0.08, dims.cabinH - 0.06, 0.04]} />
        <meshStandardMaterial color="#0a1825" transparent opacity={0.55} roughness={0} />
      </mesh>

      {/* Front splitter / F1 Front Wing */}
      <mesh position={[0, dims.wheelY - (profile === 'f1' ? 0.22 : 0.08), dims.bodyL / 2 + (profile === 'f1' ? 0.4 : 0.14)]} castShadow>
        <boxGeometry args={[dims.bodyW + (profile === 'f1' ? 1.2 : 0.1), profile === 'f1' ? 0.04 : dims.splitterH, profile === 'f1' ? 0.5 : 0.28]} />
        <meshStandardMaterial color="#080808" roughness={0.75} />
      </mesh>

      {/* Rear diffuser / F1 Sidepods */}
      {profile === 'f1' ? (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.7, dims.wheelY - 0.12, 0]} castShadow>
              <boxGeometry args={[0.6, 0.4, 2.8]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Halo */}
          <mesh position={[0, cabinY + 0.1, dims.cabinZ + 0.2]}>
            <torusGeometry args={[0.3, 0.04, 16, 32, Math.PI]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </>
      ) : (
        <mesh position={[0, dims.wheelY - 0.05, -(dims.bodyL / 2 + 0.12)]} castShadow>
          <boxGeometry args={[dims.bodyW + 0.06, dims.diffH, 0.32]} />
          <meshStandardMaterial color="#080808" roughness={0.75} />
        </mesh>
      )}

      {/* Rear wing */}
      <mesh position={[0, dims.wingH, -(dims.bodyL / 2 - (profile === 'f1' ? 0.4 : 0.12))]} castShadow>
        <boxGeometry args={[dims.wingW, profile === 'f1' ? 0.04 : 0.07, 0.44]} />
        <meshStandardMaterial color={profile === 'f1' ? color : "#111"} metalness={0.7} roughness={0.28} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (dims.wingW / 2), dims.wingH - 0.1, -(dims.bodyL / 2 - (profile === 'f1' ? 0.4 : 0.12))]} rotation={[0,0,0]}>
          <boxGeometry args={[0.06, profile === 'f1' ? 0.4 : 0.24, 0.5]} />
          <meshStandardMaterial color="#111" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Exhausts - F1 central exhaust */}
      {profile === 'f1' ? (
        <mesh position={[0, dims.wheelY + 0.1, -(dims.bodyL / 2 - 0.2)]} rotation={[Math.PI/2,0,0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.3, 12]} />
          <meshStandardMaterial color="#2a2a2a" metalness={1} />
        </mesh>
      ) : (
        (profile === 'supercar' ? [-0.55,-0.25,0.25,0.55] : [-0.38,0.38]).map((x) => (
          <mesh key={x} position={[x, dims.wheelY - 0.04, -(dims.bodyL / 2 + 0.1)]} rotation={[Math.PI/2,0,0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.16, 10]} />
            <meshStandardMaterial color="#2a2a2a" metalness={1} roughness={0.08} />
          </mesh>
        ))
      )}

      {/* Neon underglow */}
      <mesh position={[0, dims.wheelY - 0.28, 0]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[dims.neonW, dims.bodyL * 0.88]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.4} />
      </mesh>

      {/* Wheels */}
      <Wheel position={[-(dims.bodyW/2+0.01), dims.wheelY, dims.wheelBase]} speed={speed} />
      <Wheel position={[ (dims.bodyW/2+0.01), dims.wheelY, dims.wheelBase]} speed={speed} />
      <Wheel position={[-(dims.bodyW/2+0.01), dims.wheelY,-dims.wheelBase]} speed={speed} />
      <Wheel position={[ (dims.bodyW/2+0.01), dims.wheelY,-dims.wheelBase]} speed={speed} />

      {/* Headlights */}
      {isPlayer && (
        <>
          <spotLight position={[-0.55, 0.55, dims.bodyL/2]} target-position={[-0.55, 0, dims.bodyL/2 + 80]}
            intensity={400} angle={0.45} penumbra={0.6} color="#e8f4ff" castShadow distance={250} />
          <spotLight position={[ 0.55, 0.55, dims.bodyL/2]} target-position={[ 0.55, 0, dims.bodyL/2 + 80]}
            intensity={400} angle={0.45} penumbra={0.6} color="#e8f4ff" castShadow distance={250} />
          {/* Headlight lens glow */}
          {[-0.55, 0.55].map((x) => (
            <mesh key={x} position={[x, 0.55, dims.bodyL/2 - 0.04]}>
              <circleGeometry args={[0.09, 16]} />
              <meshBasicMaterial color="#e8f4ff" />
              <pointLight color="#e8f4ff" intensity={0.4} distance={8} />
            </mesh>
          ))}
        </>
      )}
      {/* Brakelights */}
      {[-0.65, 0.65].map((x) => (
        <group key={x} position={[x, 0.6, -(dims.bodyL / 2 + 0.02)]}>
          <mesh><boxGeometry args={[0.22, 0.08, 0.04]} />
            <meshBasicMaterial color={isBraking ? '#ff1111' : '#3a0000'} />
          </mesh>
          <pointLight color="#ff1111" intensity={isBraking ? 15 : 0.5} distance={isBraking ? 20 : 3} />
        </group>
      ))}
    </group>
  );
};

// ── Player Car ────────────────────────────────────────────────────────────────
const PlayerCar = ({ controls, setSpeed, setDistance, setGear, setRpm, setFinished, setChromatic, setBraking, setNitro, playerImg, carColor, raceStarted }) => {
  const meshRef   = useRef();
  const vel       = useRef(0);
  const posX      = useRef(0);
  const posZ      = useRef(10);         // spawn slightly ahead so camera starts behind car
  const steer     = useRef(0);
  const nitroFuel = useRef(NITRO_MAX);
  const finished  = useRef(false);
  const speedDisplay = useRef(0);
  const raceStartedRef = useRef(false); // avoid stale closure

  useEffect(() => { raceStartedRef.current = raceStarted; }, [raceStarted]);

  // Camera spring state — initialised behind the spawn position
  const camPos  = useRef(new THREE.Vector3(0, 4.5, -3));
  const camLook = useRef(new THREE.Vector3(0, 1.5, 30));
  const camFov  = useRef(80);

  useFrame((state, delta) => {
    if (!raceStartedRef.current || finished.current) return;
    const dt = Math.min(delta, 0.033);

    if (posZ.current >= TRACK_LENGTH) {
      finished.current = true;
      setFinished(true);
      return;
    }

    // Nitro
    const useNitro = controls.current.nitro && nitroFuel.current > 0;
    if (useNitro)      nitroFuel.current = Math.max(0, nitroFuel.current - 40 * dt);
    else if (!controls.current.nitro) nitroFuel.current = Math.min(NITRO_MAX, nitroFuel.current + 14 * dt);
    setNitro(nitroFuel.current);

    // Forces
    const force   = controls.current.forward ? (useNitro ? PHYSICS.nitroForce : PHYSICS.engineForce) : 0;
    const brakeF  = controls.current.backward ? PHYSICS.brakeForce : 0;
    const drag    = PHYSICS.dragCoeff * vel.current * Math.abs(vel.current);
    const rolling = PHYSICS.rollingResist * vel.current * PHYSICS.mass * 9.81;
    let accel     = (force - brakeF * Math.sign(vel.current) - drag - rolling) / PHYSICS.mass;

    if (vel.current < -5 && accel < 0) accel = 0;
    vel.current = Math.max(-8, Math.min(PHYSICS.maxSpeed, vel.current + accel * dt));
    if (!controls.current.forward && !controls.current.backward && Math.abs(vel.current) < 0.3) vel.current = 0;

    const kmh = vel.current * 3.6;
    setBraking(controls.current.backward && vel.current > 2);
    setSpeed(kmh);
    speedDisplay.current = vel.current;

    // Gear
    const absVel = Math.abs(vel.current);
    let gear = 1;
    for (let g = 1; g < PHYSICS.gears.length; g++) {
      if (absVel >= PHYSICS.gears[g]) gear = g;
    }
    setGear(gear);
    const gearLow  = PHYSICS.gears[gear]  || 0;
    const gearHigh = PHYSICS.gears[gear+1] || PHYSICS.maxSpeed;
    const rpm = 1000 + ((absVel - gearLow) / Math.max(gearHigh - gearLow, 1)) * 7000;
    setRpm(Math.min(8000, Math.max(800, rpm)));

    // Steering
    const steerMax = PHYSICS.maxSteer * (1 - 0.6 * (absVel / PHYSICS.maxSpeed));
    const steerTarget = controls.current.left ? steerMax : controls.current.right ? -steerMax : 0;
    steer.current += (steerTarget - steer.current) * 0.18;
    posX.current += steer.current * vel.current * dt * PHYSICS.wheelBase * 10;
    posX.current = Math.max(-(ROAD_WIDTH/2 - 1.6), Math.min(ROAD_WIDTH/2 - 1.6, posX.current));

    posZ.current += vel.current * dt;
    setDistance(posZ.current);

    // Move the actual mesh so camera can follow it
    if (meshRef.current) {
      meshRef.current.position.x = posX.current;
      meshRef.current.position.z = posZ.current; // ← KEY FIX: advance mesh along track
      // Direct assignment with lerp to avoid accumulation issues
      const targetRotY = steer.current * 2.5;
      const targetRotZ = -steer.current * 1.2;
      const targetRotX = controls.current.backward ? -0.04 : useNitro ? 0.05 : 0;

      meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * dt * 10;
      meshRef.current.rotation.z += (targetRotZ - meshRef.current.rotation.z) * dt * 12;
      meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * dt * 8;
    }

    // Spring camera follows the mesh
    const fovTarget  = useNitro ? 115 : 78 + absVel * 0.16;
    const camZOffset = useNitro ? -22 : -11 - absVel * 0.035;
    camFov.current  += (fovTarget - camFov.current) * dt * 5;

    const mz = meshRef.current ? meshRef.current.position.z : posZ.current;
    const targetPos  = new THREE.Vector3(posX.current * 0.5, 3.6, mz + camZOffset);
    const shake      = useNitro ? (Math.random()-0.5)*0.12 : absVel > 60 ? (Math.random()-0.5)*0.04 : 0;
    targetPos.y     += shake;
    camPos.current.lerp(targetPos, dt * 8);

    const targetLook = new THREE.Vector3(posX.current * 0.3, 1.4, mz + 30);
    camLook.current.lerp(targetLook, dt * 8);

    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camLook.current);
    
    // Explicitly set the up vector before/around adjustments if needed 
    // but usually lookAt handles it. The manual rotation.z was the likely flipper.
    // Instead of raw assignment, we use rotateZ which is relative to the camera's current view axis.
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

// ── AI Opponents ──────────────────────────────────────────────────────────────
const AICars = ({ playerDistance, raceStarted, onUpdate }) => {
  const opponents = useRef(
    AI_NAMES.map((name, i) => ({
      name, i,
      x:     ((i % 3) - 1) * 6.5,
      z:     30 + i * 20,
      vel:   0,
      baseSpeed: 52 + i * 2.2 + Math.random() * 6, // m/s
      color: AI_COLORS[i % AI_COLORS.length],
      imgUrl: AI_IMAGES[i % AI_IMAGES.length],
      finished: false,
    }))
  );
  const refs = useRef([]);

  useFrame((_, delta) => {
    if (!raceStarted) return;
    const dt = Math.min(delta, 0.033);
    const pd = playerDistance;

    const data = opponents.current.map((ai, i) => {
      if (!ai.finished) {
        // Rubber-band: if too far ahead of player slow down, if far behind speed up
        const gap = ai.z - pd;
        const band = gap > 400 ? 0.72 : gap < -300 ? 1.35 : 1.0;
        // Slight weave
        ai.x += Math.sin(Date.now() * 0.0006 + i * 1.8) * 0.04;
        ai.x  = Math.max(-(ROAD_WIDTH/2-1.6), Math.min(ROAD_WIDTH/2-1.6, ai.x));

        ai.vel = Math.min(ai.baseSpeed * band, ai.vel + 18 * dt);
        ai.z  += ai.vel * dt;
        if (ai.z >= TRACK_LENGTH) ai.finished = true;
      }

      if (refs.current[i]) {
        const near = Math.abs(ai.z - pd) < 900;
        refs.current[i].visible = near;
        if (near) refs.current[i].position.set(ai.x, 0, ai.z);
      }
      return { name: ai.name, z: ai.z };
    });

    onUpdate(data);
  });

  return (
    <>
      {opponents.current.map((ai, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} visible={false}>
          <CarBody color={ai.color} imgUrl={ai.imgUrl} isPlayer={false} isBraking={false} speed={ai.vel} />
        </group>
      ))}
    </>
  );
};

// ── Skid Mark ─────────────────────────────────────────────────────────────────
const SkidMarks = ({ isBraking, playerDistance }) => {
  // Simple stationary decal strips to simulate skids already on road
  const marks = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      x: (Math.random() - 0.5) * (ROAD_WIDTH - 4),
      z: 200 + i * (TRACK_LENGTH / 30) + Math.random() * 50,
      len: 10 + Math.random() * 40,
      offset: (Math.random() - 0.5) * 0.8,
    })), []
  );
  return (
    <group>
      {marks.map((m, i) => (
        <mesh key={i} position={[m.x, 0.03, m.z]} rotation={[-Math.PI/2, 0, Math.random() * 0.3 - 0.15]}>
          <planeGeometry args={[0.18 + m.offset * 0.1, m.len]} />
          <meshStandardMaterial color="#050505" transparent opacity={0.45} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

// ── Tokyo Environment ─────────────────────────────────────────────────────────
const TokyoTrack = ({ playerDistance }) => {
  const SEG   = 100;
  const COUNT = 50;
  const LOOP  = SEG * COUNT;
  const refs  = useRef([]);

  useFrame(() => {
    refs.current.forEach((ref, i) => {
      if (!ref) return;
      const base   = i * SEG;
      const delta  = ((base - (playerDistance - 250)) % LOOP + LOOP) % LOOP;
      ref.position.z = playerDistance - 250 + delta;
    });
  });

  return (
    <group>
      {/* ── Road Surface ── */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, TRACK_LENGTH/2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH + 2, TRACK_LENGTH + 600]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.72} metalness={0.28} />
      </mesh>

      {/* Kerbs / painted edges */}
      {[-13.5, 13.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI/2, 0, 0]} position={[x, 0.01, TRACK_LENGTH/2]}>
          <planeGeometry args={[0.8, TRACK_LENGTH + 600]} />
          <meshStandardMaterial color={x < 0 ? '#cc2200' : '#ccaa00'} roughness={0.9} />
        </mesh>
      ))}

      {/* Finish line */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, TRACK_LENGTH]}>
        <planeGeometry args={[ROAD_WIDTH, 5]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>

      {/* Skid marks (static) */}
      <SkidMarks playerDistance={playerDistance} />

      {/* ── Repeating Segments ── */}
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>

          {/* Lane markings */}
          {[-6, 0, 6].map((x) => (
            <mesh key={x} position={[x, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[0.22, 16]} />
              <meshStandardMaterial color="#888" roughness={1} />
            </mesh>
          ))}

          {/* Guardrails — both sides, H-beam style */}
          {[-13.8, 13.8].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.6, 0]}>
                <boxGeometry args={[0.28, 1.0, 100]} />
                <meshStandardMaterial color="#1e1e1e" metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Posts */}
              {[-40, -20, 0, 20, 40].map((z) => (
                <mesh key={z} position={[x, 0.6, z]}>
                  <boxGeometry args={[0.15, 1.2, 0.15]} />
                  <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Streetlights — both sides alternating */}
          {[{ x: -15, dir: 1 }, { x: 15, dir: -1 }].map(({ x, dir }) => (
            i % 2 === (x < 0 ? 0 : 1) && (
              <group key={x} position={[x, 0, 0]}>
                {/* Pole */}
                <mesh position={[0, 5.5, 0]}>
                  <cylinderGeometry args={[0.12, 0.18, 11, 8]} />
                  <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* Arm */}
                <mesh position={[dir * 2.5, 11.5, 0]} rotation={[0, 0, Math.PI/2]}>
                  <cylinderGeometry args={[0.07, 0.07, 5.2, 6]} />
                  <meshStandardMaterial color="#222" metalness={0.9} />
                </mesh>
                {/* Light fixtures */}
                <mesh position={[dir * 5.1, 11.4, 0]}>
                  <boxGeometry args={[1.6, 0.2, 0.5]} />
                  <meshStandardMaterial color="#fff" emissive="#ffeebb" emissiveIntensity={18} />
                  <pointLight color="#ffdda0" intensity={4} distance={90} decay={2} />
                </mesh>
              </group>
            )
          ))}

          {/* Buildings LEFT — varied widths/heights */}
          {i % 2 === 0 && (
            <group position={[-28 - (i % 4) * 5, 0, 0]}>
              {[
                { y: 50, w: 20, d: 55, c: '#020204', ec: '#00e5ff', ex: 10.1 },
                { y: 30, w: 14, d: 40, c: '#030305', ec: '#ff0088', ex: -7.1, offset: -25 },
              ].map((b, bi) => (
                <group key={bi} position={[b.offset || 0, b.y, 0]}>
                  <mesh><boxGeometry args={[b.w, b.y * 2, b.d]} /><meshStandardMaterial color={b.c} roughness={0.95} /></mesh>
                  {/* Neon strip */}
                  <mesh position={[b.ex, 0, 0]}>
                    <planeGeometry args={[0.5, b.y * 1.8]} />
                    <meshStandardMaterial color={b.ec} emissive={b.ec} emissiveIntensity={6} side={THREE.DoubleSide} />
                  </mesh>
                  {/* Window rows */}
                  {Array.from({ length: 6 }, (_, row) =>
                    Array.from({ length: 3 }, (_, col) => (
                      <mesh key={`${row}-${col}`} position={[b.ex * 0.85, -b.y * 0.6 + row * (b.y * 0.24), -b.d * 0.3 + col * (b.d * 0.3)]}>
                        <planeGeometry args={[0.3, (b.y * 0.12)]} />
                        <meshStandardMaterial color="#ffff88" emissive="#ffff88" emissiveIntensity={Math.random() > 0.4 ? 1.5 : 0.1} />
                      </mesh>
                    ))
                  )}
                </group>
              ))}
            </group>
          )}

          {/* Buildings RIGHT */}
          {i % 3 === 0 && (
            <group position={[30 + (i % 5) * 4, 65, 0]}>
              <mesh><boxGeometry args={[26, 130, 60]} /><meshStandardMaterial color="#010103" roughness={0.95} /></mesh>
              <mesh position={[-13.1, 15, 0]}>
                <planeGeometry args={[2.5, 50]} />
                <meshStandardMaterial color="#ff0044" emissive="#ff0044" emissiveIntensity={10} side={THREE.DoubleSide} />
              </mesh>
              {/* Rooftop ad billboard */}
              <mesh position={[0, 65.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <planeGeometry args={[24, 56]} />
                <meshStandardMaterial color="#001122" emissive="#003366" emissiveIntensity={0.5} />
              </mesh>
            </group>
          )}

          {/* Overhead expressway signage */}
          {i % 8 === 0 && (
            <group position={[0, 8.5, 0]}>
              <mesh>
                <boxGeometry args={[ROAD_WIDTH + 2, 0.4, 0.5]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, -1.5, 0.3]}>
                <boxGeometry args={[10, 2.5, 0.1]} />
                <meshStandardMaterial color="#004488" emissive="#0066bb" emissiveIntensity={0.8} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

// ── Nevada Desert Track ───────────────────────────────────────────────────────
const NevadaTrack = ({ playerDistance }) => {
  const SEG   = 100;
  const COUNT = 50;
  const LOOP  = SEG * COUNT;
  const refs  = useRef([]);

  // Deterministic pseudo-random seeded per segment
  const rng = (seed) => { let x = Math.sin(seed) * 43758.5453; return x - Math.floor(x); };

  useFrame(() => {
    refs.current.forEach((ref, i) => {
      if (!ref) return;
      const base  = i * SEG;
      const delta = ((base - (playerDistance - 250)) % LOOP + LOOP) % LOOP;
      ref.position.z = playerDistance - 250 + delta;
    });
  });

  return (
    <group>
      <Sky sunPosition={[150, 45, 50]} turbidity={3} rayleigh={0.4} mieCoefficient={0.005} mieDirectionalG={0.8} />
      {/* Vast desert floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, TRACK_LENGTH/2]} receiveShadow>
        <planeGeometry args={[600, TRACK_LENGTH + 1000]} />
        <meshStandardMaterial color="#c06828" roughness={1} />
      </mesh>
      {/* Asphalt road */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, TRACK_LENGTH/2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, TRACK_LENGTH + 600]} />
        <meshStandardMaterial color="#181818" roughness={0.85} />
      </mesh>
      {/* Cracked road overlay */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, TRACK_LENGTH/2]}>
        <planeGeometry args={[ROAD_WIDTH - 2, TRACK_LENGTH + 600]} />
        <meshStandardMaterial color="#1e1a10" roughness={1} transparent opacity={0.35} />
      </mesh>
      {/* Red/white kerbs */}
      {[-13.5, 13.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI/2, 0, 0]} position={[x, 0.01, TRACK_LENGTH/2]}>
          <planeGeometry args={[0.9, TRACK_LENGTH + 600]} />
          <meshStandardMaterial color={x < 0 ? '#cc3300' : '#ddaa00'} roughness={0.9} />
        </mesh>
      ))}
      {/* Finish line */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, TRACK_LENGTH]}>
        <planeGeometry args={[ROAD_WIDTH, 5]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>
      {/* Distant mesa silhouettes */}
      {[-180, -120, 120, 180].map((x, mi) => (
        <mesh key={mi} position={[x, 35 + mi * 8, TRACK_LENGTH * 0.5]} castShadow>
          <boxGeometry args={[60 + mi * 20, 70 + mi * 16, 80]} />
          <meshStandardMaterial color="#7a3a10" roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* Centre dashes */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.28, 16]} />
            <meshStandardMaterial color="#cc9900" roughness={1} />
          </mesh>
          {/* Road shoulders – loose gravel */}
          {[-14.5, 14.5].map((x) => (
            <mesh key={x} position={[x, -0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[3, SEG]} />
              <meshStandardMaterial color="#b05020" roughness={1} />
            </mesh>
          ))}
          {/* Cacti (3-arm) */}
          {[-(18 + rng(i*7)*10), (18 + rng(i*13)*10)].map((x, ci) => (
            <group key={ci} position={[x, 0, (rng(i*3+ci)-0.5)*60]}>
              {/* Main trunk */}
              <mesh position={[0, 3.5, 0]} castShadow>
                <cylinderGeometry args={[0.35, 0.45, 7, 7]} />
                <meshStandardMaterial color="#2d5a1b" roughness={1} />
              </mesh>
              {/* Left arm */}
              <mesh position={[-1.2, 4.5, 0]} rotation={[0, 0, Math.PI/3]} castShadow>
                <cylinderGeometry args={[0.22, 0.28, 3.5, 6]} />
                <meshStandardMaterial color="#2d5a1b" roughness={1} />
              </mesh>
              {/* Right arm */}
              <mesh position={[1.2, 5.5, 0]} rotation={[0, 0, -Math.PI/3.5]} castShadow>
                <cylinderGeometry args={[0.22, 0.28, 4, 6]} />
                <meshStandardMaterial color="#2d5a1b" roughness={1} />
              </mesh>
            </group>
          ))}
          {/* Sandstone boulders */}
          {i % 3 === 0 && [-(24 + rng(i)*8), (25 + rng(i+5)*8)].map((x, bi) => (
            <mesh key={bi} position={[x, 1.5 + rng(i+bi)*2, (rng(i*bi+2)-0.5)*80]} castShadow>
              <dodecahedronGeometry args={[2.5 + rng(i+bi*3)*2, 0]} />
              <meshStandardMaterial color="#9a5a28" roughness={1} />
            </mesh>
          ))}
          {/* Heat shimmer – faint emissive plane near road */}
          {i % 5 === 0 && (
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[ROAD_WIDTH - 4, 25]} />
              <meshStandardMaterial color="#ff8800" transparent opacity={0.04} emissive="#ff6600" emissiveIntensity={0.3} />
            </mesh>
          )}
          {/* Telegraph poles */}
          {i % 4 === 0 && [-16, 16].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 4.5, 0]}>
                <cylinderGeometry args={[0.1, 0.15, 9, 6]} />
                <meshStandardMaterial color="#5a3a1a" roughness={1} />
              </mesh>
              {/* Cross-arm */}
              <mesh position={[0, 8.8, 0]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.06, 0.06, 4, 5]} />
                <meshStandardMaterial color="#5a3a1a" roughness={1} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};

// ── Alpine Track ──────────────────────────────────────────────────────────────
const AlpineTrack = ({ playerDistance }) => {
  const SEG   = 100;
  const COUNT = 50;
  const LOOP  = SEG * COUNT;
  const refs  = useRef([]);

  const rng = (seed) => { let x = Math.sin(seed + 1) * 91741.3251; return x - Math.floor(x); };

  useFrame(() => {
    refs.current.forEach((ref, i) => {
      if (!ref) return;
      const base  = i * SEG;
      const delta = ((base - (playerDistance - 250)) % LOOP + LOOP) % LOOP;
      ref.position.z = playerDistance - 250 + delta;
    });
  });

  return (
    <group>
      <Sky sunPosition={[30, 15, -80]} turbidity={0.6} rayleigh={0.15} mieCoefficient={0.002} />
      <fog attach="fog" args={['#afc8e0', 40, 420]} />
      {/* Snow-covered terrain */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, TRACK_LENGTH/2]} receiveShadow>
        <planeGeometry args={[500, TRACK_LENGTH + 1000]} />
        <meshStandardMaterial color="#ddeeff" roughness={0.98} metalness={0.05} />
      </mesh>
      {/* Dark wet asphalt (some snow accumulation) */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, TRACK_LENGTH/2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, TRACK_LENGTH + 600]} />
        <meshStandardMaterial color="#1c1c22" roughness={0.88} />
      </mesh>
      {/* Icy patches on road */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, TRACK_LENGTH * 0.4]}>
        <planeGeometry args={[ROAD_WIDTH - 6, 80]} />
        <meshStandardMaterial color="#99bbdd" roughness={0.05} metalness={0.1} transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[3, 0.01, TRACK_LENGTH * 0.75]}>
        <planeGeometry args={[ROAD_WIDTH - 8, 60]} />
        <meshStandardMaterial color="#99bbdd" roughness={0.05} metalness={0.1} transparent opacity={0.3} />
      </mesh>
      {/* Snow banks on road shoulders */}
      {[-14, 14].map((x) => (
        <mesh key={x} position={[x, 0.4, TRACK_LENGTH/2]} receiveShadow>
          <boxGeometry args={[1.2, 0.8, TRACK_LENGTH + 200]} />
          <meshStandardMaterial color="#e8f4ff" roughness={0.95} />
        </mesh>
      ))}
      {/* White/yellow kerbs under snow */}
      {[-13.5, 13.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI/2, 0, 0]} position={[x, 0.01, TRACK_LENGTH/2]}>
          <planeGeometry args={[0.7, TRACK_LENGTH + 600]} />
          <meshStandardMaterial color={x < 0 ? '#cc2200' : '#ccaa00'} roughness={0.95} />
        </mesh>
      ))}
      {/* Finish line */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, TRACK_LENGTH]}>
        <planeGeometry args={[ROAD_WIDTH, 5]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>
      {/* Distant snowy peaks */}
      {[-200, -130, 130, 200].map((x, pi) => (
        <mesh key={pi} position={[x, 80 + pi * 15, TRACK_LENGTH * 0.5]} castShadow>
          <coneGeometry args={[50 + pi * 10, 160 + pi * 20, 5]} />
          <meshStandardMaterial color="#e2eeff" roughness={0.98} />
        </mesh>
      ))}
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* Centre dash (often snow-covered — faint white) */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.28, 14]} />
            <meshStandardMaterial color="#aaaaaa" roughness={1} />
          </mesh>
          {/* Pine trees — layered canopy */}
          {[-(20 + rng(i*5)*8), (20 + rng(i*9)*8)].map((x, ti) => (
            <group key={ti} position={[x, 0, (rng(i*2+ti)-0.5)*70]} castShadow>
              {/* Trunk */}
              <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.28, 0.42, 4, 7]} />
                <meshStandardMaterial color="#2e1a0a" roughness={1} />
              </mesh>
              {/* Lower canopy */}
              <mesh position={[0, 5.5, 0]}>
                <coneGeometry args={[3.2, 6, 7]} />
                <meshStandardMaterial color="#112e11" roughness={1} />
              </mesh>
              {/* Mid canopy */}
              <mesh position={[0, 8, 0]}>
                <coneGeometry args={[2.2, 5, 7]} />
                <meshStandardMaterial color="#163816" roughness={1} />
              </mesh>
              {/* Top canopy */}
              <mesh position={[0, 10, 0]}>
                <coneGeometry args={[1.2, 3.5, 7]} />
                <meshStandardMaterial color="#1a421a" roughness={1} />
              </mesh>
              {/* Snow on top */}
              <mesh position={[0, 11.5, 0]}>
                <sphereGeometry args={[0.9, 6, 4]} />
                <meshStandardMaterial color="#e8f4ff" roughness={0.95} />
              </mesh>
            </group>
          ))}
          {/* Snowdrift mounds beside road */}
          {i % 2 === 0 && [-(16 + rng(i)*4), (16 + rng(i+1)*4)].map((x, di) => (
            <mesh key={di} position={[x, 0.5, (rng(i*di+4)-0.5)*50]}>
              <sphereGeometry args={[2 + rng(i+di*5)*1.5, 7, 4]} />
              <meshStandardMaterial color="#d8ecff" roughness={0.97} />
            </mesh>
          ))}
          {/* Safety barriers — red/white striped crash barriers */}
          {i % 3 === 0 && [-14.5, 14.5].map((x) => (
            <group key={x} position={[x, 0.4, 0]}>
              <mesh>
                <boxGeometry args={[0.5, 0.8, 60]} />
                <meshStandardMaterial color="#cc2200" roughness={0.7} />
              </mesh>
            </group>
          ))}
          {/* Snowfall particle plane (very faint drifting white specks) */}
          {i % 6 === 0 && (
            <mesh position={[0, 12, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[80, 80]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.018} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

// ── HUD ───────────────────────────────────────────────────────────────────────
const HUD = ({ speed, distance, isFinished, isBraking, navigate, nitro, elapsedTime, countdown, position, aiPositions, playerDistance, gear, rpm, playerName, racePoints, addRacePoints, addPrizeMoney }) => {
  const progress     = Math.min((distance / TRACK_LENGTH) * 100, 100);
  const kmh = Math.abs(Math.round(speed));

  const fmt = (t) => {
    const m  = Math.floor(t / 60);
    const s  = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
  };

  const ordinal = (n) => {
    const s = ['TH','ST','ND','RD'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const standings = [{ name: playerName || 'YOU', z: playerDistance, isPlayer: true }, ...(aiPositions||[])].sort((a,b)=>b.z-a.z);

  // Award points exactly once when race finishes
  const pointsAwarded = useRef(false);
  useEffect(() => {
    if (isFinished && !pointsAwarded.current) {
      pointsAwarded.current = true;
      addRacePoints(position);
      addPrizeMoney(PRIZE_MONEY);
    }
  }, [isFinished]);
  const rpmPct    = Math.min(100, ((rpm - 800) / 7200) * 100);
  const rpmDanger = rpm > 7000;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none">

      {/* ── COUNTDOWN ── */}
      {countdown > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="text-[9px] text-gray-400 font-bold tracking-[0.4em] mb-4">RACE STARTS IN</div>
          <div className={`font-black italic leading-none transition-all duration-300 ${countdown === 1 ? 'text-[130px] text-green-400 drop-shadow-[0_0_40px_rgba(0,255,0,0.9)]' : 'text-[120px] text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]'}`}>
            {countdown === 1 ? 'GO!' : countdown - 1}
          </div>
          <div className="mt-8 text-[10px] text-gray-500 font-bold tracking-widest">W/↑ GAS · S/↓ BRAKE · A/D STEER · SPACE NITRO</div>
        </div>
      )}

      {/* ── TOP LEFT: Timer + Progress ── */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/75 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl min-w-[220px]">
          <div className="text-[8px] text-cyan-400 font-bold tracking-[0.3em] mb-1">RACE TIME</div>
          <div className="text-3xl font-black text-white font-mono tracking-wider mb-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{fmt(elapsedTime)}</div>
          <div className="text-[8px] text-gray-400 font-bold tracking-[0.2em] mb-1 flex justify-between"><span>TRACK</span><span>{Math.floor(progress)}%</span></div>
          <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-700 to-cyan-300 transition-all duration-100 shadow-[0_0_8px_cyan]" style={{ width:`${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── TOP RIGHT: Standings ── */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/75 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xl min-w-[160px]">
          <div className="text-[8px] text-gray-400 font-bold tracking-[0.3em] mb-2">RACE STANDINGS</div>
          {standings.slice(0, 8).map((r, idx) => (
            <div key={r.name} className={`flex justify-between items-center text-[11px] font-bold py-[2px] border-b border-white/5 last:border-0 ${r.isPlayer ? 'text-cyan-300' : 'text-gray-400'}`}>
              <span className="text-gray-600 w-5">{idx + 1}.</span>
              <span className={`flex-1 ml-1 truncate ${r.isPlayer ? 'font-black' : ''}`}>{r.name}</span>
              {r.isPlayer && <span className="text-cyan-400 text-[9px] ml-1">◀</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER TOP: Position badge ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className={`bg-black/80 backdrop-blur rounded-2xl px-6 py-3 border shadow-xl text-center transition-all ${position === 1 ? 'border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>
          <div className="text-[8px] text-gray-500 font-bold tracking-widest">POSITION</div>
          <div className={`text-4xl font-black leading-tight ${position === 1 ? 'text-yellow-400' : position <= 3 ? 'text-cyan-300' : 'text-white'}`}>
            {ordinal(position)}
          </div>
          <div className="text-[9px] text-gray-500 font-bold tracking-widest">of 12</div>
        </div>
      </div>

      {/* ── BOTTOM: Full dashboard ── */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">

        {/* Controls */}
        <div className="bg-black/60 backdrop-blur rounded-xl px-4 py-2 border border-white/10">
          <div className="text-[8px] text-gray-500 font-bold tracking-widest mb-1">CONTROLS</div>
          <div className="flex gap-3 text-[10px] font-black text-white">
            <span><span className="text-cyan-400">W/↑</span> GAS</span>
            <span><span className="text-red-400">S/↓</span> BRAKE</span>
            <span><span className="text-amber-400">A/D</span> STEER</span>
            <span><span className="text-green-400">SPACE</span> NITRO</span>
          </div>
        </div>

        {/* Full instrument cluster */}
        <div className="flex items-end gap-4">

          {/* RPM Bar */}
          <div className="bg-black/75 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-[8px] text-gray-400 font-bold tracking-widest mb-2 text-center">RPM</div>
            <div className="flex gap-[3px] items-end">
              {Array.from({ length: 20 }, (_, i) => {
                const pct = (i + 1) / 20 * 100;
                const lit = pct <= rpmPct;
                const danger = pct > 87;
                return (
                  <div key={i} className="w-[5px] rounded-sm transition-all duration-75"
                    style={{ height: 20 + i * 0.8, background: lit ? (danger ? '#ff2222' : i > 12 ? '#ffaa00' : '#00e5ff') : '#1a1a1a' }} />
                );
              })}
            </div>
            <div className="text-center text-[9px] text-gray-400 font-mono mt-1">{Math.round(rpm)} <span className="text-gray-600">RPM</span></div>
          </div>

          {/* Nitro bar */}
          <div className="bg-black/75 backdrop-blur rounded-xl p-3 border border-white/10 flex flex-col items-center gap-1">
            <div className="text-[8px] text-amber-400 font-black tracking-widest">NITRO</div>
            <div className="w-8 h-32 bg-gray-950 rounded-lg border border-amber-900/50 overflow-hidden relative">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-800 to-yellow-300 transition-all duration-100"
                style={{ height:`${nitro}%` }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[7px] font-black text-white/60">{Math.floor(nitro)}<br/>%</span>
              </div>
            </div>
          </div>

          {/* Speedometer + Gear */}
          <div className="relative">
            {/* Outer ring */}
            <div className={`w-36 h-36 rounded-full border-[5px] border-b-transparent rotate-[135deg] absolute inset-0 transition-colors duration-200 ${isBraking ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'}`} />
            <div className="w-36 h-36 rounded-full bg-black/80 border border-gray-800 backdrop-blur flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.9)] gap-0">
              <div className="text-[8px] text-gray-500 font-bold tracking-[0.1em]">KM/H</div>
              <div className="text-5xl font-black italic leading-none text-white">{kmh}</div>
              <div className="text-[9px] font-black text-cyan-400 tracking-widest">SPEED</div>
              <div className="mt-1 bg-amber-500 text-black font-black text-sm px-2 py-0.5 rounded">{gear}</div>
            </div>
          </div>

          {/* Gear name */}
          <div className="bg-black/75 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
            <div className="text-[8px] text-gray-500 font-bold tracking-widest mb-1">GEAR</div>
            <div className="text-4xl font-black text-white leading-none">{gear}</div>
            <div className="text-[8px] text-gray-500 mt-1 font-bold">
              {gear === 1 ? '1ST' : gear === 2 ? '2ND' : gear === 3 ? '3RD' : `${gear}TH`}
            </div>
          </div>
        </div>
      </div>

      {/* ── FINISH OVERLAY ── */}
      {isFinished && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
          <div className="text-center border border-white/10 px-14 py-12 rounded-3xl bg-black/70 shadow-[0_0_80px_rgba(6,182,212,0.1)] max-w-lg w-full mx-4">
            <div className="text-[9px] text-cyan-400 font-bold tracking-[0.4em] mb-1">RACE COMPLETE</div>
            <div className="text-[11px] text-white font-black tracking-widest mb-3">{playerName || 'ANON_RACER'}</div>
            <h1 className={`text-7xl font-black italic tracking-tighter mb-2 ${position===1?'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]':'text-white'}`}>
              {ordinal(position)}
            </h1>
            <div className="text-xl text-gray-400 font-bold mb-6">PLACE</div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />
            <div className="grid grid-cols-4 gap-3 mb-8 text-center">
              <div><div className="text-[9px] text-gray-500 tracking-widest mb-1">FINAL TIME</div><div className="text-white font-mono font-black text-lg">{fmt(elapsedTime)}</div></div>
              <div><div className="text-[9px] text-gray-500 tracking-widest mb-1">TOP SPEED</div><div className="text-cyan-400 font-black text-lg">{kmh} <span className="text-xs">KM/H</span></div></div>
              <div>
                <div className="text-[9px] text-gray-500 tracking-widest mb-1">
                  {position >= 9 ? 'REPAIR COST' : 'PRIZE + BONUS'}
                </div>
                <div className={`font-black text-lg ${position >= 9 ? 'text-red-500' : 'text-amber-400'}`}>
                  {position >= 9 ? '-$50,000' : `+$${(PRIZE_MONEY + (position <= 3 ? (4 - position) * 25000 : 0)).toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 tracking-widest mb-1">
                  {position >= 9 ? 'PENALTY' : 'PTS EARNED'}
                </div>
                <div className={`font-black text-lg ${position >= 9 ? 'text-red-600' : 'text-purple-400'}`}>
                  {position >= 9 ? '-15' : `+${([25,18,15,12,10,8,6,4,3,2,1,0][position-1] ?? 0) + (position <= 3 ? (4 - position) * 10 : 0)}`}
                </div>
              </div>
            </div>
            <div className="mb-5 text-[10px] text-gray-500 font-bold tracking-widest">
              TOTAL CHAMPIONSHIP POINTS: <span className="text-purple-300">{racePoints}</span>
            </div>
            <button
              onClick={() => navigate('/races')}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-black py-4 px-8 rounded-xl italic tracking-[0.2em] text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            >
              COLLECT & CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Root component ────────────────────────────────────────────────────────────
const ActiveRace = () => {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const mapType    = params.get('map') || 'tokyo';
  const playerImg  = params.get('img') || null;
  const carColor   = params.get('color') || '#00c8ff';

  // Store
  const playerName    = useStore((s) => s.playerName);
  const racePoints    = useStore((s) => s.racePoints);
  const addRacePoints = useStore((s) => s.addRacePoints);
  const addPrizeMoney = useStore((s) => s.addPrizeMoney);

  const controls = useKeyboard();

  const [speed,    setSpeed]    = useState(0);
  const [distance, setDistance] = useState(0);
  const [isFinished, setFinished] = useState(false);
  const [chromatic,  setChromatic] = useState(0);
  const [isBraking,  setBraking]   = useState(false);
  const [nitro,     setNitro]   = useState(NITRO_MAX);
  const [gear,      setGear]    = useState(1);
  const [rpm,       setRpm]     = useState(800);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdown,   setCountdown]   = useState(4);
  const [raceStarted, setRaceStarted] = useState(false);
  const [aiPositions, setAiPositions] = useState([]);
  const [position,    setPosition]    = useState(1);

  // Countdown sequence: 3 → 2 → 1 → GO! → Race
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => {
      const next = countdown - 1;
      setCountdown(next);
      if (next === 0) setRaceStarted(true);
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Race timer
  useEffect(() => {
    if (!raceStarted || isFinished) return;
    const id = setInterval(() => setElapsedTime((t) => parseFloat((t + 0.1).toFixed(1))), 100);
    return () => clearInterval(id);
  }, [raceStarted, isFinished]);

  const handleAiUpdate = (data) => {
    setAiPositions(data);
    const ahead = data.filter((d) => d.z > distance).length;
    setPosition(ahead + 1);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black" tabIndex={0}>
      <HUD
        speed={speed} distance={distance} isFinished={isFinished} isBraking={isBraking}
        navigate={navigate} nitro={nitro} elapsedTime={elapsedTime} countdown={countdown}
        position={position} aiPositions={aiPositions} playerDistance={distance}
        gear={gear} rpm={rpm}
        playerName={playerName} racePoints={racePoints}
        addRacePoints={addRacePoints} addPrizeMoney={addPrizeMoney}
      />

      <Canvas shadows gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={<Loader />}>
          <PerspectiveCamera makeDefault fov={80} near={0.1} far={2000} />

          {mapType === 'tokyo' ? (
            <>
              <color attach="background" args={['#010105']} />
              <fog attach="fog" args={['#010105', 30, 320]} />
              <ambientLight intensity={0.12} />
              <directionalLight position={[15, 30, 10]} intensity={0.6} color="#cce8ff" castShadow shadow-mapSize={[2048,2048]} shadow-camera-far={500} shadow-camera-near={1} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={100} shadow-camera-bottom={-100} />
              <Stars radius={150} depth={80} count={5000} factor={4} saturation={0.6} fade speed={0.5} />
              <TokyoTrack playerDistance={distance} />
            </>
          ) : mapType === 'nevada' ? (
            <>
              <ambientLight intensity={3.5} />
              <directionalLight position={[50, 100, 50]} intensity={6} castShadow />
              <NevadaTrack playerDistance={distance} />
            </>
          ) : (
            <>
              <ambientLight intensity={3} />
              <directionalLight position={[-30, 60, 30]} intensity={5.5} color="#ddecff" castShadow />
              <AlpineTrack playerDistance={distance} />
            </>
          )}

          <PlayerCar
            controls={controls}
            setSpeed={setSpeed}
            setDistance={setDistance}
            setGear={setGear}
            setRpm={setRpm}
            setFinished={setFinished}
            setChromatic={setChromatic}
            setBraking={setBraking}
            setNitro={setNitro}
            playerImg={playerImg}
            carColor={carColor}
            raceStarted={raceStarted}
          />

          <AICars playerDistance={distance} raceStarted={raceStarted} onUpdate={handleAiUpdate} />

          <EffectComposer>
            <Bloom luminanceThreshold={1.5} luminanceSmoothing={0.9} height={400} intensity={0.15} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[chromatic, chromatic]} />
            <Vignette eskil={false} offset={0.15} darkness={0.9} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ActiveRace;
