import type { KeyPosition } from '@/types/fallingNotes'

/** 문서나 포커스는 움직이지 않고 넘치는 건반 영역 안에서 선택한 건반을 중앙으로 맞춘다. */
export function revealKeyboardKey(
  region: Pick<HTMLElement, 'clientWidth' | 'scrollWidth' | 'scrollLeft'> | null,
  key: Pick<KeyPosition, 'x' | 'w'> | undefined,
): void {
  if (!region || !key || region.clientWidth >= region.scrollWidth) return
  region.scrollLeft = Math.max(0, Math.min(region.scrollWidth - region.clientWidth, key.x + key.w / 2 - region.clientWidth / 2))
}
