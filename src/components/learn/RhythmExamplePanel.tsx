'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui'
import ScoreExample from '@/components/learn/ScoreExample'
import { ListenButton } from '@/components/learn/ReadingAudio'
import { RHYTHM_EXAMPLES, type RhythmExample } from '@/lib/learn/rhythm'

export interface RhythmPanelItem {
  id: string
  beats?: string
}

export interface RhythmExamplePanelProps {
  label: string
  items: readonly RhythmPanelItem[]
}

export default function RhythmExamplePanel({ label, items }: RhythmExamplePanelProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '')

  const examples = useMemo(() => {
    return items
      .map(item => RHYTHM_EXAMPLES.find(ex => ex.id === item.id))
      .filter((ex): ex is RhythmExample => ex !== undefined)
  }, [items])

  const selectedExample = examples.find(ex => ex.id === selectedId) ?? examples[0]

  if (!selectedExample) return null

  return (
    <div className="mt-4 space-y-4">
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {items.map(item => {
          const example = examples.find(ex => ex.id === item.id)
          if (!example) return null
          const isSelected = item.id === selectedId
          return (
            <Button
              key={item.id}
              type="button"
              variant={isSelected ? 'primary' : 'outline'}
              aria-pressed={isSelected}
              aria-label={item.beats ? `${example.title}, ${item.beats}` : undefined}
              onClick={() => setSelectedId(item.id)}
              className="min-h-11 min-w-11 border border-rule"
            >
              <span>{example.title}</span>
              {item.beats && (
                <>
                  <span className="sr-only">, </span>
                  <span className="ml-1.5 text-xs opacity-90">{item.beats}</span>
                </>
              )}
            </Button>
          )
        })}
      </div>

      <div className="min-w-0">
        <ScoreExample example={selectedExample} panelExamples={examples} />
        <ListenButton
          key={selectedExample.id}
          rhythm={selectedExample}
          label={`${selectedExample.title} 들어 보기`}
        />
      </div>
    </div>
  )
}
