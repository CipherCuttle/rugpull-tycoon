import type { EventTrackDefinition } from '../game/types'

export const BULL_TRAP_WEEK: EventTrackDefinition = {
  id: 'bull_trap_week',
  name: 'Bull Trap Week',
  description: 'A starter checklist for turning basement confidence into paperwork.',
  tasks: [
    {
      id: 'sendCandle',
      label: 'Send the candle 25 times',
      target: 25,
      rewardText: '+200 Liquidity (wallet)',
    },
    {
      id: 'buyUpgrades',
      label: 'Buy 3 upgrades',
      target: 3,
      rewardText: '+2 Hype',
    },
    {
      id: 'reachLiquidity',
      label: 'Reach 1,000 Liquidity',
      target: 1000,
      rewardText: '+4 Copium',
    },
    {
      id: 'surviveJeets',
      label: 'Survive 2 jeet events',
      target: 2,
      rewardText: 'Random card',
    },
    {
      id: 'openCopeCrate',
      label: 'Open 1 Cope Crate',
      target: 1,
      rewardText: 'Temporary Hype boost',
    },
    {
      id: 'graduateCoin',
      label: 'Graduate $EGG',
      target: 1,
      rewardText: '+5 Receipts, +1 Exit Liquidity',
    },
  ],
}
