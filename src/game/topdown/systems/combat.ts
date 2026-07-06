import Phaser from 'phaser'
import { EnemyController } from './enemyAi'
import { PlayerController } from './player'

const SHOVE_RANGE = 62
const SHOVE_DOT_MIN = 0.28
const SHOVE_COOLDOWN_MS = 360
const HITSTOP_MS = 55

export class CombatController {
  private readonly scene: Phaser.Scene
  private readonly player: PlayerController
  private nextShoveAt = 0
  private queuedHudAttack = false

  constructor(scene: Phaser.Scene, player: PlayerController) {
    this.scene = scene
    this.player = player
    window.addEventListener('rugpull-topdown-attack', this.queueHudAttack)
    window.addEventListener('keydown', this.queueKeyboardAttack)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('rugpull-topdown-attack', this.queueHudAttack)
      window.removeEventListener('keydown', this.queueKeyboardAttack)
    })
  }

  update(now: number, enemies: EnemyController[]) {
    if (!this.shouldShove()) {
      return
    }

    this.shove(now, enemies)
  }

  private readonly queueHudAttack = () => {
    this.queuedHudAttack = true
  }

  private readonly queueKeyboardAttack = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.key === ' ') {
      this.queuedHudAttack = true
    }
  }

  private shouldShove() {
    if (this.queuedHudAttack) {
      this.queuedHudAttack = false
      return true
    }

    return false
  }

  private shove(now: number, enemies: EnemyController[]) {
    if (now < this.nextShoveAt) {
      return
    }

    this.nextShoveAt = now + SHOVE_COOLDOWN_MS
    const origin = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y)
    const facing = this.player.getFacing()
    let hit = false

    for (const enemy of enemies) {
      if (enemy.isStunned(now)) {
        continue
      }

      const toEnemy = new Phaser.Math.Vector2(enemy.sprite.x - origin.x, enemy.sprite.y - origin.y)
      const distance = toEnemy.length()
      if (distance > SHOVE_RANGE || distance <= 0) {
        continue
      }

      const direction = toEnemy.clone().normalize()
      if (direction.dot(facing) < SHOVE_DOT_MIN) {
        continue
      }

      enemy.stun(origin, now)
      hit = true
    }

    this.showShove(origin, facing, hit)
    if (hit) {
      this.scene.cameras.main.shake(90, 0.007)
      this.scene.physics.world.pause()
      this.scene.time.delayedCall(HITSTOP_MS, () => this.scene.physics.world.resume())
    }
  }

  private showShove(origin: Phaser.Math.Vector2, facing: Phaser.Math.Vector2, hit: boolean) {
    const center = origin.clone().add(facing.clone().scale(42))
    const swipe = this.scene.add.rectangle(center.x, center.y, 58, 22, hit ? 0xffc23a : 0x46e0ff, hit ? 0.62 : 0.32)
    swipe.setRotation(facing.angle())
    swipe.setDepth(40)
    this.scene.tweens.add({
      targets: swipe,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.6,
      duration: 110,
      onComplete: () => swipe.destroy(),
    })
  }
}
