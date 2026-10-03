import type { Metadata } from 'next'
import LessonLayout from '@/components/learn/LessonLayout'
import KeyboardLesson from '@/components/learn/KeyboardLesson'

export const metadata: Metadata = {
  title: '건반 익히기 | ClairKeys',
  description: '건반을 눌러 계이름과 소리를 확인하고, 검은 건반 묶음과 가운데 도의 위치를 익혀 보세요.',
}

export default function KeyboardPage() {
  return <LessonLayout lessonId="keyboard"><KeyboardLesson /></LessonLayout>
}
