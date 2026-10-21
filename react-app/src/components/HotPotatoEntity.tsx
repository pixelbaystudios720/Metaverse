import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface HotPotatoEntityProps {
  holderPosition: [number, number, number] | null
  holderName: string
  timeLeft: number
  isExploding: boolean
  roundActive: boolean
}

const FLAME_COUNT = 45
const SMOKE_COUNT = 30
const SPARK_COUNT = 40

export const HotPotatoEntity: React.FC<HotPotatoEntityProps> = ({
  holderPosition,
  holderName,
  timeLeft,
  isExploding,
  roundActive,
}) => {
  const potatoRef = useRef<THREE.Group>(null)
  const coreMeshRef = useRef<THREE.Mesh>(null)
  const blastWaveRef = useRef<THREE.Mesh>(null)

  // Flying state when transferring between players
  const [currentPos, setCurrentPos] = useState<[number, number, number]>([0, 10, 0])
  const flightRef = useRef<{
    isFlying: boolean
    startPos: THREE.Vector3
    targetPos: THREE.Vector3
    progress: number
    lastHolderPos: THREE.Vector3 | null
  }>({
    isFlying: false,
    startPos: new THREE.Vector3(0, 0, 0),
    targetPos: new THREE.Vector3(0, 0, 0),
    progress: 1,
    lastHolderPos: null,
  })

  // Flame particle buffers
  const flameParticles = useMemo(() => {
    const positions = new Float32Array(FLAME_COUNT * 3)
    const velocities = new Float32Array(FLAME_COUNT * 3)
    const lives = new Float32Array(FLAME_COUNT)
    for (let i = 0; i < FLAME_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.4
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.8
      velocities[i * 3 + 1] = 0.8 + Math.random() * 1.5
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8
      lives[i] = Math.random()
    }
    return { positions, velocities, lives }
  }, [])

  // Smoke particle buffers
  const smokeParticles = useMemo(() => {
    const positions = new Float32Array(SMOKE_COUNT * 3)
    const velocities = new Float32Array(SMOKE_COUNT * 3)
    const lives = new Float32Array(SMOKE_COUNT)
    for (let i = 0; i < SMOKE_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.5
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.4
      velocities[i * 3 + 1] = 1.2 + Math.random() * 1.8
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      lives[i] = Math.random()
    }
    return { positions, velocities, lives }
  }, [])

  // Spark particle buffers
  const sparkParticles = useMemo(() => {
    const positions = new Float32Array(SPARK_COUNT * 3)
    const velocities = new Float32Array(SPARK_COUNT * 3)
    const lives = new Float32Array(SPARK_COUNT)
    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3 + 0] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      const speed = 2.0 + Math.random() * 3.5
      const angle = Math.random() * Math.PI * 2
      const pitch = (Math.random() - 0.5) * Math.PI
      velocities[i * 3 + 0] = Math.cos(angle) * Math.cos(pitch) * speed
      velocities[i * 3 + 1] = Math.sin(pitch) * speed + 1.0
      velocities[i * 3 + 2] = Math.sin(angle) * Math.cos(pitch) * speed
      lives[i] = Math.random()
    }
    return { positions, velocities, lives }
  }, [])

  const flameGeoRef = useRef<THREE.BufferGeometry>(null)
  const smokeGeoRef = useRef<THREE.BufferGeometry>(null)
  const sparkGeoRef = useRef<THREE.BufferGeometry>(null)

  // Track target holder position and trigger flight trajectory
  useEffect(() => {
    if (!holderPosition) return
    const newTarget = new THREE.Vector3(holderPosition[0], holderPosition[1] + 2.2, holderPosition[2])

    if (flightRef.current.lastHolderPos && flightRef.current.lastHolderPos.distanceTo(newTarget) > 1.8) {
      // Start flying arc between players!
      flightRef.current.isFlying = true
      flightRef.current.startPos.copy(flightRef.current.lastHolderPos)
      flightRef.current.targetPos.copy(newTarget)
      flightRef.current.progress = 0
    } else {
      flightRef.current.lastHolderPos = newTarget.clone()
      setCurrentPos([newTarget.x, newTarget.y, newTarget.z])
    }
    flightRef.current.lastHolderPos = newTarget.clone()
  }, [holderPosition])

  useFrame((_, delta) => {
    if (!roundActive && !isExploding) return

    // 1. Animate Flight Trajectory
    const fl = flightRef.current
    if (fl.isFlying) {
      fl.progress += delta * 1.8 // ~0.55s flight time
      if (fl.progress >= 1) {
        fl.progress = 1
        fl.isFlying = false
        setCurrentPos([fl.targetPos.x, fl.targetPos.y, fl.targetPos.z])
      } else {
        const t = fl.progress
        const arcY = Math.sin(t * Math.PI) * 2.8 // Parabolic height arc
        const curX = THREE.MathUtils.lerp(fl.startPos.x, fl.targetPos.x, t)
        const curY = THREE.MathUtils.lerp(fl.startPos.y, fl.targetPos.y, t) + arcY
        const curZ = THREE.MathUtils.lerp(fl.startPos.z, fl.targetPos.z, t)
        setCurrentPos([curX, curY, curZ])
      }
    } else if (holderPosition) {
      // Float bobbing above holder's head
      const bob = Math.sin(Date.now() * 0.008) * 0.15
      setCurrentPos([holderPosition[0], holderPosition[1] + 2.2 + bob, holderPosition[2]])
    }

    if (potatoRef.current) {
      potatoRef.current.position.set(currentPos[0], currentPos[1], currentPos[2])
      potatoRef.current.rotation.y += delta * 5
      potatoRef.current.rotation.x += delta * 3
    }

    // Pulse core potato flame
    if (coreMeshRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.018) * 0.12
      coreMeshRef.current.scale.set(pulse, pulse, pulse)
    }

    // 2. Animate Flame Particles
    if (flameGeoRef.current) {
      const pos = flameGeoRef.current.attributes.position.array as Float32Array
      for (let i = 0; i < FLAME_COUNT; i++) {
        flameParticles.lives[i] += delta * 2.2
        if (flameParticles.lives[i] > 1.0) {
          flameParticles.lives[i] = 0
          pos[i * 3 + 0] = (Math.random() - 0.5) * 0.35
          pos[i * 3 + 1] = 0
          pos[i * 3 + 2] = (Math.random() - 0.5) * 0.35
        } else {
          pos[i * 3 + 0] += flameParticles.velocities[i * 3 + 0] * delta
          pos[i * 3 + 1] += flameParticles.velocities[i * 3 + 1] * delta
          pos[i * 3 + 2] += flameParticles.velocities[i * 3 + 2] * delta
        }
      }
      flameGeoRef.current.attributes.position.needsUpdate = true
    }

    // 3. Animate Smoke Particles
    if (smokeGeoRef.current) {
      const pos = smokeGeoRef.current.attributes.position.array as Float32Array
      for (let i = 0; i < SMOKE_COUNT; i++) {
        smokeParticles.lives[i] += delta * 1.2
        if (smokeParticles.lives[i] > 1.0) {
          smokeParticles.lives[i] = 0
          pos[i * 3 + 0] = (Math.random() - 0.5) * 0.4
          pos[i * 3 + 1] = 0.2
          pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4
        } else {
          pos[i * 3 + 0] += smokeParticles.velocities[i * 3 + 0] * delta
          pos[i * 3 + 1] += smokeParticles.velocities[i * 3 + 1] * delta
          pos[i * 3 + 2] += smokeParticles.velocities[i * 3 + 2] * delta
        }
      }
      smokeGeoRef.current.attributes.position.needsUpdate = true
    }

    // 4. Animate Spark Particles
    if (sparkGeoRef.current) {
      const pos = sparkGeoRef.current.attributes.position.array as Float32Array
      for (let i = 0; i < SPARK_COUNT; i++) {
        sparkParticles.lives[i] += delta * 3.0
        if (sparkParticles.lives[i] > 1.0) {
          sparkParticles.lives[i] = 0
          pos[i * 3 + 0] = 0
          pos[i * 3 + 1] = 0
          pos[i * 3 + 2] = 0
        } else {
          pos[i * 3 + 0] += sparkParticles.velocities[i * 3 + 0] * delta
          pos[i * 3 + 1] += (sparkParticles.velocities[i * 3 + 1] - 4.5 * sparkParticles.lives[i]) * delta
          pos[i * 3 + 2] += sparkParticles.velocities[i * 3 + 2] * delta
        }
      }
      sparkGeoRef.current.attributes.position.needsUpdate = true
    }

    // 5. Explosion shockwave animation
    if (blastWaveRef.current) {
      if (isExploding) {
        blastWaveRef.current.visible = true
        blastWaveRef.current.scale.addScalar(delta * 28)
      } else {
        blastWaveRef.current.visible = false
        blastWaveRef.current.scale.set(1, 1, 1)
      }
    }
  })

  if (!roundActive && !isExploding) return null

  return (
    <group>
      {/* 3D Flaming Potato Group */}
      <group ref={potatoRef} position={currentPos}>
        {/* Core Glowing 3D Potato Sphere */}
        <mesh ref={coreMeshRef} castShadow>
          <sphereGeometry args={[0.5, 24, 24]} />
          <meshStandardMaterial
            color="#ea580c"
            emissive="#f97316"
            emissiveIntensity={3.2}
            roughness={0.2}
          />
        </mesh>

        {/* Fiery Corona Aura Mesh */}
        <mesh>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshBasicMaterial color="#ef4444" wireframe={true} transparent opacity={0.65} />
        </mesh>

        {/* Outer Ember Spark Halo */}
        <mesh>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial color="#fbbf24" wireframe={true} transparent opacity={0.35} />
        </mesh>

        {/* Dynamic Warm Fire Point Light */}
        <pointLight intensity={24} distance={9} color="#f97316" castShadow />

        {/* Animated Particle Emitter: Flame Trails */}
        <points>
          <bufferGeometry ref={flameGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[flameParticles.positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.28}
            color="#f97316"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Animated Particle Emitter: Dark Smoke Trails */}
        <points>
          <bufferGeometry ref={smokeGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[smokeParticles.positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.42}
            color="#334155"
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </points>

        {/* Animated Particle Emitter: Spark Trails */}
        <points>
          <bufferGeometry ref={sparkGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[sparkParticles.positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.15}
            color="#fef08a"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Floating Countdown Timer & Carrier Name Label */}
        <group position={[0, 1.25, 0]}>
          <Text
            fontSize={0.44}
            color={timeLeft <= 4 ? '#ff1111' : '#f59e0b'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.07}
            outlineColor="#000000"
          >
            🔥 {timeLeft.toFixed(1)}s 🔥
          </Text>
          <Text
            position={[0, -0.42, 0]}
            fontSize={0.26}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            {flightRef.current.isFlying ? '⚡ IN FLIGHT ⚡' : holderName}
          </Text>
        </group>
      </group>

      {/* Explosion Shockwave Wave */}
      <mesh
        ref={blastWaveRef}
        position={[currentPos[0], currentPos[1] - 1.5, currentPos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.5, 1.6, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
