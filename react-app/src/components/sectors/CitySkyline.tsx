import React from 'react'
import { RigidBody } from '@react-three/rapier'

export const CitySkyline: React.FC = () => {
  // Array of skyscraper heights and footprints along perimeter
  const northBuildings = [-70, -45, -20, 0, 20, 45, 70].map((x, i) => ({
    x,
    z: -75,
    w: 16 + (i % 3) * 4,
    d: 14 + (i % 2) * 5,
    h: 35 + (i * 7) % 35,
    color: ['#0f172a', '#1e1b4b', '#111827', '#1e293b'][i % 4],
    windowColor: ['#38bdf8', '#f43f5e', '#a855f7', '#fbbf24'][i % 4],
  }))

  const southBuildings = [-70, -45, -20, 0, 20, 45, 70].map((x, i) => ({
    x,
    z: 75,
    w: 15 + (i % 3) * 5,
    d: 15 + (i % 2) * 4,
    h: 30 + ((i + 2) * 6) % 30,
    color: ['#1e1b4b', '#0f172a', '#1e293b', '#111827'][i % 4],
    windowColor: ['#a855f7', '#38bdf8', '#34d399', '#f43f5e'][i % 4],
  }))

  const westBuildings = [-75].map((x) =>
    [-50, -25, 25, 50].map((z, i) => ({
      x,
      z,
      w: 14 + (i % 2) * 4,
      d: 16 + (i % 3) * 4,
      h: 28 + (i * 9) % 25,
      color: ['#0f172a', '#111827', '#1e293b'][i % 3],
      windowColor: '#38bdf8',
    }))
  ).flat()

  const eastBuildings = [75].map((x) =>
    [-50, -25, 25, 50].map((z, i) => ({
      x,
      z,
      w: 14 + (i % 2) * 4,
      d: 16 + (i % 3) * 4,
      h: 30 + (i * 8) % 26,
      color: ['#1e1b4b', '#0f172a', '#111827'][i % 3],
      windowColor: '#f43f5e',
    }))
  ).flat()

  const allBuildings = [...northBuildings, ...southBuildings, ...westBuildings, ...eastBuildings]

  return (
    <group>
      {/* Surrounding Road Loop (Radius R ~ 58) */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[52, 64, 48]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Road Lane Markings */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[57.8, 58.2, 48]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>

      {/* Outer World Boundary Colliders */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* North World Wall */}
        <mesh position={[0, 5, -85]} visible={false}>
          <boxGeometry args={[180, 20, 2]} />
        </mesh>
        {/* South World Wall */}
        <mesh position={[0, 5, 85]} visible={false}>
          <boxGeometry args={[180, 20, 2]} />
        </mesh>
        {/* West World Wall */}
        <mesh position={[-85, 5, 0]} visible={false}>
          <boxGeometry args={[2, 20, 180]} />
        </mesh>
        {/* East World Wall */}
        <mesh position={[85, 5, 0]} visible={false}>
          <boxGeometry args={[2, 20, 180]} />
        </mesh>
      </RigidBody>

      {/* Perimeter Skyscraper Buildings */}
      {allBuildings.map((b, idx) => (
        <group key={idx} position={[b.x, b.h / 2, b.z]}>
          <RigidBody type="fixed" colliders="cuboid">
            {/* Tower Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.color} roughness={0.3} metalness={0.7} />
            </mesh>
          </RigidBody>

          {/* Glowing Window Accents */}
          <mesh position={[0, 0, b.d / 2 + 0.1]}>
            <planeGeometry args={[b.w * 0.8, b.h * 0.8]} />
            <meshStandardMaterial
              color={b.windowColor}
              emissive={b.windowColor}
              emissiveIntensity={0.6}
              wireframe={true}
            />
          </mesh>

          {/* Roof Beacon Light */}
          <mesh position={[0, b.h / 2 + 0.5, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* Perimeter Street Lamps along Road Loop */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => {
        const rad = (deg * Math.PI) / 180
        const x = Math.cos(rad) * 63
        const z = Math.sin(rad) * 63
        return (
          <group key={idx} position={[x, 0, z]}>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[0, 6, 0]}>
              <sphereGeometry args={[0.3, 12, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} />
            </mesh>
            <pointLight position={[0, 5.8, 0]} intensity={14} distance={16} color="#38bdf8" />
          </group>
        )
      })}
    </group>
  )
}
