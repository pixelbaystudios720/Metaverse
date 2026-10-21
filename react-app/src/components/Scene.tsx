import React from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { CentralPlaza } from './sectors/CentralPlaza'
import { ArcadeBuilding } from './sectors/ArcadeBuilding'
import { SocialPark } from './sectors/SocialPark'
import { CoinCatcherArena } from './sectors/CoinCatcherArena'
import { HotPotatoArena } from './sectors/HotPotatoArena'
import { CitySkyscrapers } from './sectors/CitySkyscrapers'
import { CityNPCs } from './characters/CityNPCs'
import { Traffic } from './Traffic'
import { HotPotatoEntity } from './HotPotatoEntity'
import { Bots } from './Bots'
import { Player } from './Player'
import { CharacterType } from './characters/MemeCharacterMesh'
import { BotState, CoinItem } from '../types'

interface SceneProps {
  playerPos: [number, number, number]
  onPlayerPosChange: (pos: [number, number, number]) => void
  onInteract: () => void
  isSitting: boolean
  onStandUp: () => void
  spawnTrigger: number
  characterType: CharacterType
  skinColor?: string
  topColor?: string
  coins: CoinItem[]
  onCollectCoin: (id: number) => void
  coinScore: number
  coinTimeLeft: number
  isCoinActive: boolean
  onStartCoinGame: () => void
  onStartPotatoRound?: () => void
  potatoActive: boolean
  potatoHolderId: string | null
  potatoHolderName: string
  potatoHolderPos: [number, number, number] | null
  potatoTimeLeft: number
  isExploding: boolean
  bots: BotState[]
  onUpdateBots: (bots: BotState[]) => void
  onBotTag?: (newHolderId: string, victimName: string) => void
}

export const Scene: React.FC<SceneProps> = ({
  playerPos,
  onPlayerPosChange,
  onInteract,
  isSitting,
  onStandUp,
  spawnTrigger,
  characterType,
  skinColor,
  topColor,
  coins,
  onCollectCoin,
  coinScore,
  coinTimeLeft,
  isCoinActive,
  onStartCoinGame,
  onStartPotatoRound,
  potatoActive,
  potatoHolderId,
  potatoHolderName,
  potatoHolderPos,
  potatoTimeLeft,
  isExploding,
  bots,
  onUpdateBots,
  onBotTag,
}) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 14], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Deep Cyber Metropolis Sky matching attentionagents.fun reference */}
      <color attach="background" args={['#081e3a']} />
      
      {/* Rich electric cyan-navy atmospheric fog so horizon blends into vibrant futuristic metropolis */}
      <fog attach="fog" args={['#081f3d', 60, 240]} />

      {/* Cyber Sky Dome with glowing vertical atmospheric gradient */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[260, 32, 24]} />
        <meshBasicMaterial
          color="#0369a1"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ambient and Cyber City Lighting */}
      <ambientLight intensity={1.4} color="#bae6fd" />
      <hemisphereLight args={['#38bdf8', '#0f172a', 1.2]} />

      {/* Directional Key Light with Crisp City Shadows */}
      <directionalLight
        position={[45, 65, 35]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={180}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0001}
        color="#ffffff"
      />

      {/* Radiant Cyan Fill Lights */}
      <directionalLight position={[-35, 25, -35]} intensity={1.4} color="#06b6d4" />
      <directionalLight position={[0, 30, 40]} intensity={1.2} color="#0284c7" />
      <pointLight position={[0, 20, 0]} intensity={30} distance={60} color="#7dd3fc" />

      {/* Volumetric Glowing Light Shafts rising behind Arcade matching reference */}
      {[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((lx, idx) => (
        <mesh key={`beam-north-${idx}`} position={[lx, 22, -32]}>
          <cylinderGeometry args={[2.5, 5.0, 50, 16]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Volumetric Glowing Light Shafts in South Sector (behind Social Park) */}
      {[-20, -10, 0, 10, 20].map((lx, idx) => (
        <mesh key={`beam-south-${idx}`} position={[lx, 24, 62]}>
          <cylinderGeometry args={[2.8, 5.5, 54, 16]} />
          <meshBasicMaterial
            color="#0284c7"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Architectural Cyan Columns flanking the Arcade */}
      {[-26, -21, 21, 26].map((px, idx) => (
        <mesh key={`col-${idx}`} position={[px, 16, -26]}>
          <boxGeometry args={[3.4, 36, 4.2]} />
          <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}

      {/* Rapier Physics World */}
      <Physics gravity={[0, -22, 0]}>
        {/* City Asphalt Ground Base covering all sectors and stadiums */}
        <RigidBody type="fixed" friction={1}>
          <mesh position={[0, -0.5, 0]} receiveShadow>
            <boxGeometry args={[460, 1.0, 460]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.15} />
          </mesh>
        </RigidBody>

        {/* 1. Center (0, 0, 0): Central Plaza with Fountain & Benches */}
        <CentralPlaza />

        {/* 2. North (0, 0, -22): Arcade Building with Door Triggers */}
        <ArcadeBuilding
          onEnterCoin={() => {
            if (onStartCoinGame) onStartCoinGame()
          }}
          onEnterPotato={() => {
            if (onStartPotatoRound) onStartPotatoRound()
          }}
        />

        {/* 3. South (0, 0, 42): Social Park */}
        <SocialPark />

        {/* 4. West-North (-42, 0, -20): Coin Catcher Arena */}
        <CoinCatcherArena
          coins={coins}
          onCollectCoin={onCollectCoin}
          score={coinScore}
          timeLeft={coinTimeLeft}
          isActive={isCoinActive}
          onStartGame={onStartCoinGame}
        />

        {/* 5. West-South (-42, 0, 22): Dedicated Hot Potato Basketball Court */}
        <HotPotatoArena />

        {/* Moving Traffic Loop */}
        <Traffic />

        {/* 360-degree Surrounding City High-Rise Skyscraper Towers matching attentionagents.fun */}
        <CitySkyscrapers />

        {/* City NPCs: Multiple Muse Mascots (Mint, Cream, Pink, Blue, Yellow) and Chibi Visitors */}
        <CityNPCs playerPos={playerPos} />

        {/* 3. The Flaming Potato: Glowing 3D sphere with animated flame, smoke & spark trails */}
        <HotPotatoEntity
          holderPosition={potatoHolderPos}
          holderName={potatoHolderName}
          timeLeft={potatoTimeLeft}
          isExploding={isExploding}
          roundActive={potatoActive}
        />

        {/* 4. Animated Bot Players with Pursuit and Fleeing AI */}
        <Bots
          bots={bots}
          onUpdateBots={onUpdateBots}
          playerPos={playerPos}
          potatoHolderId={potatoHolderId}
          potatoActive={potatoActive}
          onBotTag={onBotTag}
        />

        {/* Player with 3D Meme / Attention Agent Avatar */}
        <Player
          playerPos={playerPos}
          onPositionChange={onPlayerPosChange}
          onInteract={onInteract}
          isSitting={isSitting}
          onStandUp={onStandUp}
          spawnTrigger={spawnTrigger}
          hasPotato={potatoHolderId === 'player'}
          characterType={characterType}
          skinColor={skinColor}
          topColor={topColor}
        />
      </Physics>
    </Canvas>
  )
}
