/**
 * 선형 아이콘 세트 (DS-1).
 *
 * 이슈 #76은 이모지 제거와 일관된 선형 아이콘을 요구한다. 새 의존성을 들이는 대신 인라인 SVG로
 * 둔다 — 이 앱이 실제로 쓰는 아이콘은 십수 개이고, 아이콘 라이브러리는 번들과 트리셰이킹 설정을
 * 함께 데려온다.
 *
 * 모든 아이콘은 `currentColor`를 쓴다. 색은 부모의 텍스트 색에서 오므로 토큰이 그대로 적용된다.
 * 기본값은 장식용(`aria-hidden`)이다. 아이콘만으로 의미를 전달해야 하면 `title`을 넘긴다.
 */
import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  /** 아이콘이 유일한 레이블일 때만 넘긴다. 넘기면 `img` role과 접근 가능한 이름이 생긴다. */
  title?: string
  size?: number
}

function Icon({ title, size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** 워드마크 옆의 마크. 오선과 그 위를 지나는 음표 흐름. */
export function LogoMark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h18M3 11h18M3 15h18" opacity={0.45} />
      <path d="M4 17c4-1 6-7 9-7s4 3 7 2" />
      <circle cx="8" cy="14" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function LibraryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h5v16H5zM12 4h3v16h-3z" />
      <path d="M17.5 4.6l2.6.7-3 15.3-2.6-.7" />
    </Icon>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </Icon>
  )
}

export function ExploreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </Icon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Icon>
  )
}
