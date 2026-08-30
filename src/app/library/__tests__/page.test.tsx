import { render, screen } from '@testing-library/react'
import LibraryPage from '../page'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user-1' } },
    status: 'authenticated',
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/library/LibrarySheetMusicList', () => ({
  LibrarySheetMusicList: () => <div data-testid="library-list" />,
}))

describe('Library page controls', () => {
  it('uses rounded control surfaces for search and sorting', () => {
    render(<LibraryPage />)

    expect(screen.getByPlaceholderText('곡명, 저작자로 검색...')).toHaveClass('rounded-2xl')
    expect(screen.getByRole('combobox')).toHaveClass('rounded-full')
  })
})
