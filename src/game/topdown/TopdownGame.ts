import Phaser from 'phaser'
import type { TopdownGameCallbacks } from './events'
import { BootScene } from './scenes/BootScene'
import { WaffleBackroomScene } from './scenes/WaffleBackroomScene'

export function mountTopdownGame(parent: HTMLElement, callbacks: TopdownGameCallbacks) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#05070c',
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [new BootScene(callbacks), new WaffleBackroomScene(callbacks)],
  })
}
