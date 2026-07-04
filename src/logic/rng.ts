// Seeded PRNG module. All game-logic randomness flows through rng().
//
// Default (unseeded): delegates to Math.random(), so test mocks on Math.random
// continue to work without any test changes.
//
// After seedRng() is called: switches to sfc32 — a high-quality, fast 32-bit
// generator. Visual-only randomness (e.g. roll-animation cycling) may still
// use Math.random() directly.

let _impl: () => number = () => Math.random()

let _a = 0, _b = 0, _c = 0, _d = 1

function splitmix32(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return (h ^ (h >>> 16)) >>> 0
}

function sfc32(): number {
  _a >>>= 0; _b >>>= 0; _c >>>= 0; _d >>>= 0
  const t = (_a + _b) | 0
  _a = _b ^ (_b >>> 9)
  _b = (_c + (_c << 3)) | 0
  _c = (_c << 21) | (_c >>> 11)
  _d = (_d + 1) | 0
  const r = (t + _d) | 0
  _c = (_c + r) | 0
  return (r >>> 0) / 4294967296
}

/** Seed the global PRNG from a 10-digit hex string (40 bits of entropy). */
export function seedRng(hexSeed: string): void {
  const lo = parseInt(hexSeed.slice(2, 10), 16)
  const hi = parseInt(hexSeed.slice(0, 2), 16)
  _a = splitmix32(lo)
  _b = splitmix32(_a ^ (hi * 0x01010101))
  _c = splitmix32(_b)
  _d = splitmix32(_c ^ lo)
  // warm up
  sfc32(); sfc32(); sfc32(); sfc32()
  _impl = sfc32
}

/** Returns a pseudo-random float in [0, 1). */
export function rng(): number {
  return _impl()
}

/** Generate a fresh 10-digit hex seed using the browser's crypto API. */
export function generateSeed(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
