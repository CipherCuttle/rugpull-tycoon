import Phaser from 'phaser'
import { waffleBackroom } from '../data/waffleBackroom.v1'
import { updateTopdownDebug, updateTopdownDebugActions } from '../debug'
import type { TopdownGameCallbacks } from '../events'
import type { HeatTier, TopdownSaveV1, TrashKind } from '../types'
import { AuditorController } from '../systems/auditor'
import { CombatController } from '../systems/combat'
import type { Stunnable } from '../systems/combatTargets'
import { EnemyController } from '../systems/enemyAi'
import { PlayerController } from '../systems/player'
import { TRASH_LABELS, TrashController } from '../systems/trash'
import {
  STARTING_BAG_VALUE,
  createBagSprite,
  createGreedSprite,
  createLostBagSnapshot,
  createLostBagSprite,
  createRugExitZone,
} from '../systems/bag'
import { buildRoomCollision, drawRoomBackdrop } from '../systems/roomLoader'

const HEAT_TIERS: Array<{ tier: HeatTier, min: number, label: string, speedMultiplier: number }> = [
  { tier: 0, min: 0, label: 'Cold / Broke', speedMultiplier: 1 },
  { tier: 1, min: 1, label: 'Warm Bag', speedMultiplier: 1.04 },
  { tier: 2, min: 120, label: 'Hot Bag', speedMultiplier: 1.08 },
  { tier: 3, min: 170, label: 'Nuclear Bag', speedMultiplier: 1.12 },
]

function getBagHeat(carriedBag: number) {
  let heat = HEAT_TIERS[0]
  for (const tier of HEAT_TIERS) {
    if (carriedBag >= tier.min) {
      heat = tier
    }
  }
  return heat
}

export class WaffleBackroomScene extends Phaser.Scene {
  private save: TopdownSaveV1
  private readonly callbacks: TopdownGameCallbacks
  private player: PlayerController | null = null
  private combat: CombatController | null = null
  private trash: TrashController | null = null
  private enemies: EnemyController[] = []
  private auditors: AuditorController[] = []
  private bagSprite: Phaser.Physics.Arcade.Sprite | null = null
  private lostBagSprite: Phaser.Physics.Arcade.Sprite | null = null
  private lostBagLabel: Phaser.GameObjects.Text | null = null
  private heldTrash: TrashKind | null = null
  private carriedBag = 0
  private heatTier: HeatTier = 0
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
    this.trash = null
    this.enemies = []
    this.auditors = []
    this.bagSprite = null
    this.lostBagSprite = null
    this.lostBagLabel = null
    this.heldTrash = null
    this.carriedBag = 0
    this.heatTier = 0
    this.failed = false
    this.escaped = false

    const room = waffleBackroom
    this.physics.world.setBounds(0, 0, room.world.width, room.world.height)
    this.input.mouse?.disableContextMenu()
    this.cameras.main.setBackgroundColor('#05070c')
    this.cameras.main.setBounds(0, 0, room.world.width, room.world.height)

    drawRoomBackdrop(this, room)
    const blockers = buildRoomCollision(this, room)
    this.player = new PlayerController(this, room.playerSpawn)
    this.physics.add.collider(this.player.sprite, blockers)

    this.trash = new TrashController(
      this,
      blockers,
      (held) => this.onHeldTrashChange(held),
      (x, y, kind) => this.showTrashImpact(x, y, kind),
    )
    this.trash.spawnPickups(room, this.player.sprite)

    this.enemies = room.jeets.map((spawn) => new EnemyController(this, spawn))
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, blockers)
      this.physics.add.collider(enemy.sprite, this.player.sprite)
    }

    this.auditors = room.auditors.map((spawn) => new AuditorController(this, spawn))
    for (const auditor of this.auditors) {
      this.physics.add.collider(auditor.sprite, blockers)
      this.physics.add.collider(auditor.sprite, this.player.sprite)
    }

    this.combat = new CombatController(this, this.player, this.trash)
    this.createBagLoop()
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.startedAt = this.time.now
    this.registerDebugActions()

    // Carry the last death cause into the fresh run so it stays readable after a fast restart.
    const data = this.scene.settings.data as { lastDeathCause?: string } | undefined
    const lastDeathCause = data?.lastDeathCause ?? null
    const lostBagValue = this.save.lostBag?.roomId === room.id ? this.save.lostBag.value : 0
    const settledHint = lostBagValue > 0
      ? `Your LOST BAG ($${lostBagValue}) is still out there. Grab THE BAG and go get it back.`
      : 'Grab THE BAG, throw trash, shove Jeets, and reach the RUG EXIT.'
    if (lastDeathCause) {
      this.emitHud('Back in. Grab THE BAG.', 'playing', null, lastDeathCause)
      this.time.delayedCall(2600, () => {
        if (!this.failed && !this.escaped) {
          this.emitHud(settledHint)
        }
      })
    } else {
      this.emitHud(settledHint)
    }
    this.updateDebugSnapshot()
  }

  update() {
    if (this.failed || this.escaped || !this.player) {
      return
    }

    const now = this.time.now
    const targets: Stunnable[] = [...this.enemies, ...this.auditors]
    this.player?.update()
    this.combat?.update(now, targets)
    this.trash?.update(now, targets)

    for (const enemy of this.enemies) {
      const cause = enemy.update(now, this.player.sprite, getBagHeat(this.carriedBag).speedMultiplier)
      if (cause) {
        this.failRun(cause)
        return
      }
    }

    for (const auditor of this.auditors) {
      const cause = auditor.update(now, this.player.sprite)
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
    const droppedValue = this.carriedBag
    // LOST BAG RULE: dying while carrying value drops a NEW Lost Bag at the death
    // spot, which REPLACES any older un-recovered Lost Bag (only one is tracked).
    // Dying empty-handed leaves the previous Lost Bag right where it was.
    const droppedBag = droppedValue > 0
      ? createLostBagSnapshot(waffleBackroom, this.player?.sprite.x ?? waffleBackroom.playerSpawn.x, this.player?.sprite.y ?? waffleBackroom.playerSpawn.y, droppedValue)
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
    for (const auditor of this.auditors) {
      auditor.sprite.setVelocity(0, 0)
    }
    // Stronger death flash so the killing blow reads instantly before the restart.
    this.cameras.main.flash(150, 120, 20, 30)
    this.cameras.main.shake(220, 0.017)
    const deathCause = droppedValue > 0
      ? `${cause} — LOST BAG DROPPED — recover $${droppedValue}`
      : cause
    if (droppedValue > 0) {
      this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, `LOST BAG DROPPED -$${droppedValue}`, '#ff6b52')
    }
    this.emitHud('Restarting...', 'failed', deathCause)
    this.updateDebugSnapshot()
    this.time.delayedCall(520, () => this.scene.restart({ lastDeathCause: deathCause }))
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

    // Optional greed gems live behind danger, off the safe exit line.
    for (const greed of room.greed) {
      const sprite = createGreedSprite(this, greed.x, greed.y)
      this.add.text(greed.x, greed.y - 26, `+$${greed.value}`, {
        color: '#46ff9b',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: '900',
      }).setOrigin(0.5).setDepth(15)
      this.physics.add.overlap(this.player.sprite, sprite, () => this.pickupGreed(sprite, greed.value))
    }

    if (this.save.lostBag?.roomId === room.id) {
      this.lostBagSprite = createLostBagSprite(this, this.save.lostBag)
      this.physics.add.overlap(this.player.sprite, this.lostBagSprite, () => this.recoverLostBag())
      this.spawnLostBagMarker(this.save.lostBag.x, this.save.lostBag.y, this.save.lostBag.value)
    }
  }

  private spawnLostBagMarker(x: number, y: number, value: number) {
    // Beacon ring under the marker so a dangerous recovery still reads from across
    // the room — it should feel like unfinished business worth the risk.
    const beacon = this.add.circle(x, y, 26, 0xff6b52, 0.16).setStrokeStyle(2, 0xff6b52, 0.7).setDepth(11)
    this.tweens.add({ targets: beacon, scale: 1.9, alpha: 0, duration: 1100, repeat: -1 })

    // Make the dropped Bag unmistakably read as a Lost Bag, not just another pickup.
    this.lostBagLabel = this.add.text(x, y - 30, `LOST BAG\nRECOVER $${value}`, {
      align: 'center',
      color: '#ff6b52',
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: '900',
    }).setOrigin(0.5).setDepth(30)

    if (this.lostBagSprite) {
      this.tweens.add({
        targets: this.lostBagSprite,
        scale: 1.18,
        duration: 620,
        yoyo: true,
        repeat: -1,
      })
    }
  }

  private pickupBag() {
    // Fresh Bag always stacks onto whatever is already carried (incl. a recovered Lost Bag).
    if (!this.bagSprite?.active) {
      return
    }

    this.carriedBag += STARTING_BAG_VALUE
    this.syncHeatFeedback()
    this.bagSprite.destroy()
    this.emitFloatingText(this.player?.sprite.x ?? waffleBackroom.bagSpawn.x, this.player?.sprite.y ?? waffleBackroom.bagSpawn.y - 28, `THE BAG +$${STARTING_BAG_VALUE}`)
    this.emitHud(`Carrying $${this.carriedBag}. Get to the RUG EXIT or get greedy.`)
    this.updateDebugSnapshot()
  }

  private pickupGreed(sprite: Phaser.Physics.Arcade.Sprite, value: number) {
    if (!sprite.active) {
      return
    }

    this.carriedBag += value
    this.syncHeatFeedback()
    sprite.destroy()
    this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, `GREED +$${value}`, '#46ff9b')
    this.emitHud(`Greedy. Carrying $${this.carriedBag}. Now survive the way out.`)
    this.updateDebugSnapshot()
  }

  private onHeldTrashChange(held: TrashKind | null) {
    this.heldTrash = held
    if (held) {
      this.emitHud(`Picked up ${TRASH_LABELS[held]}. Left-click / SHOVE to throw.`)
    } else {
      this.emitHud('Trash thrown. Keep moving.')
    }
    this.updateDebugSnapshot()
  }

  private showTrashImpact(x: number, y: number, kind: 'jeet' | 'wall') {
    const color = kind === 'jeet' ? 0xffc23a : 0x8fa2bd
    const burst = this.add.circle(x, y, 10, color, 0.85).setDepth(41)
    this.tweens.add({ targets: burst, scale: 2.4, alpha: 0, duration: 200, onComplete: () => burst.destroy() })
    if (kind === 'jeet') {
      // Landed hit: extra pop so a good throw feels rewarding.
      this.emitFloatingText(x, y - 12, 'SPLAT', '#ffc23a')
      this.cameras.main.shake(120, 0.01)
    }
  }

  private recoverLostBag() {
    if (!this.lostBagSprite?.active || !this.save.lostBag) {
      return
    }

    const recovered = this.save.lostBag.value
    this.carriedBag += recovered
    this.syncHeatFeedback()
    this.lostBagSprite.destroy()
    this.lostBagLabel?.destroy()
    this.lostBagLabel = null
    this.save = {
      ...this.save,
      lostBag: null,
      stats: {
        ...this.save.stats,
        bagsRecovered: this.save.stats.bagsRecovered + 1,
      },
    }
    this.callbacks.onSaveChange(this.save)
    this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, `LOST BAG RECOVERED +$${recovered}`, '#46ff9b')
    this.emitHud(`Lost Bag recovered. Carrying $${this.carriedBag}. Now leave.`)
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
    this.syncHeatFeedback()
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

  private emitHud(
    status: string,
    runState: 'playing' | 'failed' | 'escaped' = 'playing',
    deathCause: string | null = null,
    lastDeathCause: string | null = null,
  ) {
    const heat = getBagHeat(this.carriedBag)
    this.callbacks.onHudChange({
      status,
      rentBanked: this.save.rentBanked,
      carriedBag: this.carriedBag,
      lostBag: this.save.lostBag,
      heldTrash: this.heldTrash,
      heatTier: heat.tier,
      heatLabel: heat.label,
      deathCause,
      lastDeathCause,
      runState,
    })
  }

  private syncHeatFeedback() {
    const nextHeat = getBagHeat(this.carriedBag)
    if (nextHeat.tier === this.heatTier) {
      return
    }

    const previousTier = this.heatTier
    this.heatTier = nextHeat.tier
    if (nextHeat.tier > previousTier && nextHeat.tier >= 2) {
      this.pulseHeatEdges(nextHeat.tier)
    }
  }

  private pulseHeatEdges(tier: HeatTier) {
    const width = this.scale.width
    const height = this.scale.height
    const alpha = tier === 3 ? 0.18 : 0.1
    const color = tier === 3 ? 0xff3b52 : 0xff6b52
    const edgeDepth = 80
    const edges = [
      this.add.rectangle(width / 2, 4, width, 8, color, alpha),
      this.add.rectangle(width / 2, height - 4, width, 8, color, alpha),
      this.add.rectangle(4, height / 2, 8, height, color, alpha),
      this.add.rectangle(width - 4, height / 2, 8, height, color, alpha),
    ]

    for (const edge of edges) {
      edge.setScrollFactor(0).setDepth(edgeDepth)
    }

    this.tweens.add({
      targets: edges,
      alpha: 0,
      duration: 360,
      onComplete: () => {
        for (const edge of edges) {
          edge.destroy()
        }
      },
    })
  }

  private emitFloatingText(x: number, y: number, text: string, color = '#ffc23a') {
    const label = this.add.text(x, y, text, {
      color,
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
        facingDegrees: Math.round(Phaser.Math.RadToDeg(this.player.getFacingRadians())),
      },
      enemies: [...this.enemies, ...this.auditors].map((target) => ({
        id: target.sprite.name,
        x: Math.round(target.sprite.x),
        y: Math.round(target.sprite.y),
        stunned: target.isStunned(this.time.now),
      })),
      carriedBag: this.carriedBag,
      heatTier: getBagHeat(this.carriedBag).tier,
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
