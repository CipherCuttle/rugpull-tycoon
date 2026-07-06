import Phaser from 'phaser'
import { waffleBackroom } from '../data/waffleBackroom.v1'
import { updateTopdownDebug, updateTopdownDebugActions } from '../debug'
import type { TopdownGameCallbacks } from '../events'
import type { TopdownSaveV1 } from '../types'
import { CombatController } from '../systems/combat'
import { EnemyController } from '../systems/enemyAi'
import { PlayerController } from '../systems/player'
import {
  STARTING_BAG_VALUE,
  createBagSprite,
  createLostBagSnapshot,
  createLostBagSprite,
  createRugExitZone,
} from '../systems/bag'
import { buildRoomCollision, drawRoomBackdrop } from '../systems/roomLoader'

export class WaffleBackroomScene extends Phaser.Scene {
  private save: TopdownSaveV1
  private readonly callbacks: TopdownGameCallbacks
  private player: PlayerController | null = null
  private combat: CombatController | null = null
  private enemies: EnemyController[] = []
  private bagSprite: Phaser.Physics.Arcade.Sprite | null = null
  private lostBagSprite: Phaser.Physics.Arcade.Sprite | null = null
  private carriedBag = 0
  private startedAt = 0
  private failed = false
  private escaped = false

  constructor(save: TopdownSaveV1, callbacks: TopdownGameCallbacks) {
    super('waffle-backroom')
    this.save = save
    this.callbacks = callbacks
  }

  create() {
    this.player = null
    this.combat = null
    this.enemies = []
    this.bagSprite = null
    this.lostBagSprite = null
    this.carriedBag = 0
    this.failed = false
    this.escaped = false

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
    this.createBagLoop()
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.startedAt = this.time.now
    this.registerDebugActions()

    this.emitHud('Grab THE BAG, shove Jeets, and reach the RUG EXIT.')
    this.updateDebugSnapshot()
  }

  update() {
    if (this.failed || this.escaped || !this.player) {
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
    this.updateDebugSnapshot()
  }

  private failRun(cause: string) {
    if (this.failed) {
      return
    }

    this.failed = true
    const droppedBag = this.carriedBag > 0
      ? createLostBagSnapshot(waffleBackroom, this.player?.sprite.x ?? waffleBackroom.playerSpawn.x, this.player?.sprite.y ?? waffleBackroom.playerSpawn.y, this.carriedBag)
      : this.save.lostBag
    this.carriedBag = 0
    this.save = {
      ...this.save,
      lostBag: droppedBag,
      stats: {
        ...this.save.stats,
        deaths: this.save.stats.deaths + 1,
      },
    }
    this.callbacks.onSaveChange(this.save)
    this.player?.sprite.setVelocity(0, 0)
    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }
    this.cameras.main.shake(170, 0.012)
    this.emitHud('Restarting...', 'failed', cause)
    this.updateDebugSnapshot()
    this.time.delayedCall(520, () => this.scene.restart())
  }

  private createBagLoop() {
    if (!this.player) {
      return
    }

    const room = waffleBackroom
    const exitZone = createRugExitZone(this, room.rugExit)
    this.bagSprite = createBagSprite(this, room.bagSpawn.x, room.bagSpawn.y)
    this.physics.add.overlap(this.player.sprite, this.bagSprite, () => this.pickupBag())
    this.physics.add.overlap(this.player.sprite, exitZone, () => this.rugExit())

    if (this.save.lostBag?.roomId === room.id) {
      this.lostBagSprite = createLostBagSprite(this, this.save.lostBag)
      this.physics.add.overlap(this.player.sprite, this.lostBagSprite, () => this.recoverLostBag())
    }
  }

  private pickupBag() {
    if (!this.bagSprite?.active || this.carriedBag > 0) {
      return
    }

    this.carriedBag += STARTING_BAG_VALUE
    this.bagSprite.destroy()
    this.emitFloatingText(this.player?.sprite.x ?? waffleBackroom.bagSpawn.x, this.player?.sprite.y ?? waffleBackroom.bagSpawn.y - 28, 'THE BAG')
    this.emitHud('THE BAG is hot. Get to the RUG EXIT or get greedy.')
    this.updateDebugSnapshot()
  }

  private recoverLostBag() {
    if (!this.lostBagSprite?.active || !this.save.lostBag) {
      return
    }

    const recovered = this.save.lostBag.value
    this.carriedBag += recovered
    this.lostBagSprite.destroy()
    this.save = {
      ...this.save,
      lostBag: null,
      stats: {
        ...this.save.stats,
        bagsRecovered: this.save.stats.bagsRecovered + 1,
      },
    }
    this.callbacks.onSaveChange(this.save)
    this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, 'LOST BAG RECOVERED')
    this.emitHud('Lost Bag recovered. Now leave.')
    this.updateDebugSnapshot()
  }

  private rugExit() {
    if (this.escaped || this.failed || this.carriedBag <= 0) {
      return
    }

    const banked = this.carriedBag
    const elapsed = Math.max(1, Math.round(this.time.now - this.startedAt))
    const previousBest = this.save.stats.bestEscapeMsByRoom[waffleBackroom.id]
    this.carriedBag = 0
    this.escaped = true
    this.save = {
      ...this.save,
      rentBanked: this.save.rentBanked + banked,
      stats: {
        ...this.save.stats,
        escapes: this.save.stats.escapes + 1,
        bestEscapeMsByRoom: {
          ...this.save.stats.bestEscapeMsByRoom,
          [waffleBackroom.id]: previousBest ? Math.min(previousBest, elapsed) : elapsed,
        },
      },
    }
    this.callbacks.onSaveChange(this.save)
    this.cameras.main.flash(180, 70, 255, 155)
    this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, `+$${banked} RENT`)
    this.emitHud('RUG EXIT hit. Rent banked.', 'escaped')
    this.updateDebugSnapshot()
    this.time.delayedCall(650, () => this.scene.restart())
  }

  private emitHud(status: string, runState: 'playing' | 'failed' | 'escaped' = 'playing', deathCause: string | null = null) {
    this.callbacks.onHudChange({
      status,
      rentBanked: this.save.rentBanked,
      carriedBag: this.carriedBag,
      lostBag: this.save.lostBag,
      deathCause,
      runState,
    })
  }

  private emitFloatingText(x: number, y: number, text: string) {
    const label = this.add.text(x, y, text, {
      color: '#ffc23a',
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: '700',
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 520,
      onComplete: () => label.destroy(),
    })
  }

  private updateDebugSnapshot() {
    if (!this.player) {
      return
    }

    updateTopdownDebug({
      roomId: waffleBackroom.id,
      player: {
        x: Math.round(this.player.sprite.x),
        y: Math.round(this.player.sprite.y),
        velocityX: Math.round(this.player.sprite.body?.velocity.x ?? 0),
        velocityY: Math.round(this.player.sprite.body?.velocity.y ?? 0),
        heldKeys: this.player.getHeldKeys(),
      },
      enemies: this.enemies.map((enemy) => ({
        id: enemy.sprite.name,
        x: Math.round(enemy.sprite.x),
        y: Math.round(enemy.sprite.y),
        stunned: enemy.isStunned(this.time.now),
      })),
      carriedBag: this.carriedBag,
      save: this.save,
      failed: this.failed,
      escaped: this.escaped,
    })
  }

  private registerDebugActions() {
    updateTopdownDebugActions({
      movePlayerTo: (x: number, y: number) => {
        if (!this.player || this.failed || this.escaped) {
          return
        }

        this.player.sprite.setPosition(x, y)
        this.player.sprite.setVelocity(0, 0)
        this.physics.world.update(this.time.now, 16)
        this.updateDebugSnapshot()
      },
      forceFailure: (cause: string) => this.failRun(cause),
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => updateTopdownDebugActions(null))
  }
}
