import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { CoinItem } from '../../types'

interface CoinCatcherArenaProps {
  coins: CoinItem[]
  onCollectCoin: (id: number) => void
  score: number
  timeLeft: number
  isActive: boolean
  onStartGame: () => void
}

export const CoinCatcherArena: React.FC<CoinCatcherArenaProps> = ({
  coins,
}) => {
  const coinsGroupRef = useRef<THREE.Group>(null)

  // Smooth floating bob and spin animation for coins
  useFrame((_, delta) => {
    if (coinsGroupRef.current) {
      coinsGroupRef.current.children.forEach((child, idx) => {
        child.rotation.y += delta * 2.8
        const basePos = coins[idx]?.position
        if (basePos) {
          child.position.y = basePos[1] + Math.sin(Date.now() * 0.004 + idx * 0.8) * 0.22
        }
      })
    }
  })

  // Arena centered at [160, 0, 0] in dedicated East Stadium Sector
  return (
    <group position={[160, 0, 0]}>
      {/* 1. Sleek Cyber Stadium Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[32, 0.2, 32]} />
          <meshStandardMaterial color="#090d16" roughness={0.2} metalness={0.8} />
        </mesh>
      </RigidBody>

      {/* Cyber Grid Pattern Floor Lines */}
      <gridHelper args={[30, 15, '#eab308', '#1e293b']} position={[0, 0.02, 0]} />

      {/* Center Golden Circle Emblem */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.2, 48]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.8, 32]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* 2. Glass Perimeter Walls with Glowing Neon Rails */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* North Wall */}
        <mesh position={[0, 3, -15.5]} castShadow>
          <boxGeometry args={[32, 6, 0.3]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        <mesh position={[0, 6.1, -15.5]}>
          <boxGeometry args={[32.2, 0.3, 0.4]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
        </mesh>

        {/* South Wall */}
        <mesh position={[0, 3, 15.5]} castShadow>
          <boxGeometry args={[32, 6, 0.3]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        <mesh position={[0, 6.1, 15.5]}>
          <boxGeometry args={[32.2, 0.3, 0.4]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
        </mesh>

        {/* West Wall */}
        <mesh position={[-15.5, 3, 0]} castShadow>
          <boxGeometry args={[0.3, 6, 32]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        <mesh position={[-15.5, 6.1, 0]}>
          <boxGeometry args={[0.4, 0.3, 32.2]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
        </mesh>

        {/* East Wall */}
        <mesh position={[15.5, 3, 0]} castShadow>
          <boxGeometry args={[0.3, 6, 32]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        <mesh position={[15.5, 6.1, 0]}>
          <boxGeometry args={[0.4, 0.3, 32.2]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
        </mesh>
      </RigidBody>

      {/* 3. Stadium Corner Floodlight Towers */}
      {[
        [-14, -14],
        [14, -14],
        [-14, 14],
        [14, 14],
      ].map(([fx, fz], idx) => (
        <group key={`light-${idx}`} position={[fx, 0, fz]}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 10, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 10.2, 0]}>
            <boxGeometry args={[1.6, 0.6, 1.0]} />
            <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 9.8, 0]} intensity={25} distance={30} color="#fef08a" />
        </group>
      ))}

      {/* 4. Giant Holographic Stadium Signboard */}
      <group position={[0, 7.5, -15.3]}>
        <mesh>
          <boxGeometry args={[14, 2.0, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <Text
          position={[0, 0.2, 0.15]}
          fontSize={0.85}
          color="#facc15"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          🪙 COIN CATCHER ARENA
        </Text>
        <Text
          position={[0, -0.45, 0.15]}
          fontSize={0.3}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          COLLECT GLOWING COINS FOR MAXIMUM XP & $TICKER
        </Text>
      </group>

      {/* 5. GORGEOUS, GLEAMING 3D GOLDEN COINS (NO BOXES, NO CRATES) */}
      <group ref={coinsGroupRef}>
        {coins.map((coin) => {
          if (coin.collected) return null
          // Convert absolute world pos to local arena pos: x - 160, y, z
          const localX = coin.position[0] - 160
          const localY = coin.position[1]
          const localZ = coin.position[2]

          return (
            <group key={coin.id} position={[localX, localY, localZ]}>
              {/* Floor Shadow / Glow Projector Ring */}
              <mesh position={[0, -localY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.9, 24]} />
                <meshBasicMaterial color="#facc15" transparent opacity={0.4} />
              </mesh>

              {/* Real 3D Thick Gold Coin Medallion */}
              <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.72, 0.72, 0.16, 32]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  emissive="#d97706"
                  emissiveIntensity={1.2}
                  metalness={0.92}
                  roughness={0.15}
                />
              </mesh>

              {/* Raised Golden Rim Rings on Front and Back */}
              <mesh position={[0, 0, 0.09]}>
                <ringGeometry args={[0.55, 0.70, 32]} />
                <meshStandardMaterial color="#fef08a" metalness={0.9} roughness={0.1} />
              </mesh>
              <mesh position={[0, 0, -0.09]} rotation={[0, Math.PI, 0]}>
                <ringGeometry args={[0.55, 0.70, 32]} />
                <meshStandardMaterial color="#fef08a" metalness={0.9} roughness={0.1} />
              </mesh>

              {/* Embossed Golden Star Icon on Front Face */}
              <Text
                position={[0, 0, 0.1]}
                fontSize={0.48}
                color="#78350f"
                anchorX="center"
                anchorY="middle"
                fontWeight="black"
              >
                ★
              </Text>
              {/* Embossed Golden Star Icon on Back Face */}
              <Text
                position={[0, 0, -0.1]}
                rotation={[0, Math.PI, 0]}
                fontSize={0.48}
                color="#78350f"
                anchorX="center"
                anchorY="middle"
                fontWeight="black"
              >
                ★
              </Text>

              {/* Glowing Outer Particle Ring */}
              <mesh>
                <torusGeometry args={[0.76, 0.03, 8, 32]} />
                <meshBasicMaterial color="#fef08a" />
              </mesh>

              {/* Radiant Warm Golden Point Light */}
              <pointLight intensity={8} distance={5} color="#facc15" />
            </group>
          )
        })}
      </group>
    </group>
  )
}
