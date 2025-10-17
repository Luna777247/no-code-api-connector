import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Default')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'justify-center', 'rounded-md', 'border', 'px-2', 'py-0.5', 'text-xs', 'font-medium', 'w-fit', 'whitespace-nowrap', 'shrink-0')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('border-transparent', 'bg-secondary', 'text-secondary-foreground')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('border-transparent', 'bg-destructive', 'text-white')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('text-foreground')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('custom-badge')
  })

  it('passes through additional props', () => {
    render(<Badge data-testid="custom-badge" title="Badge title">Test</Badge>)

    const badge = screen.getByTestId('custom-badge')
    expect(badge).toHaveAttribute('title', 'Badge title')
  })

  it('renders as span by default', () => {
    render(<Badge>Default</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge?.tagName).toBe('SPAN')
  })

  it('renders as different element when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>
    )

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge?.tagName).toBe('A')
    expect(badge).toHaveAttribute('href', '/test')
    expect(badge).toHaveTextContent('Link Badge')
  })

  it('supports accessibility attributes', () => {
    render(<Badge aria-label="Status badge">Active</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveAttribute('aria-label', 'Status badge')
  })

  it('renders with icons', () => {
    render(
      <Badge>
        <svg data-testid="badge-icon" />
        With Icon
      </Badge>
    )

    const icon = screen.getByTestId('badge-icon')
    expect(icon).toBeInTheDocument()
    // The size-3 class is applied via CSS selector [&>svg]:size-3
    expect(icon).toHaveAttribute('data-testid', 'badge-icon')
  })

  it('handles empty content', () => {
    render(<Badge />)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
    expect(badge).toBeEmptyDOMElement()
  })

  it('renders with long text', () => {
    const longText = 'This is a very long badge text that should still work properly'
    render(<Badge>{longText}</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveTextContent(longText)
    expect(badge).toHaveClass('whitespace-nowrap')
  })

  it('maintains focus styles', () => {
    render(<Badge>Focusable</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-ring/50', 'focus-visible:ring-[3px]')
  })

  it('supports different sizes through className', () => {
    render(<Badge className="px-3 py-1 text-sm">Large</Badge>)

    const badge = document.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('px-3', 'py-1', 'text-sm')
  })

  it('renders multiple badges', () => {
    render(
      <div>
        <Badge variant="default">First</Badge>
        <Badge variant="secondary">Second</Badge>
        <Badge variant="destructive">Third</Badge>
      </div>
    )

    const badges = document.querySelectorAll('[data-slot="badge"]')
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveTextContent('First')
    expect(badges[1]).toHaveTextContent('Second')
    expect(badges[2]).toHaveTextContent('Third')
  })

  it('badgeVariants function returns correct classes', () => {
    expect(badgeVariants()).toContain('inline-flex')
    expect(badgeVariants({ variant: 'secondary' })).toContain('bg-secondary')
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-destructive')
    expect(badgeVariants({ variant: 'outline' })).toContain('text-foreground')
  })
})