import React, { useState, useEffect, useCallback } from 'react'
import { Scene } from './components/Scene'
import { HUDLayout } from './components/hud/HUDLayout'
import { AvatarSelectModal } from './components/hud/AvatarSelectModal'
import { InteractionPrompt } from './components/hud/InteractionPrompt'
import { PotatoAlert } from './components/hud/PotatoAlert'
import { CharacterType } from './components/characters/MemeCharacterMesh'
import { Zone, BotState, CoinItem, ChatMessage, LeaderboardUser } from './types'
import { ProfileModal } from './components/hud/ProfileModal'
import { MatchResultsModal, MatchResultData } from './components/hud/MatchResultsModal'
import { GameEntryModal } from './components/hud/GameEntryModal'
import { VirtualTouchControls } from './components/hud/VirtualTouchControls'
import {
  playCoinSound,
  playPotatoPassSound,
  playExplosionSound,
  playCountdownTick,
} from './audio'

const INITIAL_COINS: CoinItem[] = [
  { id: 1, position: [160 - 8, 1.4, -8], collected: false },
  { id: 2, position: [160 + 8, 1.4, -8], collected: false },
  { id: 3, position: [160, 1.4, -7], collected: false },
  { id: 4, position: [160 - 7, 1.4, 0], collected: false },
  { id: 5, position: [160 + 7, 1.4, 0], collected: false },
  { id: 6, position: [160 - 8, 1.4, 8], collected: false },
  { id: 7, position: [160 + 8, 1.4, 8], collected: false },
  { id: 8, position: [160, 1.4, 7], collected: false },
  { id: 9, position: [160 - 4, 1.4, -4], collected: false },
  { id: 10, position: [160 + 4, 1.4, -4], collected: false },
  { id: 11, position: [160 - 4, 1.4, 4], collected: false },
  { id: 12, position: [160 + 4, 1.4, 4], collected: false },
]

const INITIAL_BOTS: BotState[] = [
  {
    id: 'bot-zeph',
    name: 'ZEPH (Gigachad)',
    color: '#06b6d4',
    position: [-160 - 6, 0, -4],
    target: [-160 + 3, 0, 3],
    speed: 5.2,
  },
  {
    id: 'bot-pib',
    name: 'PIB (Confusion)',
    color: '#ec4899',
    position: [-160 + 6, 0, -3],
    target: [-160 - 4, 0, 4],
    speed: 4.6,
  },
  {
    id: 'bot-tofu',
    name: 'TOFU (Swole)',
    color: '#0284c7',
    position: [-160 - 5, 0, 5],
    target: [-160 + 5, 0, -2],
    speed: 4.9,
  },
  {
    id: 'bot-lumen',
    name: 'LUMEN (Chill Pepe)',
    color: '#22c55e',
    position: [-160 + 7, 0, 4],
    target: [-160 - 3, 0, -4],
    speed: 5.4,
  },
  {
    id: 'bot-wisp',
    name: 'WISP (Noob)',
    color: '#facc15',
    position: [-160, 0, 0],
    target: [-160 - 7, 0, 0],
    speed: 5.0,
  },
]

export default function App() {
  // Player Position & 3D Character (Default to Attention Agents Mascot from reference screenshot)
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 1.5, 7.8])
  const [spawnTrigger, setSpawnTrigger] = useState(0)
  const [isSitting, setIsSitting] = useState(false)
  const [characterType, setCharacterType] = useState<CharacterType>('muse_mascot')
  const [skinColor, setSkinColor] = useState<string>('#a7f3d0')
  const [topColor, setTopColor] = useState<string>('#a7f3d0')
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [playerName, setPlayerName] = useState('Alex')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [totalXP, setTotalXP] = useState(980)
  const [tickerBalance, setTickerBalance] = useState(450)
  const [matchResultData, setMatchResultData] = useState<MatchResultData | null>(null)
  const [isMatchResultOpen, setIsMatchResultOpen] = useState(false)
  const [gameEntryType, setGameEntryType] = useState<'coin' | 'potato' | null>(null)
  const [isGameEntryOpen, setIsGameEntryOpen] = useState(false)

  // World Sector & Arcade Doors
  const [, setCurrentZone] = useState<Zone>('Plaza')
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null)
  const [nearDoor, setNearDoor] = useState<'coin' | 'potato' | null>(null)

  // Bots
  const [bots, setBots] = useState<BotState[]>(INITIAL_BOTS)

  // Coin Catcher State
  const [coins, setCoins] = useState<CoinItem[]>(INITIAL_COINS)
  const [coinScore, setCoinScore] = useState(0)
  const [coinTimeLeft, setCoinTimeLeft] = useState(45)
  const [isCoinActive, setIsCoinActive] = useState(false)

  // Hot Potato (Potato Run) State
  const [potatoActive, setPotatoActive] = useState(false)
  const [potatoHolderId, setPotatoHolderId] = useState<string | null>(null)
  const [potatoTimeLeft, setPotatoTimeLeft] = useState(18.0)
  const [isExploding, setIsExploding] = useState(false)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([
    { rank: 1, name: 'NovaStar', score: 1250, badge: 'PRO' },
    { rank: 2, name: 'PixelQueen', score: 1198 },
    { rank: 3, name: 'ShadowX', score: 1086 },
    { rank: 4, name: 'Alex (You)', score: 950, badge: 'YOU' },
    { rank: 5, name: 'GameMaster', score: 920 },
  ])

  // Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'SYSTEM',
      text: 'Welcome to Potato Run & Coin Catcher 3D! Press Esc to switch 3D Meme Avatars.',
      time: '12:00',
      isSystem: true,
    },
    {
      id: '2',
      sender: 'ZEPH',
      text: 'Meet me at the Potato Run basketball court!',
      time: '12:01',
    },
    {
      id: '3',
      sender: 'PIB',
      text: 'Pass it before you get blown up haha',
      time: '12:02',
    },
  ])

  const addChatMessage = useCallback((sender: string, text: string, isSystem = false) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [
      ...prev.slice(-25),
      { id: Math.random().toString(), sender, text, time, isSystem },
    ])
  }, [])

  // Listen for Esc key to toggle avatar select modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAvatarModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Sector detection
  useEffect(() => {
    const [x, , z] = playerPos
    if (Math.hypot(x - 160, z) < 24) {
      setCurrentZone('Coin Catcher')
    } else if (Math.hypot(x - (-160), z) < 24) {
      setCurrentZone('Hot Potato')
    } else if (Math.hypot(x, z - (-42)) < 18) {
      setCurrentZone('Arcade')
    } else if (Math.hypot(x, z - 42) < 18) {
      setCurrentZone('Park')
    } else {
      setCurrentZone('Plaza')
    }
  }, [playerPos])

  // Proximity & interaction check
  useEffect(() => {
    const [px, , pz] = playerPos

    // 1. Arcade Doors Detection (Left Door: Coin Catcher [-6.5, -16.8], Right Door: Potato Run [6.5, -16.8])
    if (Math.hypot(px - (-6.5), pz - (-16.8)) < 3.5) {
      setNearDoor('coin')
      setInteractionPrompt('Enter Coin Catcher Door [E]')
      return
    }
    if (Math.hypot(px - 6.5, pz - (-16.8)) < 3.5) {
      setNearDoor('potato')
      setInteractionPrompt('Enter Potato Run Door [E]')
      return
    }
    setNearDoor(null)

    // 2. Park Benches (0, 0, 48)
    if (Math.hypot(px - 0, pz - 48) < 4.5) {
      setInteractionPrompt(isSitting ? 'Stand Up' : 'Sit on Bench')
      return
    }

    // 3. Hot Potato Basketball Court entrance (-42, 0, 22)
    if (Math.hypot(px - (-42), pz - 22) < 5.0 && !potatoActive) {
      setInteractionPrompt('Start Potato Run Round!')
      return
    }

    // 4. Hot Potato Passing when player holds it
    if (potatoActive && potatoHolderId === 'player') {
      for (const bot of bots) {
        if (!bot.eliminated && Math.hypot(px - bot.position[0], pz - bot.position[2]) < 4.0) {
          setInteractionPrompt(`PASS POTATO TO ${bot.name}! [E]`)
          return
        }
      }
    }

    setInteractionPrompt(null)
  }, [playerPos, isSitting, potatoActive, potatoHolderId, bots])

  const handleTeleport = useCallback((x: number, y: number, z: number) => {
    setPlayerPos([x, y, z])
    setSpawnTrigger((prev) => prev + 1)
    setIsSitting(false)
  }, [])

  const startCoinGame = useCallback(() => {
    setCoins(INITIAL_COINS.map((c) => ({ ...c, collected: false })))
    setCoinScore(0)
    setCoinTimeLeft(45)
    setIsCoinActive(true)
    addChatMessage('COIN CATCHER', '45s Coin Rush started! Collect golden spinning coins!', true)
  }, [addChatMessage])

  const startHotPotatoRound = useCallback(() => {
    setPotatoActive(true)
    setIsExploding(false)
    setPotatoTimeLeft(18.0)
    setBots((prev) =>
      prev.map((bot, i) => ({
        ...bot,
        position: [-160 + (i % 2 === 0 ? 5 : -5), 0, (i * 3 - 6)] as [number, number, number],
        target: [-160 + (Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 8] as [number, number, number],
      }))
    )
    const isPlayer = Math.random() < 0.35
    if (isPlayer) {
      setPotatoHolderId('player')
      addChatMessage('HOT POTATO', '🔥 Round Started! YOU have the flaming potato! Pass it fast!', true)
    } else {
      setPotatoHolderId('bot-zeph')
      addChatMessage('HOT POTATO', '🔥 Round Started! ZEPH is holding the potato! RUN!', true)
    }
  }, [addChatMessage])

  // Handle Door Entrance: opens official Game Opening Modal per PRD FR-04
  const handleEnterDoor = () => {
    if (nearDoor === 'coin') {
      setGameEntryType('coin')
      setIsGameEntryOpen(true)
    } else if (nearDoor === 'potato') {
      setGameEntryType('potato')
      setIsGameEntryOpen(true)
    }
  }

  const handleConfirmStartGame = useCallback(() => {
    setIsGameEntryOpen(false)
    if (gameEntryType === 'coin') {
      handleTeleport(160, 1.5, 0)
      startCoinGame()
      addChatMessage('ARCADE', '🪙 Entered Coin Catcher Arena (Match Started)!', true)
    } else if (gameEntryType === 'potato') {
      handleTeleport(-160, 1.5, 0)
      startHotPotatoRound()
      addChatMessage('ARCADE', '🔥 Entered Potato Run Court (Match Started)!', true)
    }
  }, [gameEntryType, handleTeleport, startCoinGame, startHotPotatoRound, addChatMessage])

  // Handle interaction trigger (Key E)
  const handleInteract = () => {
    if (nearDoor) {
      handleEnterDoor()
      return
    }

    const [px, , pz] = playerPos

    if (Math.hypot(px - 0, pz - 48) < 4.5) {
      setIsSitting((prev) => !prev)
      return
    }

    if (Math.hypot(px - (-42), pz - 22) < 5.0 && !potatoActive) {
      startHotPotatoRound()
      return
    }

    if (potatoActive && potatoHolderId === 'player') {
      for (const bot of bots) {
        if (!bot.eliminated && Math.hypot(px - bot.position[0], pz - bot.position[2]) < 4.0) {
          setPotatoHolderId(bot.id)
          playPotatoPassSound()
          addChatMessage('HOT POTATO', `🔥 You passed the flaming potato to ${bot.name}! RUN!`, true)
          return
        }
      }
    }
  }

  // Coin Collection detection
  useEffect(() => {
    const [px, , pz] = playerPos
    coins.forEach((coin) => {
      if (!coin.collected) {
        const dist = Math.hypot(px - coin.position[0], pz - coin.position[2])
        if (dist < 2.0) {
          setCoins((prev) =>
            prev.map((c) => (c.id === coin.id ? { ...c, collected: true } : c))
          )
          setCoinScore((s) => {
            const nextScore = s + 10
            setLeaderboard((prev) =>
              prev.map((u) => (u.badge === 'YOU' ? { ...u, score: u.score + 10 } : u))
            )
            return nextScore
          })
          playCoinSound()
        }
      }
    })
  }, [playerPos, coins])

  // Coin Catcher Timer
  useEffect(() => {
    if (!isCoinActive) return
    const timer = setInterval(() => {
      setCoinTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsCoinActive(false)
          addChatMessage('COIN CATCHER', `Rush Ended! Final Score: ${coinScore} PTS`, true)
          const xp = coinScore * 2
          const ticker = Math.floor(coinScore * 1.5)
          setTotalXP((x) => x + xp)
          setTickerBalance((b) => b + ticker)
          setMatchResultData({
            gameType: 'coin',
            title: '🪙 Coin Catcher Match',
            isVictory: coinScore >= 40,
            score: coinScore,
            stats: [
              { label: 'Coins Collected', value: `${coinScore / 10} Coins` },
              { label: 'Time Limit', value: '45 Seconds' },
              { label: 'Match Ranking', value: coinScore >= 60 ? '1st Place' : '2nd Place' },
              { label: 'Status', value: 'Server Validated' },
            ],
            earnedXP: xp,
            earnedTicker: ticker,
          })
          setIsMatchResultOpen(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isCoinActive, coinScore, addChatMessage])

  // Bot Tagging Callback
  const handleBotTag = (newHolderId: string, victimName: string) => {
    setPotatoHolderId(newHolderId)
    playPotatoPassSound()
    if (newHolderId === 'player') {
      addChatMessage('HOT POTATO', `🔥 You got tagged! YOU HAVE THE FLAMING POTATO! PASS IT!`, true)
    } else {
      addChatMessage('HOT POTATO', `⚡ Potato transferred to ${victimName}!`, true)
    }
  }

  // Hot Potato Countdown Timer
  useEffect(() => {
    if (!potatoActive) return

    const timer = setInterval(() => {
      setPotatoTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer)
          setIsExploding(true)
          playExplosionSound()

          const victimName =
            potatoHolderId === 'player'
              ? 'YOU'
              : bots.find((b) => b.id === potatoHolderId)?.name || 'Carrier'
          addChatMessage('HOT POTATO', `💥 BOOM! The potato exploded on ${victimName}!`, true)

          const survived = potatoHolderId !== 'player'
          const xp = survived ? 100 : 25
          const ticker = survived ? 50 : 10
          setTotalXP((x) => x + xp)
          setTickerBalance((b) => b + ticker)

          if (survived) {
            setLeaderboard((prev) =>
              prev.map((u) => (u.badge === 'YOU' ? { ...u, score: u.score + 50 } : u))
            )
          }

          setTimeout(() => {
            setIsExploding(false)
            setPotatoActive(false)
            setPotatoHolderId(null)
            setMatchResultData({
              gameType: 'potato',
              title: '🔥 Hot Potato Match',
              isVictory: survived,
              score: survived ? 150 : 30,
              stats: [
                { label: 'Survival Status', value: survived ? 'Survived!' : 'Eliminated (BOOM!)' },
                { label: 'Carrier at Explosion', value: victimName },
                { label: 'Round Duration', value: '18.0s' },
                { label: 'Result', value: survived ? 'Rank 1 (Survivor)' : 'Rank 5' },
              ],
              earnedXP: xp,
              earnedTicker: ticker,
            })
            setIsMatchResultOpen(true)
          }, 3500)

          return 0
        }

        if (prev <= 4.0 && Math.floor(prev * 10) % 10 === 0) {
          playCountdownTick()
        }

        return prev - 0.1
      })
    }, 100)

    return () => clearInterval(timer)
  }, [potatoActive, potatoHolderId, bots, addChatMessage])

  const getPotatoHolderPos = (): [number, number, number] | null => {
    if (!potatoActive && !isExploding) return null
    if (potatoHolderId === 'player') return playerPos
    const b = bots.find((bot) => bot.id === potatoHolderId)
    return b ? b.position : null
  }

  const getPotatoHolderName = (): string => {
    if (potatoHolderId === 'player') return 'YOU (Player 1)'
    const b = bots.find((bot) => bot.id === potatoHolderId)
    return b ? b.name : 'Unknown'
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 font-sans">
      {/* 3D Scene Viewport */}
      <Scene
        playerPos={playerPos}
        onPlayerPosChange={setPlayerPos}
        onInteract={handleInteract}
        isSitting={isSitting}
        onStandUp={() => setIsSitting(false)}
        spawnTrigger={spawnTrigger}
        characterType={characterType}
        skinColor={skinColor}
        topColor={topColor}
        coins={coins}
        onCollectCoin={(id) =>
          setCoins((prev) => prev.map((c) => (c.id === id ? { ...c, collected: true } : c)))
        }
        coinScore={coinScore}
        coinTimeLeft={coinTimeLeft}
        isCoinActive={isCoinActive}
        onStartCoinGame={() => {
          setGameEntryType('coin')
          setIsGameEntryOpen(true)
        }}
        onStartPotatoRound={() => {
          setGameEntryType('potato')
          setIsGameEntryOpen(true)
        }}
        potatoActive={potatoActive}
        potatoHolderId={potatoHolderId}
        potatoHolderName={getPotatoHolderName()}
        potatoHolderPos={getPotatoHolderPos()}
        potatoTimeLeft={potatoTimeLeft}
        isExploding={isExploding}
        bots={bots}
        onUpdateBots={setBots}
        onBotTag={handleBotTag}
      />

      {/* Modern Frosted Clean White 2D HUD Overlays */}
      <HUDLayout
        onTeleport={handleTeleport}
        onOpenAvatarSelect={() => setIsAvatarModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        playerName={playerName}
        currentCharacter={characterType}
        coinScore={coinScore}
        coinTimeLeft={coinTimeLeft}
        isCoinActive={isCoinActive}
        onStartCoinGame={() => {
          setGameEntryType('coin')
          setIsGameEntryOpen(true)
        }}
        potatoActive={potatoActive}
        potatoTimeLeft={potatoTimeLeft}
        potatoHolderName={getPotatoHolderName()}
        onStartPotatoRound={() => {
          setGameEntryType('potato')
          setIsGameEntryOpen(true)
        }}
        messages={messages}
        onSendMessage={(txt) => addChatMessage(playerName, txt)}
        leaderboard={leaderboard}
        nearDoor={nearDoor}
        onEnterDoor={handleEnterDoor}
      />

      {/* Avatar Selection & Skin Color Customizer Modal */}
      <AvatarSelectModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentType={characterType}
        onSelectType={(newType) => {
          setCharacterType(newType)
          addChatMessage('SYSTEM', `Equipped 3D Avatar: ${newType.toUpperCase()}`, true)
        }}
        currentSkinColor={skinColor}
        onSelectSkinColor={(color) => {
          setSkinColor(color)
          addChatMessage('SYSTEM', `Updated Avatar Skin Tone`, true)
        }}
        currentTopColor={topColor}
        onSelectTopColor={(color) => {
          setTopColor(color)
          addChatMessage('SYSTEM', `Updated Outfit Color`, true)
        }}
      />

      {/* User Profile & X (Twitter) Account Linking Modal (FR-01, FR-05, FR-06, FR-08) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        playerName={playerName}
        onUpdatePlayerName={(name) => {
          setPlayerName(name)
          addChatMessage('SYSTEM', `Display name updated to: ${name}`, true)
        }}
        characterType={characterType}
        onOpenAvatarSelect={() => {
          setIsProfileModalOpen(false)
          setIsAvatarModalOpen(true)
        }}
        totalXP={totalXP}
        tickerBalance={tickerBalance}
      />

      {/* Match Results Screen (FR-04) */}
      <MatchResultsModal
        isOpen={isMatchResultOpen}
        data={matchResultData}
        onPlayAgain={() => {
          setIsMatchResultOpen(false)
          if (matchResultData?.gameType === 'coin') {
            startCoinGame()
          } else {
            startHotPotatoRound()
          }
        }}
        onReturnToLobby={() => {
          setIsMatchResultOpen(false)
          handleTeleport(0, 1.5, 7.8)
        }}
      />

      {/* Official Game Entry / Match Opening Modal (PRD FR-04) */}
      {gameEntryType && (
        <GameEntryModal
          isOpen={isGameEntryOpen}
          onClose={() => setIsGameEntryOpen(false)}
          gameType={gameEntryType}
          onConfirmStart={handleConfirmStartGame}
          playerName={playerName}
        />
      )}

      {/* Dynamic Interaction & Alert Overlays */}
      <InteractionPrompt promptText={interactionPrompt} />
      <PotatoAlert
        active={potatoActive}
        isPlayerHolder={potatoHolderId === 'player'}
        holderName={getPotatoHolderName()}
        timeLeft={potatoTimeLeft}
        isExploding={isExploding}
      />

      {/* Mobile-Friendly Virtual Touch Controls */}
      <VirtualTouchControls onInteract={handleInteract} isSitting={isSitting} />
    </div>
  )
}
