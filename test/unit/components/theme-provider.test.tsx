import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('ThemeProvider', () => {
  it('should render children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Test Child</div>
      </ThemeProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should pass through props to NextThemesProvider', () => {
    const mockAttribute = 'data-theme'
    const mockDefaultTheme = 'light'
    const mockStorageKey = 'custom-theme'

    render(
      <ThemeProvider
        attribute={mockAttribute}
        defaultTheme={mockDefaultTheme}
        storageKey={mockStorageKey}
      >
        <div data-testid="child">Test Child</div>
      </ThemeProvider>
    )

    // The component should render without errors with custom props
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <span data-testid="child3">Child 3</span>
      </ThemeProvider>
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
    expect(screen.getByTestId('child3')).toBeInTheDocument()
  })

  it('should render with default props', () => {
    render(
      <ThemeProvider>
        <p>Default theme provider test</p>
      </ThemeProvider>
    )

    expect(screen.getByText('Default theme provider test')).toBeInTheDocument()
  })
})