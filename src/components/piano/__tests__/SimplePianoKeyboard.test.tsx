import { render } from '@testing-library/react';
import SimplePianoKeyboard from '../SimplePianoKeyboard';
import { notesToVisualNotes } from '@/utils/visualUtils';
import { buildKeyLayout } from '@/utils/pianoLayout';

describe('SimplePianoKeyboard', () => {
  it('uses the same canonical black-key x as falling notes', () => {
    const layout = buildKeyLayout(20);
    const blackKey = layout.byMidi.get(22); // A#0
    const visualNote = notesToVisualNotes(
      [{ midi: 22, start: 0, duration: 1 }],
      0,
      100,
      400,
      layout
    )[0];
    const { container } = render(<SimplePianoKeyboard layout={layout} />);
    const renderedBlackKey = container.querySelector<HTMLElement>('.bg-black');

    expect(blackKey).toBeDefined();
    expect(renderedBlackKey).not.toBeNull();
    expect(Number.parseFloat(renderedBlackKey!.style.left)).toBe(blackKey!.x);
    expect(visualNote.x).toBe(blackKey!.x);
  });
});
