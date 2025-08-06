/**
 * Interface Segregation - 역할별 인터페이스 분리
 * SOLID 원칙에 따라 클라이언트가 사용하지 않는 메서드에 의존하지 않도록 인터페이스를 분리
 */

import { Category } from '@/types/category'
import { SheetMusicWithCategory } from '@/types/sheet-music'

// ============================================================================
// 기본 역할별 인터페이스
// ============================================================================

/**
 * 읽기 전용 기본 인터페이스
 */
export interface ReadOnlyProps {
  className?: string
}

/**
 * 선택 가능한 아이템에 대한 인터페이스
 */
export interface SelectableProps<T = number | null> {
  selectedId?: T
  onSelect?: (id: T) => void
}

/**
 * 편집 가능한 아이템에 대한 인터페이스
 */
export interface EditableProps<T = any> {
  onEdit?: (item: T) => void
  showEdit?: boolean
}

/**
 * 삭제 가능한 아이템에 대한 인터페이스
 */
export interface DeletableProps<T = number> {
  onDelete?: (id: T) => void
  showDelete?: boolean
}

/**
 * 이동 가능한 아이템에 대한 인터페이스
 */
export interface MovableProps<T = number | null> {
  onMove?: (itemId: number, targetId: T) => void
  showMove?: boolean
}

/**
 * 생성 가능한 컨테이너에 대한 인터페이스
 */
export interface CreatableProps {
  onCreateNew?: () => void
  showCreate?: boolean
}

/**
 * 변경 감지가 필요한 컨테이너에 대한 인터페이스
 */
export interface ChangeNotifiableProps {
  onContentChange?: () => void
}

// ============================================================================
// Category 관련 특화 인터페이스
// ============================================================================

/**
 * Category 선택 관련 인터페이스
 */
export interface CategorySelectableProps extends SelectableProps<number | null> {
  selectedCategoryId?: number | null
  onCategorySelect?: (categoryId: number | null) => void
}

/**
 * Category 편집 관련 인터페이스
 */
export interface CategoryEditableProps extends EditableProps<Category> {
  editingId?: number | null
  editValue?: string
  onStartEdit?: (category: Category) => void
  onSaveEdit?: (id: number) => void
  onCancelEdit?: () => void
  onEditValueChange?: (value: string) => void
}

/**
 * Category 생성 관련 인터페이스
 */
export interface CategoryCreatableProps extends CreatableProps {
  showCreateButton?: boolean
  isCreating?: boolean
  onSubmit?: (name: string) => Promise<void>
  onCancel?: () => void
}

/**
 * Category 삭제 관련 인터페이스
 */
export interface CategoryDeletableProps extends DeletableProps<number> {
  onDelete?: (id: number) => void
}

/**
 * Category 읽기 전용 인터페이스
 */
export interface CategoryReadOnlyProps extends ReadOnlyProps {
  categories: Category[]
}

// ============================================================================
// SheetMusic 관련 특화 인터페이스
// ============================================================================

/**
 * SheetMusic 기본 표시 인터페이스
 */
export interface SheetMusicDisplayProps extends ReadOnlyProps {
  sheetMusic: SheetMusicWithCategory
  showMetadata?: boolean
  showDate?: boolean
}

/**
 * SheetMusic 액션 관련 인터페이스
 */
export interface SheetMusicActionableProps 
  extends EditableProps<SheetMusicWithCategory>, 
          DeletableProps<number> {
  sheetMusic: SheetMusicWithCategory
  showPlay?: boolean
  layout?: 'horizontal' | 'vertical'
}

/**
 * SheetMusic 이동 관련 인터페이스
 */
export interface SheetMusicMovableProps extends MovableProps<number | null> {
  categories?: Category[]
  currentCategoryId: number | null
  onMove: (categoryId: number | null) => void
  position?: 'left' | 'right'
}

/**
 * SheetMusic 레이아웃 관련 인터페이스
 */
export interface SheetMusicLayoutProps {
  layout?: 'card' | 'compact' | 'list'
}

/**
 * SheetMusic 상호작용 관련 인터페이스
 */
export interface SheetMusicInteractiveProps {
  onClick?: () => void
  isHoverable?: boolean
}

// ============================================================================
// 복합 인터페이스 (필요한 경우에만 사용)
// ============================================================================

/**
 * Category 관리를 위한 최소 필수 인터페이스
 */
export interface CategoryManagerCoreProps 
  extends CategorySelectableProps, 
          CategoryCreatableProps,
          ChangeNotifiableProps {
}

/**
 * Category 전체 관리 인터페이스 (모든 기능 포함)
 */
export interface CategoryManagerFullProps 
  extends CategoryManagerCoreProps,
          CategoryReadOnlyProps,
          CategoryEditableProps,
          CategoryDeletableProps {
}

/**
 * SheetMusic 카드 핵심 인터페이스
 */
export interface SheetMusicCardCoreProps 
  extends SheetMusicDisplayProps,
          SheetMusicLayoutProps {
}

/**
 * SheetMusic 카드 전체 기능 인터페이스
 */
export interface SheetMusicCardFullProps 
  extends SheetMusicCardCoreProps,
          SheetMusicActionableProps,
          SheetMusicMovableProps,
          SheetMusicInteractiveProps {
}