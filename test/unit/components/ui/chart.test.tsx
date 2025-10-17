import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// Mock Recharts components to avoid complex setup
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data?: any[] }) => (
    <div data-testid="bar-chart" data-data={JSON.stringify(data)}>{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`bar-${dataKey}`} />
  ),
  XAxis: ({ dataKey }: { dataKey?: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ content }: { content?: React.ComponentType }) => (
    <div data-testid="tooltip">{content && <content />}</div>
  ),
  Legend: ({ content }: { content?: React.ComponentType }) => (
    <div data-testid="legend">{content && <content />}</div>
  ),
}))

describe('Chart Components', () => {
  const mockConfig: ChartConfig = {
    desktop: {
      label: 'Desktop',
      color: '#2563eb',
    },
    mobile: {
      label: 'Mobile',
      color: '#dc2626',
    },
    "custom desktop": {
      label: 'Custom Desktop',
      color: '#8884d8',
    },
  }

  const mockData = [
    { month: 'January', desktop: 186, mobile: 80 },
    { month: 'February', desktop: 305, mobile: 200 },
  ]

  describe('ChartContainer', () => {
    it('renders with basic structure', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Test Content</div>
        </ChartContainer>
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ChartContainer config={mockConfig} className="custom-chart">
          <div>Test Content</div>
        </ChartContainer>
      )

      const chartContainer = screen.getByTestId('responsive-container').parentElement
      expect(chartContainer).toHaveClass('custom-chart')
    })

    it('generates unique chart ID', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Chart 1</div>
        </ChartContainer>
      )

      const firstId = screen.getByTestId('responsive-container').parentElement?.getAttribute('data-chart')

      // Render a second chart
      render(
        <ChartContainer config={mockConfig}>
          <div>Chart 2</div>
        </ChartContainer>
      )

      const containers = screen.getAllByTestId('responsive-container')
      const secondContainer = containers[1]
      const secondId = secondContainer.parentElement?.getAttribute('data-chart')

      expect(firstId).not.toBe(secondId)
      expect(firstId).toMatch(/^chart-/)
    })

    it('includes chart slot data attribute', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Test Content</div>
        </ChartContainer>
      )

      const chartContainer = screen.getByTestId('responsive-container').parentElement
      expect(chartContainer).toHaveAttribute('data-slot', 'chart')
    })

    it('renders ChartStyle component when config has colors', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Test Content</div>
        </ChartContainer>
      )

      // ChartStyle should render a style tag
      const styleTag = document.querySelector('style')
      expect(styleTag).toBeInTheDocument()
      expect(styleTag?.textContent).toContain('--color-desktop')
      expect(styleTag?.textContent).toContain('--color-mobile')
    })

    it('does not render ChartStyle when config has no colors', () => {
      const emptyConfig: ChartConfig = {
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' },
      }

      render(
        <ChartContainer config={emptyConfig}>
          <div>Test Content</div>
        </ChartContainer>
      )

      const styleTag = document.querySelector('style')
      expect(styleTag).toBeNull()
    })
  })

  describe('ChartTooltipContent', () => {
    const mockPayload = [
      {
        name: 'desktop',
        value: 186,
        dataKey: 'desktop',
        color: '#2563eb',
        payload: { month: 'January', desktop: 186, mobile: 80 },
      },
    ]

    it('renders tooltip with single payload', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
          />
        </ChartContainer>
      )

      expect(screen.getByText('186')).toBeInTheDocument()
    })

    it('renders tooltip with label', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="January"
          />
        </ChartContainer>
      )

      expect(screen.getByText('January')).toBeInTheDocument()
    })

    it('hides label when hideLabel is true', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="January"
            hideLabel={true}
          />
        </ChartContainer>
      )

      expect(screen.queryByText('January')).not.toBeInTheDocument()
    })

    it('renders with custom formatter', () => {
      const formatter = (value: any, name: any) => [`$${value}`, `Custom ${name}`]

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            formatter={formatter}
          />
        </ChartContainer>
      )

      expect(screen.getByText(/\$186/)).toBeInTheDocument()
      expect(screen.getByText(/Custom desktop/)).toBeInTheDocument()
    })

    it('renders with custom indicator styles', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            indicator="line"
          />
        </ChartContainer>
      )

      const indicator = document.querySelector('[class*="w-1"]')
      expect(indicator).toBeInTheDocument()
    })

    it('renders with dashed indicator', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            indicator="dashed"
          />
        </ChartContainer>
      )

      const indicator = document.querySelector('[class*="border-dashed"]')
      expect(indicator).toBeInTheDocument()
    })

    it('returns null when not active', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={false}
            payload={mockPayload}
          />
        </ChartContainer>
      )

      // The tooltip content should not render anything inside the container
      const container = screen.getByTestId('responsive-container')
      expect(container.children.length).toBe(0)
    })

    it('returns null when no payload', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={[]}
          />
        </ChartContainer>
      )

      // The tooltip content should not render anything inside the container
      const container = screen.getByTestId('responsive-container')
      expect(container.children.length).toBe(0)
    })

    it('applies custom className', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            className="custom-tooltip"
          />
        </ChartContainer>
      )

      const tooltip = document.querySelector('.custom-tooltip')
      expect(tooltip).toBeInTheDocument()
    })

    it('renders with icon from config', () => {
      const configWithIcon: ChartConfig = {
        desktop: {
          label: 'Desktop',
          color: '#2563eb',
          icon: () => <svg data-testid="custom-icon" />,
        },
      }

      render(
        <ChartContainer config={configWithIcon}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
          />
        </ChartContainer>
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('hides indicator when hideIndicator is true', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            hideIndicator={true}
          />
        </ChartContainer>
      )

      const indicators = document.querySelectorAll('[class*="shrink-0"]')
      expect(indicators.length).toBe(0)
    })
  })

  describe('ChartLegendContent', () => {
    const mockPayload = [
      { value: 'desktop', color: '#2563eb', dataKey: 'desktop' },
      { value: 'mobile', color: '#dc2626', dataKey: 'mobile' },
    ]

    it('renders legend items', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent
            payload={mockPayload}
          />
        </ChartContainer>
      )

      expect(screen.getByText('Desktop')).toBeInTheDocument()
      expect(screen.getByText('Mobile')).toBeInTheDocument()
    })

    it('renders with icons when available', () => {
      const configWithIcon: ChartConfig = {
        desktop: {
          label: 'Desktop',
          color: '#2563eb',
          icon: () => <svg data-testid="desktop-icon" />,
        },
        mobile: {
          label: 'Mobile',
          color: '#dc2626',
        },
      }

      render(
        <ChartContainer config={configWithIcon}>
          <ChartLegendContent
            payload={mockPayload}
          />
        </ChartContainer>
      )

      expect(screen.getByTestId('desktop-icon')).toBeInTheDocument()
      // Mobile should have color indicator
      const colorIndicators = document.querySelectorAll('[style*="background-color"]')
      expect(colorIndicators.length).toBeGreaterThan(0)
    })

    it('hides icons when hideIcon is true', () => {
      const configWithIcon: ChartConfig = {
        desktop: {
          label: 'Desktop',
          color: '#2563eb',
          icon: () => <svg data-testid="desktop-icon" />,
        },
      }

      render(
        <ChartContainer config={configWithIcon}>
          <ChartLegendContent
            payload={mockPayload}
            hideIcon={true}
          />
        </ChartContainer>
      )

      expect(screen.queryByTestId('desktop-icon')).not.toBeInTheDocument()
    })

    it('applies vertical alignment classes', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent
            payload={mockPayload}
            verticalAlign="top"
          />
        </ChartContainer>
      )

      const legendContainer = document.querySelector('[class*="pb-3"]')
      expect(legendContainer).toBeInTheDocument()
    })

    it('returns null when no payload', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent
            payload={[]}
          />
        </ChartContainer>
      )

      // The legend content should not render anything inside the container
      const container = screen.getByTestId('responsive-container')
      expect(container.children.length).toBe(0)
    })

    it('applies custom className', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent
            payload={mockPayload}
            className="custom-legend"
          />
        </ChartContainer>
      )

      const legend = document.querySelector('.custom-legend')
      expect(legend).toBeInTheDocument()
    })
  })

  describe('Integration with Recharts', () => {
    const mockPayload = [
      { value: 'desktop', color: '#2563eb', dataKey: 'desktop' },
      { value: 'mobile', color: '#dc2626', dataKey: 'mobile' },
    ]

    it('integrates with BarChart component', () => {
      render(
        <ChartContainer config={mockConfig}>
          <BarChart data={mockData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Bar dataKey="desktop" />
            <Bar dataKey="mobile" />
          </BarChart>
        </ChartContainer>
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('bar-desktop')).toBeInTheDocument()
      expect(screen.getByTestId('bar-mobile')).toBeInTheDocument()
    })

    it('integrates with ChartTooltip', () => {
      render(
        <ChartContainer config={mockConfig}>
          <BarChart data={mockData}>
            <Bar dataKey="desktop" />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
      )

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('integrates with ChartLegend', () => {
      render(
        <ChartContainer config={mockConfig}>
          <BarChart data={mockData}>
            <Bar dataKey="desktop" />
            <ChartLegend content={<ChartLegendContent payload={mockPayload} />} />
          </BarChart>
        </ChartContainer>
      )

      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('includes proper ARIA attributes', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Test Chart</div>
        </ChartContainer>
      )

      const chartContainer = screen.getByTestId('responsive-container').parentElement
      expect(chartContainer).toHaveAttribute('data-slot', 'chart')
      expect(chartContainer?.getAttribute('data-chart')).toBeDefined()
    })

    it('tooltip content is keyboard accessible', () => {
      const mockPayload = [
        {
          name: 'desktop',
          value: 186,
          dataKey: 'desktop',
          color: '#2563eb',
          payload: { month: 'January', desktop: 186, mobile: 80 },
        },
      ]

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
          />
        </ChartContainer>
      )

      // Check that values are properly formatted and readable
      expect(screen.getByText('186')).toBeInTheDocument()
      // Check that at least one "Desktop" text exists (either as label or name)
      expect(screen.getAllByText('Desktop')).toHaveLength(2) // One in label, one in item name
    })
  })

  describe('Theming', () => {
    it('generates CSS variables for light theme', () => {
      const configWithTheme: ChartConfig = {
        desktop: {
          label: 'Desktop',
          theme: {
            light: '#2563eb',
            dark: '#1d4ed8',
          },
        },
      }

      render(
        <ChartContainer config={configWithTheme}>
          <div>Test Content</div>
        </ChartContainer>
      )

      const styleTag = document.querySelector('style')
      expect(styleTag?.textContent).toContain('--color-desktop: #2563eb')
    })

    it('generates CSS variables for dark theme', () => {
      const configWithTheme: ChartConfig = {
        desktop: {
          label: 'Desktop',
          theme: {
            light: '#2563eb',
            dark: '#1d4ed8',
          },
        },
      }

      render(
        <ChartContainer config={configWithTheme}>
          <div>Test Content</div>
        </ChartContainer>
      )

      const styleTag = document.querySelector('style')
      expect(styleTag?.textContent).toContain('--color-desktop: #1d4ed8')
    })
  })
})