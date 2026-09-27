/**
 * A MIDI note-on's pitch, or null. Velocity 0 is the running-status form of a
 * note-off, so it is not a press.
 */
export function parseNoteOn(data: Uint8Array | null | undefined): number | null {
  if (!data || data.length < 3) return null
  const command = data[0] & 0xf0
  if (command !== 0x90 || data[2] === 0) return null
  return data[1]
}
