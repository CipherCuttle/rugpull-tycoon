import Phaser from 'phaser'
import type { RoomPoint } from '../types'

const PLAYER_SPEED = 235
const POINTER_DEADZONE = 18

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly keys: Partial<Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>>
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys | null
  private readonly facing = new Phaser.Math.Vector2(1, 0)

  constructor(scene: Phaser.Scene, spawn: RoomPoint) {
    this.scene = scene
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'dust-pawn')
    this.sprite.setDepth(20)
    this.sprite.setCollideWorldBounds(true)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setCircle(14, 2, 2)

    const keyboard = scene.input.keyboard
    this.cursors = keyboard?.createCursorKeys() ?? null
    this.keys = keyboard
      ? {
          up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        }
      : {}
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

  private getKeyboardVector() {
    const left = this.keys.left?.isDown || this.cursors?.left.isDown
    const right = this.keys.right?.isDown || this.cursors?.right.isDown
    const up = this.keys.up?.isDown || this.cursors?.up.isDown
    const down = this.keys.down?.isDown || this.cursors?.down.isDown
    return new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0))
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
