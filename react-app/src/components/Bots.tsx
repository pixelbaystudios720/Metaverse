import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { BotState } from '../types'
import { MemeCharacterMesh, CharacterType } from './characters/MemeCharacterMesh'

interface BotsProps {
  bots: BotState[]
  onUpdateBots: (updated: BotState[]) => void
  playerPos: [number, number, number]
  potatoHolderId: string | null
  potatoActive: boolean
  onBotTag?: (newHolderId: string, victimName: string) => void
}

// Map bot names to specific 3D meme character models
const BOT_CHAR_MAP: Record<string, CharacterType> = {
  'bot-zeph': 'gigachad',
  'bot-pib': 'confusion',
  'bot-tofu': 'swole',
  'bot-lumen': 'chill',
  'bot-wisp': 'noob',
}

export const Bots: React.FC<BotsProps> = ({
  bots,
  onUpdateBots,
  playerPos,
  potatoHolderId,
  potatoActive,
  onBotTag,
}) => {
  const botsRef = useRef<BotState[]>(bots)
  botsRef.current = bots

  // Debounce bot tags so they don't instantly bounce back and forth
  const lastTagTimeRef = useRef<number>(0)

  useFrame((_, delta) => {
    let hasChanged = false
    const now = Date.now()

    // 1. Locate current carrier position
    let carrierPos: [number, number, number] | null = null
    if (potatoActive) {
      if (potatoHolderId === 'player') {
        carrierPos = playerPos
      } else {
        const cBot = botsRef.current.find((b) => b.id === potatoHolderId)
        if (cBot) carrierPos = cBot.position
      }
    }

    const nextBots = botsRef.current.map((bot) => {
      if (bot.eliminated) return bot

      const [bx, by, bz] = bot.position
      let targetX = bot.target[0]
      let targetZ = bot.target[2]
      let speedMultiplier = 1.0

      if (potatoActive && carrierPos) {
        if (potatoHolderId === bot.id) {
          // --- AI BEHAVIOR 1: BOT IS HOLDING POTATO -> CHASE! ---
          // Bot hunts down closest victim: player or other bots
          speedMultiplier = 1.6 // Sprint speed!

          let closestDist = Math.hypot(bx - playerPos[0], bz - playerPos[2])
          let closestTarget: [number, number, number] = playerPos
          let closestId = 'player'
          let closestName = 'Player'

          // Compare with other bots
          for (const other of botsRef.current) {
            if (other.id !== bot.id && !other.eliminated) {
              const d = Math.hypot(bx - other.position[0], bz - other.position[2])
              if (d < closestDist) {
                closestDist = d
                closestTarget = other.position
                closestId = other.id
                closestName = other.name
              }
            }
          }

          targetX = closestTarget[0]
          targetZ = closestTarget[2]

          // Tag check!
          if (closestDist < 2.2 && now - lastTagTimeRef.current > 1500) {
            lastTagTimeRef.current = now
            if (onBotTag) {
              onBotTag(closestId, closestName)
            }
          }
        } else {
          // --- AI BEHAVIOR 2: SOMEONE ELSE HAS POTATO -> FLEE! ---
          // Bot panics and flees directly away from carrierPos
          speedMultiplier = 1.45 // Panic sprint away!

          const distToCarrier = Math.hypot(bx - carrierPos[0], bz - carrierPos[2])
          if (distToCarrier < 28) {
            const dx = bx - carrierPos[0]
            const dz = bz - carrierPos[2]
            const norm = Math.max(0.1, Math.hypot(dx, dz))
            // Flee vector away from danger
            targetX = bx + (dx / norm) * 22
            targetZ = bz + (dz / norm) * 22
          }
        }
      }

      // Step towards target
      const dx = targetX - bx
      const dz = targetZ - bz
      const dist = Math.hypot(dx, dz)

      let newX = bx
      let newZ = bz

      if (dist > 1.0) {
        const moveDist = Math.min(dist, bot.speed * speedMultiplier * delta)
        newX += (dx / dist) * moveDist
        newZ += (dz / dist) * moveDist
        hasChanged = true
      }

      // Clamp bots strictly inside the basketball court [-160 +/- 14, +/- 8.5]
      if (potatoActive) {
        newX = Math.max(-173, Math.min(-147, newX))
        newZ = Math.max(-8.5, Math.min(8.5, newZ))
      } else {
        newX = Math.max(-173, Math.min(-147, newX))
        newZ = Math.max(-8.5, Math.min(8.5, newZ))
        if (dist <= 1.0) {
          bot.target = [
            -160 + (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 14,
          ]
          hasChanged = true
        }
      }

      return {
        ...bot,
        position: [newX, by, newZ] as [number, number, number],
      }
    })

    if (hasChanged) {
      onUpdateBots(nextBots)
    }
  })

  return (
    <group>
      {bots.map((bot) => {
        if (bot.eliminated) return null
        const isCarrier = potatoHolderId === bot.id
        const isFleeing = potatoActive && !isCarrier
        const charType: CharacterType = BOT_CHAR_MAP[bot.id] || 'swole'

        return (
          <group key={bot.id} position={bot.position}>
            {/* 3D Meme Character Avatar */}
            <MemeCharacterMesh
              type={charType}
              isMoving={true}
              hasPotato={isCarrier}
            />

            {/* AI Dynamic Nametag & Status Indicator */}
            <group position={[0, 2.5, 0]}>
              <Text
                fontSize={0.28}
                color={isCarrier ? '#ef4444' : isFleeing ? '#facc15' : '#ffffff'}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="#000000"
              >
                {isCarrier
                  ? `🔥 ${bot.name} [CHASING!] 🔥`
                  : isFleeing
                  ? `😱 ${bot.name} [FLEEING!]`
                  : bot.name}
              </Text>
            </group>
          </group>
        )
      })}
    </group>
  )
}
