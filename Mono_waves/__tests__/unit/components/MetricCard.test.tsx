import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import MetricCard from '@/components/admin/MetricCard'
import { DollarSign } from 'lucide-react'

describe('MetricCard Component', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '1,234'
  }

  it('should render title and value correctly', () => {
    render(<MetricCard {...defaultProps} />)
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('should render numeric values correctly', () => {
    render(<MetricCard title="Orders" value={42} />)
    
    expect(screen.getByText('Orders')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        icon={<DollarSign data-testid="dollar-icon" />} 
      />
    )
    
    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument()
  })

  it('should render positive trend correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        trend={{ value: 15, direction: 'up' }} 
      />
    )
    
    const trendElement = screen.getByText('+15%')
    expect(trendElement).toBeInTheDocument()
    expect(trendElement).toHaveClass('text-green-600')
  })

  it('should render negative trend correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        trend={{ value: 8, direction: 'down' }} 
      />
    )
    
    const trendElement = screen.getByText('-8%')
    expect(trendElement).toBeInTheDocument()
    expect(trendElement).toHaveClass('text-red-600')
  })

  it('should handle negative trend values correctly', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        trend={{ value: -12, direction: 'down' }} 
      />
    )
    
    // Should display absolute value with direction prefix
    expect(screen.getByText('-12%')).toBeInTheDocument()
  })

  it('should render without trend when not provided', () => {
    render(<MetricCard {...defaultProps} />)
    
    // Should not have any trend elements
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument()
  })

  it('should render with all props combined', () => {
    render(
      <MetricCard 
        title="Revenue Overview"
        value="$142,890"
        icon={<DollarSign data-testid="dollar-icon" />}
        trend={{ value: 12, direction: 'up' }}
        variant="dark"
        className="md:col-span-1"
      />
    )
    
    expect(screen.getByText('Revenue Overview')).toBeInTheDocument()
    expect(screen.getByText('$142,890')).toBeInTheDocument()
    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toBeInTheDocument()
  })

  it('should handle zero trend value', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        trend={{ value: 0, direction: 'up' }} 
      />
    )
    
    expect(screen.getByText('+0%')).toBeInTheDocument()
  })

  it('should handle large numbers in value', () => {
    render(<MetricCard title="Large Value" value="1,234,567.89" />)
    
    expect(screen.getByText('1,234,567.89')).toBeInTheDocument()
  })

  it('should render different variants', () => {
    const { rerender } = render(<MetricCard {...defaultProps} variant="default" />)
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
    
    rerender(<MetricCard {...defaultProps} variant="dark" />)
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
  })
})