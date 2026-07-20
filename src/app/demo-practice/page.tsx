'use client'

import { AnimationPlayer } from '@/components/animation'
import { PianoAnimationData } from '@/types/animation'

// 테스트용 애니메이션 데이터 - 연습하기 좋은 간단한 패턴
const practiceAnimationData: PianoAnimationData = {
  version: '1.0',
  title: '연습용 스케일',
  composer: '연습곡',
  duration: 16, // 16초
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    // C Major Scale 연습
    { note: 'C4', startTime: 0, duration: 1, velocity: 0.8, finger: 1, hand: 'right' },
    { note: 'D4', startTime: 1, duration: 1, velocity: 0.8, finger: 2, hand: 'right' },
    { note: 'E4', startTime: 2, duration: 1, velocity: 0.8, finger: 3, hand: 'right' },
    { note: 'F4', startTime: 3, duration: 1, velocity: 0.8, finger: 1, hand: 'right' },
    { note: 'G4', startTime: 4, duration: 1, velocity: 0.8, finger: 2, hand: 'right' },
    { note: 'A4', startTime: 5, duration: 1, velocity: 0.8, finger: 3, hand: 'right' },
    { note: 'B4', startTime: 6, duration: 1, velocity: 0.8, finger: 4, hand: 'right' },
    { note: 'C5', startTime: 7, duration: 1, velocity: 0.8, finger: 5, hand: 'right' },
    
    // Descending
    { note: 'B4', startTime: 8, duration: 1, velocity: 0.8, finger: 4, hand: 'right' },
    { note: 'A4', startTime: 9, duration: 1, velocity: 0.8, finger: 3, hand: 'right' },
    { note: 'G4', startTime: 10, duration: 1, velocity: 0.8, finger: 2, hand: 'right' },
    { note: 'F4', startTime: 11, duration: 1, velocity: 0.8, finger: 1, hand: 'right' },
    { note: 'E4', startTime: 12, duration: 1, velocity: 0.8, finger: 3, hand: 'right' },
    { note: 'D4', startTime: 13, duration: 1, velocity: 0.8, finger: 2, hand: 'right' },
    { note: 'C4', startTime: 14, duration: 2, velocity: 0.8, finger: 1, hand: 'right' },
  ],
  metadata: {
    originalFileName: 'practice-scale.pdf',
    fileSize: 1024,
    processedAt: new Date().toISOString(),
    keySignature: 'C',
    difficulty: 'beginner'
  }
}

export default function PracticeDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          연습 가이드 모드 데모
        </h1>
        <p className="text-gray-600">
          12번 태스크: 실제 피아노 연습 가이드 모드 구현
        </p>
      </div>

      {/* 기능 설명 */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            🎹 연습 가이드 모드
          </h2>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>• <strong>단계별 진행:</strong> 각 음표를 하나씩 연습</li>
            <li>• <strong>건반 강조:</strong> 다음에 눌러야 할 건반 표시</li>
            <li>• <strong>손가락 번호:</strong> 올바른 핑거링 가이드</li>
            <li>• <strong>수동 진행:</strong> 연주 후 직접 다음 단계</li>
          </ul>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-3">
            🎵 템포 연습 모드
          </h2>
          <ul className="text-green-800 space-y-2 text-sm">
            <li>• <strong>점진적 속도:</strong> 느린 속도에서 시작</li>
            <li>• <strong>자동 증가:</strong> 완주 후 속도 자동 증가</li>
            <li>• <strong>연습 기록:</strong> 시간과 진도 추적</li>
            <li>• <strong>구간 반복:</strong> 어려운 부분 집중 연습</li>
          </ul>
        </div>
      </div>

      {/* 사용 방법 */}
      <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">📝 사용 방법</h3>
        <ol className="text-yellow-800 space-y-1 text-sm pl-4">
          <li>1. 모드 선택에서 &quot;📚 연습 가이드&quot; 선택</li>
          <li>2. 시작 속도와 목표 속도 설정</li>
          <li>3. &quot;🎹 연습 시작&quot; 버튼 클릭</li>
          <li>4. 강조된 건반을 실제 피아노에서 연주</li>
          <li>5. 연주 후 &quot;다음 단계 →&quot; 버튼 클릭</li>
          <li>6. 모든 단계 완료 시 속도가 자동으로 증가</li>
        </ol>
      </div>

      {/* 애니메이션 플레이어 */}
      <div className="bg-white rounded-lg shadow-lg">
        <AnimationPlayer
          animationData={practiceAnimationData}
          onNotePlay={(note) => console.log('Practice note play:', note)}
          onNoteStop={(note) => console.log('Practice note stop:', note)}
          onActiveNotesChange={(notes) => console.log('Practice active notes:', Array.from(notes))}
        />
      </div>

      {/* 개발 완료 상태 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">✅ 12번 태스크 완료 상태</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-700 mb-2">12.1 연습 가이드 시스템</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ 애니메이션 일시정지 및 단계별 진행</li>
              <li>✅ 현재 건반 강조 표시 (PracticeKeyHighlight)</li>
              <li>✅ 수동 진행 버튼 (다음 단계)</li>
              <li>✅ 손가락 번호 및 손 가이드</li>
              <li>✅ 연습 진행률 표시</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">12.2 템포 연습 모드</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ 점진적 속도 증가 시스템</li>
              <li>✅ 구간별 반복 재생 (Loop Section)</li>
              <li>✅ 연습 시간 기록 및 통계</li>
              <li>✅ 자동 템포 진행 옵션</li>
              <li>✅ 세션 상태 추적</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-100 rounded border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">🎯 핵심 개선사항</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 터치/키보드 입력 제거 → 실제 피아노 연습 지원</li>
            <li>• Simply Piano 스타일의 시각적 가이드 제공</li>
            <li>• 단계별 학습으로 체계적인 연습 지원</li>
            <li>• 점진적 템포 증가로 실력 향상 도움</li>
          </ul>
        </div>
      </div>
    </div>
  )
}