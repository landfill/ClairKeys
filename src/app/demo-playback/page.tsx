'use client'

import { useState } from 'react'
import { PlaybackControls, AdvancedPlaybackControls } from '@/components/playback'
import { PianoAnimationData } from '@/types/animation'
import { AnimationPlayer } from '@/components/animation'

// 테스트용 애니메이션 데이터
const testAnimationData: PianoAnimationData = {
  version: '1.0',
  title: '테스트 곡',
  composer: '작곡가',
  duration: 120, // 2분
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
    { note: 'D4', startTime: 1, duration: 1, velocity: 0.7 },
    { note: 'E4', startTime: 2, duration: 1, velocity: 0.9 },
    { note: 'F4', startTime: 3, duration: 2, velocity: 0.8 },
    { note: 'G4', startTime: 5, duration: 1, velocity: 0.6 },
  ],
  metadata: {
    originalFileName: 'test.pdf',
    fileSize: 1024,
    processedAt: new Date().toISOString()
  }
}

export default function PlaybackDemoPage() {
  const [currentTab, setCurrentTab] = useState<'basic' | 'advanced' | 'integrated'>('basic')
  
  // 기본 컨트롤용 상태
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [playbackMode, setPlaybackMode] = useState<'listen' | 'follow'>('listen')
  const [isLooping, setIsLooping] = useState(false)

  const handlePlay = () => {
    setIsPlaying(!isPlaying)
    console.log('Play/Pause clicked')
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    console.log('Stop clicked')
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
    console.log('Seek to:', time)
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    console.log('Speed changed to:', speed)
  }

  const handleModeChange = (mode: 'listen' | 'follow') => {
    setPlaybackMode(mode)
    console.log('Mode changed to:', mode)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          재생 컨트롤 시스템 데모
        </h1>
        <p className="text-gray-600">
          11번 태스크: 재생 컨트롤 시스템 구현 완료
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'basic', label: '기본 컨트롤' },
            { key: 'advanced', label: '고급 컨트롤' },
            { key: 'integrated', label: '통합 플레이어' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCurrentTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 컨텐츠 */}
      <div className="space-y-6">
        {currentTab === 'basic' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">기본 재생 컨트롤</h2>
            <p className="text-gray-600 mb-6">
              재생/일시정지, 정지, 진행률 표시, 속도 조절, 모드 전환 기능
            </p>
            
            <PlaybackControls
              isPlaying={isPlaying}
              isReady={true}
              currentTime={currentTime}
              duration={testAnimationData.duration}
              playbackSpeed={playbackSpeed}
              playbackMode={playbackMode}
              onPlay={handlePlay}
              onStop={handleStop}
              onSeek={handleSeek}
              onSpeedChange={handleSpeedChange}
              onModeChange={handleModeChange as any}
            />

            {/* 기능 설명 */}
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">구현된 기능:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ 재생/일시정지/정지 버튼</li>
                <li>✅ 진행률 표시바 및 시간 표시</li>
                <li>✅ 클릭으로 특정 위치 이동 (seek)</li>
                <li>✅ 속도 조절 (0.25x ~ 2.0x)</li>
                <li>✅ 듣기/따라하기 모드 전환</li>
              </ul>
            </div>
          </div>
        )}

        {currentTab === 'advanced' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">고급 재생 컨트롤</h2>
            <p className="text-gray-600 mb-6">
              추가 기능: Skip, 반복 재생, 정밀 속도 조절, 키보드 단축키
            </p>
            
            <AdvancedPlaybackControls
              isPlaying={isPlaying}
              isReady={true}
              currentTime={currentTime}
              duration={testAnimationData.duration}
              playbackSpeed={playbackSpeed}
              playbackMode={playbackMode}
              onPlay={handlePlay}
              onStop={handleStop}
              onSeek={handleSeek}
              onSpeedChange={handleSpeedChange}
              onModeChange={handleModeChange as any}
              onLoop={setIsLooping}
              isLooping={isLooping}
            />

            {/* 키보드 단축키 안내 */}
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <h3 className="font-medium mb-2">키보드 단축키:</h3>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                <div>⌨️ <kbd className="bg-gray-200 px-1 rounded">Space</kbd>: 재생/일시정지</div>
                <div>⌨️ <kbd className="bg-gray-200 px-1 rounded">S</kbd>: 정지</div>
                <div>⌨️ <kbd className="bg-gray-200 px-1 rounded">←/→</kbd>: 10초 이동</div>
                <div>⌨️ <kbd className="bg-gray-200 px-1 rounded">↑/↓</kbd>: 속도 조절</div>
                <div>⌨️ <kbd className="bg-gray-200 px-1 rounded">M</kbd>: 모드 전환</div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'integrated' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">통합 애니메이션 플레이어</h2>
            <p className="text-gray-600 mb-6">
              실제 애니메이션 엔진과 통합된 완전한 재생 시스템
            </p>
            
            <AnimationPlayer
              animationData={testAnimationData}
              onNotePlay={(note) => console.log('Note play:', note)}
              onNoteStop={(note) => console.log('Note stop:', note)}
              onActiveNotesChange={(notes) => console.log('Active notes:', Array.from(notes))}
            />

            {/* 통합 기능 설명 */}
            <div className="mt-6 p-4 bg-green-50 rounded">
              <h3 className="font-medium mb-2">통합된 기능:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>🎵 오디오-애니메이션 동기화</li>
                <li>🎹 실시간 음표 하이라이팅</li>
                <li>⌨️ 키보드 단축키 지원</li>
                <li>🎚️ 고급 재생 컨트롤</li>
                <li>📊 실시간 상태 표시</li>
              </ul>
            </div>
          </div>
        )}

        {/* 개발 상태 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">개발 완료 상태</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✅ 완료된 기능</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 기본 재생 컨트롤 (재생/일시정지/정지)</li>
                <li>• 진행률 표시바 및 시간 표시</li>
                <li>• 특정 위치로 이동 (seek) 기능</li>
                <li>• 속도 조절 슬라이더 (0.5x ~ 2.0x)</li>
                <li>• 듣기/따라하기 모드 전환</li>
                <li>• 오디오-애니메이션 동기화</li>
                <li>• 키보드 단축키 지원</li>
                <li>• 고급 재생 컨트롤 (Skip, Loop)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">🚀 추가 개선사항</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PlaybackControls 컴포넌트 분리</li>
                <li>• AdvancedPlaybackControls 구현</li>
                <li>• useKeyboardShortcuts 훅 구현</li>
                <li>• CSS 스타일링 개선</li>
                <li>• A-B 구간 반복 (미래 기능)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}