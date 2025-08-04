// Database type exports for use throughout the application
import type {
  User,
  Account,
  Session,
  VerificationToken,
  Category,
  SheetMusic,
  PracticeSession,
} from '@prisma/client'

export type {
  User,
  Account,
  Session,
  VerificationToken,
  Category,
  SheetMusic,
  PracticeSession,
}

// Useful type combinations
export type UserWithCategories = User & {
  categories: Category[]
}

export type SheetMusicWithCategory = SheetMusic & {
  category: Category | null
  user: User
}

export type CategoryWithSheetMusic = Category & {
  sheetMusic: SheetMusic[]
}

export type PracticeSessionWithDetails = PracticeSession & {
  user: User
  sheetMusic: SheetMusic
}