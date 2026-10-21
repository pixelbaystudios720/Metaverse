import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

export type CharacterType =
  | 'chibi_agent'
  | 'muse_mascot'
  | 'gigachad'
  | 'swole'
  | 'confusion'
  | 'chill'
  | 'noob'

export interface CharacterConfig {
  type: CharacterType
  skinColor: string
  topColor: string
  bottomColor: string
  shoeColor: string
}

export const SKIN_TONES = [
  { name: 'Fair Light', color: '#ffd6ba' },
  { name: 'Warm Peach', color: '#ffc7a6' },
  { name: 'Golden Olive', color: '#eaab83' },
  { name: 'Caramel Bronze', color: '#d08f63' },
  { name: 'Deep Mocha', color: '#ad7049' },
  { name: 'Rich Espresso', color: '#7d5136' },
  { name: 'Cyber Neon', color: '#38bdf8' },
  { name: 'Pastel Coral', color: '#fb7185' },
]

export const OUTFIT_COLORS = [
  { name: 'Cyber Lavender', color: '#8f7cf2' },
  { name: 'Bubblegum Pink', color: '#ff9ec0' },
  { name: 'Neon Mint', color: '#6fd6bd' },
  { name: 'Mustard Gold', color: '#ffd36e' },
  { name: 'Sky Blue', color: '#7cb8ff' },
  { name: 'Clean White', color: '#e8e4dc' },
  { name: 'Midnight Navy', color: '#33364d' },
  { name: 'Dark Slate', color: '#1f1e26' },
]

export const CHARACTER_PRESETS: {
  id: CharacterType
  name: string
  title: string
  badge: string
  icon: string
  description: string
  defaultConfig: CharacterConfig
}[] = [
  {
    id: 'chibi_agent',
    name: 'Chibi Net Kid',
    title: 'Attention Agents Hero',
    badge: 'OFFICIAL',
    icon: '🐱',
    description: 'Iconic attentionagents.fun hero: Cat Hood, oversized hoodie, glowing LED headphones & kicks.',
    defaultConfig: {
      type: 'chibi_agent',
      skinColor: '#ffd6ba',
      topColor: '#8f7cf2',
      bottomColor: '#33364d',
      shoeColor: '#6fd6bd',
    },
  },
  {
    id: 'muse_mascot',
    name: 'Musebot Sprout',
    title: 'Attention Mascot',
    badge: 'MASCOT',
    icon: '🌱',
    description: 'The fluffy Attention Agents mascot from attentionagents.fun with sprout leaf & cute waddle.',
    defaultConfig: {
      type: 'muse_mascot',
      skinColor: '#ffedd5',
      topColor: '#22c55e',
      bottomColor: '#15803d',
      shoeColor: '#166534',
    },
  },
  {
    id: 'gigachad',
    name: 'Gigachad',
    title: 'Cyber Chad',
    badge: 'CHAD',
    icon: '👑',
    description: 'Chiseled abs, open neon jacket, cyber shades, and floating royal crown.',
    defaultConfig: {
      type: 'gigachad',
      skinColor: '#f5c699',
      topColor: '#1e1b4b',
      bottomColor: '#0f172a',
      shoeColor: '#06b6d4',
    },
  },
  {
    id: 'swole',
    name: 'Swole',
    title: 'Gym Gamer',
    badge: 'BUFF',
    icon: '💪',
    description: 'Muscular arms, cyber tank-top, gamer headset with mic, and wristbands.',
    defaultConfig: {
      type: 'swole',
      skinColor: '#eaab83',
      topColor: '#0284c7',
      bottomColor: '#1e293b',
      shoeColor: '#ec4899',
    },
  },
  {
    id: 'confusion',
    name: 'Confusion',
    title: 'Derpy Kid',
    badge: 'DERP',
    icon: '🤪',
    description: 'Chubby build, backward cap, hilarious googly eyes, and rainbow windbreaker.',
    defaultConfig: {
      type: 'confusion',
      skinColor: '#ffc7a6',
      topColor: '#ec4899',
      bottomColor: '#334155',
      shoeColor: '#f97316',
    },
  },
  {
    id: 'chill',
    name: 'Chill Pepe',
    title: 'Frogge Streetwear',
    badge: 'CHILL',
    icon: '🐸',
    description: 'Frog hoodie with froggy eyes on top, neck headphones, and skate sneakers.',
    defaultConfig: {
      type: 'chill',
      skinColor: '#84cc16',
      topColor: '#3b82f6',
      bottomColor: '#1f2937',
      shoeColor: '#a855f7',
    },
  },
  {
    id: 'noob',
    name: 'Meme Guy',
    title: 'Blockhead Noob',
    badge: 'POTATO',
    icon: '🔥',
    description: 'Blockhead meme avatar, rainbow hoodie, and flaming Potato Run backpack!',
    defaultConfig: {
      type: 'noob',
      skinColor: '#fde047',
      topColor: '#f43f5e',
      bottomColor: '#1e293b',
      shoeColor: '#f59e0b',
    },
  },
]

interface MemeCharacterMeshProps {
  type: CharacterType
  isMoving?: boolean
  hasPotato?: boolean
  skinColor?: string
  topColor?: string
  bottomColor?: string
  shoeColor?: string
}

export const MemeCharacterMesh: React.FC<MemeCharacterMeshProps> = ({
  type,
  isMoving = false,
  hasPotato = false,
  skinColor,
  topColor,
  bottomColor,
  shoeColor,
}) => {
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const sproutLeafRef = useRef<THREE.Group>(null)

  const preset = CHARACTER_PRESETS.find((p) => p.id === type) || CHARACTER_PRESETS[0]
  const currentSkin = skinColor || preset.defaultConfig.skinColor
  const currentTop = topColor || preset.defaultConfig.topColor
  const currentBottom = bottomColor || preset.defaultConfig.bottomColor
  const currentShoe = shoeColor || preset.defaultConfig.shoeColor

  useFrame((_, delta) => {
    if (isMoving) {
      const swing = Math.sin(Date.now() * 0.012) * 0.6
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.75
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.75
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
    }

    if (sproutLeafRef.current) {
      sproutLeafRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 0.2
    }
  })

  // 1. ATTENTION AGENTS OFFICIAL HERO: CHIBI NET KID
  if (type === 'chibi_agent') {
    return (
      <group position={[0, 0, 0]}>
        {/* Head with Customizable Skin Tone */}
        <group position={[0, 1.42, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 20, 20]} />
            <meshStandardMaterial color={currentSkin} roughness={0.4} />
          </mesh>

          {/* Big Anime Eyes */}
          {[-0.14, 0.14].map((ex, idx) => (
            <group key={idx} position={[ex, 0.04, 0.32]}>
              <mesh>
                <sphereGeometry args={[0.075, 12, 12]} />
                <meshBasicMaterial color="#1e1b4b" />
              </mesh>
              {/* Eye White Sparkle */}
              <mesh position={[0.02, 0.025, 0.05]}>
                <sphereGeometry args={[0.028, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}

          {/* Rosy Blush Cheeks */}
          {[-0.22, 0.22].map((bx, idx) => (
            <mesh key={idx} position={[bx, -0.06, 0.3]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color="#fb7185" transparent opacity={0.65} />
            </mesh>
          ))}

          {/* Cat Ears Hood */}
          <mesh position={[0, 0.1, -0.04]}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshStandardMaterial color={currentTop} roughness={0.5} />
          </mesh>
          {/* Left & Right Cat Ears */}
          {[-0.26, 0.26].map((earX, idx) => (
            <mesh
              key={idx}
              position={[earX, 0.44, 0.02]}
              rotation={[0, 0, idx === 0 ? 0.35 : -0.35]}
              castShadow
            >
              <coneGeometry args={[0.13, 0.24, 4]} />
              <meshStandardMaterial color={currentTop} roughness={0.4} />
            </mesh>
          ))}

          {/* Glowing LED Headphones around neck/ears */}
          <group position={[0, -0.15, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.36, 0.04, 8, 20]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
            {/* Left and Right Glowing Ear Cups */}
            {[-0.4, 0.4].map((hx, idx) => (
              <mesh key={idx} position={[hx, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={2.5}
                />
              </mesh>
            ))}
          </group>
        </group>

        {/* Oversized Streetwear Hoodie Torso */}
        <mesh position={[0, 0.88, 0]} castShadow>
          <capsuleGeometry args={[0.34, 0.44, 8, 16]} />
          <meshStandardMaterial color={currentTop} roughness={0.6} />
        </mesh>
        {/* Front Hoodie Kangaroo Pocket */}
        <mesh position={[0, 0.78, 0.26]}>
          <boxGeometry args={[0.36, 0.18, 0.12]} />
          <meshStandardMaterial color={currentTop} roughness={0.7} />
        </mesh>

        {/* Left Arm with skin hand */}
        <group ref={leftArmRef} position={[-0.42, 1.05, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.32, 6, 10]} />
            <meshStandardMaterial color={currentTop} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>

        {/* Right Arm with skin hand */}
        <group ref={rightArmRef} position={[0.42, 1.05, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.32, 6, 10]} />
            <meshStandardMaterial color={currentTop} />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>

        {/* Left Leg: Baggy Joggers & Chunky Kicks */}
        <group ref={leftLegRef} position={[-0.18, 0.58, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.3, 6, 10]} />
            <meshStandardMaterial color={currentBottom} roughness={0.6} />
          </mesh>
          {/* Sneaker */}
          <mesh position={[0, -0.46, 0.05]} castShadow>
            <boxGeometry args={[0.2, 0.14, 0.32]} />
            <meshStandardMaterial color={currentShoe} roughness={0.3} />
          </mesh>
        </group>

        {/* Right Leg: Baggy Joggers & Chunky Kicks */}
        <group ref={rightLegRef} position={[0.18, 0.58, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.3, 6, 10]} />
            <meshStandardMaterial color={currentBottom} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.46, 0.05]} castShadow>
            <boxGeometry args={[0.2, 0.14, 0.32]} />
            <meshStandardMaterial color={currentShoe} roughness={0.3} />
          </mesh>
        </group>
      </group>
    )
  }

  // 2. ATTENTION AGENTS OFFICIAL MASCOT: MUSEBOT SPROUT (Exact match to reference screenshot)
  if (type === 'muse_mascot') {
    const mintBodyColor = currentTop || '#a7f3d0'
    const earColor = '#6ee7b7'

    return (
      <group position={[0, 0, 0]}>
        {/* Mint Green Egg/Capsule Body matching Screenshot */}
        <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.42, 0.44, 16, 24]} />
          <meshStandardMaterial
            color={mintBodyColor}
            roughness={0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Two Cute Sprout/Bunny Ears on Top */}
        <group ref={sproutLeafRef} position={[0, 1.42, 0]}>
          {/* Left Ear */}
          <group position={[-0.14, 0.12, 0]} rotation={[0, 0, 0.2]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.07, 0.22, 8, 12]} />
              <meshStandardMaterial color={earColor} roughness={0.5} />
            </mesh>
          </group>
          {/* Right Ear */}
          <group position={[0.14, 0.12, 0]} rotation={[0, 0, -0.2]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.07, 0.22, 8, 12]} />
              <meshStandardMaterial color={earColor} roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* Cute Face (when viewed from front) */}
        <group position={[0, 0.95, 0.41]}>
          {/* Left Eye */}
          <mesh position={[-0.12, 0.08, 0]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          {/* Right Eye */}
          <mesh position={[0.12, 0.08, 0]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          {/* Cute Smile / Nose */}
          <mesh position={[0, 0.01, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#059669" />
          </mesh>
        </group>

        {/* Little Waddling Feet */}
        <group ref={leftLegRef} position={[-0.16, 0.38, 0]}>
          <mesh position={[0, -0.12, 0.04]} castShadow>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshStandardMaterial color="#6ee7b7" roughness={0.5} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.16, 0.38, 0]}>
          <mesh position={[0, -0.12, 0.04]} castShadow>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshStandardMaterial color="#6ee7b7" roughness={0.5} />
          </mesh>
        </group>
      </group>
    )
  }

  // 3. GIGACHAD
  if (type === 'gigachad') {
    return (
      <group position={[0, 0, 0]}>
        {/* Floating Crown */}
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
          <group position={[0, 2.3, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.22, 0.18, 0.14, 5]} />
              <meshStandardMaterial
                color="#facc15"
                metalness={0.9}
                roughness={0.2}
                emissive="#ca8a04"
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>
        </Float>

        {/* Head with Chiseled Jaw */}
        <group position={[0, 1.65, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.48, 0.42]} />
            <meshStandardMaterial color={currentSkin} roughness={0.3} />
          </mesh>
          {/* Cyber Shades */}
          <mesh position={[0, 0.08, 0.22]}>
            <boxGeometry args={[0.38, 0.11, 0.06]} />
            <meshStandardMaterial
              color="#0f172a"
              emissive="#06b6d4"
              emissiveIntensity={1.5}
              roughness={0.1}
            />
          </mesh>
          {/* Signature Hair Pompadour */}
          <mesh position={[0, 0.28, -0.05]} castShadow>
            <boxGeometry args={[0.44, 0.22, 0.44]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.7} />
          </mesh>
        </group>

        {/* Muscular Torso & Open Bomber Jacket */}
        <group position={[0, 1.05, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.62, 0.65, 0.35]} />
            <meshStandardMaterial color={currentTop} roughness={0.5} />
          </mesh>
          {/* Chiseled Abs Chest */}
          <mesh position={[0, -0.02, 0.1]}>
            <boxGeometry args={[0.32, 0.52, 0.22]} />
            <meshStandardMaterial color={currentSkin} roughness={0.3} />
          </mesh>
        </group>

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.44, 1.25, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.18, 0.55, 0.2]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.44, 1.25, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.18, 0.55, 0.2]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={leftLegRef} position={[-0.18, 0.65, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <boxGeometry args={[0.2, 0.65, 0.24]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.18, 0.65, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <boxGeometry args={[0.2, 0.65, 0.24]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
      </group>
    )
  }

  // 4. SWOLE
  if (type === 'swole') {
    return (
      <group position={[0, 0, 0]}>
        {/* Head & Gamer Headset with Mic */}
        <group position={[0, 1.55, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color={currentSkin} roughness={0.3} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.32, 0.04, 8, 24]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Broad Shoulders & Gym Tank-top */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[0.75, 0.65, 0.45]} />
          <meshStandardMaterial color={currentTop} roughness={0.4} />
        </mesh>

        {/* Huge Biceps */}
        <group ref={leftArmRef} position={[-0.52, 1.15, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.26, 0.5, 0.26]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.52, 1.15, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.26, 0.5, 0.26]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={leftLegRef} position={[-0.2, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.24, 0.6, 0.28]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.2, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.24, 0.6, 0.28]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
      </group>
    )
  }

  // 5. CONFUSION
  if (type === 'confusion') {
    return (
      <group position={[0, 0, 0]}>
        {/* Chubby Round Head */}
        <group position={[0, 1.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.38, 16, 16]} />
            <meshStandardMaterial color={currentSkin} />
          </mesh>
          {/* Googly Eyes */}
          <mesh position={[-0.14, 0.08, 0.32]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.14, 0.08, 0.39]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[0.14, 0.05, 0.32]}>
            <sphereGeometry args={[0.13, 10, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.14, 0.02, 0.42]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>

        {/* Chubby Windbreaker Body */}
        <mesh position={[0, 0.88, 0]} castShadow>
          <sphereGeometry args={[0.48, 16, 16]} />
          <meshStandardMaterial color={currentTop} roughness={0.6} />
        </mesh>

        <group ref={leftLegRef} position={[-0.18, 0.5, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.45, 0.2]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.18, 0.5, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.45, 0.2]} />
            <meshStandardMaterial color={currentBottom} />
          </mesh>
        </group>
      </group>
    )
  }

  // Fallback / Chill Pepe & Meme Guy
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial color={currentSkin} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.35]} />
        <meshStandardMaterial color={currentTop} />
      </mesh>
      <group ref={leftLegRef} position={[-0.18, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.18, 0.5, 0.2]} />
          <meshStandardMaterial color={currentBottom} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.18, 0.55, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.18, 0.5, 0.2]} />
          <meshStandardMaterial color={currentBottom} />
        </mesh>
      </group>
    </group>
  )
}
