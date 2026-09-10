/**
 * DevDot Gamification Anti-Abuse Utility Functions
 */

/**
 * Fast FNV-1a 32-bit hash for payload deduplication in the gamification system.
 * Returns a compact hex string with length fingerprint, e.g. "a4f19b2c:124".
 */
export function computePayloadHash(str: string): string {
  if (!str) return 'empty:0'
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16) + ':' + str.length
}
