export interface LearnLesson {
  id: string
  title: string
  href: string
  description: string
  available: boolean
}

// 레슨을 공개할 때 이 플래그를 바꾸면 단계 지도와 레슨 이동이 함께 열린다.
export const LEARN_LESSONS: LearnLesson[] = [
  { id: 'keyboard', title: '건반', href: '/learn/keyboard', description: '건반의 이름과 가운데 도의 위치를 익혀요.', available: true },
  { id: 'reading', title: '악보 읽기', href: '/learn/reading', description: '악보가 나타내는 음높이와 길이, 박자를 알아봐요.', available: false },
  { id: 'hands', title: '손', href: '/learn/hands', description: '손 자세와 손가락 번호를 익혀요.', available: false },
  { id: 'practice', title: '연습 방법', href: '/learn/practice', description: '한 부분씩 나누어 천천히 연습하는 방법을 알아봐요.', available: false },
]

export function getLessonNavigation(id: string, lessons: readonly LearnLesson[] = LEARN_LESSONS) {
  const index = lessons.findIndex(lesson => lesson.id === id)
  if (index < 0) return { previous: undefined, next: undefined }

  return {
    previous: lessons.slice(0, index).filter(lesson => lesson.available).at(-1),
    next: lessons.slice(index + 1).find(lesson => lesson.available),
  }
}
