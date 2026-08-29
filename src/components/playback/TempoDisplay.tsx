import type { TempoDisplayInput } from '@/types/animationContract'
import { getTempoDisplay } from '@/utils/tempoDisplay'

export interface TempoDisplayProps extends TempoDisplayInput {
  isPlaybackActive?: boolean
  className?: string
}

/** Shows the recorded tempo and whether it came from the score or the user. */
export default function TempoDisplay({
  isPlaybackActive = false,
  className = '',
  ...input
}: TempoDisplayProps) {
  const display = getTempoDisplay(input)

  return (
    <div
      data-testid="tempo-display"
      aria-label={`메트로놈: ${display.primary}`}
      className={[
        'text-sm font-medium text-gray-700',
        isPlaybackActive
          ? 'fixed left-2 right-2 top-16 z-50 mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-center shadow-sm backdrop-blur-sm'
          : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span>{display.primary}</span>
      {display.secondary && (
        <span className="ml-2 text-xs font-normal text-gray-500">{display.secondary}</span>
      )}
    </div>
  )
}
