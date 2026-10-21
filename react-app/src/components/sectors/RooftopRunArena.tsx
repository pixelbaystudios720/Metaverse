import React from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'

interface RooftopRunProps {
  currentCheckpoint: number
  timerFormatted: string
  bestTime: string | null
}

export const RooftopRunArena: React.FC<RooftopRunProps> = ({
  currentCheckpoint,
  timerFormatted,
  bestTime,
}) => {
  return (
    <group position={[42, 0, 0]}>
      {/* Ground Base Area */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[30, 0.2, 36]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </RigidBody>

      {/* Rooftop Tier 1: Low Building with Red Neon Border (Height Y = 3) */}
      <group position={[-6, 1.5, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh castShadow receiveShadow>
            <boxGeometry args={[8, 3, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
        </RigidBody>
        {/* Red Neon Perimeter Border matching Image 1 */}
        <mesh position={[0, 1.52, 0]}>
          <boxGeometry args={[8.2, 0.1, 12.2]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} />
        </mesh>
        {/* AC Ventilation unit obstacle */}
        <mesh position={[0, 2.2, -3]} castShadow>
          <boxGeometry args={[2.5, 1.2, 2.5]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* Starting Ramp up to Tier 1 */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[-12, 1.5, 0]} rotation={[0, 0, -Math.PI / 7]} receiveShadow>
          <boxGeometry args={[7, 0.3, 4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </RigidBody>

      {/* Jump Pad on Tier 1 */}
      <group position={[-4, 3.15, 2]}>
        <mesh>
          <cylinderGeometry args={[1.2, 1.4, 0.15, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={2.5} />
        </mesh>
        <pointLight intensity={6} distance={5} color="#4ade80" />
        <Text position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="middle">
          JUMP PAD
        </Text>
      </group>

      {/* Rooftop Tier 2: Mid Building with Red Neon Border (Height Y = 6) */}
      <group position={[4, 3, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh castShadow receiveShadow>
            <boxGeometry args={[8, 6, 14]} />
            <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.8} />
          </mesh>
        </RigidBody>
        {/* Red Neon Perimeter Border */}
        <mesh position={[0, 3.02, 0]}>
          <boxGeometry args={[8.2, 0.1, 14.2]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} />
        </mesh>
        {/* Water Tank */}
        <mesh position={[0, 4.2, 4]} castShadow>
          <cylinderGeometry args={[1.4, 1.4, 2.2, 16]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>

      {/* Checkpoint 1 on Tier 2 */}
      <group position={[4, 6.2, -3]}>
        <mesh position={[-2, 1.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
          <meshBasicMaterial color={currentCheckpoint >= 1 ? '#34d399' : '#f43f5e'} />
        </mesh>
        <mesh position={[2, 1.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
          <meshBasicMaterial color={currentCheckpoint >= 1 ? '#34d399' : '#f43f5e'} />
        </mesh>
        <Text position={[0, 3.2, 0]} fontSize={0.35} color={currentCheckpoint >= 1 ? '#34d399' : '#fca5a5'} anchorX="center" anchorY="middle">
          {currentCheckpoint >= 1 ? 'CHECKPOINT 1 [CLEARED]' : 'CHECKPOINT 1'}
        </Text>
      </group>

      {/* Rooftop Tier 3: Summit Building & FINISH Arch (Height Y = 9) */}
      <group position={[14, 4.5, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh castShadow receiveShadow>
            <boxGeometry args={[8, 9, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
        </RigidBody>
        {/* Red Neon Perimeter Border */}
        <mesh position={[0, 4.52, 0]}>
          <boxGeometry args={[8.2, 0.1, 12.2]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* FINISH Neon Checkered Archway matching Image 1 */}
      <group position={[14, 9.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[-3, 2, 0]}>
          <boxGeometry args={[0.6, 4, 0.6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[3, 2, 0]}>
          <boxGeometry args={[0.6, 4, 0.6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 3.8, 0]}>
          <boxGeometry args={[6.8, 1.2, 0.8]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <Text
          position={[0, 3.8, 0.45]}
          fontSize={0.7}
          color="#facc15"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000000"
        >
          🏁 FINISH 🏁
        </Text>
        <pointLight position={[0, 3.8, 1]} intensity={18} distance={12} color="#38bdf8" />
      </group>

      {/* Status Billboard */}
      <group position={[4, 11, -8]}>
        <mesh>
          <boxGeometry args={[7, 2.2, 0.2]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
        <Text position={[0, 0.4, 0.15]} fontSize={0.35} color="#38bdf8" anchorX="center" anchorY="middle">
          ROOFTOP TIME: {timerFormatted}
        </Text>
        <Text position={[0, -0.4, 0.15]} fontSize={0.3} color="#facc15" anchorX="center" anchorY="middle">
          RECORD: {bestTime || '--:--'}
        </Text>
      </group>
    </group>
  )
}
