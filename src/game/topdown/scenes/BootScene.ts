import Phaser from 'phaser'
import type { TopdownGameCallbacks } from '../events'

export class BootScene extends Phaser.Scene {
  private readonly callbacks: TopdownGameCallbacks

  constructor(callbacks: TopdownGameCallbacks) {
    super('boot')
    this.callbacks = callbacks
  }

  create() {
    const dust = this.make.graphics({ x: 0, y: 0 })
    dust.fillStyle(0x46ff9b, 1)
    dust.fillCircle(16, 16, 14)
    dust.fillStyle(0xf5f2dc, 1)
    dust.fillTriangle(25, 16, 13, 10, 13, 22)
    dust.generateTexture('dust-pawn', 32, 32)
    dust.destroy()

    this.callbacks.onSliceReady()
    this.scene.start('waffle-backroom')
  }
}
