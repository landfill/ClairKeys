import * as pianoLayout from '../pianoLayout';
import { A0_MIDI, C8_MIDI, buildKeyLayout } from '../pianoLayout';
import type { FallingNote, KeyLayout } from '@/types/fallingNotes';

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

describe('responsive playback layout contract', () => {
  it('documents that the fixed 24px layout only fits 14 of 52 white keys in 356px', () => {
    const layout = buildKeyLayout(24);
    const visibleWhiteKeys = [...layout.byMidi.values()].filter(
      key => !key.black && key.x + key.w <= 356
    );

    expect(visibleWhiteKeys).toHaveLength(14);
  });

  it('keeps every score note inside a white-key-snapped responsive layout', () => {
    type ResponsiveLayoutBuilder = (
      availableWidth: number,
      notes: FallingNote[]
    ) => KeyLayout;
    const { buildResponsiveKeyLayout } = pianoLayout as typeof pianoLayout & {
      buildResponsiveKeyLayout: ResponsiveLayoutBuilder;
    };
    const notes: FallingNote[] = [
      { midi: 30, start: 0, duration: 1 }, // F#1 must retain F1 below it.
      { midi: 83, start: 1, duration: 1 }, // B5 is already a white-key boundary.
    ];

    const layout = buildResponsiveKeyLayout(356, notes);

    expect(layout.byMidi.has(29)).toBe(true);
    expect(layout.byMidi.has(30)).toBe(true);
    expect(layout.byMidi.has(83)).toBe(true);
    expect(layout.byMidi.get(29)?.w).toBeCloseTo(356 / 32, 10);
    expect(Math.min(...notes.map(note => note.midi))).toBeGreaterThanOrEqual(
      Math.min(...layout.byMidi.keys())
    );
    expect(Math.max(...notes.map(note => note.midi))).toBeLessThanOrEqual(
      Math.max(...layout.byMidi.keys())
    );
    expect(layout.totalWidth).toBe(356);
  });

  // Leftover width used to become symmetric margin: 230px of blank on a 1022px
  // desktop, 612px on a 1404px playback view. Those pixels can carry adjacent
  // keys at the same density instead, which costs the score nothing — the added
  // keys lie outside its range, so no note moves onto a different key.
  describe('filling the measured width', () => {
    type ResponsiveLayoutBuilder = (
      availableWidth: number,
      notes: FallingNote[]
    ) => KeyLayout;
    const { buildResponsiveKeyLayout } = pianoLayout as typeof pianoLayout & {
      buildResponsiveKeyLayout: ResponsiveLayoutBuilder;
    };

    const narrowScore: FallingNote[] = [
      { midi: 60, start: 0, duration: 1 }, // C4
      { midi: 64, start: 1, duration: 1 }, // E4
    ];

    const whiteKeys = (layout: KeyLayout) =>
      [...layout.byMidi.entries()].filter(([, key]) => !key.black);

    it('adds neighbouring keys until the next one would fall below the base width', () => {
      const layout = buildResponsiveKeyLayout(1022, narrowScore);
      const whites = whiteKeys(layout);

      // 1022 / 24 = 42.58 — a 43rd key would put every key under the base.
      expect(whites).toHaveLength(42);
      expect(whites[0][1].w).toBeCloseTo(1022 / 42, 10);
      expect(whites[0][1].w).toBeGreaterThanOrEqual(pianoLayout.BASE_PLAYBACK_KEY_WIDTH);
    });

    it('leaves no margin once the width is filled', () => {
      const layout = buildResponsiveKeyLayout(1022, narrowScore);
      const whites = whiteKeys(layout).map(([, key]) => key);
      const left = Math.min(...whites.map(key => key.x));
      const right = Math.max(...whites.map(key => key.x + key.w));

      expect(left).toBeCloseTo(0, 6);
      expect(right).toBeCloseTo(1022, 6);
    });

    it('grows outward on both sides so the score keeps its place in the middle', () => {
      const layout = buildResponsiveKeyLayout(1022, narrowScore);
      const midis = [...layout.byMidi.keys()];

      expect(Math.min(...midis)).toBeLessThan(60);
      expect(Math.max(...midis)).toBeGreaterThan(64);
    });

    it('stops at the ends of an 88-key piano rather than inventing keys', () => {
      const layout = buildResponsiveKeyLayout(5000, narrowScore);
      const whites = whiteKeys(layout);
      const midis = [...layout.byMidi.keys()];

      expect(whites).toHaveLength(52);
      expect(Math.min(...midis)).toBe(A0_MIDI);
      expect(Math.max(...midis)).toBe(C8_MIDI);
      // Nothing is left to add, so the remaining width has to go into the keys.
      expect(whites[0][1].w).toBeCloseTo(5000 / 52, 10);
    });

    it('adds nothing when the score alone already exceeds the width', () => {
      const wideScore: FallingNote[] = [
        { midi: 30, start: 0, duration: 1 }, // F#1 → keeps F1 below it
        { midi: 83, start: 1, duration: 1 }, // B5
      ];

      const layout = buildResponsiveKeyLayout(356, wideScore);
      const whites = whiteKeys(layout);

      // 356 / 24 = 14.8, far under the 32 the score itself needs. A narrow
      // viewport must behave exactly as it did before.
      expect(whites).toHaveLength(32);
      expect(whites[0][1].w).toBeCloseTo(356 / 32, 10);
    });
  });
});
