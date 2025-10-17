import React from 'react'
import { render } from '@testing-library/react'
import { screen, fireEvent } from '@testing-library/dom'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('should render with default props', () => {
    render(<Input />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    // Default type is text, but attribute might not be explicitly set
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should render with custom placeholder', () => {
    render(<Input placeholder="Enter your name" />)

    const input = screen.getByPlaceholderText('Enter your name')
    expect(input).toBeInTheDocument()
  })

  it('should support different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number')
  })

  it('should handle value changes', () => {
    render(<Input />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Hello World' } })

    expect(input).toHaveValue('Hello World')
  })

  it('should support controlled value', () => {
    const { rerender } = render(<Input value="initial" />)

    expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

    rerender(<Input value="updated" />)
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
  })

  it('should support disabled state', () => {
    render(<Input disabled />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:pointer-events-none', 'disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should support readonly state', () => {
    render(<Input readOnly value="readonly value" />)

    const input = screen.getByDisplayValue('readonly value')
    expect(input).toHaveAttribute('readonly')
  })

  it('should apply custom className', () => {
    render(<Input className="custom-input" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })

  it('should pass through other props', () => {
    render(<Input data-testid="custom-input" maxLength={10} />)

    const input = screen.getByTestId('custom-input')
    expect(input).toHaveAttribute('maxlength', '10')
  })

  it('should handle focus and blur events', () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()

    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)

    const input = screen.getByRole('textbox')

    // Use native focus/blur methods
    input.focus()
    expect(handleFocus).toHaveBeenCalledTimes(1)

    input.blur()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should support aria attributes', () => {
    render(<Input aria-label="Custom input" aria-describedby="helper-text" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-label', 'Custom input')
    expect(input).toHaveAttribute('aria-describedby', 'helper-text')
  })

  it('should support form validation attributes', () => {
    render(<Input required minLength={3} pattern="[A-Za-z]+" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('minlength', '3')
    expect(input).toHaveAttribute('pattern', '[A-Za-z]+')
  })

  it('should be focusable', () => {
    render(<Input />)

    const input = screen.getByRole('textbox')
    input.focus()
    expect(input).toHaveFocus()
  })

  it('should handle keyboard events', () => {
    const handleKeyDown = jest.fn()
    const handleKeyUp = jest.fn()

    render(<Input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />)

    const input = screen.getByRole('textbox')

    fireEvent.keyDown(input, { key: 'A' })
    expect(handleKeyDown).toHaveBeenCalledTimes(1)

    fireEvent.keyUp(input, { key: 'A' })
    expect(handleKeyUp).toHaveBeenCalledTimes(1)
  })
})