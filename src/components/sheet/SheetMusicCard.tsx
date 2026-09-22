'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { SheetMusicWithCategory } from '@/types/sheet-music'
import { Category } from '@/types/category'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { DeleteConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { SheetMusicAvailability } from '@/lib/sheetMusicAvailability'
import { FolderIcon, GlobeIcon, LockIcon } from '@/components/ui/icons'

export interface SheetMusicCardProps {
  sheetMusic: SheetMusicWithCategory
  showMoveOptions?: boolean
  categories?: Category[]
  onMove?: (sheetMusicId: number, newCategoryId: number | null) => void
  onEdit?: (sheetMusic: SheetMusicWithCategory) => void
  onDelete?: (sheetMusicId: number) => Promise<void> | void
  availability?: SheetMusicAvailability
}

export function SheetMusicCard({
  sheetMusic,
  showMoveOptions = false,
  categories = [],
  onMove,
  onEdit,
  onDelete,
  availability
}: SheetMusicCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  // 제목은 유일하지 않다. 눈으로 보는 사람이 같은 제목의 카드를 저작자·분류·날짜로 구별하듯,
  // 각 동작은 그 정보를 설명으로 가리킨다 (PR158 리뷰).
  const metaId = useId()

  const handleMove = (newCategoryId: number | null) => {
    onMove?.(sheetMusic.id, newCategoryId)
    setShowMoveMenu(false)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const availabilityDetails = availability && {
    ready: { label: '연습 가능', icon: '✓', tone: 'success' as const },
    processing: { label: '처리 중', icon: '◌', tone: 'warning' as const },
    failed: { label: '변환 오류', icon: '!', tone: 'danger' as const },
    unknown: { label: '확인 필요', icon: '?', tone: 'neutral' as const },
  }[availability]

  /*
    보이는 날짜는 일 단위라, 변환 실패 뒤 같은 PDF를 같은 날 다시 올린 두 카드는 저작자·배지·날짜가
    모두 같다 — 가장 흔한 중복인데 이름과 설명이 완전히 같아졌다 (PR158 2차 리뷰). 올린 시각을 초
    단위로 설명에 더한다. 사람에게 의미 있는 구별 정보이고, 카드의 보이는 표현은 바꾸지 않는다.
  */
  const uploadedAt = new Date(sheetMusic.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
  const describedBy = `${metaId}-composer ${metaId}-badges ${metaId}-date ${metaId}-uploaded`
  const deleteDetail = [sheetMusic.composer, sheetMusic.category?.name || '미분류', uploadedAt].filter(Boolean).join(' · ')

  return (
    <Card padding="none" className="group min-w-0 hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        {/* Header with title and composer */}
        <div className="space-y-1 flex-shrink-0">
          <h3 title={sheetMusic.title} className="font-semibold text-lg text-ink break-words line-clamp-2 group-hover:text-accent transition-colors min-h-[3.5rem]">
            {sheetMusic.title}
          </h3>
          <p id={`${metaId}-composer`} className="text-ink-muted text-sm break-words line-clamp-2">{sheetMusic.composer}</p>
        </div>

        {/* Category and visibility info */}
        <div id={`${metaId}-badges`} className="flex flex-wrap items-center gap-1.5 text-xs flex-shrink-0">
          <Badge className="truncate">
            <FolderIcon size={14} aria-hidden="true" /> {sheetMusic.category?.name || '미분류'}
          </Badge>
          <Badge>
            {sheetMusic.isPublic ? <><GlobeIcon size={14} aria-hidden="true" /> 공개</> : <><LockIcon size={14} aria-hidden="true" /> 비공개</>}
          </Badge>
          {availabilityDetails && (
            <Badge tone={availabilityDetails.tone}>
              <span aria-hidden="true">{availabilityDetails.icon}</span>
              {availabilityDetails.label}
            </Badge>
          )}
        </div>

        {/* Date */}
        <p id={`${metaId}-date`} className="text-xs text-ink-muted flex-shrink-0">
          {formatDate(sheetMusic.createdAt)}
        </p>
        <span id={`${metaId}-uploaded`} className="sr-only">{`${uploadedAt} 업로드`}</span>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1"></div>

        {/*
          Action buttons. 목록에는 카드가 여럿이므로 각 동작의 접근 가능한 이름에 곡명을 붙인다 —
          "삭제"만으로는 어느 악보의 삭제인지 이름으로 고를 수 없다. 보이는 글자는 그대로 둔다.
        */}
        <div className="space-y-2 pt-2 flex-shrink-0">
          {availability === 'ready' || availability === undefined ? (
            <Link href={`/sheet/${sheetMusic.id}`} className="block w-full" aria-label={`${sheetMusic.title} 연습 시작`} aria-describedby={describedBy}>
              <Button as="span" className="w-full min-h-11 whitespace-nowrap" size="sm">
                연습 시작
              </Button>
            </Link>
          ) : availability === 'processing' ? (
            /*
              `flex-1`은 부모가 flex가 아니어서 아무 효과가 없었고, `min-h-11`이 없어 이 버튼만
              32px였다. 같은 자리의 같은 역할이 상태에 따라 크기가 달라지면 변환이 끝나는 순간
              카드가 흔들린다 (이슈 #146 stage 4).
            */
            <Button className="w-full min-h-11 whitespace-nowrap" size="sm" disabled aria-label={`${sheetMusic.title} 처리 중`} aria-describedby={describedBy}>
              처리 중
            </Button>
          ) : (
            <Link href="/upload" className="block w-full" aria-label={`${sheetMusic.title} 다시 업로드`} aria-describedby={describedBy}>
              <Button as="span" className="w-full min-h-11 whitespace-nowrap" size="sm">
                다시 업로드
              </Button>
            </Link>
          )}
          {(onEdit || (showMoveOptions && categories.length > 0) || onDelete) && (
            <div className="grid grid-cols-3 gap-2">
              {onEdit && (
                <Button
                  onClick={() => onEdit(sheetMusic)}
                  variant="outline"
                  size="sm"
                  className="min-w-0 w-full min-h-11 whitespace-nowrap"
                  aria-label={`${sheetMusic.title} 제목 수정`}
                  aria-describedby={describedBy}
                >
                  수정
                </Button>
              )}

              {showMoveOptions && categories.length > 0 && (
                <div className="relative">
                  <Button
                    onClick={() => setShowMoveMenu(!showMoveMenu)}
                    variant="outline"
                    size="sm"
                    className="min-w-0 w-full min-h-11 whitespace-nowrap"
                    aria-expanded={showMoveMenu}
                    aria-label={`${sheetMusic.title} 카테고리 이동`}
                    aria-describedby={describedBy}
                  >
                    이동
                  </Button>

                  {showMoveMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-rule rounded-md shadow-lg z-10 min-w-[150px]">
                      <div className="py-1">
                        <button
                          onClick={() => handleMove(null)}
                          className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-muted flex items-center gap-2"
                        >
                          <FolderIcon size={16} aria-hidden="true" /> 미분류
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleMove(category.id)}
                            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-muted flex items-center gap-2"
                            disabled={sheetMusic.categoryId === category.id}
                          >
                            <FolderIcon size={16} aria-hidden="true" /> {category.name}
                            {sheetMusic.categoryId === category.id && (
                              <span className="text-xs text-ink-muted">(현재)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {onDelete && (
                <Button
                  ref={deleteTriggerRef}
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  size="sm"
                  className="min-w-0 w-full min-h-11 whitespace-nowrap text-state-error hover:border-state-error"
                  aria-label={`${sheetMusic.title} 삭제`}
                  aria-describedby={describedBy}
                >
                  삭제
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close move menu */}
      {showMoveMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMoveMenu(false)}
        />
      )}
      
      {/* Delete confirmation dialog */}
      {onDelete && (
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            await onDelete(sheetMusic.id)
            setShowDeleteDialog(false)
          }}
          itemName={sheetMusic.title}
          itemType="악보"
          itemDetail={deleteDetail}
          returnFocusRef={deleteTriggerRef}
        />
      )}
    </Card>
  )
}
