import React, { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Creates an authentic realistic procedural window grid texture
 * matching the high-rise towers of attentionagents.fun
 */
function createWindowGridTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Concrete building base tone
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, 512, 512)

  // Subtle concrete grain
  for (let i = 0; i < 2000; i++) {
    const v = Math.random() < 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${v},${v},${v},0.04)`
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3)
  }

  // Draw 8x8 window grid
  const cols = 8
  const rows = 8
  const cellW = 512 / cols
  const cellH = 512 / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + 6
      const y = r * cellH + 6
      const w = cellW - 12
      const h = cellH - 12

      // Randomized window glow: warm interior, cool sky reflection, or dark
      const rand = Math.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453
      const val = rand - Math.floor(rand)

      if (val > 0.45) {
        // Sky blue reflection
        const grad = ctx.createLinearGradient(x, y, x + w, y + h)
        grad.addColorStop(0, '#93c5fd')
        grad.addColorStop(1, '#3b82f6')
        ctx.fillStyle = grad
      } else if (val > 0.2) {
        // Warm interior glow
        const grad = ctx.createLinearGradient(x, y, x, y + h)
        grad.addColorStop(0, '#fef08a')
        grad.addColorStop(1, '#eab308')
        ctx.fillStyle = grad
      } else {
        // Tinted dark glass
        ctx.fillStyle = '#0f172a'
      }

      ctx.fillRect(x, y, w, h)

      // Window glint / frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x, y, w, h)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 16)
  return texture
}

export const CitySkyscrapers: React.FC = () => {
  const windowTexture1 = useMemo(() => createWindowGridTexture(1), [])
  const windowTexture2 = useMemo(() => createWindowGridTexture(2), [])
  const windowTexture3 = useMemo(() => createWindowGridTexture(3), [])

  // Surrounding high-rise city buildings in 360 degrees around the perimeter
  const towers = useMemo(() => {
    const list: {
      x: number
      z: number
      w: number
      h: number
      d: number
      rotY: number
      signText?: string
      signColor?: string
      hasAntenna?: boolean
      texIndex: number
    }[] = []

    // North Sector (Behind Arcade)
    list.push(
      { x: -35, z: -35, w: 22, h: 48, d: 20, rotY: 0.1, signText: 'METROPOLIS', signColor: '#38bdf8', hasAntenna: true, texIndex: 0 },
      { x: 35, z: -35, w: 24, h: 54, d: 22, rotY: -0.1, signText: 'CYBER TOWER', signColor: '#f43f5e', hasAntenna: true, texIndex: 1 },
      { x: -55, z: -40, w: 26, h: 66, d: 24, rotY: 0.2, hasAntenna: true, texIndex: 2 },
      { x: 55, z: -40, w: 28, h: 72, d: 26, rotY: -0.2, hasAntenna: true, texIndex: 0 },
      { x: 0, z: -48, w: 34, h: 84, d: 22, rotY: 0, signText: 'ATTENTION HQ', signColor: '#a855f7', hasAntenna: true, texIndex: 1 },
      { x: -20, z: -58, w: 30, h: 105, d: 26, rotY: 0.05, hasAntenna: true, texIndex: 2 },
      { x: 20, z: -58, w: 30, h: 110, d: 26, rotY: -0.05, hasAntenna: true, texIndex: 0 }
    )

    // South Sector (Directly Enclosing Social Park in High-Tech Downtown)
    list.push(
      // Flanking Park West & East
      { x: -34, z: 28, w: 20, h: 46, d: 18, rotY: 0.08, signText: 'NET CAFE', signColor: '#38bdf8', hasAntenna: true, texIndex: 0 },
      { x: 34, z: 28, w: 20, h: 48, d: 18, rotY: -0.08, signText: '24H NOODLES', signColor: '#fbbf24', hasAntenna: true, texIndex: 1 },
      { x: -36, z: 46, w: 22, h: 58, d: 20, rotY: 0.1, signText: 'CYBER TAVERN', signColor: '#06b6d4', hasAntenna: true, texIndex: 2 },
      { x: 36, z: 46, w: 22, h: 60, d: 20, rotY: -0.1, signText: 'PIXEL HOTEL', signColor: '#ec4899', hasAntenna: true, texIndex: 0 },

      // Downtown Skyline Wall directly behind the Park
      { x: -48, z: 64, w: 24, h: 62, d: 22, rotY: 0.12, signText: 'CYBER LABS', signColor: '#38bdf8', hasAntenna: true, texIndex: 1 },
      { x: -24, z: 66, w: 24, h: 72, d: 22, rotY: 0.05, signText: 'NIGHT MARKET', signColor: '#f43f5e', hasAntenna: true, texIndex: 0 },
      { x: 0, z: 68, w: 28, h: 86, d: 24, rotY: 0, signText: 'ATTENTION DOWNTOWN', signColor: '#a855f7', hasAntenna: true, texIndex: 2 },
      { x: 24, z: 66, w: 24, h: 74, d: 22, rotY: -0.05, signText: 'SOLANA PLAZA', signColor: '#10b981', hasAntenna: true, texIndex: 1 },
      { x: 48, z: 64, w: 24, h: 64, d: 22, rotY: -0.12, signText: 'KARAOKE TOWER', signColor: '#fbbf24', hasAntenna: true, texIndex: 0 },

      // Massive Deep Skyline Backdrop Towers
      { x: -36, z: 88, w: 34, h: 110, d: 30, rotY: 0.08, hasAntenna: true, texIndex: 2 },
      { x: 0, z: 92, w: 38, h: 125, d: 32, rotY: 0, signText: 'METRO EMPIRE', signColor: '#38bdf8', hasAntenna: true, texIndex: 0 },
      { x: 36, z: 88, w: 34, h: 115, d: 30, rotY: -0.08, hasAntenna: true, texIndex: 1 }
    )

    // East Sector (East Boulevard)
    list.push(
      { x: 48, z: -10, w: 20, h: 54, d: 24, rotY: -Math.PI / 2 + 0.1, signText: 'SOLANA TOWER', signColor: '#a855f7', hasAntenna: true, texIndex: 0 },
      { x: 48, z: 12, w: 20, h: 50, d: 22, rotY: -Math.PI / 2, signText: 'CRYPTO EXCHANGE', signColor: '#22c55e', hasAntenna: true, texIndex: 1 },
      { x: 68, z: 0, w: 30, h: 88, d: 32, rotY: -Math.PI / 2, hasAntenna: true, texIndex: 2 },
      { x: 72, z: 24, w: 32, h: 96, d: 32, rotY: -Math.PI / 2, hasAntenna: true, texIndex: 0 }
    )

    // West Sector (West Boulevard)
    list.push(
      { x: -50, z: 2, w: 20, h: 52, d: 22, rotY: Math.PI / 2 - 0.1, signText: 'ARCADE CENTRAL', signColor: '#06b6d4', hasAntenna: true, texIndex: 0 },
      { x: -68, z: 22, w: 28, h: 78, d: 28, rotY: Math.PI / 2, hasAntenna: true, texIndex: 1 },
      { x: -68, z: -25, w: 30, h: 84, d: 28, rotY: Math.PI / 2, hasAntenna: true, texIndex: 2 },
      { x: -74, z: 0, w: 34, h: 104, d: 32, rotY: Math.PI / 2, hasAntenna: true, texIndex: 0 }
    )

    return list
  }, [])

  const textures = [windowTexture1, windowTexture2, windowTexture3]

  return (
    <group>
      {/* Surrounding City Skyscraper Towers */}
      {towers.map((t, idx) => (
        <group key={`tower-${idx}`} position={[t.x, t.h / 2, t.z]} rotation={[0, t.rotY, 0]}>
          <RigidBody type="fixed" colliders="cuboid">
            {/* Tower Structure */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[t.w, t.h, t.d]} />
              <meshStandardMaterial
                map={textures[t.texIndex]}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>

            {/* Roof Overhang Trim */}
            <mesh position={[0, t.h / 2 + 0.4, 0]}>
              <boxGeometry args={[t.w + 0.6, 0.8, t.d + 0.6]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} />
            </mesh>
          </RigidBody>

          {/* Glowing Vertical Neon Sign */}
          {t.signText && (
            <group position={[0, t.h * 0.1, t.d / 2 + 0.35]}>
              <mesh>
                <boxGeometry args={[t.w * 0.65, 3.2, 0.2]} />
                <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
              </mesh>
              <Text
                position={[0, 0, 0.15]}
                fontSize={1.2}
                color={t.signColor || '#38bdf8'}
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                outlineWidth={0.06}
                outlineColor="#0284c7"
              >
                {t.signText}
              </Text>
              <pointLight position={[0, 0, 1.2]} intensity={18} distance={15} color={t.signColor || '#38bdf8'} />
            </group>
          )}

          {/* Roof Antenna with Blinking Red Aircraft Beacon */}
          {t.hasAntenna && (
            <group position={[0, t.h / 2 + 4, 0]}>
              <mesh>
                <cylinderGeometry args={[0.08, 0.15, 8, 8]} />
                <meshStandardMaterial color="#475569" metalness={0.9} />
              </mesh>
              <mesh position={[0, 4.1, 0]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ef4444"
                  emissiveIntensity={3.5}
                />
              </mesh>
              <pointLight position={[0, 4.2, 0]} intensity={8} distance={10} color="#ef4444" />
            </group>
          )}
        </group>
      ))}

      {/* Perimeter Paved Boulevard Roads & Streetlights */}
      {/* North-South Boulevards */}
      {[-38, 38].map((rx, idx) => (
        <group key={`road-x-${idx}`} position={[rx, 0.02, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[10, 0.04, 140]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          {/* Yellow Road Lane Stripes */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 136]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        </group>
      ))}

      {/* South East-West Downtown Boulevard behind Park */}
      <group position={[0, 0.02, 60]}>
        <mesh receiveShadow>
          <boxGeometry args={[130, 0.04, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[126, 0.3]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      </group>

      {/* Elevated High-Tech Pedestrian Skybridge connecting South Skyscraper Towers */}
      <group position={[0, 24, 65]}>
        {/* Bridge Outer Frame */}
        <mesh castShadow>
          <boxGeometry args={[46, 5, 5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Glowing Panoramic Cyan Glass Windows on both sides */}
        <mesh position={[0, 0, 2.55]}>
          <planeGeometry args={[44, 3.2]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={2.2}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0, 0, -2.55]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[44, 3.2]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={2.2}
            transparent
            opacity={0.85}
          />
        </mesh>
        <pointLight position={[0, 0, 0]} intensity={18} distance={25} color="#38bdf8" />
      </group>

      {/* Streetlights lining the boulevards */}
      {[-35, 35].map((lx, i) =>
        [-40, -20, 0, 20, 40].map((lz, j) => (
          <group key={`lamp-${i}-${j}`} position={[lx, 0, lz]}>
            <mesh position={[0, 2.8, 0]}>
              <cylinderGeometry args={[0.07, 0.1, 5.6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[lx > 0 ? -0.4 : 0.4, 5.7, 0]}>
              <boxGeometry args={[0.9, 0.15, 0.3]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[lx > 0 ? -0.7 : 0.7, 5.6, 0]}>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#facc15"
                emissiveIntensity={2.5}
              />
            </mesh>
            <pointLight
              position={[lx > 0 ? -0.7 : 0.7, 5.5, 0]}
              intensity={16}
              distance={14}
              color="#fef08a"
            />
          </group>
        ))
      )}
    </group>
  )
}
