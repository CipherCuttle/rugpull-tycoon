import Phaser from 'phaser'
import type { LostBagSnapshot, RoomRect, TopdownRoomData } from '../types'

export const STARTING_BAG_VALUE = 120

export function createBagSprite(scene: Phaser.Scene, x: number, y: number, texture = 'bag-pawn') {
  const sprite = scene.physics.add.sprite(x, y, texture)
  sprite.setDepth(14)
  return sprite
}

export function createLostBagSprite(scene: Phaser.Scene, lostBag: LostBagSnapshot) {
  const sprite = createBagSprite(scene, lostBag.x, lostBag.y, 'lost-bag-pawn')
  sprite.setTint(0xff6b52)
  return sprite
}

export function createRugExitZone(scene: Phaser.Scene, exit: RoomRect) {
  const zone = scene.add.zone(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
  scene.physics.add.existing(zone, true)
  return zone
}

export function createLostBagSnapshot(room: TopdownRoomData, x: number, y: number, value: number): LostBagSnapshot {
  return {
    roomId: room.id,
    x: Math.round(x),
    y: Math.round(y),
    value,
  }
}
