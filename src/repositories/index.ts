/**
 * Repository 계층 통합 export
 * Repository 패턴과 의존성 주입을 위한 진입점
 */

// 인터페이스
export * from './interfaces'

// Repository 구현체
export { CategoryRepository } from './CategoryRepository'
export { SheetMusicRepository } from './SheetMusicRepository'

// Factory 및 Unit of Work
export { 
  PrismaRepositoryFactory,
  PrismaUnitOfWork,
  getRepositoryFactory,
  getUnitOfWork,
  createTestRepositoryFactory,
  createCategoryRepository,
  createSheetMusicRepository
} from './RepositoryFactory'

// 리팩터링된 서비스들
export { 
  CategoryServiceRefactored,
  type ICategoryService 
} from '../services/CategoryServiceRefactored'
export { 
  SheetMusicServiceRefactored,
  type ISheetMusicService 
} from '../services/SheetMusicServiceRefactored'