// Types shared across PlayerCard components
export interface PlayerCardProps {
  id: string
  friendlyName: string
  xp: number
  caps: number
  activeBonuses: number
  activePenalties: number
  winRate: number
  wins: number
  draws: number
  losses: number
  totalGames: number
  currentStreak: number
  maxStreak: number
  benchWarmerStreak: number
  rarity?: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary'
  avatarSvg?: string
  isRandomlySelected?: boolean
  status?: string
  hasSlotOffer?: boolean
  slotOfferStatus?: string
  slotOfferExpiresAt?: string
  slotOfferAvailableAt?: string
  potentialOfferTimes?: string[]
  hasActiveSlotOffers?: boolean
  whatsapp_group_member?: string
  children?: React.ReactNode
  rank?: number
  unpaidGames: number
  unpaidGamesModifier: number
  registrationStreakBonus?: number // Length of current registration streak
  registrationStreakBonusApplies?: boolean // Whether the bonus should be applied
}

export interface PlayerCardModifiersProps {
  currentStreak: number
  streakModifier: number
  dropoutPenalties: number
  dropoutModifier: number
  activeBonuses: number
  bonusModifier: number
  activePenalties: number
  penaltyModifier: number
  benchWarmerStreak: number
  benchWarmerModifier: number
  unpaidGames: number
  unpaidGamesModifier: number
  registrationStreakBonus?: number
  registrationStreakBonusApplies?: boolean
}

export interface PlayerCardStatsProps {
  winRate: number
  wins: number
  draws: number
  losses: number
  totalGames: number
}

export interface PlayerCardBadgesProps {
  isRandomlySelected: boolean
  status?: string
  hasSlotOffer?: boolean
  slotOfferStatus?: string
  slotOfferExpiresAt?: string
  slotOfferAvailableAt?: string
  potentialOfferTimes?: string[]
  hasActiveSlotOffers?: boolean
  children?: React.ReactNode
}
