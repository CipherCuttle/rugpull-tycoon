import Phaser from 'phaser'
import type { RoomPoint, RoomRect, RoomId, TopdownRoomData } from '../types'

const WALL_COLOR = 0x17202a
const PROP_COLOR = 0x21161a
const EXIT_COLOR = 0x203d25

function addStaticRect(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  rect: RoomRect,
  color: number,
  alpha = 1,
) {
  const shape = scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, color, alpha)
  shape.setStrokeStyle(2, 0x46ff9b, color === WALL_COLOR ? 0.22 : 0.14)
  scene.physics.add.existing(shape, true)
  group.add(shape)
  return shape
}

export function buildRoomCollision(scene: Phaser.Scene, room: TopdownRoomData) {
  const blockers = scene.physics.add.staticGroup()

  for (const wall of room.walls) {
    addStaticRect(scene, blockers, wall, WALL_COLOR)
  }

  for (const prop of room.props) {
    addStaticRect(scene, blockers, prop, PROP_COLOR, 0.94)
  }

  return blockers
}

export function drawRoomBackdrop(scene: Phaser.Scene, room: TopdownRoomData) {
  scene.add.rectangle(room.world.width / 2, room.world.height / 2, room.world.width, room.world.height, 0x070a0e)
  for (const definition of room.rooms) {
    const { bounds } = definition
    scene.add.rectangle(bounds.x + bounds.width / 2, bounds.y + 28, bounds.width - 20, 42, 0x160b12, 0.96)
      .setStrokeStyle(2, 0xff3b52, 0.55)
    scene.add.text(bounds.x + bounds.width / 2, bounds.y + 28, definition.name.toUpperCase(), {
      color: '#b6ff4a',
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: '700',
    }).setOrigin(0.5)
  }

  scene.add.rectangle(
    room.rugExit.x + room.rugExit.width / 2,
    room.rugExit.y + room.rugExit.height / 2,
    room.rugExit.width,
    room.rugExit.height,
    EXIT_COLOR,
    0.82,
  ).setStrokeStyle(3, 0x46ff9b, 0.72)
  scene.add.text(room.rugExit.x + room.rugExit.width / 2, room.rugExit.y + room.rugExit.height / 2, 'RUG\nEXIT', {
    align: 'center',
    color: '#46ff9b',
    fontFamily: 'monospace',
    fontSize: '16px',
    fontStyle: '700',
  }).setOrigin(0.5)
}

export function getRoomAtPosition(room: TopdownRoomData, point: RoomPoint): RoomId {
  const found = room.rooms.find(({ bounds }) => (
    point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height
  ))
  return found?.id ?? 'grease-entrance'
}

export function resolveSafeRoomPoint(room: TopdownRoomData, roomId: RoomId, point: RoomPoint): RoomPoint {
  const definition = room.rooms.find((candidate) => candidate.id === roomId) ?? room.rooms[0]
  const inset = 28
  return {
    x: Phaser.Math.Clamp(point.x, definition.bounds.x + inset, definition.bounds.x + definition.bounds.width - inset),
    y: Phaser.Math.Clamp(point.y, definition.bounds.y + inset, definition.bounds.y + definition.bounds.height - inset),
  }
}
