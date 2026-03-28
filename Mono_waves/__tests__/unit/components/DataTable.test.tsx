import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import DataTable from '@/components/admin/DataTable'

describe('DataTable Component', () => {
  const mockColumns = [
    { key: 'name', label: 'Product Name' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' }
  ]

  const mockData = [
    { name: 'T-Shirt', price: '$29.99', stock: 150 },
    { name: 'Hoodie', price: '$59.99', stock: 75 }
  ]

  it('should render table title', () => {
    render(
      <DataTable 
        title="Test Table" 
        columns={mockColumns} 
        data={mockData} 
      />
    )
    
    expect(screen.getByText('Test Table')).toBeInTheDocument()
  })

  it('should render column headers', () => {
    render(
      <DataTable 
        title="Test Table" 
        columns={mockColumns} 
        data={mockData} 
      />
    )
    
    expect(screen.getByText('Product Name')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Stock')).toBeInTheDocument()
  })

  it('should render data rows correctly', () => {
    render(
      <DataTable 
        title="Test Table" 
        columns={mockColumns} 
        data={mockData} 
      />
    )
    
    // Check first row
    expect(screen.getByText('T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    
    // Check second row
    expect(screen.getByText('Hoodie')).toBeInTheDocument()
    expect(screen.getByText('$59.99')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('should render custom column content using render function', () => {
    const columnsWithRender = [
      { key: 'name', label: 'Product Name' },
      { 
        key: 'status', 
        label: 'Status',
        render: (value: string) => (
          <span className={`badge ${value === 'Active' ? 'badge-green' : 'badge-yellow'}`}>
            {value}
          </span>
        )
      }
    ]

    const dataWithStatus = [
      { name: 'T-Shirt', status: 'Active' },
      { name: 'Hoodie', status: 'Low Stock' }
    ]

    render(
      <DataTable 
        title="Status Table" 
        columns={columnsWithRender} 
        data={dataWithStatus} 
      />
    )
    
    // Check that custom render function is used
    const activeStatus = screen.getByText('Active')
    expect(activeStatus).toBeInTheDocument()
    expect(activeStatus).toHaveClass('badge', 'badge-green')
    
    const lowStockStatus = screen.getByText('Low Stock')
    expect(lowStockStatus).toBeInTheDocument()
    expect(lowStockStatus).toHaveClass('badge', 'badge-yellow')
  })

  it('should display empty state when no data provided', () => {
    render(
      <DataTable 
        title="Empty Table" 
        columns={mockColumns} 
        data={[]} 
      />
    )
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <DataTable 
        title="Custom Table" 
        columns={mockColumns} 
        data={mockData}
        className="custom-table-class"
      />
    )
    
    // Find the root container div
    const container = screen.getByText('Custom Table').closest('div')?.parentElement
    expect(container).toHaveClass('custom-table-class')
  })

  it('should handle missing data fields gracefully', () => {
    const incompleteData = [
      { name: 'T-Shirt', price: '$29.99' }, // missing stock
      { name: 'Hoodie', stock: 75 } // missing price
    ]

    render(
      <DataTable 
        title="Incomplete Data" 
        columns={mockColumns} 
        data={incompleteData} 
      />
    )
    
    expect(screen.getByText('T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('Hoodie')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('should render actions column with buttons', () => {
    const columnsWithActions = [
      { key: 'name', label: 'Product Name' },
      {
        key: 'actions',
        label: 'Actions',
        render: () => (
          <div className="flex gap-2">
            <button data-testid="view-btn">View</button>
            <button data-testid="edit-btn">Edit</button>
            <button data-testid="delete-btn">Delete</button>
          </div>
        )
      }
    ]

    render(
      <DataTable 
        title="Actions Table" 
        columns={columnsWithActions} 
        data={[{ name: 'T-Shirt' }]} 
      />
    )
    
    expect(screen.getByTestId('view-btn')).toBeInTheDocument()
    expect(screen.getByTestId('edit-btn')).toBeInTheDocument()
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument()
  })

  it('should handle large datasets', () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      name: `Product ${i + 1}`,
      price: `$${(i + 1) * 10}.99`,
      stock: (i + 1) * 5
    }))

    render(
      <DataTable 
        title="Large Dataset" 
        columns={mockColumns} 
        data={largeData} 
      />
    )
    
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 100')).toBeInTheDocument()
  })

  it('should render with proper table structure', () => {
    render(
      <DataTable 
        title="Structure Test" 
        columns={mockColumns} 
        data={mockData} 
      />
    )
    
    // Check table structure
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Check thead and tbody
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(mockColumns.length)
    
    const rows = screen.getAllByRole('row')
    // Should have header row + data rows
    expect(rows).toHaveLength(mockData.length + 1)
  })

  it('should handle render function with row data', () => {
    const columnsWithRowData = [
      { key: 'name', label: 'Product Name' },
      { 
        key: 'computed', 
        label: 'Computed',
        render: (value: any, row: any) => (
          <span data-testid="computed-value">
            {row.name} - {row.price}
          </span>
        )
      }
    ]

    render(
      <DataTable 
        title="Row Data Test" 
        columns={columnsWithRowData} 
        data={mockData} 
      />
    )
    
    expect(screen.getByText('T-Shirt - $29.99')).toBeInTheDocument()
    expect(screen.getByText('Hoodie - $59.99')).toBeInTheDocument()
  })
})