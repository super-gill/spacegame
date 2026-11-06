/** A seed from an id (FNV-1a): the same id always gives the same seed. */
export function idSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * A small seeded random number generator (mulberry32), for content made
 * once from a seed, such as a belt's asteroids. The sim keeps no random
 * state while it runs: generated content is stored in the world, and
 * anything else that must vary (a shot's scatter) is seeded from an id.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
