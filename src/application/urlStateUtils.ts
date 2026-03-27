import LZString from 'lz-string'

/**
 * Compresses and encodes an object into a URL-safe string.
 */
export function encodeState<T>(state: T): string {
  try {
    const json = JSON.stringify(state)
    return LZString.compressToEncodedURIComponent(json)
  } catch (e) {
    console.error('Failed to encode state', e)
    return ''
  }
}

/**
 * Decodes and decompresses a string from a URL into an object.
 */
export function decodeState<T>(encoded: string): T | null {
  if (!encoded) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as T
  } catch (e) {
    console.error('Failed to decode state', e)
    return null
  }
}
