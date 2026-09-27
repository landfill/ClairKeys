'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { buildResponsiveKeyLayout } from '@/utils/pianoLayout'
import { BOX_BORDER, PX_PER_SEC, planPlaybackGeometry, planScoreAwareGeometry } from '@/utils/playbackGeometry'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import { useFallingNotesPlayer } from '@/hooks/useFallingNotesPlayer'
import { usePlaybackOrientation } from '@/hooks/usePlaybackOrientation'
import { useMidiInput, type MidiStatus } from '@/hooks/useMidiInput'
import { buildWaitSteps } from '@/utils/waitSteps'
import { usePracticeReport, type PracticeRun } from '@/hooks/usePracticeReport'
import { usePracticeResume } from '@/hooks/usePracticeResume'
import { SEEK_STEP_SEC, usePlaybackShortcuts } from '@/hooks/usePlaybackShortcuts'
import { MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'
import FallingNotes from './FallingNotes'
import SimplePianoKeyboard from '../piano/SimplePianoKeyboard'
import { CompactPlaybackBar, PlaybackControls, TempoDisplay } from '@/components/playback'
import { getActiveNotes } from '@/utils/visualUtils'
import { annotationNotesFor, audibleNotesFor, hasBothHands, isPracticedNote, otherHand, type PracticeHand } from '@/utils/handPractice'
import ScoreToggle from '@/components/playback/ScoreToggle'
import ScorePanel from '@/components/playback/ScorePanel'
import ScoreTimingNotice from '@/components/playback/ScoreTimingNotice'
import type { ScoreArtifact } from '@/types/scoreArtifact'
import { loadScoreArtifact } from '@/utils/scoreArtifactCache'
import {
  beatUnitQuarters,
  beatsFromScoreArtifact,
  beatsPerBar,
  constantBeats,
  countInClicks,
  metronomeSource,
} from '@/utils/beatGrid'
import { HAND_COLORS } from '@/types/fallingNotes'
import { formatVolumePercent } from '@/utils/volumeDisplay'

const SEEK_STEP_LABEL = `${SEEK_STEP_SEC}초 이동`

/** A remembered on/off preference; storage may be unavailable, which only forgets it. */
function useStoredToggle(key: string): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(false)
  useEffect(() => {
    try { setValue(localStorage.getItem(key) === 'true') } catch { /* storage disabled */ }
  }, [key])
  const update = useCallback((next: boolean) => {
    setValue(next)
    try { localStorage.setItem(key, String(next)) } catch { /* keep this session usable */ }
  }, [key])
  return [value, update]
}

/**
 * Standing in for a rotation the device will not perform. The box is laid out
 * along the viewport's opposite axis and then turned about its top-left corner;
 * `translateY(-100%)` brings it back over the viewport afterwards. dvh/dvw are
 * required rather than vh/vw — iOS measures vh against the toolbar-less height,
 * which would push the keyboard off screen.
 */
/** What the reader can press with, in wait mode. */
function midiStatusText(status: MidiStatus, devices: string[]): string {
  switch (status) {
    case 'unsupported': return '이 브라우저는 MIDI를 지원하지 않습니다. 화면 건반을 눌러 주세요.'
    case 'denied': return 'MIDI 사용이 허용되지 않았습니다. 화면 건반을 눌러 주세요.'
    case 'requesting': return 'MIDI 장치를 확인하는 중입니다.'
    case 'ready': return devices.length
      ? `MIDI 연결됨: ${devices.join(', ')} · 화면 건반도 누를 수 있습니다.`
      : '연결된 MIDI 장치가 없습니다. 피아노를 연결하거나 화면 건반을 눌러 주세요.'
    default: return '화면 건반을 누르거나 MIDI 피아노를 연결해 주세요.'
  }
}

/** m:ss for a song position. */
function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

const rotatedRootStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100dvh',
  height: '100dvw',
  transformOrigin: 'top left',
  transform: 'rotate(90deg) translateY(-100%)',
  overflow: 'hidden',
  zIndex: 40,
  background: '#f9fafb',
}

/**
 * Falling Notes Player - MVP Style Piano Visualization
 * Integrates falling notes animation with piano keyboard
 * Based on MVP ClairKeys component for SimplyPiano-style UI
 */
export default function FallingNotesPlayer({
  animationData,
  className = '',
  onSessionChange,
  scoreUrl,
  onPracticeRun,
  resumeKey,
}: {
  animationData: CanonicalAnimationData
  className?: string
  scoreUrl?: string
  /** Receives each finished practice run; omitted, nothing is measured for anyone. */
  onPracticeRun?: (run: PracticeRun, context: { leavingPage: boolean }) => void
  /** Browser storage key for this piece's last position; omitted, nothing is remembered. */
  resumeKey?: string
  /**
   * Reports the practice session, not the sounding score. A pause keeps this
   * true: the page chrome must not come back underneath a reader who only
   * stopped the sound for a moment.
   */
  onSessionChange?: (isSessionActive: boolean) => void
}) {
  const [showScore, setShowScore] = useState(false)
  // Convert canonical animation data to falling notes format
  const notes = useMemo(() => canonicalToFallingNotes(animationData), [animationData])
  const hasReleaseGuidance = useMemo(() => notes.some(note => note.keyRelease !== undefined), [notes])
  // One-hand practice. The other hand stays on screen as faded context and,
  // unless the reader silences it, keeps sounding as the accompaniment.
  const offersHandChoice = useMemo(() => hasBothHands(notes), [notes])
  const [practiceHand, setPracticeHand] = useState<PracticeHand>('both')
  const [otherHandAudible, setOtherHandAudible] = useState(true)
  const activePractice: PracticeHand = offersHandChoice ? practiceHand : 'both'
  const audibleNotes = useMemo(
    () => audibleNotesFor(notes, activePractice, otherHandAudible),
    [notes, activePractice, otherHandAudible]
  )
  const annotationNotes = useMemo(() => annotationNotesFor(notes, activePractice), [notes, activePractice])

  // Metronome and count-in. The score's measure map is the trustworthy beat
  // grid; it is downloaded only once one of them is switched on.
  const [metronomeOn, setMetronomeOn] = useStoredToggle('clairkeys.metronome')
  const [countInOn, setCountInOn] = useStoredToggle('clairkeys.countIn')
  const [scoreBeats, setScoreBeats] = useState<{ url: string; artifact: ScoreArtifact | null } | null>(null)
  const wantsBeats = metronomeOn || countInOn
  useEffect(() => {
    if (!wantsBeats || !scoreUrl) return
    let current = true
    loadScoreArtifact(scoreUrl)
      .then(artifact => { if (current) setScoreBeats({ url: scoreUrl, artifact }) })
      .catch(() => { if (current) setScoreBeats({ url: scoreUrl, artifact: null }) })
    return () => { current = false }
  }, [wantsBeats, scoreUrl])
  const loadedScore = scoreBeats && scoreBeats.url === scoreUrl ? scoreBeats : null
  const scoreArtifact = loadedScore?.artifact ?? null
  // With a score still to come, wait for it rather than click on a grid that
  // may be replaced by a different one a moment later.
  const awaitingScore = Boolean(scoreUrl) && wantsBeats && loadedScore === null
  const beatSource = metronomeSource(animationData.tempoSource, scoreArtifact !== null)
  const beatGrid = useMemo(() => {
    if (scoreArtifact) {
      return beatsFromScoreArtifact(scoreArtifact, animationData.timingReferenceBpm, animationData.timeSignature)
    }
    if (awaitingScore || beatSource !== 'constant') return []
    return constantBeats(animationData.duration, animationData.timingReferenceBpm, animationData.timeSignature)
  }, [scoreArtifact, awaitingScore, beatSource, animationData.duration, animationData.timingReferenceBpm, animationData.timeSignature])
  // Offered when a trustworthy grid exists or may still arrive with the score.
  const metronomeAvailable = beatSource !== null || (Boolean(scoreUrl) && loadedScore?.artifact !== null)
  const metronomeClicks = metronomeOn && metronomeAvailable ? beatGrid : undefined
  const countIn = useMemo(() => {
    if (!countInOn) return undefined
    const perBar = beatsPerBar(animationData.timeSignature)
    const referenceBeat = (60 / animationData.timingReferenceBpm) * beatUnitQuarters(animationData.timeSignature)
    return (resumeAt: number) => countInClicks(beatGrid, resumeAt, perBar, referenceBeat)
  }, [countInOn, beatGrid, animationData.timeSignature, animationData.timingReferenceBpm])

  // Wait mode (D-086): the piece stops on each step until its keys are played.
  // With one hand chosen, only that hand's notes are waited for (D-086 note).
  const [waitOn, setWaitOn] = useState(false)
  const waitSteps = useMemo(
    () => (waitOn ? buildWaitSteps(notes.filter(note => isPracticedNote(note, activePractice))) : undefined),
    [waitOn, notes, activePractice]
  )
  
  // Use falling notes player hook for audio-visual synchronization
  const {
    isPlaying,
    isSessionActive,
    currentTime,
    tempoScale,
    lookAheadSec,
    volume,
    sampleStatus,
    totalLength,
    play,
    pause,
    stop,
    seek,
    setTempoScale,
    setVolume,
    loopStart,
    loopEnd,
    countInLeft,
    markLoopStart,
    markLoopEnd,
    clearLoop,
    waitingFor,
    pressKey,
    playNoteNow,
  } = useFallingNotesPlayer(notes, { audibleNotes, clicks: metronomeClicks, countIn, waitSteps })

  // Constants
  const pxPerSec = PX_PER_SEC
  // The idle box has always been a border-box 330px, so the border is inside it.
  const standardVisualizationHeight = Math.round(lookAheadSec * pxPerSec) + 120
  const visualizationRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [visualizationSize, setVisualizationSize] = useState({ width: 0, height: 0 })
  const [requiredScoreHeight, setRequiredScoreHeight] = useState(0)
  const [scoreBudget, setScoreBudget] = useState<{ baseScoreHeight: number; total: number } | null>(null)
  const measureScore = useCallback((required: number) => {
    setRequiredScoreHeight(previous => previous === required ? previous : required)
  }, [])

  // Fullscreen is requested on the player root so the rotated box, not just the
  // visualization, owns the screen.
  const orientation = usePlaybackOrientation(rootRef)

  // The content box is the coordinate system shared by the keyboard and the
  // falling notes. ResizeObserver keeps it current after breakpoint, rotation,
  // and browser-chrome changes without listening to playback time.
  useLayoutEffect(() => {
    const element = visualizationRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      setVisualizationSize({
        width: element.clientWidth || Math.max(0, rect.width - 2),
        height: element.clientHeight || Math.max(0, rect.height - 2),
      })
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(([entry]) => {
      setVisualizationSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // The score and visualization share one fixed desktop session height. Their
  // measured sum is invariant as score height changes, unlike the visualization
  // height alone. Re-measure on viewport/control changes without feeding the
  // panel's own new height back into the allocation.
  useLayoutEffect(() => {
    if (!isSessionActive || !showScore || !scoreUrl || orientation.rotate) {
      setScoreBudget(null)
      return
    }
    const root = rootRef.current
    const panel = root?.querySelector<HTMLElement>('[data-testid="score-panel"]')
    const visualization = visualizationRef.current
    if (!root || !panel || !visualization) return
    const measure = () => {
      const baseScoreHeight = Math.min(360, Math.max(240, window.innerHeight * 0.34))
      const total = panel.getBoundingClientRect().height + visualization.getBoundingClientRect().height
      setScoreBudget(previous => previous && Math.abs(previous.total - total) < 0.5 &&
        Math.abs(previous.baseScoreHeight - baseScoreHeight) < 0.5
        ? previous : { baseScoreHeight, total })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    observer.observe(panel)
    observer.observe(visualization)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [isSessionActive, showScore, scoreUrl, orientation.rotate])

  // This runs only when a score is loaded or the containing box is resized;
  // playback time deliberately cannot remap a falling note's horizontal x.
  // The measured element wraps the box, so its content width is the box's own
  // less the border the box draws.
  const layout = useMemo(
    () => buildResponsiveKeyLayout(Math.max(0, visualizationSize.width - BOX_BORDER), notes),
    [notes, visualizationSize.width]
  )

  // The wrapper owns the available height and the box takes the height this
  // returns, which is what keeps the cap from feeding back into its own input.
  const ordinaryGeometry = planPlaybackGeometry({
    availableHeight: visualizationSize.height > 0
      ? visualizationSize.height
      : standardVisualizationHeight,
    keyWidth: layout.keyWidth,
  })
  const scoreGeometry = scoreBudget && isSessionActive && showScore && scoreUrl
    ? planScoreAwareGeometry({
        baselineAvailableHeight: Math.max(0, scoreBudget.total - scoreBudget.baseScoreHeight),
        baseScoreHeight: scoreBudget.baseScoreHeight,
        requiredScoreHeight: requiredScoreHeight || scoreBudget.baseScoreHeight,
        keyWidth: layout.keyWidth,
      })
    : null
  const { fallingHeight, keyboardHeight, boxHeight } = scoreGeometry ?? ordinaryGeometry

  // The session, not `isPlaying`, owns the screen. A pause leaves the reader
  // inside the practice run, so turning the phone back upright and rebuilding
  // the page under them belongs to the end of the session alone. The session
  // is also still false while play() awaits the AudioContext and the samples,
  // so only the fall from true is an exit — a plain `!isSessionActive` would
  // release the orientation the click had just requested.
  const wasSessionActiveRef = useRef(false)
  useEffect(() => {
    document.body.classList.toggle('playback-active', isSessionActive)
    onSessionChange?.(isSessionActive)
    if (wasSessionActiveRef.current && !isSessionActive) orientation.exit()
    wasSessionActiveRef.current = isSessionActive
    return () => document.body.classList.remove('playback-active')
  }, [isSessionActive, onSessionChange, orientation])

  // The rotated player is fixed over the whole screen, so anything left
  // scrolling behind it only produces rubber-banding on iOS.
  useEffect(() => {
    document.body.classList.toggle('playback-rotated', orientation.rotate)
    return () => document.body.classList.remove('playback-rotated')
  }, [orientation.rotate])

  // The orientation request has to be issued from the click that produced the
  // user activation. play() awaits the AudioContext and the sample load, which
  // can outlive the activation window that requestFullscreen needs.
  // Resuming asks for the orientation again rather than assuming it survived:
  // the browser may have dropped fullscreen while the reader was paused, and
  // the request is only grantable from the click that produced it.
  const handlePlay = useCallback(async () => {
    orientation.enter()
    // A start that never happens must not leave a phone turned with nothing
    // playing, and no state transition would report that on its own. Inside a
    // session there is nothing to undo: the reader stays on the paused screen
    // they were already operating.
    const started = await play()
    if (!started && !isSessionActive) orientation.exit()
  }, [isSessionActive, orientation, play])

  // Practice time is time the music runs (D-085); a wait prompt stops the clock.
  usePracticeReport({ isPlaying: isPlaying && !waitingFor, isSessionActive, currentTime, totalLength, onReport: onPracticeRun })

  const resume = usePracticeResume(resumeKey, { currentTime, isPlaying, isSessionActive, totalLength })
  const handleResume = useCallback(async () => {
    const saved = resume.offer
    if (!saved) return
    resume.accept()
    // Fullscreen needs this click's user activation, which an await can
    // outlive; ask first, exactly as handlePlay does, then seek and start.
    orientation.enter()
    await seek(saved.time)
    const started = await play()
    if (!started && !isSessionActive) orientation.exit()
  }, [resume, seek, play, orientation, isSessionActive])

  // Space and the arrows act on the page, never on a focused control (see
  // resolvePlaybackShortcut). A start waits for the samples exactly as the play
  // button does, and it goes through handlePlay so the orientation request is
  // made from this key press's user activation.
  const isReady = sampleStatus !== 'loading'
  usePlaybackShortcuts({
    onToggle: () => {
      if (isPlaying) pause()
      else if (isReady) void handlePlay()
    },
    onSeekBy: seconds => {
      // While a start waits for samples every control is disabled; a seek
      // now would cancel that start and it would never sound.
      if (!isReady) return
      void seek(Math.min(totalLength, Math.max(0, currentTime + seconds)))
    },
  })

  // A MIDI piano sounds by itself; a key tapped on screen needs our sound.
  const midi = useMidiInput({ enabled: waitOn, onNoteOn: note => { void pressKey(note) } })
  const handleScreenKey = useCallback((note: number) => {
    void playNoteNow(note)
    void pressKey(note)
  }, [playNoteNow, pressKey])
  const toggleWait = useCallback((next: boolean) => {
    setWaitOn(next)
    // Chrome asks permission for MIDI; ask from this click, never on load.
    if (next && midi.status === 'idle') void midi.request()
  }, [midi])

  // Derive key activation synchronously from the exact playhead passed to the
  // falling-note visualization. An effect would leave the keyboard one render
  // behind whenever the AudioContext clock advances.
  const activeKeys = useMemo(() => {
    // While waiting, the keyboard shows what is left to press.
    if (waitingFor) return new Set(waitingFor)
    return new Set(getActiveNotes(notes, currentTime)
      .filter(note => isPracticedNote(note, activePractice))
      .map(note => note.midi))
  }, [notes, currentTime, activePractice, waitingFor])
  
  const activeFingers = useMemo(() => {
    const fingers = new Map<number, string>()
    if (showScore) for (const note of getActiveNotes(notes, currentTime)) {
      if (!note.finger || !isPracticedNote(note, activePractice)) continue
      const previous = fingers.get(note.midi)
      const finger = String(note.finger)
      fingers.set(note.midi, previous && previous !== finger ? `${previous}/${finger}` : finger)
    }
    return fingers
  }, [notes, currentTime, showScore, activePractice])

  // Playback control handlers
  return (
    <div
      ref={rootRef}
      className={[
        'w-full mx-auto',
        isSessionActive ? 'max-w-none flex flex-col' : 'max-w-6xl',
        // An explicit cross-axis height replaces min-h while rotated; keeping
        // both would constrain the box along the wrong axis.
        isSessionActive && !orientation.rotate ? 'min-h-[100dvh]' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={orientation.rotate ? rotatedRootStyle : scoreGeometry ? { height: '100dvh' } : undefined}
    >
      {!isSessionActive && <ScoreTimingNotice metadata={animationData.metadata} />}
      <TempoDisplay
        tempo={animationData.tempo}
        tempoSource={animationData.tempoSource}
        timingReferenceBpm={animationData.timingReferenceBpm}
        scoreTempo={animationData.scoreTempo}
        isPlaybackActive={isSessionActive}
        className={isSessionActive ? '' : 'mb-4'}
      >
        {isSessionActive && hasReleaseGuidance && <span role="note" className="ml-2 text-xs text-ink-muted">
          옅은 노트: 소리 유지 · 자동 손 떼기 제안
        </span>}
      </TempoDisplay>

      {!isSessionActive && hasReleaseGuidance && <p className="mb-2 text-xs text-ink-muted" role="note">
        옅은 노트는 손을 뗀 뒤 소리가 이어지는 구간입니다. 손 떼기 시점은 자동 연습 제안이며,
        소리를 이어가려면 페달이나 다른 연주 방법이 필요할 수 있습니다.
      </p>}

      {isSessionActive ? (
        /* One row instead of four, and it outlives a pause. The landscape
           viewport this mode targets is 390px tall in total; the stacked setup
           chrome cost 264px of it, and restoring it on every pause moved every
           control the reader was using. */
        <div className="mb-2">
          <CompactPlaybackBar
            isReady={sampleStatus !== 'loading'}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={totalLength}
            playbackSpeed={tempoScale}
            volume={volume}
            maxVolume={MAX_MASTER_GAIN}
            onPlay={handlePlay}
            onPause={pause}
            onStop={stop}
            onSeek={seek}
            onSpeedChange={setTempoScale}
            onVolumeChange={setVolume}
            loopStart={loopStart}
            loopEnd={loopEnd}
            onLoopStart={markLoopStart}
            onLoopEnd={markLoopEnd}
            onLoopClear={clearLoop}
          />
        </div>
      ) : (
        <>
          {resume.offer && (
            <section
              aria-label="이어서 연습"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-surface px-4 py-3"
            >
              <p className="text-sm text-ink">
                지난번 <span className="font-semibold tabular-nums">{formatClock(resume.offer.time)}</span>에서 멈췄습니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { void handleResume() }}
                  disabled={sampleStatus === 'loading'}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                >
                  {formatClock(resume.offer.time)}부터 이어서 연습
                </button>
                <button
                  type="button"
                  onClick={resume.dismiss}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  처음부터
                </button>
              </div>
            </section>
          )}

          {/* Usage Instructions */}
          <ol aria-label="연습 방법" className="mb-4 grid gap-2 text-sm text-ink-muted sm:grid-cols-3">
            {[
              '노트의 아랫변이 건반 위 선에 닿을 때 누르세요.',
              '처음에는 속도를 늦춰 따라가세요.',
              '어려운 곳은 A와 B로 구간을 정해 반복하세요.',
            ].map((step, index) => (
              <li key={step} className="flex gap-2 rounded-lg border border-rule bg-surface px-3 py-2">
                <span aria-hidden="true" className="font-semibold text-accent">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {/* Playback Controls */}
          <div className="mb-4">
            <PlaybackControls
              isPlaying={isPlaying}
              isReady={sampleStatus !== 'loading'}
              currentTime={currentTime}
              duration={totalLength}
              playbackSpeed={tempoScale}
              onPlay={handlePlay}
              onPause={pause}
              onStop={stop}
              onSeek={seek}
              onSpeedChange={setTempoScale}
              loopStart={loopStart}
              loopEnd={loopEnd}
              onLoopStart={markLoopStart}
              onLoopEnd={markLoopEnd}
              onLoopClear={clearLoop}
            />
          </div>

          {offersHandChoice && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div role="group" aria-label="연습할 손" className="inline-flex rounded-full bg-surface-muted p-1">
                {([['both', '양손'], ['L', '왼손'], ['R', '오른손']] as const).map(([hand, label]) => (
                  <button
                    key={hand}
                    type="button"
                    aria-pressed={practiceHand === hand}
                    onClick={() => setPracticeHand(hand)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      practiceHand === hand ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {practiceHand !== 'both' && (
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={otherHandAudible}
                    onChange={event => setOtherHandAudible(event.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  다른 손 소리 듣기
                </label>
              )}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={metronomeOn && metronomeAvailable}
                disabled={!metronomeAvailable}
                onChange={event => setMetronomeOn(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              메트로놈
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={countInOn}
                onChange={event => setCountInOn(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              시작 전 준비 박자
            </label>
            {!metronomeAvailable && (
              <p className="w-full text-xs">
                이 악보는 마디별 박자 정보가 없어 메트로놈을 켤 수 없습니다. 악보의 빠르기가 곡 중간에 바뀔 수 있어
                클릭이 노트와 어긋날 수 있기 때문입니다.
              </p>
            )}
          </div>

          <div className="mb-4 text-sm text-ink-muted">
            <div className="flex flex-wrap items-center gap-x-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={waitOn}
                  onChange={event => toggleWait(event.target.checked)}
                  aria-describedby="wait-mode-description"
                  className="h-4 w-4 accent-accent"
                />
                기다리기 모드
              </label>
              <span id="wait-mode-description" className="text-xs">맞는 건반을 누를 때까지 멈춰서 기다립니다</span>
            </div>
            {waitOn && <p className="mt-1 text-xs" role="status">{midiStatusText(midi.status, midi.devices)}</p>}
          </div>

          {/* The raw gain readout was a tuning aid for DEFAULT_MASTER_GAIN; that value is
              settled, so readers see a share of the range instead (D-080). */}
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="master-volume" className="text-xs text-ink-muted whitespace-nowrap">
              음량
            </label>
            <input
              id="master-volume"
              type="range"
              min={0}
              max={MAX_MASTER_GAIN}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 max-w-xs accent-accent"
              aria-valuetext={formatVolumePercent(volume, MAX_MASTER_GAIN)}
            />
            <span className="text-xs text-ink-muted tabular-nums w-10 text-right">
              {formatVolumePercent(volume, MAX_MASTER_GAIN)}
            </span>
          </div>
        </>
      )}

      {/* Playback reclaims this row, but never the announcement: a listener who
          cannot see the screen still has to learn that the recorded piano was
          replaced by a synthesised one. */}
      <div
        role="status"
        aria-live="polite"
        className={isSessionActive ? 'sr-only' : 'mb-4 text-xs text-ink-muted'}
      >
        {sampleStatus === 'idle' && '녹음 피아노 샘플은 첫 재생 때 준비됩니다.'}
        {sampleStatus === 'loading' && '녹음 피아노 샘플을 준비 중입니다.'}
        {sampleStatus === 'ready' && '녹음 피아노 샘플로 재생합니다.'}
        {sampleStatus === 'degraded' &&
          '샘플이 일부만 준비되었거나 늦어 이번 재생은 합성음으로 재생합니다.'}
        {sampleStatus === 'failed' &&
          '샘플을 불러오지 못해 합성음으로 재생합니다.'}
      </div>

      {/* Hidden only on touch screens, which have no space bar to press. A
          keyboard-only PC reports `pointer: none`, as ScoreToggle also allows. */}
      {!isSessionActive && (
        <p role="note" aria-label="키보드 단축키" className="mb-2 text-xs text-ink-muted pointer-coarse:hidden">
          <kbd className="rounded border border-rule-strong bg-surface px-1.5 py-0.5 font-sans">Space</kbd> 재생·일시정지
          <span aria-hidden="true"> · </span>
          <kbd className="rounded border border-rule-strong bg-surface px-1.5 py-0.5 font-sans">←</kbd>
          <kbd className="ml-1 rounded border border-rule-strong bg-surface px-1.5 py-0.5 font-sans">→</kbd> {SEEK_STEP_LABEL}
        </p>
      )}
      {/* Setup only: during a session this height belongs to the notes, and the
          session layout budget (#177) must not change. */}
      {!isSessionActive && (
        <ul aria-label="노트 색상" className="mb-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: HAND_COLORS.L }} />
            왼손
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: HAND_COLORS.R }} />
            오른손
          </li>
        </ul>
      )}
      <ScoreToggle available={Boolean(scoreUrl)} onChange={setShowScore} />
      {showScore && scoreUrl && <ScorePanel url={scoreUrl} notes={annotationNotes} currentTime={currentTime}
        timingReferenceBpm={animationData.timingReferenceBpm}
        height={scoreGeometry?.scoreHeight} contentFits={scoreGeometry?.contentFits}
        onRequiredHeight={measureScore} />}
      {/* Main Visualization Area */}
      {/* Two elements with one job each. The wrapper is measured and owns the
          available height; the box takes the height the plan returns. Sizing the
          measured element from its own measurement would be a feedback loop. */}
      <div
        ref={visualizationRef}
        className="w-full"
        style={isSessionActive
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }
          : undefined}
      >
      <div
        data-testid="playback-box"
        className="w-full border rounded-2xl shadow overflow-hidden"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: isSessionActive ? boxHeight : standardVisualizationHeight,
        }}
      >
        {/* Falling Notes Area */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            // The hit line is a boundary, not a decoration: a note that has
            // already been played must not keep falling across the keys.
            overflow: 'hidden',
            background: '#0b0b0c'
          }}
        >
          <FallingNotes
            notes={notes}
            nowSec={currentTime}
            pxPerSec={pxPerSec}
            height={fallingHeight}
            layout={layout}
            dimHand={otherHand(activePractice)}
          />

          {waitingFor && (
            <div
              data-testid="wait-prompt"
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink shadow"
            >
              건반을 눌러 주세요 · 남은 음 {waitingFor.length}개
            </div>
          )}

          {countInLeft !== null && (
            <div
              data-testid="count-in"
              role="status"
              aria-live="assertive"
              className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-7xl font-bold text-white/90"
            >
              {countInLeft}
            </div>
          )}

          {/* Hit Line */}
          <div
            className="absolute left-0 right-0"
            style={{
              bottom: 0,
              height: 1,
              background: '#1f2937'
            }}
          />
        </div>

        {/* Piano Keyboard */}
        <div
          style={{
            height: keyboardHeight,
            flexShrink: 0,
            background: '#0f0f10'
          }}
        >
          <SimplePianoKeyboard
            layout={layout}
            activeKeys={activeKeys}
            activeFingers={showScore ? activeFingers : undefined}
            onKeyPress={waitOn ? handleScreenKey : undefined}
          />
        </div>
      </div>
      </div>
      
      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <p>Current Time: {currentTime.toFixed(2)}s</p>
          <p>Total Length: {totalLength.toFixed(2)}s</p>
          <p>Active Keys: {Array.from(activeKeys).join(', ')}</p>
          <p>Tempo Scale: {tempoScale}x</p>
          <p>Look Ahead: {lookAheadSec}s</p>
        </div>
      )}
    </div>
  )
}
