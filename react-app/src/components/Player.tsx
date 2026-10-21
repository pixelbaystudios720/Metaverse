import React, { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { playJumpSound } from '../audio'
import { MemeCharacterMesh, CharacterType } from './characters/MemeCharacterMesh'

interface PlayerProps {
  onPositionChange: (pos: [number, number, number]) => void
  onInteract: () => void
  isSitting: boolean
  onStandUp: () => void
  spawnTrigger: number
  hasPotato: boolean
  characterType: CharacterType
  playerPos?: [number, number, number]
  skinColor?: string
  topColor?: string
}

export const Player: React.FC<PlayerProps> = ({
  onPositionChange,
  onInteract,
  isSitting,
  onStandUp,
  spawnTrigger,
  hasPotato,
  characterType,
  playerPos,
  skinColor,
  topColor,
}) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const avatarGroupRef = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const [isMovingState, setIsMovingState] = useState(false)

  // Camera angles calibrated to match reference screenshot
  const cameraAngles = useRef({
    yaw: 0,
    pitch: 0.16,
    distance: 4.8,
  })

  const lastReportedPos = useRef<[number, number, number]>([0, 0, 0])
  const lastReportTime = useRef<number>(0)
  const isOnGround = useRef(true)

  // Handle teleport / repositioning
  useEffect(() => {
    if (rigidBodyRef.current && spawnTrigger > 0 && playerPos) {
      rigidBodyRef.current.setTranslation({ x: playerPos[0], y: playerPos[1], z: playerPos[2] }, true)
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      lastReportedPos.current = [playerPos[0], playerPos[1], playerPos[2]]

      // Snap camera directly to avoid lerping delay across map
      const camDist = cameraAngles.current.distance
      const camYaw = cameraAngles.current.yaw
      const camPitch = cameraAngles.current.pitch
      const cx = playerPos[0] + Math.sin(camYaw) * Math.cos(camPitch) * camDist
      const cy = playerPos[1] + 1.8 + Math.sin(camPitch) * camDist
      const cz = playerPos[2] + Math.cos(camYaw) * Math.cos(camPitch) * camDist
      camera.position.set(cx, cy, cz)
      camera.lookAt(playerPos[0], playerPos[1] + 1.4, playerPos[2])
    }
  }, [spawnTrigger, playerPos])

  // Input states
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  })

  const isMouseDown = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true
          break
        case 'Space':
          if (!keys.current.jump && isOnGround.current) {
            keys.current.jump = true
          }
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = true
          break
        case 'KeyE':
          if (isSitting) {
            onStandUp()
          } else {
            onInteract()
          }
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false
          break
        case 'Space':
          keys.current.jump = false
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onInteract, isSitting, onStandUp])

  // Mouse camera orbit
  useEffect(() => {
    const dom = gl.domElement

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom || isMouseDown.current) {
        const movementX = document.pointerLockElement === dom ? e.movementX : e.clientX - lastMousePos.current.x
        const movementY = document.pointerLockElement === dom ? e.movementY : e.clientY - lastMousePos.current.y
        lastMousePos.current = { x: e.clientX, y: e.clientY }

        cameraAngles.current.yaw -= movementX * 0.004
        cameraAngles.current.pitch = Math.max(
          -0.1,
          Math.min(1.2, cameraAngles.current.pitch + movementY * 0.004)
        )
      }
    }

    const onMouseUp = () => {
      isMouseDown.current = false
    }

    const onWheel = (e: WheelEvent) => {
      cameraAngles.current.distance = Math.max(
        4,
        Math.min(18, cameraAngles.current.distance + e.deltaY * 0.005)
      )
    }

    dom.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dom.addEventListener('wheel', onWheel)

    return () => {
      dom.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      dom.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  // Teleport respawn

  useFrame((_, delta) => {
    const rb = rigidBodyRef.current
    if (!rb) return

    const translation = rb.translation()
    const linvel = rb.linvel()

    // Fall recovery
    if (translation.y < -10) {
      const respawnX = lastReportedPos.current[0] || 0
      const respawnZ = lastReportedPos.current[2] || 0
      rb.setTranslation({ x: respawnX, y: 1.5, z: respawnZ }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    isOnGround.current = Math.abs(linvel.y) < 0.2

    let moveX = 0
    let moveZ = 0

    if (!isSitting) {
      if (keys.current.forward) moveZ -= 1
      if (keys.current.backward) moveZ += 1
      if (keys.current.left) moveX -= 1
      if (keys.current.right) moveX += 1
    }

    const isMoving = moveX !== 0 || moveZ !== 0
    setIsMovingState(isMoving)

    if (isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
      moveX /= len
      moveZ /= len

      const yaw = cameraAngles.current.yaw
      const worldX = moveX * Math.cos(yaw) - moveZ * Math.sin(yaw)
      const worldZ = moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)

      const speed = keys.current.sprint ? 11 : 6.8
      rb.setLinvel({ x: worldX * speed, y: linvel.y, z: worldZ * speed }, true)

      if (avatarGroupRef.current) {
        const targetRotation = Math.atan2(worldX, worldZ)
        avatarGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          avatarGroupRef.current.rotation.y,
          targetRotation,
          delta * 14
        )
      }
    } else {
      rb.setLinvel({ x: linvel.x * 0.8, y: linvel.y, z: linvel.z * 0.8 }, true)
    }

    // Jumping
    if (keys.current.jump && isOnGround.current && !isSitting) {
      rb.setLinvel({ x: linvel.x, y: 9.0, z: linvel.z }, true)
      playJumpSound()
      keys.current.jump = false
    }

    // Jump pads check
    const px = translation.x
    const py = translation.y
    const pz = translation.z

    if (Math.hypot(px - 39.5, pz - 0) < 1.5 && py > 2.8 && py < 4.2) {
      rb.setLinvel({ x: 4, y: 14, z: 0 }, true)
      playJumpSound()
    }
    if (Math.hypot(px - 52, pz - 9.5) < 1.5 && py > 8.0 && py < 10.0) {
      rb.setLinvel({ x: -10, y: 16, z: -1 }, true)
      playJumpSound()
    }

    // Throttle position reports to React state to prevent 60fps re-rendering jitter
    const now = performance.now()
    if (now - lastReportTime.current > 75) {
      const dist = Math.hypot(
        translation.x - lastReportedPos.current[0],
        translation.z - lastReportedPos.current[2]
      )
      if (dist > 0.08 || now - lastReportTime.current > 350) {
        lastReportedPos.current = [translation.x, translation.y, translation.z]
        lastReportTime.current = now
        onPositionChange([translation.x, translation.y, translation.z])
      }
    }

    // Camera follow with smooth damping (no blinking/jitter)
    const targetCamX =
      translation.x +
      Math.sin(cameraAngles.current.yaw) *
        Math.cos(cameraAngles.current.pitch) *
        cameraAngles.current.distance
    const targetCamY =
      translation.y + 1.8 + Math.sin(cameraAngles.current.pitch) * cameraAngles.current.distance
    const targetCamZ =
      translation.z +
      Math.cos(cameraAngles.current.yaw) *
        Math.cos(cameraAngles.current.pitch) *
        cameraAngles.current.distance

    const lerpFactor = Math.min(1, Math.max(0.01, delta * 10))
    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), lerpFactor)
    camera.lookAt(translation.x, translation.y + 1.35, translation.z)
  })

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 1.5, 7.8]}
      enabledRotations={[false, false, false]}
      colliders="hull"
      friction={0.2}
      restitution={0.0}
    >
      <group ref={avatarGroupRef}>
        {/* Render Rich 3D Meme Avatar Mesh */}
        <MemeCharacterMesh
          type={characterType}
          isMoving={isMovingState}
          hasPotato={hasPotato}
          skinColor={skinColor}
          topColor={topColor}
        />

        {/* Player Potato Alert Nameplate if holding potato */}
        {hasPotato && (
          <group position={[0, 2.3, 0]}>
            <Text
              fontSize={0.32}
              color="#f97316"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              🔥 YOU HAVE THE POTATO! 🔥
            </Text>
          </group>
        )}
      </group>
    </RigidBody>
  )
}
