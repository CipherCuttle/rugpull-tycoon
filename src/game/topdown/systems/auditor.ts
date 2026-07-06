import Phaser from 'phaser'
import type { AuditorSpawn, RoomPoint } from '../types'
import type { Stunnable } from './combatTargets'

const AUDITOR_PATROL_SPEED = 72
const AUDITOR_NOTICE_RANGE = 168
// Slightly above the player+auditor collider separation (~33px) so brushing the
// active auditor reliably registers as a lethal touch, not a harmless bump.
const AUDITOR_CONTACT_RANGE = 34
const PATROL_POINT_RANGE = 12
const WINDUP_MS = 680
const STAMP_RADIUS = 92
const RECOVER_MS = 900
const STUN_MS = 900
const KNOCKBACK_SPEED = 640
const STUN_TINT = 0x8fa2bd
const CALM_TINT = 0x6f7d99
const ALERT_TINT = 0xffd23a

type AuditorState = 'patrol' | 'windup' | 'recover'

// The Fake Auditor: a slow lane blocker that guards the RUG EXIT approach. It is
// deliberately telegraphed — it plants, winds up with a growing ring, then STAMPS
// a shockwave. Standing inside the stamp (or touching the auditor) ends the run,
// but a shove or thrown trash staggers it long enough to slip past.
export class AuditorController implements Stunnable {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly patrol: RoomPoint[]
  private patrolIndex = 0
  private state: AuditorState = 'patrol'
  private stunnedUntil = 0
  private windupUntil = 0
  private recoverUntil = 0
  private telegraph: Phaser.GameObjects.Arc | null = null

  constructor(scene: Phaser.Scene, spawn: AuditorSpawn) {
    this.scene = scene
    this.patrol = spawn.patrol.length > 0 ? spawn.patrol : [{ x: spawn.x, y: spawn.y }]
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'auditor-pawn')
    this.sprite.setName(spawn.id)
    this.sprite.setDepth(19)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setCircle(19, 5, 5)
    body.setImmovable(true)
  }

  update(now: number, player: Phaser.Physics.Arcade.Sprite): string | null {
    if (now < this.stunnedUntil) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      this.sprite.setTint(STUN_TINT)
      this.sprite.setAlpha(0.55)
      this.sprite.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9)
      return null
    }

    this.sprite.setAlpha(1)
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y)

    // Touching an active auditor is an instant fail, same rule as a Jeet bump.
    if (distance <= AUDITOR_CONTACT_RANGE) {
      this.clearTelegraph()
      this.sprite.setVelocity(0, 0)
      this.sprite.setTint(0xff3b52)
      return `${this.sprite.name.toUpperCase()} stamped Dust's paperwork. Denied.`
    }

    if (this.state === 'recover') {
      this.sprite.setVelocity(0, 0)
      this.sprite.setTint(CALM_TINT)
      if (now >= this.recoverUntil) {
        this.state = 'patrol'
      }
      return null
    }

    if (this.state === 'windup') {
      this.sprite.setVelocity(0, 0)
      this.sprite.setTint(ALERT_TINT)
      if (now >= this.windupUntil) {
        return this.stamp(now, distance)
      }
      return null
    }

    // Patrol until the player wanders into the guarded lane, then commit to a stamp.
    if (distance <= AUDITOR_NOTICE_RANGE) {
      this.beginWindup(now)
      return null
    }

    this.sprite.setTint(CALM_TINT)
    this.patrolStep()
    return null
  }

  stun(from: Phaser.Math.Vector2, now: number) {
    this.clearTelegraph()
    this.state = 'patrol'
    const knockback = new Phaser.Math.Vector2(this.sprite.x - from.x, this.sprite.y - from.y)
    if (knockback.lengthSq() === 0) {
      knockback.set(1, 0)
    }
    knockback.normalize()
    this.stunnedUntil = now + STUN_MS
    this.sprite.setTint(STUN_TINT)
    this.sprite.setAlpha(0.55)
    this.sprite.setVelocity(knockback.x * KNOCKBACK_SPEED, knockback.y * KNOCKBACK_SPEED)
  }

  isStunned(now: number) {
    return now < this.stunnedUntil
  }

  private beginWindup(now: number) {
    this.state = 'windup'
    this.windupUntil = now + WINDUP_MS
    this.sprite.setVelocity(0, 0)

    // Growing red ring = "danger about to land here". Player has WINDUP_MS to leave.
    this.telegraph = this.scene.add.circle(this.sprite.x, this.sprite.y, STAMP_RADIUS, 0xff3b52, 0.18)
      .setStrokeStyle(3, 0xff3b52, 0.85)
      .setScale(0.18)
      .setDepth(12)
    this.scene.tweens.add({
      targets: this.telegraph,
      scale: 1,
      duration: WINDUP_MS,
      ease: 'Sine.Out',
    })
  }

  private stamp(now: number, distance: number): string | null {
    this.clearTelegraph()
    this.state = 'recover'
    this.recoverUntil = now + RECOVER_MS

    // Shockwave flash to sell the impact.
    const wave = this.scene.add.circle(this.sprite.x, this.sprite.y, STAMP_RADIUS, 0xff3b52, 0.28)
      .setStrokeStyle(4, 0xffd23a, 0.9)
      .setDepth(12)
    this.scene.tweens.add({ targets: wave, alpha: 0, scale: 1.25, duration: 220, onComplete: () => wave.destroy() })
    this.scene.cameras.main.shake(140, 0.014)

    if (distance <= STAMP_RADIUS) {
      return `${this.sprite.name.toUpperCase()} STAMPED Dust flat. Audit failed.`
    }
    return null
  }

  private clearTelegraph() {
    if (this.telegraph) {
      this.scene.tweens.killTweensOf(this.telegraph)
      this.telegraph.destroy()
      this.telegraph = null
    }
  }

  private patrolStep() {
    const target = this.patrol[this.patrolIndex]
    if (!target) {
      this.sprite.setVelocity(0, 0)
      return
    }

    const toTarget = new Phaser.Math.Vector2(target.x - this.sprite.x, target.y - this.sprite.y)
    if (toTarget.length() <= PATROL_POINT_RANGE) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length
      this.sprite.setVelocity(0, 0)
      return
    }

    toTarget.normalize()
    this.sprite.setVelocity(toTarget.x * AUDITOR_PATROL_SPEED, toTarget.y * AUDITOR_PATROL_SPEED)
    this.sprite.setRotation(toTarget.angle())
  }
}
