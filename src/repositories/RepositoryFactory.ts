/**
 * Repository Factory 구현
 * 의존성 주입을 위한 Repository 인스턴스 생성 및 관리
 */

import { PrismaClient } from '@prisma/client'
import { ICategoryRepository, ISheetMusicRepository, IRepositoryFactory, IUnitOfWork } from './interfaces'
import { CategoryRepository } from './CategoryRepository'
import { SheetMusicRepository } from './SheetMusicRepository'
import { prisma } from '@/lib/prisma'

/**
 * Prisma 기반 Repository Factory
 */
export class PrismaRepositoryFactory implements IRepositoryFactory {
  private _prisma: PrismaClient
  private _categoryRepository?: ICategoryRepository
  private _sheetMusicRepository?: ISheetMusicRepository

  constructor(prismaInstance?: PrismaClient) {
    this._prisma = prismaInstance || prisma
  }

  categoryRepository(): ICategoryRepository {
    if (!this._categoryRepository) {
      this._categoryRepository = new CategoryRepository(this._prisma)
    }
    return this._categoryRepository
  }

  sheetMusicRepository(): ISheetMusicRepository {
    if (!this._sheetMusicRepository) {
      this._sheetMusicRepository = new SheetMusicRepository(this._prisma)
    }
    return this._sheetMusicRepository
  }

  /**
   * 새로운 트랜잭션용 Factory 인스턴스 생성
   */
  createTransactional(tx: PrismaClient): PrismaRepositoryFactory {
    return new PrismaRepositoryFactory(tx)
  }
}

/**
 * Unit of Work 구현
 * 트랜잭션 관리 및 여러 Repository 작업 조율
 */
export class PrismaUnitOfWork implements IUnitOfWork {
  private _prisma: PrismaClient
  private _factory: PrismaRepositoryFactory
  private _isInTransaction = false

  constructor(prismaInstance?: PrismaClient) {
    this._prisma = prismaInstance || prisma
    this._factory = new PrismaRepositoryFactory(this._prisma)
  }

  get categoryRepository(): ICategoryRepository {
    return this._factory.categoryRepository()
  }

  get sheetMusicRepository(): ISheetMusicRepository {
    return this._factory.sheetMusicRepository()
  }

  async beginTransaction(): Promise<void> {
    if (this._isInTransaction) {
      throw new Error('Transaction already started')
    }
    this._isInTransaction = true
  }

  async commit(): Promise<void> {
    if (!this._isInTransaction) {
      throw new Error('No transaction to commit')
    }
    this._isInTransaction = false
  }

  async rollback(): Promise<void> {
    if (!this._isInTransaction) {
      throw new Error('No transaction to rollback')
    }
    this._isInTransaction = false
  }

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return await this._prisma.$transaction(async (tx) => {
      // 트랜잭션 스코프에서 새로운 Factory 인스턴스 생성
      const transactionalFactory = this._factory.createTransactional(tx as PrismaClient)
      
      // 임시로 현재 factory를 교체
      const originalFactory = this._factory
      this._factory = transactionalFactory
      
      try {
        this._isInTransaction = true
        const result = await operation()
        this._isInTransaction = false
        return result
      } catch (error) {
        this._isInTransaction = false
        throw error
      } finally {
        // 원래 factory 복원
        this._factory = originalFactory
      }
    })
  }

  getRepository<T extends keyof IUnitOfWork>(
    repositoryName: T
  ): IUnitOfWork[T] extends ICategoryRepository | ISheetMusicRepository 
    ? IUnitOfWork[T] 
    : never {
    switch (repositoryName) {
      case 'categoryRepository':
        return this.categoryRepository as any
      case 'sheetMusicRepository':
        return this.sheetMusicRepository as any
      default:
        throw new Error(`Unknown repository: ${String(repositoryName)}`)
    }
  }
}

/**
 * 싱글톤 Repository Factory 인스턴스
 */
let _factoryInstance: PrismaRepositoryFactory | null = null
let _unitOfWorkInstance: PrismaUnitOfWork | null = null

export function getRepositoryFactory(): PrismaRepositoryFactory {
  if (!_factoryInstance) {
    _factoryInstance = new PrismaRepositoryFactory()
  }
  return _factoryInstance
}

export function getUnitOfWork(): PrismaUnitOfWork {
  if (!_unitOfWorkInstance) {
    _unitOfWorkInstance = new PrismaUnitOfWork()
  }
  return _unitOfWorkInstance
}

/**
 * 테스트용 Repository Factory 생성
 */
export function createTestRepositoryFactory(mockPrisma: PrismaClient): PrismaRepositoryFactory {
  return new PrismaRepositoryFactory(mockPrisma)
}

/**
 * 개별 Repository 인스턴스 생성 헬퍼
 */
export function createCategoryRepository(prismaInstance?: PrismaClient): ICategoryRepository {
  return new CategoryRepository(prismaInstance || prisma)
}

export function createSheetMusicRepository(prismaInstance?: PrismaClient): ISheetMusicRepository {
  return new SheetMusicRepository(prismaInstance || prisma)
}