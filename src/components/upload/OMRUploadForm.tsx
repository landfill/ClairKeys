'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button, StatusState, UploadIcon } from '@/components/ui'
import type { Category } from '@/types/category'
import { fileSignature, inspectPdfFile, MAX_UPLOAD_MB } from '@/lib/upload/pdfInspection'
import {
  classifyUploadResponse,
  describeFileRejection,
  type UploadFailure,
} from '@/lib/upload/uploadFailures'

interface OMRUploadFormProps {
  onUploadStart?: (data: {
    sheetMusicId: number
    jobId: string
    title: string
    signature: string
  }) => void
  /**
   * **아직 변환 중인** 파일들의 서명. 폼은 이 목록만으로 중복을 판정한다.
   *
   * 폼이 직접 들고 있으면 안 되는 이유가 있다. 작업이 끝났는지는 처리 패널만 알고, 끝난 작업의
   * 서명을 계속 들고 있으면 "같은 파일을 다시 올려 주세요"라는 복구 안내를 **화면 스스로가**
   * 막는다. 무엇이 살아 있는지는 두 컴포넌트를 모두 보는 페이지가 판정한다.
   */
  activeSignatures?: readonly string[]
}

/**
 * 업로드 폼이 지나는 상태. 화면 문구는 이 값 하나에서 나온다.
 *
 * `checking`이 별도 상태인 이유는 파일 검사가 바이트를 읽는 비동기 작업이기 때문이다. 이 구간을
 * 숨기면 큰 파일에서 아무 반응 없는 몇백 밀리초가 생기고, 사용자는 선택이 먹히지 않았다고 읽는다.
 */
type FormPhase = 'idle' | 'checking' | 'submitting'

const PHASE_MESSAGE: Record<FormPhase, string> = {
  idle: '',
  checking: '파일을 확인하고 있습니다.',
  submitting: '변환을 요청하고 있습니다.',
}

export default function OMRUploadForm({
  onUploadStart,
  activeSignatures = [],
}: OMRUploadFormProps) {
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const categorySelectId = useId()

  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    tempo: '',
    categoryId: null as number | null,
    isPublic: false,
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<FormPhase>('idle')
  const [failure, setFailure] = useState<UploadFailure | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isBusy = phase !== 'idle'

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      setIsCreatingCategory(true)
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories(prev => [...prev, newCategory])
        setFormData(prev => ({ ...prev, categoryId: newCategory.id }))
        setNewCategoryName('')
        setShowNewCategoryInput(false)
      } else {
        const error = await response.json()
        setErrors(prev => ({ ...prev, category: error.message || '카테고리를 만들지 못했습니다.' }))
      }
    } catch {
      setErrors(prev => ({ ...prev, category: '카테고리를 만드는 중 오류가 발생했습니다.' }))
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '곡명은 필수 입력 항목입니다.'
    }

    if (!formData.composer.trim()) {
      newErrors.composer = '저작자는 필수 입력 항목입니다.'
    }

    if (formData.tempo.trim()) {
      const tempo = Number(formData.tempo)
      if (!Number.isFinite(tempo) || tempo < 20 || tempo > 400) {
        newErrors.tempo = '빠르기는 20에서 400 사이로 입력해 주세요.'
      }
    }

    if (!selectedFile) {
      newErrors.file = 'PDF 파일을 선택해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number | boolean | null
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  /**
   * 선택되거나 끌어다 놓인 파일 하나를 검사한다.
   *
   * 검사를 통과하지 못한 파일은 **선택 자체가 되지 않는다.** 잘못된 파일을 담아 둔 채 제출 버튼만
   * 막으면, 사용자는 무엇이 잘못됐는지가 아니라 버튼이 왜 안 눌리는지를 먼저 궁금해한다.
   */
  const acceptFile = useCallback(
    async (file: File) => {
      setPhase('checking')
      setFailure(null)
      setErrors(prev => ({ ...prev, file: '' }))

      const inspection = await inspectPdfFile(file, { knownSignatures: activeSignatures })

      if (!inspection.ok) {
        setSelectedFile(null)
        setFailure(describeFileRejection(inspection.reason))
        setPhase('idle')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setSelectedFile(file)
      setPhase('idle')

      setFormData(prev =>
        prev.title ? prev : { ...prev, title: file.name.replace(/\.pdf$/i, '') }
      )
    },
    [activeSignatures]
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void acceptFile(file)
  }

  /**
   * 화면은 처음부터 "또는 끌어다 놓기"라고 적혀 있었지만 놓을 곳에 핸들러가 없었다. 브라우저는
   * 놓인 파일을 그냥 열어 버려 작성 중이던 폼이 사라진다.
   */
  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (isBusy) return

    const file = event.dataTransfer?.files?.[0]
    if (file) void acceptFile(file)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (!isBusy) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!session?.user) {
      setErrors(prev => ({ ...prev, form: '로그인이 필요합니다.' }))
      return
    }

    if (!validateForm()) {
      return
    }

    const title = formData.title.trim()

    try {
      setPhase('submitting')
      setFailure(null)
      setErrors(prev => ({ ...prev, form: '' }))

      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile!)
      uploadFormData.append('title', title)
      uploadFormData.append('composer', formData.composer.trim())
      if (formData.tempo.trim()) {
        uploadFormData.append('tempo', formData.tempo.trim())
      }
      if (formData.categoryId) {
        uploadFormData.append('categoryId', formData.categoryId.toString())
      }
      uploadFormData.append('isPublic', formData.isPublic.toString())

      // D-010: 저장 능력을 가진 업로드 경로는 이것 하나다. 새 경로를 만들지 않는다.
      //
      // `try`가 감싸는 것은 요청 자체뿐이다. 성공 응답 처리까지 감싸면, 본문을 읽지 못했을 때
      // 네트워크 실패와 같은 안내("잠시 후 다시 시도해 주세요")가 나간다. 변환은 이미 시작된
      // 뒤이므로 그 안내를 따르면 같은 악보의 행이 둘 생긴다.
      const response = await fetch('/api/omr/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        // 세션 만료와 입력값 오류는 변환 파이프라인의 실패가 아니라 폼 자체의 문제다. 각각
        // 로그인 안내와 입력란 오류로 돌려주는 것이 사용자가 실제로 할 수 있는 행동이다.
        if (response.status === 401) {
          setErrors(prev => ({ ...prev, form: '로그인이 만료되었습니다. 다시 로그인해 주세요.' }))
          setPhase('idle')
          return
        }
        if (body?.code === 'INVALID_TEMPO') {
          setErrors(prev => ({ ...prev, tempo: '빠르기는 20에서 400 사이로 입력해 주세요.' }))
          setPhase('idle')
          return
        }

        setFailure(classifyUploadResponse(response.status, body?.code))
        setPhase('idle')
        return
      }

      const result = await response.json().catch(() => null)

      // 요청은 받아들여졌는데 무엇이 시작됐는지 알 수 없는 경우다. 여기서 다시 올리라고 하는 것이
      // 가장 나쁜 안내다 — 변환은 진행 중이고, 결과는 내 악보에 나타난다.
      if (typeof result?.sheetMusicId !== 'number' || typeof result?.jobId !== 'string') {
        setErrors(prev => ({
          ...prev,
          form: '변환은 시작됐지만 진행 상태를 표시하지 못했습니다. 내 악보에서 확인해 주세요.',
        }))
        setPhase('idle')
        return
      }

      onUploadStart?.({
        sheetMusicId: result.sheetMusicId,
        jobId: result.jobId,
        title,
        signature: fileSignature(selectedFile!),
      })

      setSelectedFile(null)
      setFormData({
        title: '',
        composer: '',
        tempo: '',
        categoryId: null,
        isPublic: false,
      })
      setPhase('idle')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      // 네트워크가 끊긴 경우다. 서버는 요청을 받지 못했거나 답을 돌려주지 못했을 뿐이고,
      // 어느 쪽이든 사용자가 할 일은 잠시 후 다시 시도하는 것이다.
      console.error('Upload request failed:', error)
      setFailure(classifyUploadResponse(0))
      setPhase('idle')
    }
  }

  const canSubmit =
    !isBusy && Boolean(selectedFile) && formData.title.trim() !== '' && formData.composer.trim() !== ''

  return (
    <section className="bg-surface rounded-lg border border-rule p-6">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <h2 className="text-lg font-semibold text-ink">악보 파일</h2>
          <p className="mt-1 text-sm text-ink-muted">
            연주하고 싶은 악보의 PDF를 올려 주세요.
          </p>
        </div>

        {/* 파일 선택 */}
        <div>
          {/*
            드롭존 전체가 `<label>`이다. 파일 입력은 `sr-only`지만 숨겨지지 않아 Tab으로 도달하고
            Enter·Space로 열린다. 시각적 포커스는 `focus-within`이 드롭존 테두리로 옮겨 준다.
          */}
          <label
            htmlFor={fileInputId}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:border-accent ${
              isDragging ? 'border-accent bg-surface-muted' : 'border-rule-strong hover:bg-surface-muted'
            }`}
          >
            <UploadIcon size={32} className="text-ink-muted" aria-hidden="true" />
            <span className="text-base font-medium text-ink">
              PDF 악보를 끌어다 놓거나 선택하세요
            </span>
            <span className="text-sm text-ink-muted">
              PDF 파일, 최대 {MAX_UPLOAD_MB}MB, 암호가 걸리지 않은 파일
            </span>
            <input
              id={fileInputId}
              ref={fileInputRef}
              name="file-upload"
              type="file"
              className="sr-only"
              accept="application/pdf,.pdf"
              onChange={handleFileSelect}
              disabled={isBusy}
            />
          </label>

          {selectedFile && !failure && (
            <p className="mt-3 text-sm text-ink">
              선택한 파일: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}

          {errors.file && (
            <p className="mt-2 text-sm text-state-error">{errors.file}</p>
          )}
        </div>

        {/* 실패 안내. 색이 아니라 아이콘과 문장이 상태를 말한다. */}
        {failure && (
          <StatusState title={failure.title} detail={failure.detail} action={failure.action} tone="error" />
        )}

        {/* 곡명 */}
        <div>
          <label htmlFor="sheet-title" className="mb-2 block text-sm font-medium text-ink">
            곡명 <span className="text-state-error">*</span>
          </label>
          <input
            id="sheet-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            aria-invalid={Boolean(errors.title)}
            className={`w-full rounded-2xl border px-3 py-2 transition-colors focus:border-accent ${
              errors.title ? 'border-state-error' : 'border-rule-strong'
            }`}
            placeholder="곡명을 입력하세요"
            disabled={isBusy}
          />
          {errors.title && <p className="mt-1 text-sm text-state-error">{errors.title}</p>}
        </div>

        {/* 저작자 */}
        <div>
          <label htmlFor="sheet-composer" className="mb-2 block text-sm font-medium text-ink">
            저작자 <span className="text-state-error">*</span>
          </label>
          <input
            id="sheet-composer"
            type="text"
            value={formData.composer}
            onChange={(e) => handleInputChange('composer', e.target.value)}
            aria-invalid={Boolean(errors.composer)}
            className={`w-full rounded-2xl border px-3 py-2 transition-colors focus:border-accent ${
              errors.composer ? 'border-state-error' : 'border-rule-strong'
            }`}
            placeholder="작곡가 또는 저작자를 입력하세요"
            disabled={isBusy}
          />
          {errors.composer && <p className="mt-1 text-sm text-state-error">{errors.composer}</p>}
        </div>

        {/* 빠르기 (D-013: 비워두면 미상) */}
        <div>
          <label htmlFor="tempo" className="mb-2 block text-sm font-medium text-ink">
            빠르기 (BPM)
          </label>
          <input
            id="tempo"
            type="number"
            min={20}
            max={400}
            step="any"
            value={formData.tempo}
            onChange={(e) => handleInputChange('tempo', e.target.value)}
            aria-describedby="tempo-help"
            aria-invalid={Boolean(errors.tempo)}
            className={`w-full rounded-2xl border px-3 py-2 transition-colors focus:border-accent ${
              errors.tempo ? 'border-state-error' : 'border-rule-strong'
            }`}
            placeholder="예: 60"
            disabled={isBusy}
          />
          <p id="tempo-help" className="mt-1 text-xs text-ink-muted">
            선택 입력입니다. 비워두면 빠르기 미상으로 표시됩니다.
          </p>
          {errors.tempo && <p className="mt-1 text-sm text-state-error">{errors.tempo}</p>}
        </div>

        {/* 카테고리 */}
        <div>
          <label htmlFor={categorySelectId} className="mb-2 block text-sm font-medium text-ink">
            카테고리
          </label>
          <div className="space-y-2">
            <select
              id={categorySelectId}
              value={formData.categoryId || ''}
              onChange={(e) =>
                handleInputChange('categoryId', e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full rounded-2xl border border-rule-strong px-3 py-2 transition-colors focus:border-accent"
              disabled={isBusy || isLoadingCategories}
            >
              <option value="">카테고리 선택 (선택사항)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {!showNewCategoryInput ? (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="text-sm font-medium text-accent hover:text-accent-hover"
                disabled={isBusy}
              >
                + 새 카테고리 만들기
              </button>
            ) : (
              <div className="flex gap-2">
                <label htmlFor="new-category" className="sr-only">
                  새 카테고리 이름
                </label>
                <input
                  id="new-category"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="새 카테고리 이름"
                  className="flex-1 rounded-2xl border border-rule-strong px-3 py-2 transition-colors focus:border-accent"
                  disabled={isCreatingCategory}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                >
                  {isCreatingCategory ? '만드는 중...' : '만들기'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewCategoryInput(false)
                    setNewCategoryName('')
                  }}
                  disabled={isCreatingCategory}
                >
                  취소
                </Button>
              </div>
            )}

            {errors.category && <p className="text-sm text-state-error">{errors.category}</p>}
          </div>
        </div>

        {/* 공개 여부 */}
        <div>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="mt-1 rounded border-rule-strong"
              disabled={isBusy}
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-ink">다른 사용자와 공유 (공개 설정)</span>
              <span className="mt-1 block text-xs text-ink-muted">
                공개로 설정하면 다른 사용자가 이 악보를 탐색에서 찾고 연주할 수 있습니다.
              </span>
            </span>
          </label>
        </div>

        {/*
          제출 전에 알아야 할 것. 홈이 이미 "변환에 1~3분, 페이지를 닫아도 계속됩니다"라고
          말하고 있으므로 같은 값을 쓴다 — 두 화면이 다른 시간을 말하면 어느 쪽도 믿을 수 없다.
        */}
        <div className="rounded-md border border-rule bg-surface-muted p-4">
          <h3 className="text-sm font-semibold text-ink">변환을 시작하면</h3>
          <ul className="mt-2 space-y-1 text-sm text-ink-muted">
            <li>보통 1~3분이 걸립니다. 악보가 길거나 복잡하면 더 걸릴 수 있습니다.</li>
            <li>변환은 서버에서 진행되므로 이 페이지를 닫아도 계속됩니다.</li>
            <li>끝난 악보는 내 악보에서 바로 연습할 수 있습니다.</li>
          </ul>
        </div>

        {errors.form && (
          <p role="alert" className="text-sm text-state-error">
            {errors.form}
          </p>
        )}

        {/* 진행 중인 동작을 스크린리더에도 전달한다. */}
        <p aria-live="polite" className={isBusy ? 'text-sm text-ink-muted' : 'sr-only'}>
          {PHASE_MESSAGE[phase]}
        </p>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" disabled={!canSubmit} loading={phase === 'submitting'}>
            {phase === 'submitting' ? '변환 요청 중...' : '변환 시작하기'}
          </Button>
        </div>
      </form>
    </section>
  )
}
