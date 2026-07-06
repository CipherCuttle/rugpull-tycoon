import Phaser from 'phaser'

// Anything the player can knock back with a shove or a thrown trash object.
// Both Jeets and the Fake Auditor implement this so combat/trash code can treat
// them uniformly instead of hard-coding enemy types.
export interface Stunnable {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  isStunned(now: number): boolean
  stun(from: Phaser.Math.Vector2, now: number): void
}
