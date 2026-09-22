'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Button from './Button'
import { AlertIcon } from './icons'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  children?: React.ReactNode
  confirmDisabled?: boolean
  busy?: boolean
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title = '확인', message = '이 작업을 수행하시겠습니까?',
  confirmText = '확인', cancelText = '취소', type = 'info', children,
  confirmDisabled = false, busy = false,
}: ConfirmDialogProps) {
  const titleId = useId()
  const contentId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()
    return () => {
      document.body.style.overflow = oldOverflow
      previousFocus.current?.focus()
    }
  }, [isOpen])

  // A pending request disables every control. Chromium otherwise moves focus to
  // body when the active confirm button becomes disabled, allowing Tab behind
  // the still-open modal.
  useEffect(() => {
    if (isOpen && busy) dialogRef.current?.focus()
  }, [isOpen, busy])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!busy) onClose()
    }
    if (event.key !== 'Tab' || !modalRef.current) return
    const controls = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
    ))
    if (!controls.length) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (document.activeElement === dialogRef.current) {
      event.preventDefault()
      const target = event.shiftKey ? last : first
      target.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/60 p-3 sm:items-center sm:p-6"
      role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={contentId}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div ref={modalRef} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-rule bg-surface shadow-xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${type === 'danger' ? 'bg-state-error/10 text-state-error' : type === 'warning' ? 'bg-state-progress/10 text-state-progress' : 'bg-accent/10 text-accent'}`} aria-hidden="true">
              <AlertIcon size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
              <div id={contentId} className="mt-2 text-sm leading-6 text-ink-muted break-words">
                {children ?? <p>{message}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-rule bg-surface-muted p-4 sm:flex-row sm:justify-end sm:px-6">
          <Button ref={cancelRef} type="button" variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={onClose}>{cancelText}</Button>
          <Button type="button" variant={type === 'danger' ? 'danger' : 'primary'} className="min-h-11 w-full sm:w-auto" disabled={confirmDisabled || busy} loading={busy} onClick={onConfirm}>{busy ? '처리 중…' : confirmText}</Button>
        </div>
      </div>
    </div>
  )
}

// Legacy call sites still use the browser confirmation contract.
export function useConfirmDialog() {
  const confirm = (options: { message?: string }): Promise<boolean> =>
    Promise.resolve(window.confirm(options.message || '이 작업을 수행하시겠습니까?'))
  return { confirm }
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  itemName?: string
  itemType?: string
  itemDetail?: string
}

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, itemName = '', itemType = '항목', itemDetail }: DeleteConfirmDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setAcknowledged(false)
      setError(null)
    }
  }, [isOpen])

  const confirm = async () => {
    if (!acknowledged || busy) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch {
      setError(`${itemType}를 삭제하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog isOpen={isOpen} onClose={onClose} onConfirm={confirm}
      title={`${itemType} 영구 삭제`} confirmText={`${itemType} 영구 삭제`} type="danger"
      confirmDisabled={!acknowledged} busy={busy}>
      <div className="space-y-4">
        <div className="rounded-lg border border-rule bg-surface-muted p-4">
          <p className="text-xs font-semibold text-ink-muted">삭제할 {itemType}</p>
          <p className="mt-1 break-all text-base font-semibold text-ink">{itemName || itemType}</p>
          {itemDetail && <p className="mt-1 break-words text-sm text-ink-muted">{itemDetail}</p>}
        </div>
        <p className="font-medium text-state-error">이 {itemType}는 영구 삭제되며 되돌릴 수 없습니다.</p>
        {itemType === '악보' && <p>악보와 연결된 연습 기록을 더 이상 사용할 수 없습니다.</p>}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-rule-strong bg-surface px-3 py-2 text-ink">
          <input type="checkbox" checked={acknowledged} disabled={busy} onChange={(event) => setAcknowledged(event.target.checked)} className="size-5 accent-state-error" />
          <span>영구 삭제를 이해했습니다</span>
        </label>
        {error && <p role="alert" className="rounded-lg border border-state-error/30 bg-state-error/5 px-3 py-2 text-state-error">{error}</p>}
      </div>
    </ConfirmDialog>
  )
}
