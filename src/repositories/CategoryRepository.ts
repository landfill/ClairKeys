/**
 * Prisma를 사용한 Category Repository 구현체
 * Repository 패턴을 통한 데이터 접근 계층 구현
 */

import { PrismaClient } from '@prisma/client'
import { Category, CategoryWithSheetMusic } from '@/types/category'
import { ICategoryRepository } from './interfaces'

export class CategoryRepository implements ICategoryRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // 기본 CRUD 작업
  // ============================================================================

  async findById(id: number): Promise<Category | null> {
    return await this.prisma.category.findUnique({
      where: { id }
    })
  }

  async findMany(): Promise<Category[]> {
    return await this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  async create(data: { name: string; userId: string }): Promise<Category> {
    return await this.prisma.category.create({
      data: {
        name: data.name,
        userId: data.userId
      }
    })
  }

  async update(id: number, data: { name: string }): Promise<Category> {
    return await this.prisma.category.update({
      where: { id },
      data: { name: data.name }
    })
  }

  async delete(id: number): Promise<void> {
    // 관련된 악보들의 categoryId를 null로 설정 (cascade 대신 명시적 처리)
    await this.prisma.sheetMusic.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    })

    await this.prisma.category.delete({
      where: { id }
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { id }
    })
    return count > 0
  }

  async count(params?: Record<string, unknown>): Promise<number> {
    return await this.prisma.category.count({
      where: params as any
    })
  }

  // ============================================================================
  // 특화 메서드
  // ============================================================================

  async findByUserId(userId: string): Promise<Category[]> {
    return await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    })
  }

  async findByIdWithSheetMusic(id: number): Promise<CategoryWithSheetMusic | null> {
    const result = await this.prisma.category.findUnique({
      where: { id },
      include: {
        sheetMusic: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!result) return null

    return {
      ...result,
      sheetMusic: result.sheetMusic.map(sheet => ({
        ...sheet,
        category: result
      }))
    }
  }

  async findByNameAndUserId(name: string, userId: string): Promise<Category | null> {
    return await this.prisma.category.findFirst({
      where: {
        name,
        userId
      }
    })
  }

  async countSheetMusicInCategory(categoryId: number): Promise<number> {
    return await this.prisma.sheetMusic.count({
      where: { categoryId }
    })
  }

  // ============================================================================
  // 비즈니스 로직
  // ============================================================================

  async validateCategoryOwnership(categoryId: number, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { userId: true }
    })

    return category?.userId === userId
  }

  async canDeleteCategory(categoryId: number): Promise<boolean> {
    const sheetMusicCount = await this.countSheetMusicInCategory(categoryId)
    // 비즈니스 규칙: 악보가 있어도 삭제 가능 (미분류로 이동)
    return true
  }

  // ============================================================================
  // 추가 유틸리티 메서드
  // ============================================================================

  /**
   * 사용자의 카테고리 통계 조회
   */
  async getCategoryStats(userId: string): Promise<{
    totalCategories: number
    categoriesWithSheetMusic: number
    totalSheetMusicInCategories: number
  }> {
    const [totalCategories, categoriesWithSheetMusic, totalSheetMusicInCategories] = await Promise.all([
      this.prisma.category.count({ where: { userId } }),
      this.prisma.category.count({
        where: {
          userId,
          sheetMusic: {
            some: {}
          }
        }
      }),
      this.prisma.sheetMusic.count({
        where: {
          userId,
          categoryId: { not: null }
        }
      })
    ])

    return {
      totalCategories,
      categoriesWithSheetMusic,
      totalSheetMusicInCategories
    }
  }

  /**
   * 가장 많은 악보를 가진 카테고리 조회
   */
  async getMostPopularCategories(userId: string, limit: number = 5): Promise<Array<Category & { _count: { sheetMusic: number } }>> {
    return await this.prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { sheetMusic: true }
        }
      },
      orderBy: {
        sheetMusic: {
          _count: 'desc'
        }
      },
      take: limit
    }) as any
  }

  /**
   * 빈 카테고리들 조회
   */
  async getEmptyCategories(userId: string): Promise<Category[]> {
    return await this.prisma.category.findMany({
      where: {
        userId,
        sheetMusic: {
          none: {}
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}