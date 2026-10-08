'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  OrbitControls,
  Environment,
} from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type VehicleType = 'danfo' | 'keke' | 'car';

type VehicleProps = {
  type: VehicleType;
  position: [number, number, number];
  rotation?: number;
  speed?: number;
};

function Road() {
  return (
    <group>
      {/* Main asphalt */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.04, 0]}
      >
        <planeGeometry args={[22, 34]} />
        <meshStandardMaterial
          color="#202725"
          roughness={0.94}
        />
      </mesh>

      {/* Sidewalks */}
      {[-12, 12].map((x) => (
        <mesh
          key={x}
          position={[x, 0.08, 0]}
          receiveShadow
        >
          <boxGeometry args={[2.8, 0.18, 34]} />
          <meshStandardMaterial
            color="#81796b"
            roughness={0.9}
          />
        </mesh>
      ))}

      {/* Road lane markings */}
      {[-12, -7, -2, 3, 8, 13].map((z) => (
        <mesh
          key={z}
          position={[0, 0.015, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.16, 2.1]} />
          <meshStandardMaterial
            color="#ded8b8"
            roughness={0.8}
          />
        </mesh>
      ))}

      {/* Yellow road edge lines */}
      {[-9.2, 9.2].map((x) => (
        <mesh
          key={x}
          position={[x, 0.018, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.11, 34]} />
          <meshStandardMaterial
            color="#e4b72c"
            roughness={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

function Building({
  position,
  scale = 1,
  height = 4,
  color = '#8b7b68',
}: {
  position: [number, number, number];
  scale?: number;
  height?: number;
  color?: string;
}) {
  const windows = useMemo(
    () =>
      Array.from(
        {
          length: Math.max(4, Math.floor(height)),
        },
        (_, row) =>
          Array.from(
            { length: 3 },
            (_, col) => ({
              row,
              col,
            }),
          ),
      ).flat(),
    [height],
  );

  return (
    <group
      position={position}
      scale={[scale, scale, scale]}
    >
      {/* Main building */}
      <mesh
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[5.2, height, 5]} />
        <meshStandardMaterial
          color={color}
          roughness={0.86}
        />
      </mesh>

      {/* Roof trim */}
      <mesh
        position={[0, height + 0.12, 0]}
        castShadow
      >
        <boxGeometry args={[5.45, 0.24, 5.2]} />
        <meshStandardMaterial
          color="#343b35"
          roughness={0.8}
        />
      </mesh>

      {/* Windows */}
      {windows.map((window) => (
        <mesh
          key={`${window.row}-${window.col}`}
          position={[
            -1.45 + window.col * 1.45,
            1 + window.row * 1.05,
            2.53,
          ]}
        >
          <boxGeometry args={[0.65, 0.48, 0.05]} />
          <meshStandardMaterial
            color={
              window.row % 2 === 0
                ? '#9cae9b'
                : '#b9a06d'
            }
            emissive="#17251d"
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}

      {/* Shop fascia */}
      <mesh position={[0, 0.95, 2.56]}>
        <boxGeometry args={[4.7, 0.7, 0.08]} />
        <meshStandardMaterial
          color="#d8a72c"
          roughness={0.75}
        />
      </mesh>
    </group>
  );
}

function StreetLight({
  position,
  side = 1,
}: {
  position: [number, number, number];
  side?: number;
}) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh
        position={[0, 2.1, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.08, 4.2, 8]} />
        <meshStandardMaterial color="#252b28" />
      </mesh>

      {/* Arm */}
      <mesh
        position={[side * 0.65, 4.15, 0]}
        rotation={[0, 0, side * -0.18]}
        castShadow
      >
        <boxGeometry args={[1.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#252b28" />
      </mesh>

      {/* Lamp */}
      <mesh
        position={[side * 1.28, 4.08, 0]}
      >
        <boxGeometry args={[0.28, 0.14, 0.18]} />
        <meshStandardMaterial
          color="#f5d77a"
          emissive="#e7b73a"
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function Tree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group
      position={position}
      scale={[scale, scale, scale]}
    >
      {/* Trunk */}
      <mesh
        position={[0, 1.2, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.18, 0.24, 2.4, 8]} />
        <meshStandardMaterial color="#51412d" />
      </mesh>

      {/* Main canopy */}
      <mesh
        position={[0, 2.65, 0]}
        castShadow
      >
        <icosahedronGeometry args={[1.25, 1]} />
        <meshStandardMaterial
          color="#2d6a3f"
          roughness={0.9}
        />
      </mesh>

      {/* Secondary canopy */}
      <mesh
        position={[0.55, 2.45, 0.1]}
        castShadow
      >
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color="#397c49"
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Danfo({
  position,
  rotation = 0,
  speed = 1.6,
}: VehicleProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;

    group.current.position.z += delta * speed;

    if (group.current.position.z > 18) {
      group.current.position.z = -18;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotation, 0]}
      scale={0.82}
    >
      {/* Main body */}
      <mesh
        position={[0, 1.15, 0]}
        castShadow
      >
        <boxGeometry args={[2.15, 1.65, 4.7]} />
        <meshStandardMaterial
          color="#f5c518"
          roughness={0.45}
          metalness={0.18}
        />
      </mesh>

      {/* Black Lagos waist stripe */}
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[2.18, 0.34, 4.72]} />
        <meshStandardMaterial
          color="#171b19"
          roughness={0.35}
        />
      </mesh>

      {/* Roof */}
      <mesh
        position={[0, 2.05, 0]}
        castShadow
      >
        <boxGeometry args={[2.2, 0.35, 4.3]} />
        <meshStandardMaterial
          color="#f0bf16"
          roughness={0.48}
        />
      </mesh>

      {/* Front windshield */}
      <mesh position={[0, 1.65, -2.37]}>
        <boxGeometry args={[1.78, 0.7, 0.06]} />
        <meshStandardMaterial
          color="#17272b"
          metalness={0.45}
          roughness={0.16}
        />
      </mesh>

      {/* Side windows */}
      {[-1.09, 1.09].map((x) => (
        <mesh
          key={x}
          position={[x, 1.63, 0]}
        >
          <boxGeometry args={[0.05, 0.68, 3.45]} />
          <meshStandardMaterial
            color="#17272b"
            metalness={0.45}
            roughness={0.16}
          />
        </mesh>
      ))}

      {/* Wheels */}
      {[-1, 1].flatMap((x) =>
        [-1.55, 1.55].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x * 1.05, 0.45, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry
              args={[0.38, 0.38, 0.26, 16]}
            />
            <meshStandardMaterial color="#121514" />
          </mesh>
        )),
      )}

      {/* Headlights */}
      {[-0.68, 0.68].map((x) => (
        <mesh
          key={x}
          position={[x, 1.22, -2.4]}
        >
          <boxGeometry args={[0.28, 0.18, 0.08]} />
          <meshStandardMaterial
            color="#fff2b0"
            emissive="#ffe06a"
            emissiveIntensity={1.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function Keke({
  position,
  rotation = 0,
  speed = 1.1,
}: VehicleProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;

    group.current.position.z -= delta * speed;

    if (group.current.position.z < -18) {
      group.current.position.z = 18;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotation, 0]}
      scale={0.8}
    >
      {/* Cabin */}
      <mesh
        position={[0, 1.15, 0]}
        castShadow
      >
        <boxGeometry args={[1.35, 1.55, 1.9]} />
        <meshStandardMaterial
          color="#f5c518"
          roughness={0.55}
        />
      </mesh>

      {/* Black canopy */}
      <mesh
        position={[0, 2, 0]}
        castShadow
      >
        <boxGeometry args={[1.45, 0.18, 2]} />
        <meshStandardMaterial color="#171918" />
      </mesh>

      {/* Front opening */}
      <mesh
        position={[0, 1.4, -0.98]}
      >
        <boxGeometry args={[1.05, 0.72, 0.04]} />
        <meshStandardMaterial
          color="#1a2828"
          roughness={0.2}
        />
      </mesh>

      {/* Three wheels */}
      {[
        [-0.72, 0.4, -0.62],
        [0.72, 0.4, -0.62],
        [0, 0.4, 0.72],
      ].map(([x, y, z], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.3, 0.3, 0.2, 14]} />
          <meshStandardMaterial color="#121514" />
        </mesh>
      ))}
    </group>
  );
}

function Car({
  position,
  rotation = 0,
  speed = 0.95,
}: VehicleProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;

    group.current.position.z += delta * speed;

    if (group.current.position.z > 18) {
      group.current.position.z = -18;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotation, 0]}
      scale={0.72}
    >
      {/* Body */}
      <mesh
        position={[0, 0.7, 0]}
        castShadow
      >
        <boxGeometry args={[1.75, 0.65, 3.6]} />
        <meshStandardMaterial
          color="#263d48"
          metalness={0.45}
          roughness={0.3}
        />
      </mesh>

      {/* Cabin */}
      <mesh
        position={[0, 1.15, 0.25]}
        castShadow
      >
        <boxGeometry args={[1.48, 0.62, 1.65]} />
        <meshStandardMaterial
          color="#152327"
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>

      {/* Wheels */}
      {[-0.82, 0.82].flatMap((x) =>
        [-1.1, 1.1].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.38, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.27, 0.27, 0.18, 14]} />
            <meshStandardMaterial color="#111312" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Flyover() {
  return (
    <group position={[0, 5.1, 3]}>
      {/* Deck */}
      <mesh
        position={[0, 0, 0]}
        castShadow
      >
        <boxGeometry args={[24, 0.65, 7]} />
        <meshStandardMaterial
          color="#626660"
          roughness={0.82}
        />
      </mesh>

      {/* Deck edge */}
      <mesh
        position={[0, -0.42, 0]}
        castShadow
      >
        <boxGeometry args={[24, 0.22, 7.2]} />
        <meshStandardMaterial
          color="#d5b22c"
          roughness={0.72}
        />
      </mesh>

      {/* Supports */}
      {[-8, -2.5, 3, 8.5].map((x) => (
        <mesh
          key={x}
          position={[x, -2.5, 0]}
          castShadow
        >
          <boxGeometry args={[0.85, 5, 0.85]} />
          <meshStandardMaterial
            color="#727570"
            roughness={0.86}
          />
        </mesh>
      ))}
    </group>
  );
}

function LagosScene() {
  return (
    <>
      <color
        attach="background"
        args={['#07110f']}
      />

      <fog
        attach="fog"
        args={['#07110f', 18, 42]}
      />

      <ambientLight intensity={1.15} />

      <directionalLight
        position={[8, 14, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <hemisphereLight
        args={[
          '#d9ecdf',
          '#14231c',
          1.1,
        ]}
      />

      <Environment preset="city" />

      <Road />

      <Flyover />

      {/* Buildings */}
      <Building
        position={[-9.5, 0, -7]}
        height={6}
        color="#75695d"
      />

      <Building
        position={[9.5, 0, -7]}
        height={5}
        color="#68715f"
      />

      <Building
        position={[-9.5, 0, 9]}
        height={4.5}
        color="#8b735f"
      />

      <Building
        position={[9.5, 0, 10]}
        height={6.5}
        color="#6e675d"
      />

      {/* Street furniture */}
      <StreetLight
        position={[-10.2, 0, -2]}
        side={1}
      />

      <StreetLight
        position={[10.2, 0, 4]}
        side={-1}
      />

      <StreetLight
        position={[-10.2, 0, 13]}
        side={1}
      />

      {/* Vegetation */}
      <Tree
        position={[-11.5, 0, -11]}
        scale={0.85}
      />

      <Tree
        position={[11.5, 0, -1]}
        scale={0.7}
      />

      <Tree
        position={[-11.4, 0, 13]}
        scale={0.75}
      />

      <Tree
        position={[11.4, 0, 15]}
        scale={0.85}
      />

      {/* Traffic */}
      <Danfo
        type="danfo"
        position={[-3.8, 0, -14]}
        rotation={Math.PI}
        speed={1.6}
      />

      <Keke
        type="keke"
        position={[3.7, 0, 14]}
        rotation={0}
        speed={1.1}
      />

      <Car
        type="car"
        position={[3.8, 0, -7]}
        rotation={Math.PI}
        speed={0.95}
      />

      <Car
        type="car"
        position={[-3.8, 0, 6]}
        rotation={0}
        speed={0.95}
      />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.52}
        blur={2.8}
        far={24}
        resolution={512}
      />
    </>
  );
}

export default function Hero() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{
        position: [15, 9, 17],
        fov: 42,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
    >
      <LagosScene />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={15}
        maxDistance={27}
        minPolarAngle={0.72}
        maxPolarAngle={1.3}
        autoRotate
        autoRotateSpeed={0.32}
        target={[0, 1.7, 0]}
      />
    </Canvas>
  );
}
