import type { TopdownRoomData } from '../types'

export const waffleBackroom: TopdownRoomData = {
  id: 'waffle-mausoleum-backroom-v1',
  name: 'Waffle Mausoleum Backroom Extraction',
  world: {
    width: 1280,
    height: 720,
  },
  playerSpawn: { x: 170, y: 560 },
  bagSpawn: { x: 650, y: 330 },
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
  ],
  props: [
    { id: 'booth-left', x: 182, y: 126, width: 178, height: 82 },
    { id: 'booth-right', x: 442, y: 126, width: 178, height: 82 },
    { id: 'grease-counter', x: 832, y: 108, width: 232, height: 74 },
    { id: 'sticky-table-a', x: 252, y: 398, width: 138, height: 70 },
    { id: 'sticky-table-b', x: 818, y: 428, width: 146, height: 72 },
    { id: 'trash-barricade', x: 532, y: 520, width: 120, height: 58 },
  ],
  jeets: [
    { id: 'jeet-a', x: 446, y: 292, patrol: [{ x: 446, y: 292 }, { x: 446, y: 468 }] },
    { id: 'jeet-b', x: 804, y: 274, patrol: [{ x: 804, y: 274 }, { x: 1008, y: 274 }] },
    { id: 'jeet-c', x: 948, y: 540, patrol: [{ x: 948, y: 540 }, { x: 720, y: 540 }] },
  ],
}
