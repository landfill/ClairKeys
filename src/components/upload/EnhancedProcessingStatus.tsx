'use client'

/**
 * Enhanced Processing Status with improved visual feedback
 * Features: animated progress bars, particle effects, smooth transitions, and dynamic themes
 */

import { useEffect, useState, useRef } from 'react'
import { ProcessingStage } from '@/types/sheet-music'

interface ProcessingAnimation {
  particles: Array<{
    id: string
    x: number
    y: number
    vx: number
    vy: number
    size: number
    color: string
    opacity: number
    life: number
  }>
  wave: {
    amplitude: number
    frequency: number
    phase: number
  }
}

interface EnhancedProcessingStatusProps {
  stage: ProcessingStage
  progress: number
  message: string
  estimatedTime?: number
  elapsedTime: number
  isCompleted: boolean
  hasError: boolean
  enableAnimations?: boolean
  theme?: 'music' | 'tech' | 'elegant'
}

const STAGE_CONFIG = {
  upload: {
    icon: '📤',
    color: '#2196f3',
    gradient: ['#1976d2', '#42a5f5'],
    particles: { count: 15, speed: 2 }
  },
  parsing: {
    icon: '📖',
    color: '#ff9800',
    gradient: ['#f57c00', '#ffb74d'],
    particles: { count: 20, speed: 3 }
  },
  omr: {
    icon: '🎵',
    color: '#9c27b0',
    gradient: ['#7b1fa2', '#ba68c8'],
    particles: { count: 25, speed: 2.5 }
  },
  validation: {
    icon: '✅',
    color: '#4caf50',
    gradient: ['#388e3c', '#66bb6a'],
    particles: { count: 18, speed: 2.2 }
  },
  generation: {
    icon: '🎹',
    color: '#e91e63',
    gradient: ['#c2185b', '#f06292'],
    particles: { count: 30, speed: 3.5 }
  }
}

const MUSICAL_PARTICLES = ['♪', '♫', '♬', '♩', '♯', '♭', '𝄞', '𝄢']
const TECH_PARTICLES = ['●', '◆', '▲', '■', '◇', '○']

export default function EnhancedProcessingStatus({
  stage,
  progress,
  message,
  estimatedTime = 0,
  elapsedTime,
  isCompleted,
  hasError,
  enableAnimations = true,
  theme = 'music'
}: EnhancedProcessingStatusProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [animation, setAnimation] = useState<ProcessingAnimation>({
    particles: [],
    wave: { amplitude: 10, frequency: 0.02, phase: 0 }
  })

  const config = STAGE_CONFIG[stage]
  const remainingTime = Math.max(0, estimatedTime - elapsedTime)

  // Initialize particles
  useEffect(() => {
    if (!enableAnimations) return

    const particleSymbols = theme === 'music' ? MUSICAL_PARTICLES : TECH_PARTICLES
    const particleCount = config.particles.count

    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: `${stage}-${i}`,
      x: Math.random() * 400,
      y: Math.random() * 200,
      vx: (Math.random() - 0.5) * config.particles.speed,
      vy: (Math.random() - 0.5) * config.particles.speed,
      size: Math.random() * 4 + 2,
      color: config.color,
      opacity: Math.random() * 0.6 + 0.4,
      life: Math.random() * 100 + 50
    }))

    setAnimation(prev => ({
      ...prev,
      particles: newParticles
    }))
  }, [stage, enableAnimations, theme, config])

  // Animation loop
  useEffect(() => {
    if (!enableAnimations || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update wave phase
      setAnimation(prev => ({
        ...prev,
        wave: {
          ...prev.wave,
          phase: prev.wave.phase + 0.05
        }
      }))

      // Draw wave background
      drawWave(ctx, canvas.width, canvas.height)

      // Update and draw particles
      updateAndDrawParticles(ctx, canvas.width, canvas.height)

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [enableAnimations])

  const drawWave = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const { amplitude, frequency, phase } = animation.wave
    
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    
    for (let x = 0; x <= width; x++) {
      const y = height / 2 + Math.sin(x * frequency + phase) * amplitude * (progress / 100)
      ctx.lineTo(x, y)
    }
    
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, `${config.color}20`)
    gradient.addColorStop(1, `${config.color}05`)
    
    ctx.fillStyle = gradient
    ctx.fill()
  }

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const particleSymbols = theme === 'music' ? MUSICAL_PARTICLES : TECH_PARTICLES
    
    setAnimation(prev => ({
      ...prev,
      particles: prev.particles.map(particle => {
        // Update position
        let newX = particle.x + particle.vx
        let newY = particle.y + particle.vy
        let newVx = particle.vx
        let newVy = particle.vy
        
        // Bounce off edges
        if (newX <= 0 || newX >= width) {
          newVx = -particle.vx
          newX = Math.max(0, Math.min(width, newX))
        }
        if (newY <= 0 || newY >= height) {
          newVy = -particle.vy
          newY = Math.max(0, Math.min(height, newY))
        }

        // Draw particle
        ctx.save()
        ctx.globalAlpha = particle.opacity * (progress / 100)
        ctx.fillStyle = particle.color
        
        if (theme === 'music') {
          ctx.font = `${particle.size * 3}px serif`
          ctx.textAlign = 'center'
          ctx.fillText(
            particleSymbols[Math.floor(Math.random() * particleSymbols.length)],
            newX,
            newY
          )
        } else {
          ctx.beginPath()
          ctx.arc(newX, newY, particle.size, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.restore()

        return {
          ...particle,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          life: particle.life - 1
        }
      }).filter(particle => particle.life > 0)
    }))
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgressBarStyle = () => {
    const gradient = `linear-gradient(90deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 100%)`
    return {
      background: gradient,
      width: `${progress}%`,
      transition: 'width 0.3s ease-out'
    }
  }

  const getStatusIcon = () => {
    if (hasError) return '❌'
    if (isCompleted) return '✅'
    return config.icon
  }

  const getStatusText = () => {
    if (hasError) return 'error'
    if (isCompleted) return 'completed'
    return stage
  }

  return (
    <div className="enhanced-processing-status relative p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Animated background canvas */}
      {enableAnimations && (
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          style={{ borderRadius: '0.75rem' }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className={`text-3xl ${isCompleted ? 'animate-bounce' : hasError ? 'animate-pulse' : 'animate-spin'}`}
              style={{ animationDuration: hasError ? '1s' : '2s' }}
            >
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold capitalize text-gray-800">
                {getStatusText().replace('_', ' ')}
              </h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          
          {/* Time information */}
          <div className="text-right text-sm text-gray-500">
            <div>경과: {formatTime(elapsedTime)}</div>
            {remainingTime > 0 && !isCompleted && (
              <div>예상: {formatTime(remainingTime)}</div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">진행률</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full relative overflow-hidden"
              style={getProgressBarStyle()}
            >
              {enableAnimations && (
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                    animation: 'shimmer 1.5s infinite',
                    animationTimingFunction: 'ease-in-out'
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex justify-between text-xs text-gray-500">
          <div className="flex gap-4">
            <span className={stage === 'upload' ? 'text-blue-600 font-semibold' : ''}>
              업로드
            </span>
            <span className={stage === 'parsing' ? 'text-orange-600 font-semibold' : ''}>
              분석
            </span>
            <span className={stage === 'omr' ? 'text-purple-600 font-semibold' : ''}>
              인식
            </span>
            <span className={stage === 'validation' ? 'text-green-600 font-semibold' : ''}>
              검증
            </span>
            <span className={stage === 'generation' ? 'text-pink-600 font-semibold' : ''}>
              생성
            </span>
          </div>
          
          {!isCompleted && !hasError && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>
      </div>

      {/* CSS for shimmer effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}