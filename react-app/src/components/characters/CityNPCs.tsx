import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { MemeCharacterMesh } from './MemeCharacterMesh'

interface NPCState {
  id: string
  name: string
  kind: 'muse' | 'human'
  color: string
  pos: [number, number, number]
  target: [number, number, number]
  speed: number
  phrase: string
}

const INITIAL_NPCS: NPCState[] = [
  // 1. Attention Agents Muse Mascots (Mint, Cream, Pink, Blue, Yellow)
  {
    id: 'npc-mint',
    name: 'Sprout Mint',
    kind: 'muse',
    color: '#a7f3d0',
    pos: [3.8, 0, 6.5],
    target: [6.5, 0, 9.0],
    speed: 1.8,
    phrase: '🌱 gm! Welcome to the city!',
  },
  {
    id: 'npc-cream',
    name: 'Vanilla Cream',
    kind: 'muse',
    color: '#fef3c7',
    pos: [-4.2, 0, 7.0],
    target: [-7.5, 0, 4.0],
    speed: 1.6,
    phrase: '✨ The city looks incredible today!',
  },
  {
    id: 'npc-pink',
    name: 'Blush Pink',
    kind: 'muse',
    color: '#fbcfe8',
    pos: [7.8, 0, 2.5],
    target: [8.5, 0, -4.0],
    speed: 1.9,
    phrase: '🌸 Hot Potato match is starting!',
  },
  {
    id: 'npc-blue',
    name: 'Sky Blue',
    kind: 'muse',
    color: '#bae6fd',
    pos: [-8.2, 0, -2.0],
    target: [-6.5, 0, -11.0],
    speed: 1.7,
    phrase: '🪙 Getting ready for Coin Catcher!',
  },
  {
    id: 'npc-yellow',
    name: 'Lemon Yellow',
    kind: 'muse',
    color: '#fef08a',
    pos: [1.5, 0, 11.5],
    target: [-4.0, 0, 11.0],
    speed: 1.5,
    phrase: '☕ Coffee at the cyber cafe?',
  },

  // 2. Chibi & Humanoid Visitors (Cyber Streetwear from attentionagents.fun)
  {
    id: 'npc-pixel',
    name: 'PixelQueen',
    kind: 'human',
    color: '#ec4899',
    pos: [9.2, 0, 6.5],
    target: [12.0, 0, 9.0],
    speed: 2.1,
    phrase: '🎮 Need a partner for Hot Potato!',
  },
  {
    id: 'npc-nova',
    name: 'NovaStar',
    kind: 'human',
    color: '#38bdf8',
    pos: [-9.5, 0, 5.0],
    target: [-12.0, 0, 8.0],
    speed: 2.2,
    phrase: '🏆 High score today: 120 PTS!',
  },
  {
    id: 'npc-boba',
    name: 'BobaKid',
    kind: 'human',
    color: '#84cc16',
    pos: [8.5, 0, -8.0],
    target: [6.5, 0, -12.0],
    speed: 2.0,
    phrase: '🧋 Taro milk tea on the way.',
  },
  {
    id: 'npc-shadow',
    name: 'ShadowX',
    kind: 'human',
    color: '#a855f7',
    pos: [-3.5, 0, -11.0],
    target: [3.5, 0, -11.0],
    speed: 2.0,
    phrase: '⚡ The Arcade doors are open!',
  },
]

interface CityNPCsProps {
  playerPos?: [number, number, number]
}

export const CityNPCs: React.FC<CityNPCsProps> = ({ playerPos = [0, 1.5, 7.8] }) => {
  const npcsRef = useRef<NPCState[]>(INITIAL_NPCS)
  const posGroupRefs = useRef<{ [id: string]: THREE.Group | null }>({})
  const bodyRefs = useRef<{ [id: string]: THREE.Group | null }>({})

  // Waypoints circling open plaza courtyard, benches, and doorways
  const waypoints: [number, number, number][] = [
    [0, 0, 8.5],
    [5.5, 0, 7.5],
    [-5.5, 0, 7.5],
    [8.5, 0, 3.0],
    [-8.5, 0, 3.0],
    [8.0, 0, -6.5],
    [-8.0, 0, -6.5],
    [-6.5, 0, -12.0],
    [6.5, 0, -12.0],
    [0, 0, 12.0],
    [9.5, 0, 10.0],
    [-9.5, 0, 10.0],
  ]

  useFrame((_, delta) => {
    npcsRef.current.forEach((npc) => {
      const posGrp = posGroupRefs.current[npc.id]
      const bodyGrp = bodyRefs.current[npc.id]
      if (!posGrp || !bodyGrp) return

      const dx = npc.target[0] - npc.pos[0]
      const dz = npc.target[2] - npc.pos[2]
      const dist = Math.hypot(dx, dz)

      if (dist < 0.6) {
        const wp = waypoints[Math.floor(Math.random() * waypoints.length)]
        npc.target = [wp[0] + (Math.random() - 0.5) * 2, 0, wp[2] + (Math.random() - 0.5) * 2]
      } else {
        const moveDist = Math.min(dist, npc.speed * delta)
        npc.pos[0] += (dx / dist) * moveDist
        npc.pos[2] += (dz / dist) * moveDist

        // Rotate only the body towards movement direction
        const targetRot = Math.atan2(dx, dz)
        bodyGrp.rotation.y = THREE.MathUtils.lerp(bodyGrp.rotation.y, targetRot, delta * 8)
      }

      posGrp.position.set(npc.pos[0], npc.pos[1], npc.pos[2])
    })
  })

  return (
    <group>
      {npcsRef.current.map((npc) => {
        const distToPlayer = Math.hypot(
          npc.pos[0] - playerPos[0],
          npc.pos[2] - playerPos[2]
        )
        const showBubble = distToPlayer < 2.5

        return (
          <group
            key={npc.id}
            ref={(el) => {
              posGroupRefs.current[npc.id] = el
            }}
            position={npc.pos}
          >
            {/* NPC Model using authentic 3D MemeCharacterMesh */}
            <group
              ref={(el) => {
                bodyRefs.current[npc.id] = el
              }}
            >
              <MemeCharacterMesh
                type={npc.kind === 'muse' ? 'muse_mascot' : 'chibi_agent'}
                isMoving={true}
                skinColor={npc.color}
                topColor={npc.kind === 'muse' ? npc.color : '#8f7cf2'}
              />
            </group>

            {/* Clean, Compact Floating Name Badge */}
            <Billboard position={[0, 1.85, 0]}>
              <Text
                fontSize={0.15}
                color={npc.kind === 'muse' ? '#fde047' : '#38bdf8'}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.025}
                outlineColor="#000000"
                fontWeight="bold"
              >
                {npc.name}
              </Text>
            </Billboard>

            {/* Proximity Speech Bubble when player walks within 2.5m */}
            {showBubble && (
              <Billboard position={[0, 2.25, 0]}>
                <mesh position={[0, 0, -0.01]}>
                  <planeGeometry args={[Math.min(2.8, npc.phrase.length * 0.08 + 0.45), 0.32]} />
                  <meshBasicMaterial color="#0f172a" transparent opacity={0.92} />
                </mesh>
                <Text
                  position={[0, 0, 0.02]}
                  fontSize={0.12}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                  maxWidth={2.6}
                >
                  {npc.phrase}
                </Text>
              </Billboard>
            )}
          </group>
        )
      })}
    </group>
  )
}
