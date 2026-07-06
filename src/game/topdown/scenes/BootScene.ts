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

    const jeet = this.make.graphics({ x: 0, y: 0 })
    jeet.fillStyle(0xff3b52, 1)
    jeet.fillCircle(16, 16, 13)
    jeet.fillStyle(0x08040a, 1)
    jeet.fillCircle(11, 13, 2)
    jeet.fillCircle(21, 13, 2)
    jeet.generateTexture('jeet-pawn', 32, 32)
    jeet.destroy()

    const bag = this.make.graphics({ x: 0, y: 0 })
    bag.fillStyle(0xffc23a, 1)
    bag.fillRoundedRect(5, 9, 22, 18, 5)
    bag.lineStyle(3, 0x08040a, 1)
    bag.strokeRoundedRect(5, 9, 22, 18, 5)
    bag.generateTexture('bag-pawn', 32, 32)
    bag.clear()
    bag.fillStyle(0xff3b52, 1)
    bag.fillRoundedRect(5, 9, 22, 18, 5)
    bag.lineStyle(3, 0xffc23a, 1)
    bag.strokeRoundedRect(5, 9, 22, 18, 5)
    bag.generateTexture('lost-bag-pawn', 32, 32)
    bag.destroy()

    this.callbacks.onSliceReady()
    this.scene.start('waffle-backroom')
  }
}
