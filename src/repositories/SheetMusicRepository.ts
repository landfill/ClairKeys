/**
 * Prisma를 사용한 SheetMusic Repository 구현체
 * Repository 패턴을 통한 데이터 접근 계층 구현
 */

import { PrismaClient } from '@prisma/client'
import { 
  SheetMusicWithCategory,
  CreateSheetMusicData,
  UpdateSheetMusicData,
  SheetMusicQueryParams,
  PublicSheetMusicQueryParams
} from '@/types/sheet-music'
import { ISheetMusicRepository } from './interfaces'

export class SheetMusicRepository implements ISheetMusicRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // 기본 CRUD 작업
  // ============================================================================

  async findById(id: number): Promise<SheetMusicWithCategory | null> {
    return await this.prisma.sheetMusic.findUnique({
      where: { id },
      include: { category: true }
    })
  }

  async findMany(params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]> {
    const where: any = {}
    
    if (params?.userId) where.userId = params.userId
    if (params?.categoryId !== undefined) {
      where.categoryId = params.categoryId === null ? null : params.categoryId
    }
    if (params?.isPublic !== undefined) where.isPublic = params.isPublic
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { composer: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    return await this.prisma.sheetMusic.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: params?.limit,
      skip: params?.offset
    })
  }

  async create(data: CreateSheetMusicData): Promise<SheetMusicWithCategory> {
    return await this.prisma.sheetMusic.create({
      data: {
        title: data.title,
        composer: data.composer,
        userId: data.userId,
        categoryId: data.categoryId || null,
        isPublic: data.isPublic ?? false,
        animationDataUrl: data.animationDataUrl
      },
      include: { category: true }
    })
  }

  async update(id: number, data: UpdateSheetMusicData): Promise<SheetMusicWithCategory> {
    return await this.prisma.sheetMusic.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.composer !== undefined && { composer: data.composer }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic })
      },
      include: { category: true }
    })
  }

  async delete(id: number): Promise<void> {
    await this.prisma.sheetMusic.delete({
      where: { id }
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.sheetMusic.count({
      where: { id }
    })
    return count > 0
  }

  async count(params?: Record<string, unknown>): Promise<number> {
    return await this.prisma.sheetMusic.count({
      where: params as any
    })
  }

  // ============================================================================
  // 사용자별 조회
  // ============================================================================

  async findByUserId(userId: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]> {
    return await this.findMany({ ...params, userId })
  }

  async findByCategoryId(categoryId: number, userId?: string): Promise<SheetMusicWithCategory[]> {
    const where: any = { categoryId }
    if (userId) where.userId = userId

    return await this.prisma.sheetMusic.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  // ============================================================================
  // 공개 악보 조회
  // ============================================================================

  async findPublic(params?: PublicSheetMusicQueryParams): Promise<{
    sheetMusic: SheetMusicWithCategory[]
    total: number
    hasMore: boolean
  }> {
    const where: any = { isPublic: true }
    
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { composer: { contains: params.search, mode: 'insensitive' } }
      ]
    }
    if (params?.categoryId) where.categoryId = params.categoryId

    const limit = params?.limit || 20
    const offset = params?.offset || 0

    const [sheetMusic, total] = await Promise.all([
      this.prisma.sheetMusic.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // 다음 페이지 존재 여부 확인용
        skip: offset
      }),
      this.prisma.sheetMusic.count({ where })
    ])

    const hasMore = sheetMusic.length > limit
    if (hasMore) sheetMusic.pop() // 추가로 가져온 항목 제거

    return {
      sheetMusic,
      total,
      hasMore
    }
  }

  // ============================================================================
  // 검색 기능
  // ============================================================================

  async searchByTitle(query: string, userId?: string, isPublic?: boolean): Promise<SheetMusicWithCategory[]> {
    const where: any = {
      title: { contains: query, mode: 'insensitive' }
    }
    
    if (userId) where.userId = userId
    if (isPublic !== undefined) where.isPublic = isPublic

    return await this.prisma.sheetMusic.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async searchByComposer(query: string, userId?: string, isPublic?: boolean): Promise<SheetMusicWithCategory[]> {
    const where: any = {
      composer: { contains: query, mode: 'insensitive' }
    }
    
    if (userId) where.userId = userId
    if (isPublic !== undefined) where.isPublic = isPublic

    return await this.prisma.sheetMusic.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async searchGeneral(query: string, params?: SheetMusicQueryParams): Promise<SheetMusicWithCategory[]> {
    return await this.findMany({ ...params, search: query })
  }

  // ============================================================================
  // 통계 및 집계
  // ============================================================================

  async countByUserId(userId: string): Promise<number> {
    return await this.prisma.sheetMusic.count({
      where: { userId }
    })
  }

  async countByCategoryId(categoryId: number): Promise<number> {
    return await this.prisma.sheetMusic.count({
      where: { categoryId }
    })
  }

  async countPublic(): Promise<number> {
    return await this.prisma.sheetMusic.count({
      where: { isPublic: true }
    })
  }

  // ============================================================================
  // 비즈니스 로직
  // ============================================================================

  async validateSheetMusicOwnership(sheetMusicId: number, userId: string): Promise<boolean> {
    const sheetMusic = await this.prisma.sheetMusic.findUnique({
      where: { id: sheetMusicId },
      select: { userId: true }
    })

    return sheetMusic?.userId === userId
  }

  async moveToCategory(
    sheetMusicId: number, 
    newCategoryId: number | null, 
    userId: string
  ): Promise<SheetMusicWithCategory> {
    // 소유권 검증
    const isOwner = await this.validateSheetMusicOwnership(sheetMusicId, userId)
    if (!isOwner) {
      throw new Error('Unauthorized: You do not own this sheet music')
    }

    // 카테고리 소유권 검증 (newCategoryId가 null이 아닌 경우)
    if (newCategoryId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: newCategoryId },
        select: { userId: true }
      })
      
      if (!category || category.userId !== userId) {
        throw new Error('Unauthorized: You do not own this category')
      }
    }

    return await this.update(sheetMusicId, { categoryId: newCategoryId })
  }

  async togglePublicStatus(sheetMusicId: number, userId: string): Promise<SheetMusicWithCategory> {
    const sheetMusic = await this.findById(sheetMusicId)
    if (!sheetMusic || sheetMusic.userId !== userId) {
      throw new Error('Unauthorized: You do not own this sheet music')
    }

    return await this.update(sheetMusicId, { isPublic: !sheetMusic.isPublic })
  }

  // ============================================================================
  // 배치 작업
  // ============================================================================

  async bulkDelete(ids: number[], userId: string): Promise<void> {
    // 소유권 검증
    const count = await this.prisma.sheetMusic.count({
      where: {
        id: { in: ids },
        userId
      }
    })

    if (count !== ids.length) {
      throw new Error('Unauthorized: Some sheet music items are not owned by you')
    }

    await this.prisma.sheetMusic.deleteMany({
      where: {
        id: { in: ids },
        userId
      }
    })
  }

  async bulkMoveToCategory(ids: number[], categoryId: number | null, userId: string): Promise<void> {
    // 소유권 검증
    const count = await this.prisma.sheetMusic.count({
      where: {
        id: { in: ids },
        userId
      }
    })

    if (count !== ids.length) {
      throw new Error('Unauthorized: Some sheet music items are not owned by you')
    }

    // 카테고리 소유권 검증 (categoryId가 null이 아닌 경우)
    if (categoryId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { userId: true }
      })
      
      if (!category || category.userId !== userId) {
        throw new Error('Unauthorized: You do not own this category')
      }
    }

    await this.prisma.sheetMusic.updateMany({
      where: {
        id: { in: ids },
        userId
      },
      data: { categoryId }
    })
  }

  async bulkUpdatePublicStatus(ids: number[], isPublic: boolean, userId: string): Promise<void> {
    // 소유권 검증
    const count = await this.prisma.sheetMusic.count({
      where: {
        id: { in: ids },
        userId
      }
    })

    if (count !== ids.length) {
      throw new Error('Unauthorized: Some sheet music items are not owned by you')
    }

    await this.prisma.sheetMusic.updateMany({
      where: {
        id: { in: ids },
        userId
      },
      data: { isPublic }
    })
  }

  // ============================================================================
  // 추가 유틸리티 메서드
  // ============================================================================

  /**
   * 사용자의 악보 통계 조회
   */
  async getUserSheetMusicStats(userId: string): Promise<{
    total: number
    public: number
    private: number
    categorized: number
    uncategorized: number
    byCategory: Record<string, number>
  }> {
    const [total, publicCount, categorized, categoryStats] = await Promise.all([
      this.countByUserId(userId),
      this.prisma.sheetMusic.count({
        where: { userId, isPublic: true }
      }),
      this.prisma.sheetMusic.count({
        where: { userId, categoryId: { not: null } }
      }),
      this.prisma.sheetMusic.groupBy({
        by: ['categoryId'],
        where: { userId },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      })
    ])

    const byCategory: Record<string, number> = {}
    for (const stat of categoryStats) {
      const key = stat.categoryId ? `category_${stat.categoryId}` : 'uncategorized'
      byCategory[key] = stat._count._all
    }

    return {
      total,
      public: publicCount,
      private: total - publicCount,
      categorized,
      uncategorized: total - categorized,
      byCategory
    }
  }

  /**
   * 최근 생성된 악보 조회
   */
  async getRecentSheetMusic(userId: string, limit: number = 10): Promise<SheetMusicWithCategory[]> {
    return await this.prisma.sheetMusic.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * 가장 인기 있는 공개 악보 조회
   */
  async getPopularPublicSheetMusic(limit: number = 20): Promise<SheetMusicWithCategory[]> {
    return await this.prisma.sheetMusic.findMany({
      where: { isPublic: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' }, // 실제로는 조회수나 좋아요 수로 정렬해야 함
      take: limit
    })
  }
}