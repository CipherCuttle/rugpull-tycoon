import Phaser from 'phaser'
import type { RoomPoint } from '../types'

const PLAYER_SPEED = 235
const POINTER_DEADZONE = 18

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly heldKeys = new Set<string>()
  private readonly facing = new Phaser.Math.Vector2(1, 0)

  constructor(scene: Phaser.Scene, spawn: RoomPoint) {
    this.scene = scene
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'dust-pawn')
    this.sprite.setDepth(20)
    this.sprite.setCollideWorldBounds(true)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setCircle(14, 2, 2)

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.handleKeyDown)
      window.removeEventListener('keyup', this.handleKeyUp)
    })
  }

  update() {
    const keyboardVector = this.getKeyboardVector()
    const pointerVector = keyboardVector.lengthSq() > 0 ? new Phaser.Math.Vector2(0, 0) : this.getPointerVector()
    const move = keyboardVector.lengthSq() > 0 ? keyboardVector : pointerVector

    if (move.lengthSq() > 0) {
      move.normalize()
      this.facing.copy(move)
      this.sprite.setVelocity(move.x * PLAYER_SPEED, move.y * PLAYER_SPEED)
      this.sprite.setRotation(this.facing.angle())
      return
    }

    this.sprite.setVelocity(0, 0)
  }

  getFacing() {
    return this.facing.clone()
  }

  getHeldKeys() {
    return [...this.heldKeys]
  }

  private getKeyboardVector() {
    const left = this.heldKeys.has('a') || this.heldKeys.has('arrowleft')
    const right = this.heldKeys.has('d') || this.heldKeys.has('arrowright')
    const up = this.heldKeys.has('w') || this.heldKeys.has('arrowup')
    const down = this.heldKeys.has('s') || this.heldKeys.has('arrowdown')
    return new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0))
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    this.heldKeys.add(event.key.toLowerCase())
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.heldKeys.delete(event.key.toLowerCase())
  }

  private getPointerVector() {
    const pointer = this.scene.input.activePointer

    if (!pointer.isDown) {
      return new Phaser.Math.Vector2(0, 0)
    }

    const target = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const move = new Phaser.Math.Vector2(target.x - this.sprite.x, target.y - this.sprite.y)
    return move.length() > POINTER_DEADZONE ? move : new Phaser.Math.Vector2(0, 0)
  }
}
