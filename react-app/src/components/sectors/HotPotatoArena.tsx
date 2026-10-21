import React, { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface HotPotatoArenaProps {
  onStartGame?: () => void
}

/**
 * Creates an authentic blue & red hardwood basketball court texture with lines and keys.
 */
function createBasketballCourtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const w = canvas.width
  const h = canvas.height

  // 1. Apron (Crimson Red)
  ctx.fillStyle = '#b91c1c'
  ctx.fillRect(0, 0, w, h)

  // 2. Playing Surface (Athletic Blue)
  const mx = 80
  const my = 80
  const cw = w - mx * 2
  const ch = h - my * 2

  ctx.fillStyle = '#0284c7'
  ctx.fillRect(mx, my, cw, ch)

  // Subtle wood plank grain
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 2
  for (let y = my; y < my + ch; y += 22) {
    ctx.beginPath()
    ctx.moveTo(mx, y)
    ctx.lineTo(mx + cw, y)
    ctx.stroke()
  }

  // White Court Markings
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 6

  // Center Court Line & Center Circle
  ctx.beginPath()
  ctx.moveTo(w / 2, my)
  ctx.lineTo(w / 2, my + ch)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 90, 0, Math.PI * 2)
  ctx.stroke()

  // Left & Right Keys (Red Painted)
  const keyW = cw * 0.22
  const keyH = ch * 0.44
  const keyY = my + (ch - keyH) / 2

  ctx.fillStyle = '#b91c1c'
  ctx.fillRect(mx, keyY, keyW, keyH)
  ctx.strokeRect(mx, keyY, keyW, keyH)

  ctx.fillRect(mx + cw - keyW, keyY, keyW, keyH)
  ctx.strokeRect(mx + cw - keyW, keyY, keyW, keyH)

  // 3-Point Arcs
  ctx.beginPath()
  ctx.arc(mx, h / 2, 260, -Math.PI / 2.4, Math.PI / 2.4)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(mx + cw, h / 2, 260, Math.PI - Math.PI / 2.4, Math.PI + Math.PI / 2.4)
  ctx.stroke()

  // Free Throw Circles
  ctx.beginPath()
  ctx.arc(mx + keyW, h / 2, 60, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(mx + cw - keyW, h / 2, 60, 0, Math.PI * 2)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export const HotPotatoArena: React.FC<HotPotatoArenaProps> = () => {
  const courtTexture = useMemo(() => createBasketballCourtTexture(), [])

  // Positioned cleanly in dedicated West Stadium Sector at [-160, 0, 0]
  return (
    <group position={[-160, 0, 0]}>
      {/* 1. Realistic Basketball Court Surface */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[32, 0.2, 20]} />
          <meshStandardMaterial
            map={courtTexture}
            roughness={0.25}
            metalness={0.15}
          />
        </mesh>
      </RigidBody>

      {/* 2. Chainlink Perimeter Fences with Neon Cyan & Magenta Rails */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* North Fence */}
        <mesh position={[0, 2.5, -10]} castShadow>
          <boxGeometry args={[32, 5, 0.15]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.35}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 5.1, -10]}>
          <boxGeometry args={[32.2, 0.25, 0.3]} />
          <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2.5} />
        </mesh>

        {/* South Fence */}
        <mesh position={[0, 2.5, 10]} castShadow>
          <boxGeometry args={[32, 5, 0.15]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.35}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 5.1, 10]}>
          <boxGeometry args={[32.2, 0.25, 0.3]} />
          <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2.5} />
        </mesh>

        {/* West Wall behind Left Basket */}
        <mesh position={[-16, 2.5, 0]} castShadow>
          <boxGeometry args={[0.15, 5, 20]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.35}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[-16, 5.1, 0]}>
          <boxGeometry args={[0.3, 0.25, 20.2]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} />
        </mesh>

        {/* East Wall behind Right Basket */}
        <mesh position={[16, 2.5, 0]} castShadow>
          <boxGeometry args={[0.15, 5, 20]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.35}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[16, 5.1, 0]}>
          <boxGeometry args={[0.3, 0.25, 20.2]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} />
        </mesh>
      </RigidBody>

      {/* 3. Authentic Basketball Hoops (Left & Right Ends) */}
      {[-13.5, 13.5].map((hx, idx) => {
        const isLeft = hx < 0
        return (
          <group key={`hoop-${idx}`} position={[hx, 0, 0]}>
            {/* Support Steel Post */}
            <mesh position={[isLeft ? -1.2 : 1.2, 2.8, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 5.6, 12]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Angled Overhang Arm */}
            <mesh
              position={[isLeft ? -0.4 : 0.4, 4.4, 0]}
              rotation={[0, 0, isLeft ? -0.5 : 0.5]}
            >
              <cylinderGeometry args={[0.09, 0.09, 1.8, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.9} />
            </mesh>

            {/* Clear Acrylic Backboard with Red Target Square */}
            <mesh position={[0, 3.8, 0]} rotation={[0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <boxGeometry args={[2.4, 1.6, 0.08]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.65} roughness={0.1} />
            </mesh>
            <mesh
              position={[isLeft ? 0.05 : -0.05, 3.6, 0]}
              rotation={[0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0]}
            >
              <ringGeometry args={[0.4, 0.45, 4]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>

            {/* Bright Orange Metal Rim */}
            <mesh
              position={[isLeft ? 0.7 : -0.7, 3.1, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.38, 0.04, 12, 24]} />
              <meshStandardMaterial color="#ea580c" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* White Net */}
            <mesh position={[isLeft ? 0.7 : -0.7, 2.7, 0]}>
              <cylinderGeometry args={[0.36, 0.22, 0.7, 16, 4, true]} />
              <meshStandardMaterial
                color="#f8fafc"
                wireframe
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
        )
      })}

      {/* 4. Stadium Floodlight Towers */}
      {[
        [-14, -8.5],
        [14, -8.5],
        [-14, 8.5],
        [14, 8.5],
      ].map(([fx, fz], idx) => (
        <group key={`light-${idx}`} position={[fx, 0, fz]}>
          <mesh position={[0, 4.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 9, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0, 9.2, 0]}>
            <boxGeometry args={[1.5, 0.6, 0.9]} />
            <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 8.8, 0]} intensity={25} distance={28} color="#fef08a" />
        </group>
      ))}

      {/* 5. Glowing Stadium Signboard */}
      <group position={[0, 7.0, -9.8]}>
        <mesh>
          <boxGeometry args={[14, 1.8, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <Text
          position={[0, 0.2, 0.15]}
          fontSize={0.8}
          color="#f43f5e"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          🔥 HOT POTATO ARENA
        </Text>
        <Text
          position={[0, -0.4, 0.15]}
          fontSize={0.28}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          PASS THE FLAMING ORB BEFORE DETONATION!
        </Text>
      </group>
    </group>
  )
}
