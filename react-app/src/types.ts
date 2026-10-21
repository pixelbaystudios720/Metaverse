export type Zone = 'Plaza' | 'Arcade' | 'Park' | 'Coin Catcher' | 'Hot Potato'

export interface BotState {
  id: string
  name: string
  color: string
  position: [number, number, number]
  target: [number, number, number]
  speed: number
  hasPotato?: boolean
  eliminated?: boolean
}

export interface CoinItem {
  id: number
  position: [number, number, number]
  collected: boolean
}

export interface ChatMessage {
  id: string
  sender: string
  text: string
  time: string
  isSystem?: boolean
}

export interface LeaderboardUser {
  rank: number
  name: string
  score: number
  badge?: string
}
