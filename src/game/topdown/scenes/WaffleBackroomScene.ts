import Phaser from 'phaser'
import type { TopdownGameCallbacks } from '../events'

export class WaffleBackroomScene extends Phaser.Scene {
  private readonly callbacks: TopdownGameCallbacks

  constructor(callbacks: TopdownGameCallbacks) {
    super('waffle-backroom')
    this.callbacks = callbacks
  }

  create() {
    this.cameras.main.setBackgroundColor('#05070c')
    this.add.rectangle(480, 270, 900, 480, 0x0c1118).setStrokeStyle(4, 0x46ff9b, 0.7)
    this.add.rectangle(480, 84, 740, 54, 0x1a1018).setStrokeStyle(2, 0xff3b52, 0.75)
    this.add.text(480, 78, 'WAFFLE MAUSOLEUM BACKROOM', {
      color: '#b6ff4a',
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: '700',
    }).setOrigin(0.5)
    this.add.text(480, 126, 'Phase 1: Phaser 3.90.0 canvas mounted. No chart hazards came with us.', {
      color: '#ffc23a',
      fontFamily: 'monospace',
      fontSize: '14px',
    }).setOrigin(0.5)

    this.add.rectangle(210, 300, 120, 54, 0x20131a).setStrokeStyle(2, 0xffc23a, 0.6)
    this.add.rectangle(378, 348, 180, 42, 0x111926).setStrokeStyle(2, 0x46e0ff, 0.45)
    this.add.rectangle(688, 314, 150, 70, 0x18120c).setStrokeStyle(2, 0xff3b52, 0.45)
    this.add.circle(480, 282, 18, 0x46ff9b, 0.95).setStrokeStyle(3, 0xf5f2dc, 0.9)
    this.add.text(480, 322, 'DUST SPAWN', {
      color: '#f5f2dc',
      fontFamily: 'monospace',
      fontSize: '12px',
    }).setOrigin(0.5)

    this.callbacks.onHudChange({
      status: 'Phaser canvas mounted. Next phase adds movement and collision.',
      rentBanked: 0,
      carriedBag: 0,
      lostBag: null,
      deathCause: null,
      runState: 'playing',
    })
  }
}
