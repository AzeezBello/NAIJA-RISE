'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

// React Three Fiber showcase: a danfo idling on the landing page. The in-game vehicles are built the same way in ../src/entities/vehicles.js.
function Danfo() {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.35; });
  return (
    <group ref={g}>
      <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[2.3, 2, 5.2]} /><meshStandardMaterial color="#f5c518" metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[0, 1.85, 0.3]}><boxGeometry args={[2.34, 0.62, 3.4]} /><meshStandardMaterial color="#152022" roughness={0.15} metalness={0.3} /></mesh>
      <mesh position={[0, 1.85, -2.56]}><boxGeometry args={[2.34, 0.6, 0.1]} /><meshStandardMaterial color="#152022" /></mesh>
      {[-1.17, 1.17].map(x => <mesh key={x} position={[x, 1.05, 0]}><boxGeometry args={[0.04, 0.28, 5.2]} /><meshStandardMaterial color="#111" /></mesh>)}
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => (
        <mesh key={`${sx}${sz}`} position={[sx * 1.05, 0.42, sz * 1.7]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.3, 14]} /><meshStandardMaterial color="#101111" /></mesh>
      )))}
    </group>
  );
}

export default function Hero() {
  return (
    <Canvas shadows camera={{ position: [6, 4, 7], fov: 45 }}>
      <color attach="background" args={['#0a1612']} />
      <hemisphereLight args={['#e7f5ff', '#1b3029', 1.4]} />
      <directionalLight position={[6, 10, 4]} intensity={2.4} castShadow />
      <Danfo />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} blur={2} far={6} />
      <OrbitControls enablePan={false} minDistance={6} maxDistance={14} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
