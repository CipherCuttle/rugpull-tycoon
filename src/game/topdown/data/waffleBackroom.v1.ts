import type { TopdownRoomData } from '../types'

// Hand-authored pressure route (no map editor). Read left-to-right:
//   start (bottom-left) -> grab THE BAG (top-left) -> squeeze the central CHOKE
//   past a Jeet -> cross the open arena (rearm on trash) -> run the EXIT CORRIDOR
//   guarded by the Fake Auditor -> RUG EXIT (far right).
// The GREED gem is a deliberate detour into the bottom-right Jeet's turf, off the
// safe exit line, so the player has to choose: bank now or push for more.
export const waffleBackroom: TopdownRoomData = {
  id: 'waffle-mausoleum-backroom-v1',
  name: 'Waffle Mausoleum Backroom Extraction',
  world: {
    width: 1280,
    height: 720,
  },
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
    // Central spine splits the room; the y270..450 gap is the only crossing (a choke).
    { id: 'spine-upper', x: 600, y: 60, width: 26, height: 210 },
    { id: 'spine-lower', x: 600, y: 450, width: 26, height: 210 },
    // Exit corridor: sealed top and bottom so the RUG EXIT can only be reached by
    // running the auditor's lane — no sneaking around the pocket.
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
    { id: 'jeet-a', x: 660, y: 360, patrol: [{ x: 660, y: 300 }, { x: 660, y: 420 }] },
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
  greed: [
    { id: 'greed-corner', x: 1130, y: 610, value: 25 },
  ],
}
