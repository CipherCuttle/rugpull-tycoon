import Phaser from 'phaser'
import type { TopdownRoomData, TrashKind } from '../types'
import type { Stunnable } from './combatTargets'

const THROW_SPEED = 620
const THROW_LIFETIME_MS = 1400
const THROW_HIT_RANGE = 26

export const TRASH_LABELS: Record<TrashKind, string> = {
  'frozen-waffle': 'Frozen Waffle',
}

interface Projectile {
  sprite: Phaser.Physics.Arcade.Sprite
  diesAt: number
  dead: boolean
}

// Owns the room's trash pickups, the single held trash slot, and any airborne
// projectiles. The scene asks this whether the player is holding trash so the
// attack input can decide between a throw and a bare-handed shove.
export class TrashController {
  private readonly scene: Phaser.Scene
  private readonly blockers: Phaser.Physics.Arcade.StaticGroup
  private readonly onHeldChange: (held: TrashKind | null) => void
  private readonly onImpact: (x: number, y: number, kind: 'jeet' | 'wall') => void
  private held: TrashKind | null = null
  private pickups: Phaser.Physics.Arcade.Sprite[] = []
  private projectiles: Projectile[] = []

  constructor(
    scene: Phaser.Scene,
    blockers: Phaser.Physics.Arcade.StaticGroup,
    onHeldChange: (held: TrashKind | null) => void,
    onImpact: (x: number, y: number, kind: 'jeet' | 'wall') => void,
  ) {
    this.scene = scene
    this.blockers = blockers
    this.onHeldChange = onHeldChange
    this.onImpact = onImpact
  }

  spawnPickups(room: TopdownRoomData, playerSprite: Phaser.Physics.Arcade.Sprite) {
    for (const spawn of room.trash) {
      const sprite = this.scene.physics.add.sprite(spawn.x, spawn.y, 'trash-waffle')
      sprite.setName(spawn.id)
      sprite.setData('kind', spawn.kind)
      sprite.setDepth(13)
      this.scene.tweens.add({ targets: sprite, angle: 12, duration: 900, yoyo: true, repeat: -1 })
      this.scene.physics.add.overlap(playerSprite, sprite, () => this.pickup(sprite))
      this.pickups.push(sprite)
    }
  }

  isHolding() {
    return this.held !== null
  }

  private pickup(sprite: Phaser.Physics.Arcade.Sprite) {
    // One trash slot only: ignore pickups while already carrying something.
    if (this.held || !sprite.active) {
      return
    }

    this.held = sprite.getData('kind') as TrashKind
    sprite.destroy()
    this.pickups = this.pickups.filter((item) => item !== sprite)
    this.onHeldChange(this.held)
  }

  throw(origin: Phaser.Math.Vector2, facing: Phaser.Math.Vector2, now: number) {
    if (!this.held) {
      return
    }

    this.held = null
    this.onHeldChange(null)

    const spawn = origin.clone().add(facing.clone().scale(24))
    const sprite = this.scene.physics.add.sprite(spawn.x, spawn.y, 'trash-waffle')
    sprite.setDepth(22)
    sprite.setVelocity(facing.x * THROW_SPEED, facing.y * THROW_SPEED)
    const projectile: Projectile = { sprite, diesAt: now + THROW_LIFETIME_MS, dead: false }

    // A projectile that meets a wall shatters — clear feedback, no pass-through.
    this.scene.physics.add.collider(sprite, this.blockers, () => this.breakProjectile(projectile, 'wall'))
    this.scene.tweens.add({ targets: sprite, angle: 720, duration: THROW_LIFETIME_MS })
    this.projectiles.push(projectile)
  }

  update(now: number, targets: Stunnable[]) {
    for (const projectile of this.projectiles) {
      if (projectile.dead) {
        continue
      }

      if (now >= projectile.diesAt) {
        this.breakProjectile(projectile, 'wall')
        continue
      }

      for (const target of targets) {
        if (target.isStunned(now)) {
          continue
        }

        const distance = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, target.sprite.x, target.sprite.y)
        if (distance <= THROW_HIT_RANGE) {
          const from = new Phaser.Math.Vector2(projectile.sprite.x, projectile.sprite.y)
          target.stun(from, now)
          this.breakProjectile(projectile, 'jeet')
          break
        }
      }
    }

    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead)
  }

  private breakProjectile(projectile: Projectile, kind: 'jeet' | 'wall') {
    if (projectile.dead) {
      return
    }

    projectile.dead = true
    this.onImpact(projectile.sprite.x, projectile.sprite.y, kind)
    projectile.sprite.destroy()
  }
}
