/**
 * Repository 인터페이스 정의
 * Repository 패턴을 통한 데이터 접근 계층 추상화
 */

import { Category, CategoryWithSheetMusic } from '@/types/category'
import { 
  SheetMusicWithCategory, 
  CreateSheetMusicData,
  UpdateSheetMusicData,
  SheetMusicQueryParams,
  PublicSheetMusicQueryParams 
} from '@/types/sheet-music'

// ============================================================================
// Base Repository Interface
// ============================================================================

/**
 * 기본 Repository 인터페이스
 */
export interface IBaseRepository<TEntity, TKey = number> {
  findById(id: TKey): Promise<TEntity | null>
  findMany(params?: Record<string, unknown>): Promise<TEntity[]>
  create(data: Partial<TEntity>): Promise<TEntity>
  update(id: TKey, data: Partial<TEntity>): Promise<TEntity>
  delete(id: TKey): Promise<void>
  exists(id: TKey): Promise<boolean>
  count(params?: Record<string, unknown>): Promise<number>
}

// ============================================================================
// Category Repository Interface
// ============================================================================

export interface ICategoryRepository extends IBaseRepository<Category> {
  // 기본 CRUD
  findById(id: number): Promise<Category | null>
  findMany(): Promise<Category[]>
  create(data: { name: string; userId: string }): Promise<Category>
  update(id: number, data: { name: string }): Promise<Category>
  delete(id: number): Promise<void>
  
  // 특화 메서드
  findByUserId(userId: string): Promise<Category[]>
  findByIdWithSheetMusic(id: number): Promise<CategoryWithSheetMusic | null>
  findByNameAndUserId(name: string, userId: string): Promise<Category | null>
  countSheetMusicInCategory(categoryId: number): Promise<number>
  
  // 비즈니스 로직
  validateCategoryOwnership(categoryId: number, userId: string): Promise<boolean>
  canDeleteCategory(categoryId: number): Promise<boolean>
}

// ============================================================================
// SheetMusic Repository Interface
// ============================================================================

export interface ISheetMusicRepository extends IBaseRepository<SheetMusicWithCategory> {
  // 기본 CRUD
  findById(id: number): Promise<SheetMusicWithCategory | null>
  findMany(params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]>
  create(data: CreateSheetMusicData): Promise<SheetMusicWithCategory>
  update(id: number, data: UpdateSheetMusicData): Promise<SheetMusicWithCategory>
  delete(id: number): Promise<void>
  
  // 사용자별 조회
  findByUserId(userId: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]>
  findByCategoryId(categoryId: number, userId?: string): Promise<SheetMusicWithCategory[]>
  
  // 공개 악보 조회
  findPublic(params?: PublicSheetMusicQueryParams): Promise<{
    sheetMusic: SheetMusicWithCategory[]
    total: number
    hasMore: boolean
  }>
  
  // 검색 기능
  searchByTitle(query: string, userId?: string, isPublic?: boolean): Promise<SheetMusicWithCategory[]>
  searchByComposer(query: string, userId?: string, isPublic?: boolean): Promise<SheetMusicWithCategory[]>
  searchGeneral(query: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]>
  
  // 통계 및 집계
  countByUserId(userId: string): Promise<number>
  countByCategoryId(categoryId: number): Promise<number>
  countPublic(): Promise<number>
  
  // 비즈니스 로직
  validateSheetMusicOwnership(sheetMusicId: number, userId: string): Promise<boolean>
  moveToCategory(sheetMusicId: number, newCategoryId: number | null, userId: string): Promise<SheetMusicWithCategory>
  togglePublicStatus(sheetMusicId: number, userId: string): Promise<SheetMusicWithCategory>
  
  // 배치 작업
  bulkDelete(ids: number[], userId: string): Promise<void>
  bulkMoveToCategory(ids: number[], categoryId: number | null, userId: string): Promise<void>
  bulkUpdatePublicStatus(ids: number[], isPublic: boolean, userId: string): Promise<void>
}

// ============================================================================
// Repository Factory Interface
// ============================================================================

/**
 * Repository 팩토리 인터페이스
 * 의존성 주입을 위한 Repository 인스턴스 생성
 */
export interface IRepositoryFactory {
  categoryRepository(): ICategoryRepository
  sheetMusicRepository(): ISheetMusicRepository
}

// ============================================================================
// Unit of Work Interface
// ============================================================================

/**
 * Unit of Work 패턴 인터페이스
 * 트랜잭션 관리 및 여러 Repository 작업 조율
 */
export interface IUnitOfWork {
  categoryRepository: ICategoryRepository
  sheetMusicRepository: ISheetMusicRepository
  
  // 트랜잭션 관리
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  
  // 원자적 작업 실행
  executeInTransaction<T>(operation: () => Promise<T>): Promise<T>
  
  // Repository 팩토리
  getRepository<T extends keyof IUnitOfWork>(
    repositoryName: T
  ): IUnitOfWork[T] extends ICategoryRepository | ISheetMusicRepository 
    ? IUnitOfWork[T] 
    : never
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * 페이지네이션 결과
 */
export interface IPaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * 검색 결과
 */
export interface ISearchResult<T> extends IPaginatedResult<T> {
  query: string
  searchTime: number
  filters: Record<string, unknown>
}

/**
 * 집계 결과
 */
export interface IAggregationResult {
  field: string
  value: unknown
  count: number
}