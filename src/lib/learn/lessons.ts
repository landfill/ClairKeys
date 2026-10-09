export interface LearnLesson {
  id: string
  title: string
  href: string
  description: string
  available: boolean
  // 이 레슨에서 하는 것. 홈 카드와 레슨 상단이 같은 원본을 쓴다. 레슨 페이지에 실제로 있는 섹션·조작에서만 뽑는다.
  topics: string[]
  activity: string
}

// 레슨을 공개할 때 이 플래그를 바꾸면 단계 지도와 레슨 이동이 함께 열린다.
export const LEARN_LESSONS: LearnLesson[] = [
  {
    id: 'keyboard', title: '건반', href: '/learn/keyboard', description: '건반의 이름과 가운데 도의 위치를 익혀요.', available: true,
    topics: ['건반 이름', '검은 건반 묶음', '가운데 도', '옥타브'], activity: '건반 눌러 보기, 도 찾기 문제',
  },
  {
    id: 'reading', title: '악보 읽기 1', href: '/learn/reading', description: '악보가 나타내는 음높이를 알아봐요.', available: true,
    topics: ['오선', '음자리표', '가운데 도'], activity: '악보 예시 듣기, 오선과 건반 연결하기',
  },
  {
    id: 'reading-rhythm', title: '악보 읽기 2', href: '/learn/reading/rhythm', description: '악보가 나타내는 음의 길이와 박자를 알아봐요.', available: true,
    topics: ['음표 길이', '쉼표', '점음표', '박자표'], activity: '리듬 예시를 골라 듣기',
  },
  {
    id: 'hands', title: '손', href: '/learn/hands', description: '손 자세와 손가락 번호를 익혀요.', available: true,
    topics: ['손가락 번호', '기본 손 모양', '다섯 손가락 자리'], activity: '손을 골라 다섯 손가락 자리 눌러 보기',
  },
  {
    id: 'practice', title: '연습 방법', href: '/learn/practice', description: '한 부분씩 나누어 천천히 연습하는 방법을 알아봐요.', available: true,
    topics: ['느린 속도', '한 손 연습', 'A-B 구간 반복', '기다리기 모드', '메트로놈', '단축키'], activity: '재생 화면의 연습 설정과 단축키 알아보기',
  },
]

export function getLessonNavigation(id: string, lessons: readonly LearnLesson[] = LEARN_LESSONS) {
  const index = lessons.findIndex(lesson => lesson.id === id)
  if (index < 0) return { previous: undefined, next: undefined }

  return {
    previous: lessons.slice(0, index).filter(lesson => lesson.available).at(-1),
    next: lessons.slice(index + 1).find(lesson => lesson.available),
  }
}
