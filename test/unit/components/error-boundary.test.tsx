import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'

// Component that throws an error
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Component that can be reset after retry
const ResettableErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  const [throwError, setThrowError] = React.useState(shouldThrow)

  React.useEffect(() => {
    setThrowError(shouldThrow)
  }, [shouldThrow])

  if (throwError) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Component that throws an error in event handler
const EventErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false)

  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Event handler error')
    }
  }, [shouldThrow])

  return (
    <button onClick={() => setShouldThrow(true)}>
      Trigger error
    </button>
  )
}

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalConsoleError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalConsoleError
  })

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('should catch and display error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('should show error details in development mode', () => {
    render(
      <ErrorBoundary isDevelopment={true}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check for the summary text in the details element
    const errorDetails = screen.getByText('Error details')
    expect(errorDetails).toBeInTheDocument()
    expect(errorDetails.tagName).toBe('SUMMARY')

    // Check for the error message in the pre element
    expect(screen.getByText('Error: Test error')).toBeInTheDocument()
  })

  it('should not show error details in production mode', () => {
    // Mock process.env.NODE_ENV
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true
    })

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Error details')).not.toBeInTheDocument()
    expect(screen.queryByText('Test error')).not.toBeInTheDocument()

    // Restore original value
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    })
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should retry and recover from error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ResettableErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click retry button - this resets the error boundary state
    const retryButton = screen.getByText('Try again')
    fireEvent.click(retryButton)

    // After retry, the error boundary should re-render children
    // Since the component is resettable, it should now show normal content
    rerender(
      <ErrorBoundary>
        <ResettableErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should handle errors in event handlers', () => {
    render(
      <ErrorBoundary>
        <EventErrorComponent />
      </ErrorBoundary>
    )

    const button = screen.getByText('Trigger error')
    fireEvent.click(button)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('First child')).not.toBeInTheDocument()
    expect(screen.queryByText('Second child')).not.toBeInTheDocument()
  })

  it('should handle nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <div>Outer content</div>
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    )

    // Inner error boundary should catch the error and show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // Outer content should still be shown since outer boundary didn't catch the error
    expect(screen.getByText('Outer content')).toBeInTheDocument()
  })

  it('should handle async errors', async () => {
    const AsyncErrorComponent = () => {
      const [error, setError] = React.useState(false)

      React.useEffect(() => {
        const timer = setTimeout(() => setError(true), 100)
        return () => clearTimeout(timer)
      }, [])

      if (error) {
        throw new Error('Async error')
      }

      return <div>Loading...</div>
    }

    render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for async error
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should maintain error state across re-renders', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Re-render with same error
    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should reset error state when children change', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Re-render with different children
    rerender(
      <ErrorBoundary>
        <div>New content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('New content')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})