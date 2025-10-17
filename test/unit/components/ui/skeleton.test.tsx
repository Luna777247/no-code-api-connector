import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton Component', () => {
  it('renders with default classes', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md')
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton" />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveClass('bg-accent', 'animate-pulse', 'rounded-md', 'custom-skeleton')
  })

  it('passes through additional props', () => {
    render(<Skeleton data-testid="custom-skeleton" aria-label="Loading content" />)

    const skeleton = screen.getByTestId('custom-skeleton')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
  })

  it('renders as different HTML element when asChild is used', () => {
    // Note: This component doesn't have asChild, but testing standard div behavior
    render(<Skeleton />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton?.tagName).toBe('DIV')
  })

  it('supports different sizes with className', () => {
    render(<Skeleton className="h-4 w-32" />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveClass('h-4', 'w-32')
  })

  it('maintains animation when custom classes are applied', () => {
    render(<Skeleton className="h-8 w-full" />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('renders multiple skeletons', () => {
    render(
      <div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>
    )

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons).toHaveLength(3)
    expect(skeletons[0]).toHaveClass('h-4', 'w-20')
    expect(skeletons[1]).toHaveClass('h-4', 'w-32')
    expect(skeletons[2]).toHaveClass('h-8', 'w-full')
  })

  it('supports accessibility attributes', () => {
    render(<Skeleton role="presentation" aria-hidden="true" />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveAttribute('role', 'presentation')
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders with custom styling', () => {
    render(<Skeleton style={{ width: '100px', height: '20px' }} />)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveStyle({ width: '100px', height: '20px' })
  })

  it('handles children content', () => {
    render(<Skeleton>Should render</Skeleton>)

    const skeleton = document.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveTextContent('Should render')
  })
})