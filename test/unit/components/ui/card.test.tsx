import React from 'react'
import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter
} from '@/components/ui/card'

describe('Card', () => {
  it('should render with default props', () => {
    render(<Card>Card content</Card>)

    const card = screen.getByText('Card content')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('bg-card', 'text-card-foreground', 'flex', 'flex-col', 'gap-6', 'rounded-xl', 'border', 'py-6', 'shadow-sm')
  })

  it('should apply custom className', () => {
    render(<Card className="custom-card">Content</Card>)

    const card = screen.getByText('Content')
    expect(card).toHaveClass('custom-card')
  })

  it('should pass through other props', () => {
    render(<Card data-testid="custom-card">Content</Card>)

    const card = screen.getByTestId('custom-card')
    expect(card).toBeInTheDocument()
  })

  it('should render CardHeader', () => {
    render(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>
    )

    const header = screen.getByText('Header content')
    expect(header).toHaveClass('@container/card-header', 'grid', 'auto-rows-min', 'grid-rows-[auto_auto]', 'items-start', 'gap-1.5', 'px-6')
  })

  it('should render CardTitle', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
      </Card>
    )

    const title = screen.getByText('Card Title')
    expect(title).toHaveClass('leading-none', 'font-semibold')
  })

  it('should render CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
      </Card>
    )

    const description = screen.getByText('Card description')
    expect(description).toHaveClass('text-muted-foreground', 'text-sm')
  })

  it('should render CardAction', () => {
    render(
      <Card>
        <CardHeader>
          <CardAction>Action button</CardAction>
        </CardHeader>
      </Card>
    )

    const action = screen.getByText('Action button')
    expect(action).toHaveClass('col-start-2', 'row-span-2', 'row-start-1', 'self-start', 'justify-self-end')
  })

  it('should render CardContent', () => {
    render(
      <Card>
        <CardContent>Main content</CardContent>
      </Card>
    )

    const content = screen.getByText('Main content')
    expect(content).toHaveClass('px-6')
  })

  it('should render CardFooter', () => {
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    )

    const footer = screen.getByText('Footer content')
    expect(footer).toHaveClass('flex', 'items-center', 'px-6')
  })

  it('should render complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>A test card component</CardDescription>
          <CardAction>Edit</CardAction>
        </CardHeader>
        <CardContent>
          <p>This is the main content of the card.</p>
        </CardContent>
        <CardFooter>
          <button>Save</button>
          <button>Cancel</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('A test card component')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should support custom className on sub-components', () => {
    render(
      <Card>
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Title</CardTitle>
        </CardHeader>
        <CardContent className="custom-content">Content</CardContent>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Title')).toHaveClass('custom-title')
    expect(screen.getByText('Content')).toHaveClass('custom-content')
    expect(screen.getByText('Footer')).toHaveClass('custom-footer')
  })

  it('should handle empty content gracefully', () => {
    render(<Card />)

    // Card should still render even with no content
    const card = document.querySelector('[data-slot="card"]')
    expect(card).toBeInTheDocument()
  })

  it('should support nested components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>
          <Card>
            <CardContent>Nested card content</CardContent>
          </Card>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Nested card content')).toBeInTheDocument()
  })
})