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
    dust.fillCircle(16, 16, 13)
    // Cracked-phone / knife wedge protruding from the front so facing reads at a glance.
    dust.fillStyle(0xffc23a, 1)
    dust.fillTriangle(30, 16, 12, 11, 12, 21)
    dust.fillStyle(0x08040a, 1)
    dust.fillCircle(16, 16, 3)
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

    // Frozen waffle: amber square with a dark grid so it reads as throwable junk.
    const trash = this.make.graphics({ x: 0, y: 0 })
    trash.fillStyle(0xe7a943, 1)
    trash.fillRoundedRect(4, 4, 24, 24, 4)
    trash.lineStyle(2, 0x5a3410, 1)
    trash.strokeRoundedRect(4, 4, 24, 24, 4)
    trash.lineBetween(12, 4, 12, 28)
    trash.lineBetween(20, 4, 20, 28)
    trash.lineBetween(4, 12, 28, 12)
    trash.lineBetween(4, 20, 28, 20)
    trash.generateTexture('trash-waffle', 32, 32)
    trash.destroy()

    // Greed gem: green diamond, deliberately shiny so it lures the player off-route.
    const greed = this.make.graphics({ x: 0, y: 0 })
    greed.fillStyle(0x46ff9b, 1)
    greed.fillPoints([
      { x: 16, y: 3 },
      { x: 28, y: 16 },
      { x: 16, y: 29 },
      { x: 4, y: 16 },
    ], true)
    greed.lineStyle(2, 0x08040a, 1)
    greed.strokePoints([
      { x: 16, y: 3 },
      { x: 28, y: 16 },
      { x: 16, y: 29 },
      { x: 4, y: 16 },
    ], true, true)
    greed.generateTexture('greed-gem', 32, 32)
    greed.destroy()

    // Fake Auditor: a bulky steel block with a dark visor slit — bigger than a Jeet.
    const auditor = this.make.graphics({ x: 0, y: 0 })
    auditor.fillStyle(0x6f7d99, 1)
    auditor.fillRoundedRect(5, 5, 34, 34, 6)
    auditor.lineStyle(3, 0x2a3550, 1)
    auditor.strokeRoundedRect(5, 5, 34, 34, 6)
    auditor.fillStyle(0x08040a, 1)
    auditor.fillRect(26, 14, 10, 16)
    auditor.generateTexture('auditor-pawn', 44, 44)
    auditor.destroy()

    this.callbacks.onSliceReady()
    this.scene.start('waffle-backroom')
  }
}
