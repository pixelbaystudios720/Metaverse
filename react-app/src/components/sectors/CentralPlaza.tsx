import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Creates the exact warm square stone grid paver texture seen in the reference screenshot
 */
function createPlazaTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Base stone tone
  ctx.fillStyle = '#d5ccbe'
  ctx.fillRect(0, 0, 512, 512)

  // Draw square cobblestone tile grid
  const tileSize = 64
  ctx.strokeStyle = '#a69a8b'
  ctx.lineWidth = 3

  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      const rand = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      const shade = (rand - Math.floor(rand)) * 16 - 8
      ctx.fillStyle = `rgb(${213 + shade}, ${204 + shade}, ${190 + shade})`
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4)
      ctx.strokeRect(x, y, tileSize, tileSize)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(16, 16)
  texture.needsUpdate = true
  return texture
}

export const CentralPlaza: React.FC = () => {
  const tileTexture = useMemo(() => createPlazaTileTexture(), [])
  const orbsGroupRef = useRef<THREE.Group>(null)

  // Floating orbiting orbs around fountain
  useFrame((_, delta) => {
    if (orbsGroupRef.current) {
      orbsGroupRef.current.rotation.y += delta * 0.4
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Tiled Pavement Ground Plane matching Screenshot */}
      <RigidBody type="fixed">
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <cylinderGeometry args={[32, 32, 0.2, 48]} />
          <meshStandardMaterial
            map={tileTexture}
            roughness={0.8}
            metalness={0.05}
          />
        </mesh>
      </RigidBody>

      {/* Green Grass Lawn Patch on Left side matching Screenshot */}
      <mesh position={[-18, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 22]} />
        <meshStandardMaterial color="#4ade80" roughness={0.85} />
      </mesh>

      {/* Decorative Outer Circle Ring */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.8, 7.05, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>

      {/* 2. Central Stepped White Fountain matching Reference Screenshot */}
      <group position={[0, 0, 0]}>
        <RigidBody type="fixed">
          {/* Base Tier 1 White Basin Rim */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[5.2, 5.6, 0.7, 36]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Tier 2 White Step */}
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.6, 4.0, 0.5, 32]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Tier 3 Pedestal for Jets */}
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.8, 0.5, 24]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.2} />
          </mesh>
        </RigidBody>

        {/* Text 'NetKid' on front rim of Tier 2 matching Screenshot */}
        <Text
          position={[0, 0.88, 3.82]}
          rotation={[-0.25, 0, 0]}
          fontSize={0.28}
          color="#0f172a"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
        >
          NetKid
        </Text>

        {/* Glowing Turquoise / Cyan Water Pool */}
        <mesh position={[0, 0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.6, 5.15, 36]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.8}
            roughness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Water Pool Inner Light */}
        <pointLight position={[0, 1.2, 0]} intensity={18} distance={12} color="#38bdf8" />

        {/* Vertical Blue Water Jets / Pipes supporting Sphere */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((jx, idx) => (
          <group key={`pipe-${idx}`} position={[jx, 1.8, idx % 2 === 0 ? 0.35 : -0.35]}>
            <mesh rotation={[idx % 2 === 0 ? 0.15 : -0.15, 0, jx * 0.2]}>
              <cylinderGeometry args={[0.035, 0.035, 1.4, 8]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={2.0}
              />
            </mesh>
          </group>
        ))}

        {/* Central Large Glossy Glowing Blue Sphere matching Screenshot */}
        <group position={[0, 2.65, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[1.15, 32, 32]} />
            <meshPhysicalMaterial
              color="#2563eb"
              emissive="#1d4ed8"
              emissiveIntensity={1.5}
              roughness={0.15}
              metalness={0.2}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          </mesh>
          <pointLight intensity={22} distance={10} color="#60a5fa" />
        </group>
      </group>

      {/* 3. Floating Orbiting Amber/Orange Orbs matching Screenshot */}
      <group ref={orbsGroupRef} position={[0, 1.4, 0]}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const angle = (idx * Math.PI * 2) / 6
          const ox = Math.cos(angle) * 6.6
          const oz = Math.sin(angle) * 6.6
          return (
            <mesh key={`orb-${idx}`} position={[ox, Math.sin(idx) * 0.3, oz]}>
              <sphereGeometry args={[0.38, 16, 16]} />
              <meshStandardMaterial
                color="#fb923c"
                emissive="#ea580c"
                emissiveIntensity={2.5}
                roughness={0.2}
              />
            </mesh>
          )
        })}
      </group>

      {/* 4. Left Wooden Park Bench matching Screenshot */}
      <group position={[-6.8, 0, 4.2]} rotation={[0, 0.3, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.08, 0.6]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.9, -0.26]} castShadow>
            <boxGeometry args={[2.5, 0.55, 0.08]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
          <mesh position={[-1.0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          <mesh position={[1.0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        </RigidBody>
      </group>

      {/* 5. Right Wooden Park Bench with Sitting Characters matching Screenshot */}
      <group position={[6.2, 0, 4.2]} rotation={[0, -0.3, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.08, 0.6]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.9, -0.26]} castShadow>
            <boxGeometry args={[2.5, 0.55, 0.08]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
          <mesh position={[-1.0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          <mesh position={[1.0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        </RigidBody>

        {/* Character 1: NetKid (Chibi with white hoodie & purple headphones) sitting on bench */}
        <group position={[-0.5, 0.5, 0.05]} rotation={[0, -0.15, 0]}>
          <mesh position={[0, 0.68, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#ffedd5" />
          </mesh>
          <mesh position={[0, 0.74, -0.04]}>
            <sphereGeometry args={[0.24, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.035, 8, 16]} />
            <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={3.5} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.28]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        </group>

        {/* Character 2: Dark Chibi sitting next to him */}
        <group position={[0.4, 0.5, 0.05]} rotation={[0, 0.1, 0]}>
          <mesh position={[0, 0.68, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#ffedd5" />
          </mesh>
          <mesh position={[0, 0.74, -0.04]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.32, 0.38, 0.26]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} />
          </mesh>
        </group>

        {/* Golden/Yellow Mascot shape next to bench */}
        <mesh position={[1.4, 0.45, 0.2]} castShadow>
          <capsuleGeometry args={[0.22, 0.3, 12, 12]} />
          <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* 6. Coin Catcher Area Details: Small Bench and White Glowing Egg Mascot matching Screenshot */}
      <group position={[-5.8, 0, -14.5]}>
        {/* Small Bench */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.6, 0.06, 0.45]} />
          <meshStandardMaterial color="#92400e" />
        </mesh>
        {/* White Glowing Egg Mascot */}
        <mesh position={[0.9, 0.5, 0]} castShadow>
          <capsuleGeometry args={[0.26, 0.34, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#f8fafc" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* 7. Near Cyan Door: ezpz_ text label matching Screenshot */}
      <group position={[0, 0.5, -14.8]}>
        <Text
          fontSize={0.24}
          color="#bae6fd"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
        >
          ezpz_
        </Text>
      </group>
    </group>
  )
}
