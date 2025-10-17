import React from 'react'
import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import { ApiConfigStep } from '@/components/wizard/api-config-step'

const mockData = {
  name: 'Test API',
  description: 'A test API connection',
  baseUrl: 'https://api.example.com/v1/users',
  method: 'GET',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer token123' }
  ],
  authType: 'bearer',
  authConfig: { token: 'test-token' }
}

const mockOnChange = jest.fn()

describe('ApiConfigStep', () => {
  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should render with initial data', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    expect(screen.getByDisplayValue('Test API')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test API connection')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://api.example.com/v1/users')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
  })

  it('should update name field', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const nameInput = screen.getByDisplayValue('Test API')
    fireEvent.change(nameInput, { target: { value: 'Updated API Name' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      name: 'Updated API Name'
    })
  })

  it('should update description field', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const descriptionTextarea = screen.getByDisplayValue('A test API connection')
    fireEvent.change(descriptionTextarea, { target: { value: 'Updated description' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      description: 'Updated description'
    })
  })

  it('should update base URL field', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const baseUrlInput = screen.getByDisplayValue('https://api.example.com/v1/users')
    fireEvent.change(baseUrlInput, { target: { value: 'https://api.new.com/v2/data' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      baseUrl: 'https://api.new.com/v2/data'
    })
  })

  it('should update HTTP method', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const methodSelect = screen.getByText('GET')
    fireEvent.click(methodSelect)

    const postOption = screen.getByText('POST')
    fireEvent.click(postOption)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      method: 'POST'
    })
  })

  it('should display existing headers', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument()
    expect(screen.getByDisplayValue('application/json')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bearer token123')).toBeInTheDocument()
  })

  it('should add new header', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const addButton = screen.getByText('Add Header')
    fireEvent.click(addButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      headers: [...mockData.headers, { key: '', value: '' }]
    })
  })

  it('should update header key', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const headerKeyInputs = screen.getAllByPlaceholderText('Header name')
    fireEvent.change(headerKeyInputs[0], { target: { value: 'X-Custom-Header' } })

    const expectedHeaders = [...mockData.headers]
    expectedHeaders[0] = { ...expectedHeaders[0], key: 'X-Custom-Header' }

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      headers: expectedHeaders
    })
  })

  it('should update header value', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const headerValueInputs = screen.getAllByPlaceholderText('Header value')
    fireEvent.change(headerValueInputs[0], { target: { value: 'custom-value' } })

    const expectedHeaders = [...mockData.headers]
    expectedHeaders[0] = { ...expectedHeaders[0], value: 'custom-value' }

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      headers: expectedHeaders
    })
  })

  it('should remove header', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    // Find buttons with Trash2 icon (they don't have accessible names)
    const removeButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg.lucide-trash2')
    )
    fireEvent.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      headers: [mockData.headers[1]]
    })
  })

  it('should show empty headers message when no headers', () => {
    const dataWithoutHeaders = { ...mockData, headers: [] }
    render(<ApiConfigStep data={dataWithoutHeaders} onChange={mockOnChange} />)

    expect(screen.getByText('No headers added yet')).toBeInTheDocument()
  })

  it('should change authentication type', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const authSelect = screen.getByRole('combobox', { name: /authentication type/i })
    fireEvent.click(authSelect)

    const basicOption = screen.getByText('Basic Auth')
    fireEvent.click(basicOption)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      authType: 'basic'
    })
  })

  it('should show bearer token input when auth type is bearer', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    expect(screen.getByDisplayValue('test-token')).toBeInTheDocument()
    expect(screen.getByLabelText('Bearer Token')).toBeInTheDocument()
  })

  it('should update bearer token', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const tokenInput = screen.getByDisplayValue('test-token')
    fireEvent.change(tokenInput, { target: { value: 'new-token-123' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockData,
      authConfig: { token: 'new-token-123' }
    })
  })

  it('should toggle password visibility for bearer token', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    const tokenInput = screen.getByDisplayValue('test-token')
    expect(tokenInput).toHaveAttribute('type', 'password')

    // Find button with Eye icon (it doesn't have accessible name)
    const toggleButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg.lucide-eye')
    )
    fireEvent.click(toggleButton)

    expect(tokenInput).toHaveAttribute('type', 'text')
  })

  it('should show basic auth fields when auth type is basic', () => {
    const basicAuthData = { ...mockData, authType: 'basic', authConfig: { username: 'testuser', password: 'testpass' } }
    render(<ApiConfigStep data={basicAuthData} onChange={mockOnChange} />)

    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    expect(screen.getByDisplayValue('testpass')).toBeInTheDocument()
    expect(screen.getByText('Basic Auth')).toBeInTheDocument()
  })

  it('should update basic auth credentials', () => {
    const basicAuthData = { ...mockData, authType: 'basic', authConfig: {} }
    render(<ApiConfigStep data={basicAuthData} onChange={mockOnChange} />)

    const usernameInput = screen.getByPlaceholderText('Username')
    const passwordInput = screen.getByPlaceholderText('Password')

    fireEvent.change(usernameInput, { target: { value: 'newuser' } })
    fireEvent.change(passwordInput, { target: { value: 'newpass' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...basicAuthData,
      authConfig: { username: 'newuser' }
    })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...basicAuthData,
      authConfig: { password: 'newpass' }
    })
  })

  it('should show API key fields when auth type is api_key', () => {
    const apiKeyData = { ...mockData, authType: 'api_key', authConfig: { keyName: 'X-API-Key', keyValue: 'secret-key' } }
    render(<ApiConfigStep data={apiKeyData} onChange={mockOnChange} />)

    expect(screen.getByDisplayValue('X-API-Key')).toBeInTheDocument()
    expect(screen.getByDisplayValue('secret-key')).toBeInTheDocument()
    expect(screen.getByText('API Key')).toBeInTheDocument()
  })

  it('should update API key fields', () => {
    const apiKeyData = { ...mockData, authType: 'api_key', authConfig: {} }
    render(<ApiConfigStep data={apiKeyData} onChange={mockOnChange} />)

    const keyNameInput = screen.getByPlaceholderText('e.g., X-API-Key')
    const keyValueInput = screen.getByPlaceholderText('Enter your API key')

    fireEvent.change(keyNameInput, { target: { value: 'X-Custom-Key' } })
    fireEvent.change(keyValueInput, { target: { value: 'custom-secret' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...apiKeyData,
      authConfig: { keyName: 'X-Custom-Key' }
    })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...apiKeyData,
      authConfig: { keyValue: 'custom-secret' }
    })
  })

  it('should hide auth fields when auth type is none', () => {
    const noAuthData = { ...mockData, authType: 'none' }
    render(<ApiConfigStep data={noAuthData} onChange={mockOnChange} />)

    expect(screen.queryByDisplayValue('test-token')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Username')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('e.g., X-API-Key')).not.toBeInTheDocument()
  })

  it('should handle empty auth config gracefully', () => {
    const emptyAuthData = { ...mockData, authConfig: {} }
    render(<ApiConfigStep data={emptyAuthData} onChange={mockOnChange} />)

    // Should not crash and should render the component
    expect(screen.getByText('Authentication')).toBeInTheDocument()
  })

  it('should render all form sections', () => {
    render(<ApiConfigStep data={mockData} onChange={mockOnChange} />)

    expect(screen.getByText('Connection Name *')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('API Endpoint')).toBeInTheDocument()
    expect(screen.getByText('Headers')).toBeInTheDocument()
    expect(screen.getByText('Authentication')).toBeInTheDocument()
  })
})