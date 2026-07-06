import Phaser from 'phaser'
import { waffleBackroom } from '../data/waffleBackroom.v1'
import type { TopdownGameCallbacks } from '../events'
import { CombatController } from '../systems/combat'
import { EnemyController } from '../systems/enemyAi'
import { PlayerController } from '../systems/player'
import { buildRoomCollision, drawRoomBackdrop } from '../systems/roomLoader'

export class WaffleBackroomScene extends Phaser.Scene {
  private readonly callbacks: TopdownGameCallbacks
  private player: PlayerController | null = null
  private combat: CombatController | null = null
  private enemies: EnemyController[] = []
  private failed = false

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
    this.enemies = room.jeets.map((spawn) => new EnemyController(this, spawn))
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, blockers)
      this.physics.add.collider(enemy.sprite, this.player.sprite)
    }
    this.combat = new CombatController(this, this.player)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)

    this.callbacks.onHudChange({
      status: 'Move Dust. Press Space or tap Shove to stun Jeets.',
      rentBanked: 0,
      carriedBag: 0,
      lostBag: null,
      deathCause: null,
      runState: 'playing',
    })
  }

  update() {
    if (this.failed || !this.player) {
      return
    }

    const now = this.time.now
    this.player?.update()
    this.combat?.update(now, this.enemies)

    for (const enemy of this.enemies) {
      const cause = enemy.update(now, this.player.sprite)
      if (cause) {
        this.failRun(cause)
        return
      }
    }
  }

  private failRun(cause: string) {
    if (this.failed) {
      return
    }

    this.failed = true
    this.player?.sprite.setVelocity(0, 0)
    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }
    this.cameras.main.shake(170, 0.012)
    this.callbacks.onHudChange({
      status: 'Restarting...',
      rentBanked: 0,
      carriedBag: 0,
      lostBag: null,
      deathCause: cause,
      runState: 'failed',
    })
    this.time.delayedCall(520, () => this.scene.restart())
  }
}
