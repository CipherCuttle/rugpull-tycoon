import type { CardDefinition } from '../game/types'

export const STARTER_SET_NAME = 'Basement Launch Collection'

export const CARDS: CardDefinition[] = [
  {
    id: 'side_wallet_dust',
    name: 'Side Wallet Dust',
    rarity: 'common',
    effect: '+1% passive Liquidity',
    flavorText: 'Dev moved to side wallet. Chat called it bullish.',
    iconPrompt: 'evidence bag with glittering dust and a tiny fake wallet',
  },
  {
    id: 'micro_kol_receipt',
    name: 'Micro KOL Receipt',
    rarity: 'common',
    effect: '+1% Hype value',
    flavorText: 'KOLs ate first. You provided the calories.',
    iconPrompt: 'crumpled invoice from an anonymous avatar account',
  },
  {
    id: 'jeet_stampede',
    name: 'Jeet Stampede',
    rarity: 'common',
    effect: 'Jeet losses reduced by 1%',
    flavorText: 'The floor was thin and everyone found out together.',
    iconPrompt: 'red candle footprints running across a trading floor',
  },
  {
    id: 'bonding_curve_body',
    name: 'Bonding Curve Body',
    rarity: 'uncommon',
    effect: '+2% bonding curve fill',
    flavorText: 'Bonding curve graduated directly into a crime scene.',
    iconPrompt: 'chalk outline shaped like a curved price graph',
  },
  {
    id: 'chart_gravity_debt',
    name: 'Chart Gravity Debt',
    rarity: 'uncommon',
    effect: '+2 tap Liquidity',
    flavorText: 'Chart went vertical because gravity clocked out early.',
    iconPrompt: 'green candle breaking through a ceiling tile',
  },
  {
    id: 'exit_interface_badge',
    name: 'Exit Interface Badge',
    rarity: 'rare',
    effect: '+2% prestige multiplier',
    flavorText: 'You were not early. You were the exit interface.',
    iconPrompt: 'cheap badge reading EXIT INTERFACE in noir lighting',
  },
  {
    id: 'cope_crate',
    name: 'Cope Crate',
    rarity: 'common',
    effect: '+1 Copium when duplicated',
    flavorText: 'Handle with care. Contents are mostly denial.',
    iconPrompt: 'cardboard crate leaking green chat bubbles',
  },
  {
    id: 'volume_bot_choir',
    name: 'Volume Bot Choir',
    rarity: 'uncommon',
    effect: '+2% passive Liquidity',
    flavorText: 'Trenches are fried but your bots are hungrier.',
    iconPrompt: 'small bots singing in a basement server rack',
  },
  {
    id: 'wrong_ticker_poster',
    name: 'Wrong Ticker Poster',
    rarity: 'common',
    effect: '+1% card chance',
    flavorText: 'Marketing printed the wrong ticker. It somehow helped.',
    iconPrompt: 'peeling poster with crossed out ticker symbols',
  },
  {
    id: 'cto_cope_meter',
    name: 'CTO Cope Meter',
    rarity: 'rare',
    effect: '+3% Hype value',
    flavorText: 'CTO now 87% cope by volume.',
    iconPrompt: 'analog meter stuck between hope and cope',
  },
  {
    id: 'graduation_crime_scene',
    name: 'Graduation Crime Scene',
    rarity: 'epic',
    effect: '+4% bonding curve fill',
    flavorText: 'The confetti was admissible.',
    iconPrompt: 'graduation cap beside caution tape and green candles',
  },
  {
    id: 'you_were_not_early',
    name: 'You Were Not Early',
    rarity: 'legendary',
    effect: '+5% all gains',
    flavorText: 'You were not early. You were the exit interface.',
    iconPrompt: 'noir title card with a fake coin and harsh spotlight',
  },
]

export const CARD_UNLOCK_ORDER = [
  'side_wallet_dust',
  'micro_kol_receipt',
  'jeet_stampede',
  'bonding_curve_body',
  'chart_gravity_debt',
  'cope_crate',
  'wrong_ticker_poster',
  'volume_bot_choir',
  'exit_interface_badge',
  'cto_cope_meter',
  'graduation_crime_scene',
  'you_were_not_early',
]

export function getCard(id: string) {
  return CARDS.find((card) => card.id === id)
}
