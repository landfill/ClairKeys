import { render, screen } from '@testing-library/react';
import SimplePianoKeyboard from '../SimplePianoKeyboard';
import { notesToVisualNotes } from '@/utils/visualUtils';
import { A0_MIDI, C8_MIDI, buildKeyLayout } from '@/utils/pianoLayout';

describe('SimplePianoKeyboard', () => {
  it('centers every falling note over its key while keys keep canonical x', () => {
    const layout = buildKeyLayout(24);
    const notes = Array.from(
      { length: C8_MIDI - A0_MIDI + 1 },
      (_, index) => ({
        midi: A0_MIDI + index,
        start: 0,
        duration: 1
      })
    );
    const visualNotes = notesToVisualNotes(
      notes,
      0,
      100,
      400,
      layout
    );
    const { container } = render(<SimplePianoKeyboard layout={layout} />);
    const renderedWhiteKey = container.querySelector<HTMLElement>('.bg-white');
    const renderedBlackKey = container.querySelector<HTMLElement>('.bg-black');

    expect(visualNotes).toHaveLength(88);
    expect(renderedWhiteKey).not.toBeNull();
    expect(renderedBlackKey).not.toBeNull();
    expect(Number.parseFloat(renderedWhiteKey!.style.left)).toBe(
      layout.byMidi.get(A0_MIDI)!.x
    );
    expect(Number.parseFloat(renderedBlackKey!.style.left)).toBe(
      layout.byMidi.get(A0_MIDI + 1)!.x
    );

    let centeredWhiteKeys = 0;
    let centeredBlackKeys = 0;

    notes.forEach((note, index) => {
      const key = layout.byMidi.get(note.midi)!;
      const visualNote = visualNotes[index];
      const keyCenter = key.x + key.w / 2;
      const noteCenter = visualNote.x + visualNote.w / 2;

      expect(noteCenter).toBeCloseTo(keyCenter, 10);
      if (key.black) centeredBlackKeys++;
      else centeredWhiteKeys++;
    });

    expect(centeredWhiteKeys).toBe(52);
    expect(centeredBlackKeys).toBe(36);
  });

  it('marks C keys without widening a cropped score range', () => {
    const croppedLayout = buildKeyLayout(12, { minMidi: 29, maxMidi: 83 });
    render(<SimplePianoKeyboard layout={croppedLayout} />);

    expect(screen.getByLabelText('C2 octave marker')).toBeInTheDocument();
    expect(screen.getByLabelText('C3 octave marker')).toBeInTheDocument();
    expect(screen.getByLabelText('C4 octave marker')).toBeInTheDocument();
    expect(screen.getByLabelText('C5 octave marker')).toBeInTheDocument();
    expect(croppedLayout.byMidi.has(24)).toBe(false);
  });
});
