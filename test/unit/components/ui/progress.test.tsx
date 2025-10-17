import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Progress } from '@/components/ui/progress'

describe('Progress Component', () => {
  it('renders with default classes', () => {
    render(<Progress />)

    const progress = document.querySelector('[data-slot="progress"]')
    expect(progress).toBeInTheDocument()
    expect(progress).toHaveClass('bg-primary/20', 'relative', 'h-2', 'w-full', 'overflow-hidden', 'rounded-full')
  })

  it('applies custom className', () => {
    render(<Progress className="custom-progress" />)

    const progress = document.querySelector('[data-slot="progress"]')
    expect(progress).toHaveClass('custom-progress')
  })

  it('renders progress indicator', () => {
    render(<Progress value={50} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveClass('bg-primary', 'h-full', 'w-full', 'flex-1', 'transition-all')
  })

  it('sets correct transform for progress value', () => {
    render(<Progress value={75} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' })
  })

  it('handles zero value', () => {
    render(<Progress value={0} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('handles full value', () => {
    render(<Progress value={100} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(0%)' })
  })

  it('handles undefined value', () => {
    render(<Progress />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('handles negative values', () => {
    render(<Progress value={-10} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('handles values over 100', () => {
    render(<Progress value={150} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(0%)' })
  })

  it('passes through additional props', () => {
    render(<Progress data-testid="custom-progress" aria-label="Upload progress" />)

    const progress = screen.getByTestId('custom-progress')
    expect(progress).toHaveAttribute('aria-label', 'Upload progress')
  })

  it('supports accessibility attributes', () => {
    render(<Progress value={50} aria-valuenow={50} aria-valuemin={0} aria-valuemax={100} />)

    const progress = document.querySelector('[data-slot="progress"]')
    expect(progress).toHaveAttribute('aria-valuenow', '50')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders with custom styling', () => {
    render(<Progress style={{ width: '200px', height: '8px' }} />)

    const progress = document.querySelector('[data-slot="progress"]')
    expect(progress).toHaveStyle({ width: '200px', height: '8px' })
  })

  it('maintains aspect ratio with custom height', () => {
    render(<Progress className="h-4" value={60} />)

    const progress = document.querySelector('[data-slot="progress"]')
    const indicator = document.querySelector('[data-slot="progress-indicator"]')

    expect(progress).toHaveClass('h-4')
    expect(indicator).toHaveClass('h-full')
    expect(indicator).toHaveStyle({ transform: 'translateX(-40%)' })
  })

  it('handles decimal values', () => {
    render(<Progress value={33.5} />)

    const indicator = document.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-66.5%)' })
  })

  it('renders multiple progress bars', () => {
    render(
      <div>
        <Progress value={25} className="mb-2" />
        <Progress value={50} className="mb-2" />
        <Progress value={75} />
      </div>
    )

    const progresses = document.querySelectorAll('[data-slot="progress"]')
    const indicators = document.querySelectorAll('[data-slot="progress-indicator"]')

    expect(progresses).toHaveLength(3)
    expect(indicators).toHaveLength(3)
    expect(indicators[0]).toHaveStyle({ transform: 'translateX(-75%)' })
    expect(indicators[1]).toHaveStyle({ transform: 'translateX(-50%)' })
    expect(indicators[2]).toHaveStyle({ transform: 'translateX(-25%)' })
  })
})