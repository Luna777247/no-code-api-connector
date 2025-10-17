import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table'

describe('Table', () => {
  it('should render table with basic structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should render table with caption', () => {
    render(
      <Table>
        <TableCaption>User Information Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('User Information Table')).toBeInTheDocument()
    expect(screen.getByRole('caption')).toBeInTheDocument()
  })

  it('should render table with footer', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Widget</TableCell>
            <TableCell>$10.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$10.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getAllByText('$10.00')).toHaveLength(2)
  })

  it('should apply custom className to table', () => {
    render(
      <Table className="custom-table-class">
        <TableBody>
          <TableRow>
            <TableCell>Test</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toHaveClass('custom-table-class')
  })

  it('should apply custom className to table head', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="custom-head-class">Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    const head = screen.getByRole('columnheader')
    expect(head).toHaveClass('custom-head-class')
  })

  it('should apply custom className to table cell', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="custom-cell-class">Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const cell = screen.getByRole('cell')
    expect(cell).toHaveClass('custom-cell-class')
  })

  it('should render multiple rows', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Row 1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Row 2</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Row 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('Row 1')).toBeInTheDocument()
    expect(screen.getByText('Row 2')).toBeInTheDocument()
    expect(screen.getByText('Row 3')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4) // header + 3 data rows
  })

  it('should render table with complex data structure', () => {
    const data = [
      { id: 1, name: 'Alice', role: 'Developer', status: 'Active' },
      { id: 2, name: 'Bob', role: 'Designer', status: 'Inactive' },
    ]

    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.role}</TableCell>
              <TableCell>{item.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
    expect(screen.getByText('Designer')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('should pass through additional props', () => {
    render(
      <Table data-testid="custom-table" aria-label="Test table">
        <TableBody>
          <TableRow>
            <TableCell>Test</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('data-testid', 'custom-table')
    expect(table).toHaveAttribute('aria-label', 'Test table')
  })

  it('should render empty table body', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Empty body */}
        </TableBody>
      </Table>
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByRole('cell')).not.toBeInTheDocument()
  })
})