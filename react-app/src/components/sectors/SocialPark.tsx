import React from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'

export const SocialPark: React.FC = () => {
  // Positions of blooming pink cherry blossom trees & green trees
  const cherryTrees: [number, number, number][] = [
    [-8, 0, 3],
    [8, 0, 3],
    [-6, 0, 14],
    [6, 0, 14],
  ]

  const greenTrees: [number, number, number][] = [
    [-14, 0, -5],
    [14, 0, -5],
    [-14, 0, 8],
    [14, 0, 8],
  ]

  return (
    <group position={[0, 0, 42]}>
      {/* Park Rolling Grass Base */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.05, 4]} receiveShadow>
          <boxGeometry args={[36, 0.2, 34]} />
          <meshStandardMaterial color="#16a34a" roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* Gentle Green Grass Hillocks */}
      {[-8, 8].map((hx, idx) => (
        <mesh key={idx} position={[hx, 0.35, 12]} receiveShadow>
          <sphereGeometry args={[4.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#22c55e" roughness={0.9} />
        </mesh>
      ))}

      {/* Center Square Paved Patio matching Image 1 */}
      <mesh position={[0, 0.06, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.07, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.5, 7.0, 32]} />
        <meshBasicMaterial color="#d97706" />
      </mesh>

      {/* Pathway connecting Central Plaza */}
      <mesh position={[0, 0.06, -7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* Center Patio Interaction Marker: "Press E to sit" */}
      <group position={[0, 1.4, 6]}>
        <Text
          fontSize={0.36}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          [E] Sit on Bench
        </Text>
      </group>

      {/* 4 Wooden Benches facing inward on the Square Patio */}
      {[
        { pos: [0, 0, 1.5], rot: 0 },
        { pos: [0, 0, 10.5], rot: Math.PI },
        { pos: [-4.5, 0, 6], rot: Math.PI / 2 },
        { pos: [4.5, 0, 6], rot: -Math.PI / 2 },
      ].map((b, idx) => (
        <group key={idx} position={b.pos as [number, number, number]} rotation={[0, b.rot, 0]}>
          <RigidBody type="fixed" colliders="cuboid">
            {/* Seat */}
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.2, 0.1, 0.65]} />
              <meshStandardMaterial color="#854d0e" roughness={0.7} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 0.95, -0.28]} castShadow>
              <boxGeometry args={[3.2, 0.65, 0.08]} />
              <meshStandardMaterial color="#854d0e" roughness={0.7} />
            </mesh>
            {/* Metal Legs */}
            <mesh position={[-1.4, 0.25, 0]} castShadow>
              <boxGeometry args={[0.1, 0.5, 0.6]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} />
            </mesh>
            <mesh position={[1.4, 0.25, 0]} castShadow>
              <boxGeometry args={[0.1, 0.5, 0.6]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} />
            </mesh>
          </RigidBody>
        </group>
      ))}

      {/* Blooming Pink Cherry Blossom Trees matching Image 1 */}
      {cherryTrees.map((pos, idx) => (
        <group key={`cherry-${idx}`} position={pos}>
          <RigidBody type="fixed" colliders="hull">
            {/* Trunk */}
            <mesh position={[0, 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.38, 3.6, 8]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
            {/* Fluffy Pink Blossom Canopy */}
            <mesh position={[0, 4.0, 0]} castShadow>
              <sphereGeometry args={[2.0, 16, 16]} />
              <meshStandardMaterial color="#f472b6" roughness={0.8} />
            </mesh>
            <mesh position={[0.6, 4.6, 0.4]} castShadow>
              <sphereGeometry args={[1.5, 14, 14]} />
              <meshStandardMaterial color="#fbcfe8" roughness={0.8} />
            </mesh>
            <mesh position={[-0.5, 4.8, -0.4]} castShadow>
              <sphereGeometry args={[1.4, 14, 14]} />
              <meshStandardMaterial color="#ec4899" roughness={0.8} />
            </mesh>
          </RigidBody>
        </group>
      ))}

      {/* Lush Green Trees */}
      {greenTrees.map((pos, idx) => (
        <group key={`green-${idx}`} position={pos}>
          <RigidBody type="fixed" colliders="hull">
            <mesh position={[0, 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.4, 3.6, 8]} />
              <meshStandardMaterial color="#5c3818" roughness={0.9} />
            </mesh>
            <mesh position={[0, 4.2, 0]} castShadow>
              <coneGeometry args={[2.2, 3.0, 8]} />
              <meshStandardMaterial color="#15803d" roughness={0.8} />
            </mesh>
            <mesh position={[0, 5.6, 0]} castShadow>
              <coneGeometry args={[1.6, 2.4, 8]} />
              <meshStandardMaterial color="#22c55e" roughness={0.8} />
            </mesh>
          </RigidBody>
        </group>
      ))}

      {/* Warm Street Lanterns */}
      {[-5, 5].map((lx, idx) => (
        <group key={`lantern-${idx}`} position={[lx, 0, 0]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 3.0, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.25, 12, 12]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 3.2, 0]} intensity={14} distance={12} color="#fef08a" />
        </group>
      ))}
    </group>
  )
}
