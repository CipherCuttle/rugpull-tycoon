import Phaser from 'phaser'
import type { RoomPoint } from '../types'

const PLAYER_SPEED = 235
const TOUCH_DEADZONE = 18

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly heldKeys = new Set<string>()
  private facingRadians = 0
  private mouseActive = false

  constructor(scene: Phaser.Scene, spawn: RoomPoint) {
    this.scene = scene
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'dust-pawn')
    this.sprite.setDepth(20)
    this.sprite.setCollideWorldBounds(true)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setCircle(14, 2, 2)

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.handleKeyDown)
      window.removeEventListener('keyup', this.handleKeyUp)
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove)
    })
  }

  update() {
    // Movement is keyboard-first, with touch drag as the mobile fallback.
    const keyboardVector = this.getKeyboardVector()
    const move = keyboardVector.lengthSq() > 0 ? keyboardVector.normalize() : this.getTouchMoveVector()

    if (move.lengthSq() > 0) {
      this.sprite.setVelocity(move.x * PLAYER_SPEED, move.y * PLAYER_SPEED)
      if (!this.mouseActive) {
        // No mouse yet: face where we are heading (keyboard/touch fallback).
        this.facingRadians = move.angle()
      }
    } else {
      this.sprite.setVelocity(0, 0)
    }

    // Facing is mouse-driven and independent of movement (Hotline-style twin control).
    if (this.mouseActive) {
      const pointer = this.scene.input.activePointer
      const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.facingRadians = Math.atan2(world.y - this.sprite.y, world.x - this.sprite.x)
    }

    this.sprite.setRotation(this.facingRadians)
  }

  getFacing() {
    return new Phaser.Math.Vector2(Math.cos(this.facingRadians), Math.sin(this.facingRadians))
  }

  getFacingRadians() {
    return this.facingRadians
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

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) {
      this.mouseActive = true
    }
  }

  private getTouchMoveVector() {
    const pointer = this.scene.input.activePointer

    // A held mouse button must not move the pawn — that click is reserved for shoving.
    if (!pointer.isDown || !pointer.wasTouch) {
      return new Phaser.Math.Vector2(0, 0)
    }

    const target = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const move = new Phaser.Math.Vector2(target.x - this.sprite.x, target.y - this.sprite.y)
    return move.length() > TOUCH_DEADZONE ? move.normalize() : new Phaser.Math.Vector2(0, 0)
  }
}
