'use client'

import React from 'react'
import FallingNotesPlayer from '@/components/animation/FallingNotesPlayer'
import type { PianoAnimationData } from '@/types/animation'
import { normalizeAnimationData } from '@/utils/animationContract'

// Test data authored in the legacy Shape A (string pitch / startTime / left|right);
// normalized to the canonical contract before use, exercising that path too.
const testData: PianoAnimationData = {
  version: '1.0',
  title: 'Finger Visualization Test',
  composer: 'ClairKeys',
  duration: 8,
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    // Right hand scale with clear finger numbers
    { note: 'C4', startTime: 0, duration: 1, velocity: 0.8, hand: 'right', finger: 1 },
    { note: 'D4', startTime: 1, duration: 1, velocity: 0.8, hand: 'right', finger: 2 },
    { note: 'E4', startTime: 2, duration: 1, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'F4', startTime: 3, duration: 1, velocity: 0.8, hand: 'right', finger: 4 },
    { note: 'G4', startTime: 4, duration: 1, velocity: 0.8, hand: 'right', finger: 5 },
    
    // Left hand bass notes
    { note: 'C3', startTime: 0, duration: 2, velocity: 0.7, hand: 'left', finger: 5 },
    { note: 'G2', startTime: 2, duration: 2, velocity: 0.7, hand: 'left', finger: 3 },
    { note: 'F2', startTime: 4, duration: 2, velocity: 0.7, hand: 'left', finger: 1 },
    
    // Chord with multiple fingers showing
    { note: 'C5', startTime: 6, duration: 2, velocity: 0.8, hand: 'right', finger: 1 },
    { note: 'E5', startTime: 6, duration: 2, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'G5', startTime: 6, duration: 2, velocity: 0.8, hand: 'right', finger: 5 },
  ],
  metadata: {
    originalFileName: 'finger-test-inline.json',
    fileSize: 1024,
    processedAt: new Date().toISOString(),
    pagesProcessed: 1,
    staffLinesDetected: 2,
    notesDetected: 11
  }
}

export default function TestFingerPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎹 손가락 번호 시각화 테스트
          </h1>
          <p className="text-gray-600 mb-4">
            떨어지는 음표에 손가락 번호(1-5)와 손 색상(왼손=파란색, 오른손=빨간색)이 표시되는지 확인합니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">👈 왼손 (파란색)</h3>
              <p className="text-sm text-blue-600">
                베이스 음표들이 파란색으로 표시되며, 손가락 번호 5, 3, 1이 보여야 합니다.
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">👉 오른손 (빨간색)</h3>
              <p className="text-sm text-red-600">
                멜로디 음표들이 빨간색으로 표시되며, 손가락 번호 1-5가 순서대로 보여야 합니다.
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">🎯 확인 포인트</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>떨어지는 음표에 원형 배지로 손가락 번호가 표시되는가?</li>
              <li>왼손 음표는 파란색, 오른손 음표는 빨간색으로 표시되는가?</li>
              <li>손가락 번호가 음표 내부에 중앙 정렬되어 있는가?</li>
              <li>작은 음표에서는 손가락 번호가 적절히 숨겨지는가?</li>
              <li>재생 시 애니메이션이 부드럽게 작동하는가?</li>
            </ul>
          </div>
        </div>
        
        <FallingNotesPlayer
          animationData={normalizeAnimationData(testData)}
          className="bg-white rounded-lg shadow-lg"
        />
        
        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">🔍 디버그 정보</h3>
          <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(testData.notes.slice(0, 3), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}