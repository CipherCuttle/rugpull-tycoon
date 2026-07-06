import Phaser from 'phaser'
import type { JeetSpawn, RoomPoint } from '../types'

const JEET_SPEED = 150
const JEET_NOTICE_RANGE = 230
const JEET_ATTACK_RANGE = 31
const PATROL_POINT_RANGE = 12
const STUN_MS = 720
const KNOCKBACK_SPEED = 780
const STUN_TINT = 0x8fa2bd

export class EnemyController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly patrol: RoomPoint[]
  private patrolIndex = 0
  private stunnedUntil = 0

  constructor(scene: Phaser.Scene, spawn: JeetSpawn) {
    this.patrol = spawn.patrol.length > 0 ? spawn.patrol : [{ x: spawn.x, y: spawn.y }]
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'jeet-pawn')
    this.sprite.setName(spawn.id)
    this.sprite.setDepth(18)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setCircle(13, 3, 3)
  }

  update(now: number, player: Phaser.Physics.Arcade.Sprite) {
    if (now < this.stunnedUntil) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      // Stunned Jeets read as dazed: cold grey-blue tint + faded, sliding to a stop.
      this.sprite.setTint(STUN_TINT)
      this.sprite.setAlpha(0.55)
      this.sprite.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95)
      return null
    }

    this.sprite.setAlpha(1)
    const toPlayer = new Phaser.Math.Vector2(player.x - this.sprite.x, player.y - this.sprite.y)
    const distanceToPlayer = toPlayer.length()

    if (distanceToPlayer <= JEET_ATTACK_RANGE) {
      this.sprite.setVelocity(0, 0)
      this.sprite.setTint(0xff3b52)
      return `${this.sprite.name.toUpperCase()} bumped Dust into the sticky tile.`
    }

    if (distanceToPlayer <= JEET_NOTICE_RANGE) {
      this.sprite.setTint(0xff6b52)
      toPlayer.normalize()
      this.sprite.setVelocity(toPlayer.x * JEET_SPEED, toPlayer.y * JEET_SPEED)
      this.sprite.setRotation(toPlayer.angle())
      return null
    }

    this.sprite.clearTint()
    this.patrolStep()
    return null
  }

  stun(from: Phaser.Math.Vector2, now: number) {
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
    this.sprite.setVelocity(toTarget.x * JEET_SPEED * 0.55, toTarget.y * JEET_SPEED * 0.55)
    this.sprite.setRotation(toTarget.angle())
  }
}
