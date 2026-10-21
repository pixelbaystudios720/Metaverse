import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CarData {
  radius: number
  speed: number
  offsetAngle: number
  color: string
}

const CARS_DATA: CarData[] = [
  { radius: 56, speed: 0.28, offsetAngle: 0, color: '#06b6d4' },
  { radius: 56, speed: 0.28, offsetAngle: Math.PI * 0.6, color: '#ec4899' },
  { radius: 56, speed: 0.28, offsetAngle: Math.PI * 1.3, color: '#eab308' },
  { radius: 60, speed: -0.24, offsetAngle: Math.PI * 0.3, color: '#8b5cf6' },
  { radius: 60, speed: -0.24, offsetAngle: Math.PI * 1.0, color: '#10b981' },
  { radius: 60, speed: -0.24, offsetAngle: Math.PI * 1.7, color: '#f97316' },
]

export const Traffic: React.FC = () => {
  const carsRef = useRef<(THREE.Group | null)[]>([])

  useFrame((_, delta) => {
    CARS_DATA.forEach((car, idx) => {
      const mesh = carsRef.current[idx]
      if (!mesh) return
      car.offsetAngle += car.speed * delta
      const x = Math.cos(car.offsetAngle) * car.radius
      const z = Math.sin(car.offsetAngle) * car.radius
      mesh.position.set(x, 0.45, z)
      // Tangent angle
      const forwardAngle = car.offsetAngle + (car.speed > 0 ? -Math.PI / 2 : Math.PI / 2)
      mesh.rotation.y = forwardAngle
    })
  })

  return (
    <group>
      {CARS_DATA.map((car, idx) => (
        <group
          key={idx}
          ref={(el) => {
            carsRef.current[idx] = el
          }}
          position={[car.radius, 0.45, 0]}
        >
          {/* Main Car Body */}
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.7, 3.6]} />
            <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.7} />
          </mesh>

          {/* Cabin Glass */}
          <mesh position={[0, 0.5, -0.2]}>
            <boxGeometry args={[1.5, 0.55, 2.0]} />
            <meshStandardMaterial color="#0284c7" roughness={0.1} transparent opacity={0.8} />
          </mesh>

          {/* Headlights (Front is +Z in model space) */}
          <mesh position={[-0.6, 0, 1.8]}>
            <boxGeometry args={[0.3, 0.2, 0.05]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.6, 0, 1.8]}>
            <boxGeometry args={[0.3, 0.2, 0.05]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Taillights (Back is -Z in model space) */}
          <mesh position={[-0.6, 0, -1.8]}>
            <boxGeometry args={[0.3, 0.2, 0.05]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0.6, 0, -1.8]}>
            <boxGeometry args={[0.3, 0.2, 0.05]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>

          {/* Wheels */}
          {[-0.95, 0.95].map((wx, wIdx) =>
            [-1.1, 1.1].map((wz, wzIdx) => (
              <mesh
                key={`${wIdx}-${wzIdx}`}
                position={[wx, -0.2, wz]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.35, 0.35, 0.2, 12]} />
                <meshStandardMaterial color="#111827" roughness={0.9} />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  )
}
