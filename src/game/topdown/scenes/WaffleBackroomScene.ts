import Phaser from 'phaser'
import { waffleBackroom } from '../data/waffleBackroom.v1'
import { updateTopdownDebug, updateTopdownDebugActions } from '../debug'
import type { TopdownGameCallbacks } from '../events'
import type { FakeAlphaSpawn, FloorResult, HeatTier, RoomId, RoomRect, RugWindowState, TopdownSaveV1, TrashKind } from '../types'
import { AuditorController } from '../systems/auditor'
import { CombatController } from '../systems/combat'
import type { Stunnable } from '../systems/combatTargets'
import { EnemyController } from '../systems/enemyAi'
import { PlayerController } from '../systems/player'
import { TRASH_LABELS, TrashController } from '../systems/trash'
import {
  STARTING_BAG_VALUE,
  createBagSprite,
  createFakeAlphaSprite,
  createLostBagSnapshot,
  createLostBagSprite,
  createRugExitZone,
} from '../systems/bag'
import { buildRoomCollision, drawRoomBackdrop, getRoomAtPosition, resolveSafeRoomPoint } from '../systems/roomLoader'

const HEAT_PRESSURE_VALUE = 20
const FREE_MINT_SPEED_MULTIPLIER = 0.85
const FREE_MINT_SLOW_MS = 900

const HEAT_TIERS: Array<{ tier: HeatTier, min: number, label: string, speedMultiplier: number }> = [
  { tier: 0, min: 0, label: 'Cold / Broke', speedMultiplier: 1 },
  { tier: 1, min: 1, label: 'Warm Bag', speedMultiplier: 1.04 },
  { tier: 2, min: 150, label: 'Hot Bag', speedMultiplier: 1.08 },
  { tier: 3, min: 210, label: 'Nuclear Bag', speedMultiplier: 1.12 },
]

const RUG_WINDOW_LABELS: Record<RugWindowState, string> = {
  'no-bag': 'NO BAG',
  open: 'RUG WINDOW: OPEN',
  hot: 'RUG WINDOW: HOT',
  unstable: 'RUG WINDOW: UNSTABLE',
}

const RUG_WINDOW_STYLES: Record<RugWindowState, { color: number, textColor: string, alpha: number, duration: number }> = {
  'no-bag': { color: 0x46ff9b, textColor: '#8fa2bd', alpha: 0.22, duration: 0 },
  open: { color: 0x46ff9b, textColor: '#46ff9b', alpha: 0.72, duration: 900 },
  hot: { color: 0xffc23a, textColor: '#ffc23a', alpha: 0.82, duration: 620 },
  unstable: { color: 0xff6b52, textColor: '#ff6b52', alpha: 0.92, duration: 360 },
}

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
  private rugWindowFrame: Phaser.GameObjects.Rectangle | null = null
  private rugWindowText: Phaser.GameObjects.Text | null = null
  private heldTrash: TrashKind | null = null
  private carriedBag = 0
  private heatPressure = 0
  private heatTier: HeatTier = 0
  private rugWindowState: RugWindowState = 'no-bag'
  private startedAt = 0
  private failed = false
  private escaped = false
  private activeRoomId: RoomId = 'grease-entrance'
  private fakeAlphaTaken = 0
  private lostBagRecoveredThisRun = false
  private deathsThisFloor = 0
  private floorResult: FloorResult | null = null

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
    this.rugWindowFrame = null
    this.rugWindowText = null
    this.heldTrash = null
    this.carriedBag = 0
    this.heatPressure = 0
    this.heatTier = 0
    this.rugWindowState = 'no-bag'
    this.failed = false
    this.escaped = false
    this.activeRoomId = 'grease-entrance'
    this.fakeAlphaTaken = 0
    this.lostBagRecoveredThisRun = false
    this.floorResult = null
    const sceneData = this.scene.settings.data as { deathsThisFloor?: number } | undefined
    this.deathsThisFloor = sceneData?.deathsThisFloor ?? 0

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
    const lostBagValue = this.save.lostBag?.value ?? 0
    const settledHint = lostBagValue > 0
      ? `LOST BAG ($${lostBagValue}) is in the room where you dropped it. Grab THE BAG and go get it back.`
      : 'Grease Entrance → Side Greed → RUG EXIT. Grab THE BAG, then decide how greedy to get.'
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
    this.updateActiveRoom()
    this.combat?.update(now, targets)
    this.trash?.update(now, targets)

    for (const enemy of this.enemies) {
      const cause = enemy.update(now, this.player.sprite, this.getCurrentHeat().speedMultiplier)
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
    const deathPoint = resolveSafeRoomPoint(waffleBackroom, this.activeRoomId, {
      x: this.player?.sprite.x ?? waffleBackroom.playerSpawn.x,
      y: this.player?.sprite.y ?? waffleBackroom.playerSpawn.y,
    })
    const droppedBag = droppedValue > 0
      ? createLostBagSnapshot(this.activeRoomId, deathPoint, droppedValue)
      : this.save.lostBag
    this.deathsThisFloor += 1
    this.carriedBag = 0
    this.heatPressure = 0
    this.syncHeatFeedback()
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
    this.time.delayedCall(520, () => this.scene.restart({ lastDeathCause: deathCause, deathsThisFloor: this.deathsThisFloor }))
  }

  private createBagLoop() {
    if (!this.player) {
      return
    }

    const room = waffleBackroom
    const exitZone = createRugExitZone(this, room.rugExit)
    this.createRugWindowFeedback(room.rugExit)
    this.bagSprite = createBagSprite(this, room.bagSpawn.x, room.bagSpawn.y)
    this.physics.add.overlap(this.player.sprite, this.bagSprite, () => this.pickupBag())
    this.physics.add.overlap(this.player.sprite, exitZone, () => this.rugExit())

    // Fake Alpha pickups are readable cursed opportunities, not an inventory/card layer.
    for (const alpha of room.fakeAlpha) {
      const sprite = createFakeAlphaSprite(this, alpha)
      this.add.text(alpha.x, alpha.y - 30, `${alpha.label}\n+$${alpha.bagValue}`, {
        align: 'center',
        color: alpha.labelColor,
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: '900',
      }).setOrigin(0.5).setDepth(15)
      this.physics.add.overlap(this.player.sprite, sprite, () => this.pickupFakeAlpha(sprite, alpha))
    }

    if (this.save.lostBag && room.rooms.some((candidate) => candidate.id === this.save.lostBag?.roomId)) {
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

  private pickupFakeAlpha(sprite: Phaser.Physics.Arcade.Sprite, alpha: FakeAlphaSpawn) {
    if (!sprite.active) {
      return
    }

    this.carriedBag += alpha.bagValue
    this.heatPressure += alpha.heatBump
    this.fakeAlphaTaken += 1
    this.syncHeatFeedback()
    sprite.destroy()
    this.emitFloatingText(this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0, `${alpha.label} +$${alpha.bagValue}`, alpha.labelColor)
    this.applyFakeAlphaSideEffect(alpha)
    this.emitHud(`${alpha.status} Carrying $${this.carriedBag}.`)
    this.updateDebugSnapshot()
  }

  private applyFakeAlphaSideEffect(alpha: FakeAlphaSpawn) {
    if (alpha.sideEffect === 'slow') {
      this.player?.applyTemporarySpeedMultiplier(FREE_MINT_SPEED_MULTIPLIER, FREE_MINT_SLOW_MS)
      this.emitFloatingText(this.player?.sprite.x ?? 0, (this.player?.sprite.y ?? 0) + 24, 'SLOWED', alpha.labelColor)
      return
    }

    if (alpha.sideEffect === 'auditor-pulse') {
      this.pulseAuditors(alpha.labelColor)
    }
  }

  private pulseAuditors(color: string) {
    this.cameras.main.shake(110, 0.008)
    for (const auditor of this.auditors) {
      const ring = this.add.circle(auditor.sprite.x, auditor.sprite.y, 28, 0xff6b52, 0.16)
        .setStrokeStyle(3, 0xffc23a, 0.9)
        .setDepth(21)
      this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 300, onComplete: () => ring.destroy() })
      this.emitFloatingText(auditor.sprite.x, auditor.sprite.y - 34, 'ALERT', color)
    }
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
    this.lostBagRecoveredThisRun = true
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
    this.heatPressure = 0
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
    this.floorResult = {
      banked,
      fakeAlphaTaken: this.fakeAlphaTaken,
      lostBagRecovered: this.lostBagRecoveredThisRun,
      deaths: this.deathsThisFloor,
    }
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
    const heat = this.getCurrentHeat()
    this.callbacks.onHudChange({
      status,
      rentBanked: this.save.rentBanked,
      carriedBag: this.carriedBag,
      lostBag: this.save.lostBag,
      heldTrash: this.heldTrash,
      heatTier: heat.tier,
      heatLabel: heat.label,
      rugWindowState: this.getRugWindowState(heat.tier),
      rugWindowLabel: RUG_WINDOW_LABELS[this.getRugWindowState(heat.tier)],
      deathCause,
      lastDeathCause,
      runState,
      floorResult: this.floorResult,
    })
  }

  private updateActiveRoom() {
    if (!this.player) {
      return
    }

    const nextRoomId = getRoomAtPosition(waffleBackroom, this.player.sprite)
    if (nextRoomId === this.activeRoomId) {
      return
    }

    this.activeRoomId = nextRoomId
    const room = waffleBackroom.rooms.find((candidate) => candidate.id === nextRoomId)
    if (room) {
      this.emitHud(`${room.name}. Keep the exit route in sight.`)
      this.emitFloatingText(this.player.sprite.x, this.player.sprite.y - 28, room.name.toUpperCase(), '#b6ff4a')
    }
  }

  private syncHeatFeedback() {
    const nextHeat = this.getCurrentHeat()
    this.updateRugWindowFeedback(nextHeat.tier)
    if (nextHeat.tier === this.heatTier) {
      return
    }

    const previousTier = this.heatTier
    this.heatTier = nextHeat.tier
    if (nextHeat.tier > previousTier && nextHeat.tier >= 2) {
      this.pulseHeatEdges(nextHeat.tier)
    }
  }

  private getEffectiveHeat() {
    return this.carriedBag + this.heatPressure * HEAT_PRESSURE_VALUE
  }

  private getCurrentHeat() {
    return getBagHeat(this.getEffectiveHeat())
  }

  private getRugWindowState(tier = this.getCurrentHeat().tier): RugWindowState {
    if (this.carriedBag <= 0) {
      return 'no-bag'
    }

    if (tier >= 3) {
      return 'unstable'
    }

    if (tier >= 2) {
      return 'hot'
    }

    return 'open'
  }

  private createRugWindowFeedback(exit: RoomRect) {
    const centerX = exit.x + exit.width / 2
    const centerY = exit.y + exit.height / 2
    this.rugWindowFrame = this.add.rectangle(centerX, centerY, exit.width + 12, exit.height + 12)
      .setDepth(13)
      .setAlpha(0.22)
      .setStrokeStyle(2, 0x46ff9b, 0.22)

    this.rugWindowText = this.add.text(centerX, exit.y - 18, RUG_WINDOW_LABELS['no-bag'], {
      align: 'center',
      color: '#8fa2bd',
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: '900',
    }).setOrigin(0.5).setDepth(18)
    this.updateRugWindowFeedback(0)
  }

  private updateRugWindowFeedback(tier = this.getCurrentHeat().tier) {
    const nextState = this.getRugWindowState(tier)
    const frame = this.rugWindowFrame
    const label = this.rugWindowText
    if (!frame || !label || nextState === this.rugWindowState) {
      return
    }

    this.rugWindowState = nextState
    const style = RUG_WINDOW_STYLES[nextState]
    this.tweens.killTweensOf(frame)
    frame.setScale(1)
    frame.setAlpha(style.alpha)
    frame.setStrokeStyle(nextState === 'unstable' ? 4 : 3, style.color, style.alpha)
    label.setText(RUG_WINDOW_LABELS[nextState])
    label.setColor(style.textColor)
    label.setAlpha(nextState === 'no-bag' ? 0.72 : 1)

    if (style.duration > 0) {
      this.tweens.add({
        targets: frame,
        alpha: Math.max(0.34, style.alpha - 0.22),
        scale: nextState === 'unstable' ? 1.08 : 1.04,
        duration: style.duration,
        yoyo: true,
        repeat: -1,
      })
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
      roomId: this.activeRoomId,
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
      heatTier: this.getCurrentHeat().tier,
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
        this.updateActiveRoom()
        this.updateDebugSnapshot()
      },
      forceFailure: (cause: string) => this.failRun(cause),
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => updateTopdownDebugActions(null))
  }
}
