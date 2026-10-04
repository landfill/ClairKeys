import type { CanonicalFinger } from '@/types/animationContract'

export type LessonHand = 'right' | 'left'
export const FINGER_NAMES: Record<CanonicalFinger, string> = {
  1: '엄지', 2: '검지', 3: '중지', 4: '약지', 5: '새끼손가락',
}
export const FIVE_FINGER_POSITIONS: Record<LessonHand, readonly { midi: number; finger: CanonicalFinger }[]> = {
  right: [{ midi: 60, finger: 1 }, { midi: 62, finger: 2 }, { midi: 64, finger: 3 }, { midi: 65, finger: 4 }, { midi: 67, finger: 5 }],
  left: [{ midi: 48, finger: 5 }, { midi: 50, finger: 4 }, { midi: 52, finger: 3 }, { midi: 53, finger: 2 }, { midi: 55, finger: 1 }],
}
export function fingerForKey(hand: LessonHand, midi: number): CanonicalFinger | undefined {
  return FIVE_FINGER_POSITIONS[hand].find(key => key.midi === midi)?.finger
}
