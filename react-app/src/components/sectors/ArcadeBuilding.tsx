import React from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'

interface ArcadeBuildingProps {
  onEnterCoin?: () => void
  onEnterPotato?: () => void
  onEnterRooftop?: () => void
}

export const ArcadeBuilding: React.FC<ArcadeBuildingProps> = ({
  onEnterCoin,
  onEnterPotato,
  onEnterRooftop,
}) => {
  return (
    <group position={[0, 0, -18]}>
      {/* 1. Arcade Facade matching Reference Screenshot (Rich navy blue, nicely lit, not black) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 5.8, -2]} castShadow receiveShadow>
          <boxGeometry args={[32, 11.6, 6]} />
          <meshStandardMaterial
            color="#223a54"
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        {/* Subtle Roof Overhang Trim */}
        <mesh position={[0, 11.6, -1.8]}>
          <boxGeometry args={[32.5, 0.6, 6.5]} />
          <meshStandardMaterial color="#172b40" roughness={0.3} />
        </mesh>
      </RigidBody>

      {/* Front Daylight Fill Light so building is beautifully illuminated */}
      <pointLight position={[0, 7, 6]} intensity={45} distance={25} color="#e0f2fe" />

      {/* 2. Cyan Neon Rectangular Outline Box Frame above ARCADE sign matching Screenshot */}
      <group position={[0, 8.8, 1.1]}>
        {/* Outer Cyan Hollow Frame */}
        <mesh>
          <boxGeometry args={[6.8, 2.0, 0.2]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
        {/* Inner Cutout to create frame effect */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[6.2, 1.4, 0.25]} />
          <meshStandardMaterial color="#223a54" />
        </mesh>
      </group>

      {/* 3. Glowing Neon ARCADE Text right above center door matching Screenshot */}
      <group position={[0, 6.7, 1.1]}>
        <Text
          fontSize={1.4}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#0284c7"
          fontWeight="bold"
        >
          ARCADE
        </Text>
        <pointLight position={[0, 0, 1.2]} intensity={25} distance={12} color="#38bdf8" />
      </group>

      {/* 4. Two Grand Mini-Game Portals matching PRD (Coin Catcher & Hot Potato) */}
      {/* Door 1: Yellow Coin Catcher (Left) */}
      <group position={[-6.5, 2.8, 1.2]} onClick={onEnterCoin}>
        <RigidBody type="fixed">
          {/* Outer Frame */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[4.6, 5.6, 0.6]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.3} metalness={0.5} />
          </mesh>
        </RigidBody>

        {/* Glowing Yellow Doorway Plane */}
        <mesh position={[0, -0.35, 0.32]}>
          <planeGeometry args={[3.8, 4.8]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#eab308"
            emissiveIntensity={2.2}
            roughness={0.15}
          />
        </mesh>

        {/* Door Header Label */}
        <mesh position={[0, 2.45, 0.35]}>
          <boxGeometry args={[4.2, 0.6, 0.15]} />
          <meshStandardMaterial color="#713f12" />
        </mesh>
        <Text
          position={[0, 2.45, 0.45]}
          fontSize={0.34}
          color="#fef08a"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#713f12"
          fontWeight="bold"
        >
          🪙 COIN CATCHER
        </Text>
        <pointLight position={[0, 0, 1.5]} intensity={20} distance={12} color="#facc15" />
      </group>

      {/* Central Cyber Lobby Entry Archway */}
      <group position={[0, 2.4, 0.8]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.8, 4.8, 0.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.22]}>
          <planeGeometry args={[4.2, 4.4]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>
        <Text
          position={[0, 0.2, 0.26]}
          fontSize={0.28}
          color="#bae6fd"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#0369a1"
        >
          SELECT A GAME
        </Text>
      </group>

      {/* Door 2: Red Hot Potato (Right) */}
      <group position={[6.5, 2.8, 1.2]} onClick={onEnterPotato}>
        <RigidBody type="fixed">
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[4.6, 5.6, 0.6]} />
            <meshStandardMaterial color="#991b1b" roughness={0.3} metalness={0.5} />
          </mesh>
        </RigidBody>

        {/* Glowing Red Doorway Plane */}
        <mesh position={[0, -0.35, 0.32]}>
          <planeGeometry args={[3.8, 4.8]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={2.4}
            roughness={0.15}
          />
        </mesh>

        {/* Door Header Label */}
        <mesh position={[0, 2.45, 0.35]}>
          <boxGeometry args={[4.2, 0.6, 0.15]} />
          <meshStandardMaterial color="#450a0a" />
        </mesh>
        <Text
          position={[0, 2.45, 0.45]}
          fontSize={0.34}
          color="#fecaca"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#450a0a"
          fontWeight="bold"
        >
          🔥 HOT POTATO
        </Text>
        <pointLight position={[0, 0, 1.5]} intensity={20} distance={12} color="#ef4444" />
      </group>
    </group>
  )
}
