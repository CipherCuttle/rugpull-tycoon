import type { TopdownRoomData } from '../types'

// Hand-authored pressure route (no map editor). Read left-to-right:
//   start (bottom-left) -> grab THE BAG (top-left) -> squeeze the central CHOKE
//   past a Jeet -> cross the open arena (rearm on trash) -> run the EXIT CORRIDOR
//   guarded by the Fake Auditor -> RUG EXIT (far right).
// Fake Alpha pickups are deliberate detours off the safe exit line, so the player
// has to choose: bank now or push for one more cursed opportunity.
export const waffleBackroom: TopdownRoomData = {
  id: 'waffle-mausoleum-backroom-v1',
  name: 'Waffle Mausoleum Backroom Extraction',
  world: {
    width: 1280,
    height: 720,
  },
  rooms: [
    { id: 'grease-entrance', name: 'Grease Entrance', bounds: { id: 'grease-entrance', x: 68, y: 60, width: 352, height: 600 }, spawn: { x: 150, y: 560 }, safeDrop: { x: 220, y: 520 } },
    { id: 'side-greed', name: 'Side Greed Room', bounds: { id: 'side-greed', x: 420, y: 60, width: 400, height: 600 }, spawn: { x: 470, y: 360 }, safeDrop: { x: 520, y: 360 } },
    { id: 'rug-exit', name: 'RUG EXIT Room', bounds: { id: 'rug-exit', x: 820, y: 60, width: 392, height: 600 }, spawn: { x: 860, y: 360 }, safeDrop: { x: 900, y: 360 } },
  ],
  playerSpawn: { x: 170, y: 560 },
  bagSpawn: { x: 320, y: 200 },
  rugExit: {
    id: 'rug-exit',
    x: 1128,
    y: 292,
    width: 78,
    height: 136,
  },
  walls: [
    { id: 'north-wall', x: 40, y: 32, width: 1200, height: 28 },
    { id: 'south-wall', x: 40, y: 660, width: 1200, height: 28 },
    { id: 'west-wall', x: 40, y: 32, width: 28, height: 656 },
    { id: 'east-wall-top', x: 1212, y: 32, width: 28, height: 260 },
    { id: 'east-wall-bottom', x: 1212, y: 428, width: 28, height: 260 },
    // Door openings at each room seam keep the three spaces physically connected.
    { id: 'entrance-door-top', x: 400, y: 60, width: 20, height: 210 },
    { id: 'entrance-door-bottom', x: 400, y: 450, width: 20, height: 210 },
    { id: 'side-door-top', x: 800, y: 60, width: 20, height: 210 },
    { id: 'side-door-bottom', x: 800, y: 450, width: 20, height: 210 },
    { id: 'exit-corridor-top', x: 900, y: 250, width: 312, height: 22 },
    { id: 'exit-corridor-bottom', x: 900, y: 456, width: 312, height: 22 },
  ],
  props: [
    { id: 'booth-left', x: 150, y: 96, width: 160, height: 64 },
    { id: 'grease-counter', x: 720, y: 96, width: 240, height: 70 },
    { id: 'sticky-table-a', x: 320, y: 440, width: 140, height: 66 },
    { id: 'sticky-table-b', x: 700, y: 520, width: 150, height: 70 },
    { id: 'grease-pillar', x: 816, y: 336, width: 54, height: 54 },
  ],
  jeets: [
    { id: 'jeet-a', x: 560, y: 360, patrol: [{ x: 500, y: 300 }, { x: 620, y: 420 }] },
    { id: 'jeet-b', x: 760, y: 360, patrol: [{ x: 760, y: 250 }, { x: 760, y: 430 }] },
    { id: 'jeet-c', x: 1030, y: 580, patrol: [{ x: 1120, y: 600 }, { x: 940, y: 560 }] },
  ],
  auditors: [
    { id: 'fake-auditor', x: 1040, y: 360, patrol: [{ x: 1040, y: 300 }, { x: 1040, y: 430 }] },
  ],
  trash: [
    { id: 'trash-start', x: 250, y: 560, kind: 'frozen-waffle' },
    { id: 'trash-mid', x: 730, y: 360, kind: 'frozen-waffle' },
  ],
  fakeAlpha: [
    {
      id: 'alpha-insider-tip',
      kind: 'insider-tip',
      label: 'INSIDER TIP',
      x: 500,
      y: 585,
      bagValue: 40,
      heatBump: 1,
      status: 'INSIDER TIP leaked. Heat noticed.',
      tint: 0xb6ff4a,
      labelColor: '#b6ff4a',
    },
    {
      id: 'alpha-free-mint',
      kind: 'free-mint',
      label: 'FREE MINT',
      x: 520,
      y: 235,
      bagValue: 25,
      heatBump: 0,
      sideEffect: 'slow',
      status: 'FREE MINT clogged your shoes.',
      tint: 0x75e4ff,
      labelColor: '#75e4ff',
    },
    {
      id: 'alpha-green-candle',
      kind: 'green-candle',
      label: 'GREEN CANDLE',
      x: 820,
      y: 610,
      bagValue: 35,
      heatBump: 1,
      status: 'GREEN CANDLE pumped the room.',
      tint: 0x46ff9b,
      labelColor: '#46ff9b',
    },
    {
      id: 'alpha-dev-wallet',
      kind: 'dev-wallet',
      label: 'DEV WALLET',
      x: 1100,
      y: 520,
      bagValue: 70,
      heatBump: 2,
      sideEffect: 'auditor-pulse',
      status: 'DEV WALLET exposed. Auditor twitched.',
      tint: 0xff6b52,
      labelColor: '#ff6b52',
    },
  ],
}
