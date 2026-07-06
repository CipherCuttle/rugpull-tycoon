import Phaser from 'phaser'
import { waffleBackroom } from '../data/waffleBackroom.v1'
import type { TopdownGameCallbacks } from '../events'
import { PlayerController } from '../systems/player'
import { buildRoomCollision, drawRoomBackdrop } from '../systems/roomLoader'

export class WaffleBackroomScene extends Phaser.Scene {
  private readonly callbacks: TopdownGameCallbacks
  private player: PlayerController | null = null

  constructor(callbacks: TopdownGameCallbacks) {
    super('waffle-backroom')
    this.callbacks = callbacks
  }

  create() {
    const room = waffleBackroom
    this.physics.world.setBounds(0, 0, room.world.width, room.world.height)
    this.cameras.main.setBackgroundColor('#05070c')
    this.cameras.main.setBounds(0, 0, room.world.width, room.world.height)

    drawRoomBackdrop(this, room)
    const blockers = buildRoomCollision(this, room)
    this.player = new PlayerController(this, room.playerSpawn)
    this.physics.add.collider(this.player.sprite, blockers)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)

    this.callbacks.onHudChange({
      status: 'Move Dust with WASD, arrow keys, or hold/tap on mobile.',
      rentBanked: 0,
      carriedBag: 0,
      lostBag: null,
      deathCause: null,
      runState: 'playing',
    })
  }

  update() {
    this.player?.update()
  }
}
