'use client'

/**
 * Confirm Dialog Component
 * 사용자 액션 확인을 위한 모달 다이얼로그
 */

import { useEffect, useRef } from 'react'

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
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '확인',
  message = '이 작업을 수행하시겠습니까?',
  confirmText = '확인',
  cancelText = '취소',
  type = 'info',
  children
}: ConfirmDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      // 첫 번째 버튼(취소)에 포커스
      cancelButtonRef.current?.focus()
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 클릭 외부 영역으로 모달 닫기
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  // Enter 키로 확인
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.target === cancelButtonRef.current) {
      event.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          titleColor: 'text-red-900'
        }
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          confirmBg: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
          titleColor: 'text-orange-900'
        }
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
          titleColor: 'text-blue-900'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          ref={modalRef}
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
        >
          {/* 모달 헤더 */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* 아이콘 */}
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                <span className="text-lg" role="img" aria-hidden="true">
                  {styles.icon}
                </span>
              </div>
              
              {/* 콘텐츠 */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 
                  className={`text-base font-semibold leading-6 ${styles.titleColor}`}
                  id="modal-title"
                >
                  {title}
                </h3>
                <div className="mt-2">
                  {children ? (
                    children
                  ) : (
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 모달 푸터 - 버튼들 */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {/* 확인 버튼 */}
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${styles.confirmBg} focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto`}
            >
              {confirmText}
            </button>
            
            {/* 취소 버튼 */}
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              onKeyDown={handleKeyDown}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 사용하기 쉬운 훅
export function useConfirmDialog() {
  const confirm = (options: {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div')
      document.body.appendChild(dialog)
      
      const cleanup = () => {
        document.body.removeChild(dialog)
      }
      
      // React를 사용하지 않고 간단한 confirm 창 생성
      const result = window.confirm(options.message || '이 작업을 수행하시겠습니까?')
      resolve(result)
      cleanup()
    })
  }
  
  return { confirm }
}

// 특화된 삭제 확인 컴포넌트
interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName?: string
  itemType?: string
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName = '',
  itemType = '항목'
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="삭제 확인"
      confirmText="삭제"
      cancelText="취소"
      type="danger"
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          <strong>{itemName}</strong> {itemType}을(를) 삭제하시겠습니까?
        </p>
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-sm">⚠️</span>
            </div>
            <div className="ml-2">
              <p className="text-sm text-red-700 font-medium">
                주의: 이 작업은 되돌릴 수 없습니다
              </p>
              <ul className="mt-1 text-xs text-red-600 list-disc list-inside space-y-1">
                <li>연관된 모든 데이터가 함께 삭제됩니다</li>
                <li>연습 기록 및 통계가 사라집니다</li>
                <li>파일 저장소에서도 완전히 제거됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ConfirmDialog>
  )
}