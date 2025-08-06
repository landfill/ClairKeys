/**
 * 리팩터링된 SheetMusic Service
 * Repository 패턴과 의존성 주입 적용
 */

import { 
  SheetMusicWithCategory,
  CreateSheetMusicData,
  UpdateSheetMusicData,
  SheetMusicQueryParams,
  PublicSheetMusicQueryParams
} from '@/types/sheet-music'
import { ISheetMusicRepository, ICategoryRepository, IUnitOfWork } from '@/repositories/interfaces'
import { getRepositoryFactory, getUnitOfWork } from '@/repositories/RepositoryFactory'

export interface ISheetMusicService {
  // 기본 CRUD
  getSheetMusic(id: number, userId?: string): Promise<SheetMusicWithCategory>
  getUserSheetMusic(userId: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]>
  getPublicSheetMusic(params?: PublicSheetMusicQueryParams): Promise<{
    sheetMusic: SheetMusicWithCategory[]
    total: number
    hasMore: boolean
  }>
  createSheetMusic(data: CreateSheetMusicData): Promise<SheetMusicWithCategory>
  updateSheetMusic(id: number, data: UpdateSheetMusicData, userId: string): Promise<SheetMusicWithCategory>
  deleteSheetMusic(id: number, userId: string): Promise<void>
  
  // 비즈니스 로직
  moveSheetMusicToCategory(sheetMusicId: number, categoryId: number | null, userId: string): Promise<SheetMusicWithCategory>
  togglePublicStatus(sheetMusicId: number, userId: string): Promise<SheetMusicWithCategory>
  bulkOperations: {
    delete(ids: number[], userId: string): Promise<void>
    moveToCategory(ids: number[], categoryId: number | null, userId: string): Promise<void>
    updatePublicStatus(ids: number[], isPublic: boolean, userId: string): Promise<void>
  }
}

/**
 * Repository 패턴을 사용한 SheetMusic Service 구현
 */
export class SheetMusicServiceRefactored implements ISheetMusicService {
  private sheetMusicRepository: ISheetMusicRepository
  private categoryRepository: ICategoryRepository
  private unitOfWork: IUnitOfWork

  constructor(
    sheetMusicRepository?: ISheetMusicRepository,
    categoryRepository?: ICategoryRepository,
    unitOfWork?: IUnitOfWork
  ) {
    const factory = getRepositoryFactory()
    this.sheetMusicRepository = sheetMusicRepository || factory.sheetMusicRepository()
    this.categoryRepository = categoryRepository || factory.categoryRepository()
    this.unitOfWork = unitOfWork || getUnitOfWork()
  }

  // ============================================================================
  // 기본 CRUD 작업
  // ============================================================================

  async getSheetMusic(id: number, userId?: string): Promise<SheetMusicWithCategory> {
    const sheetMusic = await this.sheetMusicRepository.findById(id)
    
    if (!sheetMusic) {
      throw new Error('Sheet music not found')
    }

    // 비공개 악보의 경우 소유자만 접근 가능
    if (!sheetMusic.isPublic && sheetMusic.userId !== userId) {
      throw new Error('Unauthorized: This sheet music is private')
    }

    return sheetMusic
  }

  async getUserSheetMusic(userId: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]> {
    return await this.sheetMusicRepository.findByUserId(userId, params)
  }

  async getPublicSheetMusic(params?: PublicSheetMusicQueryParams): Promise<{
    sheetMusic: SheetMusicWithCategory[]
    total: number
    hasMore: boolean
  }> {
    return await this.sheetMusicRepository.findPublic(params)
  }

  async createSheetMusic(data: CreateSheetMusicData): Promise<SheetMusicWithCategory> {
    // 비즈니스 규칙 검증
    await this.validateCreateSheetMusicData(data)

    return await this.sheetMusicRepository.create(data)
  }

  async updateSheetMusic(id: number, data: UpdateSheetMusicData, userId: string): Promise<SheetMusicWithCategory> {
    // 소유권 검증
    await this.validateSheetMusicOwnership(id, userId)
    
    // 비즈니스 규칙 검증
    await this.validateUpdateSheetMusicData(data, userId)

    return await this.sheetMusicRepository.update(id, data)
  }

  async deleteSheetMusic(id: number, userId: string): Promise<void> {
    // 소유권 검증
    await this.validateSheetMusicOwnership(id, userId)

    await this.sheetMusicRepository.delete(id)
  }

  // ============================================================================
  // 비즈니스 로직
  // ============================================================================

  async moveSheetMusicToCategory(
    sheetMusicId: number, 
    categoryId: number | null, 
    userId: string
  ): Promise<SheetMusicWithCategory> {
    return await this.sheetMusicRepository.moveToCategory(sheetMusicId, categoryId, userId)
  }

  async togglePublicStatus(sheetMusicId: number, userId: string): Promise<SheetMusicWithCategory> {
    return await this.sheetMusicRepository.togglePublicStatus(sheetMusicId, userId)
  }

  // ============================================================================
  // 배치 작업
  // ============================================================================

  bulkOperations = {
    delete: async (ids: number[], userId: string): Promise<void> => {
      await this.sheetMusicRepository.bulkDelete(ids, userId)
    },

    moveToCategory: async (ids: number[], categoryId: number | null, userId: string): Promise<void> => {
      await this.sheetMusicRepository.bulkMoveToCategory(ids, categoryId, userId)
    },

    updatePublicStatus: async (ids: number[], isPublic: boolean, userId: string): Promise<void> => {
      await this.sheetMusicRepository.bulkUpdatePublicStatus(ids, isPublic, userId)
    }
  }

  // ============================================================================
  // 검색 기능
  // ============================================================================

  async searchSheetMusic(params: {
    query: string
    userId?: string
    isPublic?: boolean
    searchType?: 'title' | 'composer' | 'general'
  }): Promise<SheetMusicWithCategory[]> {
    const { query, userId, isPublic, searchType = 'general' } = params

    switch (searchType) {
      case 'title':
        return await this.sheetMusicRepository.searchByTitle(query, userId, isPublic)
      case 'composer':
        return await this.sheetMusicRepository.searchByComposer(query, userId, isPublic)
      case 'general':
      default:
        return await this.sheetMusicRepository.searchGeneral(query, { userId, isPublic })
    }
  }

  // ============================================================================
  // 통계 및 분석
  // ============================================================================

  async getUserSheetMusicStats(userId: string): Promise<{
    total: number
    public: number
    private: number
    categorized: number
    uncategorized: number
    byCategory: Record<string, number>
  }> {
    return await this.sheetMusicRepository.getUserSheetMusicStats(userId)
  }

  async getRecentSheetMusic(userId: string, limit: number = 10): Promise<SheetMusicWithCategory[]> {
    return await this.sheetMusicRepository.getRecentSheetMusic(userId, limit)
  }

  async getPopularPublicSheetMusic(limit: number = 20): Promise<SheetMusicWithCategory[]> {
    return await this.sheetMusicRepository.getPopularPublicSheetMusic(limit)
  }

  // ============================================================================
  // 데이터 검증 메서드
  // ============================================================================

  private async validateCreateSheetMusicData(data: CreateSheetMusicData): Promise<void> {
    // 제목 검증
    if (!data.title?.trim()) {
      throw new Error('Sheet music title is required')
    }
    if (data.title.length > 200) {
      throw new Error('Title cannot exceed 200 characters')
    }

    // 작곡가 검증
    if (!data.composer?.trim()) {
      throw new Error('Composer name is required')
    }
    if (data.composer.length > 100) {
      throw new Error('Composer name cannot exceed 100 characters')
    }

    // 카테고리 검증
    if (data.categoryId) {
      await this.validateCategoryOwnership(data.categoryId, data.userId)
    }

    // 애니메이션 데이터 URL 검증
    if (!data.animationDataUrl?.trim()) {
      throw new Error('Animation data URL is required')
    }
  }

  private async validateUpdateSheetMusicData(data: UpdateSheetMusicData, userId: string): Promise<void> {
    // 제목 검증
    if (data.title !== undefined) {
      if (!data.title?.trim()) {
        throw new Error('Sheet music title cannot be empty')
      }
      if (data.title.length > 200) {
        throw new Error('Title cannot exceed 200 characters')
      }
    }

    // 작곡가 검증
    if (data.composer !== undefined) {
      if (!data.composer?.trim()) {
        throw new Error('Composer name cannot be empty')
      }
      if (data.composer.length > 100) {
        throw new Error('Composer name cannot exceed 100 characters')
      }
    }

    // 카테고리 검증
    if (data.categoryId !== undefined && data.categoryId !== null) {
      await this.validateCategoryOwnership(data.categoryId, userId)
    }
  }

  private async validateSheetMusicOwnership(sheetMusicId: number, userId: string): Promise<void> {
    const isOwner = await this.sheetMusicRepository.validateSheetMusicOwnership(sheetMusicId, userId)
    if (!isOwner) {
      throw new Error('Unauthorized: You do not own this sheet music')
    }
  }

  private async validateCategoryOwnership(categoryId: number, userId: string): Promise<void> {
    const isOwner = await this.categoryRepository.validateCategoryOwnership(categoryId, userId)
    if (!isOwner) {
      throw new Error('Unauthorized: You do not own this category')
    }
  }

  // ============================================================================
  // 고급 비즈니스 로직
  // ============================================================================

  /**
   * 악보 복제 (개인 라이브러리에 공개 악보 복사)
   */
  async clonePublicSheetMusic(
    sourceId: number, 
    userId: string, 
    options?: {
      newTitle?: string
      categoryId?: number | null
      makePrivate?: boolean
    }
  ): Promise<SheetMusicWithCategory> {
    const sourceSheetMusic = await this.getSheetMusic(sourceId)
    
    if (!sourceSheetMusic.isPublic) {
      throw new Error('Cannot clone private sheet music')
    }

    const cloneData: CreateSheetMusicData = {
      title: options?.newTitle || `${sourceSheetMusic.title} (Copy)`,
      composer: sourceSheetMusic.composer,
      userId,
      categoryId: options?.categoryId || null,
      isPublic: options?.makePrivate === true ? false : sourceSheetMusic.isPublic,
      animationDataUrl: sourceSheetMusic.animationDataUrl
    }

    return await this.createSheetMusic(cloneData)
  }

  /**
   * 악보 공유 링크 생성 (공개 악보만)
   */
  async generateShareLink(sheetMusicId: number, userId: string): Promise<string> {
    const sheetMusic = await this.getSheetMusic(sheetMusicId, userId)
    
    if (!sheetMusic.isPublic) {
      throw new Error('Cannot generate share link for private sheet music')
    }

    // 실제로는 더 복잡한 공유 링크 생성 로직이 필요
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return `${baseUrl}/sheet/${sheetMusicId}`
  }

  /**
   * 사용자의 악보를 카테고리별로 내보내기 (백업 목적)
   */
  async exportUserSheetMusic(userId: string): Promise<{
    categories: Array<{
      name: string
      sheetMusic: SheetMusicWithCategory[]
    }>
    uncategorized: SheetMusicWithCategory[]
    summary: {
      totalSheetMusic: number
      totalCategories: number
      publicSheetMusic: number
      privateSheetMusic: number
    }
  }> {
    const [allSheetMusic, categories, stats] = await Promise.all([
      this.getUserSheetMusic(userId),
      this.categoryRepository.findByUserId(userId),
      this.getUserSheetMusicStats(userId)
    ])

    const categorizedSheetMusic = categories.map(category => ({
      name: category.name,
      sheetMusic: allSheetMusic.filter(sheet => sheet.categoryId === category.id)
    }))

    const uncategorized = allSheetMusic.filter(sheet => sheet.categoryId === null)

    return {
      categories: categorizedSheetMusic,
      uncategorized,
      summary: {
        totalSheetMusic: stats.total,
        totalCategories: categories.length,
        publicSheetMusic: stats.public,
        privateSheetMusic: stats.private
      }
    }
  }
}