import { render, screen, fireEvent } from '@testing-library/react'
import Button from '@/components/ui/Button'

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Test Button</Button>)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  test('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)
    
    fireEvent.click(screen.getByText('Click Me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('applies variant styles correctly', () => {
    const { rerender } = render(<Button variant="outline">Outline Button</Button>)
    let button = screen.getByText('Outline Button')
    expect(button).toHaveClass('border-gray-300', 'text-gray-700')

    rerender(<Button variant="secondary">Secondary Button</Button>)
    button = screen.getByText('Secondary Button')
    expect(button).toHaveClass('bg-gray-100', 'text-gray-700')

    rerender(<Button variant="danger">Danger Button</Button>)
    button = screen.getByText('Danger Button')
    expect(button).toHaveClass('bg-red-500', 'text-white')
  })

  test('applies size styles correctly', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>)
    let button = screen.getByText('Small Button')
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')

    rerender(<Button size="lg">Large Button</Button>)
    button = screen.getByText('Large Button')
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg')
  })

  test('can be disabled', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByText('Disabled Button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  test('shows loading state', () => {
    render(<Button loading>Loading Button</Button>)
    const button = screen.getByText('Loading Button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-75', 'cursor-wait')
  })

  test('accepts custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    const button = screen.getByText('Custom Button')
    expect(button).toHaveClass('custom-class')
  })

  test('renders as different HTML element when "as" prop is provided', () => {
    render(<Button as="a" href="/test">Link Button</Button>)
    const link = screen.getByText('Link Button')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/test')
  })
})