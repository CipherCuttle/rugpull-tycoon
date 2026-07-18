import Phaser from 'phaser'
import type { FakeAlphaSpawn, LostBagSnapshot, RoomId, RoomRect, RoomPoint } from '../types'

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

export function createFakeAlphaSprite(scene: Phaser.Scene, spawn: FakeAlphaSpawn) {
  const sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'greed-gem')
  sprite.setDepth(14)
  sprite.setTint(spawn.tint)
  scene.tweens.add({ targets: sprite, scale: 1.16, duration: 720, yoyo: true, repeat: -1 })
  return sprite
}

export function createRugExitZone(scene: Phaser.Scene, exit: RoomRect) {
  const zone = scene.add.zone(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
  scene.physics.add.existing(zone, true)
  return zone
}

export function createLostBagSnapshot(roomId: RoomId, point: RoomPoint, value: number): LostBagSnapshot {
  return {
    roomId,
    x: Math.round(point.x),
    y: Math.round(point.y),
    value,
  }
}
