import Phaser from 'phaser'
import type { TopdownGameCallbacks } from '../events'

export class BootScene extends Phaser.Scene {
  private readonly callbacks: TopdownGameCallbacks

  constructor(callbacks: TopdownGameCallbacks) {
    super('boot')
    this.callbacks = callbacks
  }

  create() {
    this.callbacks.onSliceReady()
    this.scene.start('waffle-backroom')
  }
}
