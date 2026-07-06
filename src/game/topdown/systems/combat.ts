import Phaser from 'phaser'
import type { Stunnable } from './combatTargets'
import { PlayerController } from './player'
import { TrashController } from './trash'

const SHOVE_RANGE = 62
const SHOVE_DOT_MIN = 0.28
const SHOVE_COOLDOWN_MS = 360
const HITSTOP_MS = 55

export class CombatController {
  private readonly scene: Phaser.Scene
  private readonly player: PlayerController
  private readonly trash: TrashController
  private nextShoveAt = 0
  private queuedHudAttack = false

  constructor(scene: Phaser.Scene, player: PlayerController, trash: TrashController) {
    this.scene = scene
    this.player = player
    this.trash = trash
    window.addEventListener('rugpull-topdown-attack', this.queueHudAttack)
    window.addEventListener('keydown', this.queueKeyboardAttack)
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.queuePointerAttack)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('rugpull-topdown-attack', this.queueHudAttack)
      window.removeEventListener('keydown', this.queueKeyboardAttack)
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.queuePointerAttack)
    })
  }

  update(now: number, targets: Stunnable[]) {
    if (!this.shouldAct()) {
      return
    }

    const origin = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y)
    const facing = this.player.getFacing()

    // Holding trash turns the attack into a throw; empty-handed, it's a shove.
    if (this.trash.isHolding()) {
      this.trash.throw(origin, facing, now)
      return
    }

    this.shove(now, origin, facing, targets)
  }

  private readonly queueHudAttack = () => {
    this.queuedHudAttack = true
  }

  private readonly queueKeyboardAttack = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.key === ' ') {
      this.queuedHudAttack = true
    }
  }

  private readonly queuePointerAttack = (pointer: Phaser.Input.Pointer) => {
    // Only a left mouse click attacks; touch is reserved for movement + the HUD button.
    if (!pointer.wasTouch && pointer.leftButtonDown()) {
      this.queuedHudAttack = true
    }
  }

  private shouldAct() {
    if (this.queuedHudAttack) {
      this.queuedHudAttack = false
      return true
    }

    return false
  }

  private shove(now: number, origin: Phaser.Math.Vector2, facing: Phaser.Math.Vector2, targets: Stunnable[]) {
    if (now < this.nextShoveAt) {
      return
    }

    this.nextShoveAt = now + SHOVE_COOLDOWN_MS
    let hit = false

    for (const target of targets) {
      if (target.isStunned(now)) {
        continue
      }

      const toTarget = new Phaser.Math.Vector2(target.sprite.x - origin.x, target.sprite.y - origin.y)
      const distance = toTarget.length()
      if (distance > SHOVE_RANGE || distance <= 0) {
        continue
      }

      const direction = toTarget.clone().normalize()
      if (direction.dot(facing) < SHOVE_DOT_MIN) {
        continue
      }

      target.stun(origin, now)
      hit = true
    }

    this.showShove(origin, facing, hit)
    if (hit) {
      this.scene.cameras.main.shake(130, 0.012)
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
