/**
 * 리팩터링된 Category Service
 * Repository 패턴과 의존성 주입 적용
 */

import { Category, CategoryWithSheetMusic } from '@/types/category'
import { ICategoryRepository, IUnitOfWork } from '@/repositories/interfaces'
import { getRepositoryFactory, getUnitOfWork } from '@/repositories/RepositoryFactory'

export interface ICategoryService {
  // 기본 CRUD
  getCategories(userId: string): Promise<Category[]>
  getCategory(id: number, userId: string): Promise<CategoryWithSheetMusic>
  createCategory(data: { name: string; userId: string }): Promise<Category>
  updateCategory(id: number, data: { name: string }, userId: string): Promise<Category>
  deleteCategory(id: number, userId: string): Promise<void>
  
  // 비즈니스 로직
  validateCategoryName(name: string, userId: string): Promise<void>
  getCategoryStats(userId: string): Promise<{
    totalCategories: number
    categoriesWithSheetMusic: number
    totalSheetMusicInCategories: number
  }>
}

/**
 * Repository 패턴을 사용한 Category Service 구현
 */
export class CategoryServiceRefactored implements ICategoryService {
  private categoryRepository: ICategoryRepository
  private unitOfWork: IUnitOfWork

  constructor(
    categoryRepository?: ICategoryRepository,
    unitOfWork?: IUnitOfWork
  ) {
    this.categoryRepository = categoryRepository || getRepositoryFactory().categoryRepository()
    this.unitOfWork = unitOfWork || getUnitOfWork()
  }

  // ============================================================================
  // 기본 CRUD 작업
  // ============================================================================

  async getCategories(userId: string): Promise<Category[]> {
    return await this.categoryRepository.findByUserId(userId)
  }

  async getCategory(id: number, userId: string): Promise<CategoryWithSheetMusic> {
    // 소유권 검증
    await this.validateCategoryOwnership(id, userId)

    const category = await this.categoryRepository.findByIdWithSheetMusic(id)
    if (!category) {
      throw new Error('Category not found')
    }

    return category
  }

  async createCategory(data: { name: string; userId: string }): Promise<Category> {
    // 비즈니스 규칙 검증
    await this.validateCategoryName(data.name, data.userId)

    return await this.categoryRepository.create(data)
  }

  async updateCategory(id: number, data: { name: string }, userId: string): Promise<Category> {
    // 소유권 검증
    await this.validateCategoryOwnership(id, userId)
    
    // 비즈니스 규칙 검증
    await this.validateCategoryName(data.name, userId, id)

    return await this.categoryRepository.update(id, data)
  }

  async deleteCategory(id: number, userId: string): Promise<void> {
    // 소유권 검증
    await this.validateCategoryOwnership(id, userId)

    // 트랜잭션으로 처리 (카테고리 삭제 시 악보들을 미분류로 이동)
    await this.unitOfWork.executeInTransaction(async () => {
      // Repository에서 cascade 처리가 되지만, 명시적으로 비즈니스 로직으로 처리
      await this.categoryRepository.delete(id)
    })
  }

  // ============================================================================
  // 비즈니스 로직
  // ============================================================================

  async validateCategoryName(name: string, userId: string, excludeId?: number): Promise<void> {
    // 빈 이름 검증
    if (!name.trim()) {
      throw new Error('Category name cannot be empty')
    }

    // 이름 길이 검증
    if (name.length > 50) {
      throw new Error('Category name cannot exceed 50 characters')
    }

    // 중복 이름 검증
    const existingCategory = await this.categoryRepository.findByNameAndUserId(name.trim(), userId)
    if (existingCategory && existingCategory.id !== excludeId) {
      throw new Error('A category with this name already exists')
    }
  }

  async getCategoryStats(userId: string): Promise<{
    totalCategories: number
    categoriesWithSheetMusic: number
    totalSheetMusicInCategories: number
  }> {
    return await this.categoryRepository.getCategoryStats(userId)
  }

  // ============================================================================
  // 내부 헬퍼 메서드
  // ============================================================================

  private async validateCategoryOwnership(categoryId: number, userId: string): Promise<void> {
    const isOwner = await this.categoryRepository.validateCategoryOwnership(categoryId, userId)
    if (!isOwner) {
      throw new Error('Unauthorized: You do not own this category')
    }
  }

  // ============================================================================
  // 추가 비즈니스 메서드
  // ============================================================================

  /**
   * 카테고리별 악보 수 조회
   */
  async getCategoriesWithSheetMusicCount(userId: string): Promise<Array<Category & { sheetMusicCount: number }>> {
    const categories = await this.categoryRepository.findByUserId(userId)
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => ({
        ...category,
        sheetMusicCount: await this.categoryRepository.countSheetMusicInCategory(category.id)
      }))
    )

    return categoriesWithCount.sort((a, b) => b.sheetMusicCount - a.sheetMusicCount)
  }

  /**
   * 빈 카테고리들 조회
   */
  async getEmptyCategories(userId: string): Promise<Category[]> {
    return await this.categoryRepository.getEmptyCategories(userId)
  }

  /**
   * 가장 인기 있는 카테고리들 조회
   */
  async getMostPopularCategories(userId: string, limit: number = 5): Promise<Array<Category & { _count: { sheetMusic: number } }>> {
    return await this.categoryRepository.getMostPopularCategories(userId, limit)
  }

  /**
   * 카테고리 일괄 삭제 (빈 카테고리만)
   */
  async bulkDeleteEmptyCategories(userId: string): Promise<{ deletedCount: number; deletedCategories: string[] }> {
    const emptyCategories = await this.getEmptyCategories(userId)
    
    if (emptyCategories.length === 0) {
      return { deletedCount: 0, deletedCategories: [] }
    }

    await this.unitOfWork.executeInTransaction(async () => {
      for (const category of emptyCategories) {
        await this.categoryRepository.delete(category.id)
      }
    })

    return {
      deletedCount: emptyCategories.length,
      deletedCategories: emptyCategories.map(c => c.name)
    }
  }

  /**
   * 카테고리 병합 (sourceId의 악보들을 targetId로 이동 후 sourceId 삭제)
   */
  async mergeCategories(sourceId: number, targetId: number, userId: string): Promise<void> {
    // 소유권 검증
    await Promise.all([
      this.validateCategoryOwnership(sourceId, userId),
      this.validateCategoryOwnership(targetId, userId)
    ])

    if (sourceId === targetId) {
      throw new Error('Cannot merge category with itself')
    }

    await this.unitOfWork.executeInTransaction(async () => {
      // 소스 카테고리의 모든 악보를 타겟 카테고리로 이동
      await this.unitOfWork.sheetMusicRepository.bulkMoveToCategory(
        await this.getSheetMusicIdsInCategory(sourceId),
        targetId,
        userId
      )
      
      // 소스 카테고리 삭제
      await this.categoryRepository.delete(sourceId)
    })
  }

  private async getSheetMusicIdsInCategory(categoryId: number): Promise<number[]> {
    const sheetMusicList = await this.unitOfWork.sheetMusicRepository.findByCategoryId(categoryId)
    return sheetMusicList.map(sheet => sheet.id)
  }
}