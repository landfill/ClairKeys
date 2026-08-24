import { A0_MIDI, C8_MIDI, buildKeyLayout } from '../pianoLayout';

const KEY_WIDTH = 20;
const BLACK_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

describe('buildKeyLayout', () => {
  const layout = buildKeyLayout(KEY_WIDTH);
  const keys = [...layout.byMidi.entries()].map(([midi, position]) => ({
    midi,
    ...position
  }));
  const whiteKeys = keys.filter(key => !key.black);
  const blackKeys = keys.filter(key => key.black);

  it('builds all 88 piano keys from A0 through C8', () => {
    expect(keys).toHaveLength(88);
    expect(whiteKeys).toHaveLength(52);
    expect(blackKeys).toHaveLength(36);
    expect(Math.min(...keys.map(key => key.midi))).toBe(A0_MIDI);
    expect(Math.max(...keys.map(key => key.midi))).toBe(C8_MIDI);
  });

  it('keeps left-to-right x order identical to ascending MIDI order', () => {
    const midiByX = [...keys]
      .sort((left, right) => left.x - right.x)
      .map(key => key.midi);

    expect(midiByX).toEqual(
      Array.from({ length: 88 }, (_, index) => A0_MIDI + index)
    );
  });

  it('centers every black key near the boundary of its adjacent white keys', () => {
    for (const blackKey of blackKeys) {
      const leftWhiteKey = layout.byMidi.get(blackKey.midi - 1);
      const rightWhiteKey = layout.byMidi.get(blackKey.midi + 1);

      expect(leftWhiteKey?.black).toBe(false);
      expect(rightWhiteKey?.black).toBe(false);

      const boundary = leftWhiteKey!.x + leftWhiteKey!.w;
      const center = blackKey.x + blackKey.w / 2;
      expect(Math.abs(center - boundary)).toBeLessThanOrEqual(
        KEY_WIDTH * 0.35
      );
      expect(rightWhiteKey!.x).toBe(boundary);
    }
  });

  it('does not overlap black keys', () => {
    const blackKeysByX = [...blackKeys].sort((left, right) => left.x - right.x);

    for (let index = 1; index < blackKeysByX.length; index++) {
      const previous = blackKeysByX[index - 1];
      const current = blackKeysByX[index];
      expect(previous.x + previous.w).toBeLessThanOrEqual(current.x);
    }
  });

  it('keeps every key inside the keyboard width', () => {
    for (const key of keys) {
      expect(key.x).toBeGreaterThanOrEqual(0);
      expect(key.x + key.w).toBeLessThanOrEqual(layout.totalWidth);
    }
  });

  it('does not place black keys between E-F or B-C', () => {
    for (const key of keys) {
      if (key.black) {
        expect(BLACK_KEY_PITCH_CLASSES).toContain(key.midi % 12);
      }

      const pitchClass = key.midi % 12;
      if (!key.black && (pitchClass === 4 || pitchClass === 11)) {
        expect(layout.byMidi.get(key.midi + 1)?.black).toBe(false);
      }
    }
  });

  it('keeps the empty gap between adjacent black keys within 1.5 white-key widths', () => {
    const blackKeysByX = [...blackKeys].sort((left, right) => left.x - right.x);

    for (let index = 1; index < blackKeysByX.length; index++) {
      const previous = blackKeysByX[index - 1];
      const current = blackKeysByX[index];
      const gap = current.x - (previous.x + previous.w);
      expect(gap).toBeLessThanOrEqual(KEY_WIDTH * 1.5);
    }
  });
});
