'use client'

import { useState, useEffect } from 'react'
import { getAudioService, AudioSettings as AudioSettingsType } from '@/services/audioService'

interface AudioSettingsProps {
  className?: string
  onSettingsChange?: (settings: AudioSettingsType) => void
}

export default function AudioSettings({ className = '', onSettingsChange }: AudioSettingsProps) {
  const [settings, setSettings] = useState<AudioSettingsType>({
    volume: 0.7,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.4,
    release: 1.2,
    reverb: 0.2,
    enabled: true
  })
  const [isInitialized, setIsInitialized] = useState(false)

  const audioService = getAudioService()

  useEffect(() => {
    // Load current settings
    const currentSettings = audioService.getSettings()
    setSettings(currentSettings)
    setIsInitialized(audioService.isReady())
  }, [audioService])

  const updateSetting = <K extends keyof AudioSettingsType>(
    key: K,
    value: AudioSettingsType[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    audioService.updateSettings({ [key]: value })
    onSettingsChange?.(newSettings)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value)
    updateSetting('volume', volume)
  }

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reverb = parseFloat(e.target.value)
    updateSetting('reverb', reverb)
  }

  const handleAttackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const attack = parseFloat(e.target.value)
    updateSetting('attack', attack)
  }

  const handleDecayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const decay = parseFloat(e.target.value)
    updateSetting('decay', decay)
  }

  const handleSustainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sustain = parseFloat(e.target.value)
    updateSetting('sustain', sustain)
  }

  const handleReleaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const release = parseFloat(e.target.value)
    updateSetting('release', release)
  }

  const toggleEnabled = () => {
    updateSetting('enabled', !settings.enabled)
  }

  return (
    <div className={`audio-settings bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">오디오 설정</h3>
        <button
          onClick={toggleEnabled}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            settings.enabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {settings.enabled ? '켜짐' : '꺼짐'}
        </button>
      </div>

      {!isInitialized && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            오디오를 사용하려면 피아노 키를 클릭하여 오디오를 활성화하세요.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Volume Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            볼륨: {Math.round(settings.volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            onChange={handleVolumeChange}
            disabled={!settings.enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Reverb Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            리버브: {Math.round(settings.reverb * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.reverb}
            onChange={handleReverbChange}
            disabled={!settings.enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Advanced Settings */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            고급 설정
          </summary>
          <div className="mt-3 space-y-3 pl-4">
            {/* Attack */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                어택: {(settings.attack * 1000).toFixed(0)}ms
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={settings.attack}
                onChange={handleAttackChange}
                disabled={!settings.enabled}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Decay */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                디케이: {settings.decay.toFixed(2)}s
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.decay}
                onChange={handleDecayChange}
                disabled={!settings.enabled}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sustain */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                서스테인: {Math.round(settings.sustain * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.sustain}
                onChange={handleSustainChange}
                disabled={!settings.enabled}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Release */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                릴리즈: {settings.release.toFixed(2)}s
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.release}
                onChange={handleReleaseChange}
                disabled={!settings.enabled}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </details>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider:disabled::-webkit-slider-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .slider:disabled::-moz-range-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}