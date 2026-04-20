/**
 * Report Service
 * 
 * Generates PDF reports for admin dashboard
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DashboardMetrics, DashboardProduct, DashboardOrder } from '@/types'
import type { AuditReport } from './auditService'

export interface ReportData {
  metrics: DashboardMetrics
  products: DashboardProduct[]
  orders: DashboardOrder[]
  dateRange?: {
    from: string
    to: string
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format order status for display
 */
function formatOrderStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'Pending',
    'payment_confirmed': 'Processing',
    'submitted_to_gelato': 'Processing',
    'printing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'failed': 'Failed'
  }
  return statusMap[status] || status
}

/**
 * Generate PDF report from dashboard data
 */
export function generateDashboardReport(data: ReportData): jsPDF {
  const doc = new jsPDF()
  
  // Set document properties
  doc.setProperties({
    title: 'Mono Waves Dashboard Report',
    subject: 'Business Analytics Report',
    author: 'Mono Waves Admin',
    creator: 'Mono Waves Dashboard'
  })

  let yPosition = 20

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('MONO WAVES', 105, yPosition, { align: 'center' })
  
  yPosition += 10
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Dashboard Report', 105, yPosition, { align: 'center' })
  
  yPosition += 8
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, yPosition, { align: 'center' })
  
  // Reset text color
  doc.setTextColor(0)
  yPosition += 15

  // Metrics Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Metrics', 14, yPosition)
  yPosition += 8

  // Metrics table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Revenue', formatCurrency(data.metrics.totalRevenue)],
      ['Total Sales', formatCurrency(data.metrics.totalSales)],
      ['Total Orders', data.metrics.totalOrders.toString()],
      ['Active Products', data.metrics.totalProducts.toString()],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' }
    }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // Recent Orders Section
  if (data.orders && data.orders.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recent Orders', 14, yPosition)
    yPosition += 8

    const orderRows = data.orders.slice(0, 10).map(order => [
      order.order_number,
      order.customer_name,
      order.customer_email,
      formatCurrency(Number(order.total)),
      formatOrderStatus(order.status),
      formatDate(order.created_at)
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Order #', 'Customer', 'Email', 'Total', 'Status', 'Date']],
      body: orderRows,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { halign: 'right', cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Add new page if needed
  if (yPosition > 250) {
    doc.addPage()
    yPosition = 20
  }

  // Recent Products Section
  if (data.products && data.products.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Active Products', 14, yPosition)
    yPosition += 8

    const productRows = data.products.slice(0, 10).map(product => [
      product.name,
      product.gelato_product_uid.substring(0, 30) + '...',
      formatCurrency(Number(product.price)),
      product.published ? 'Active' : 'Inactive',
      formatDate(product.created_at)
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Product Name', 'SKU', 'Price', 'Status', 'Created']],
      body: productRows,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 50 },
        2: { halign: 'right', cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
    doc.text(
      'Mono Waves - Confidential',
      14,
      doc.internal.pageSize.height - 10
    )
  }

  return doc
}

/**
 * Report service object
 */
export const reportService = {
  generateDashboardReport,
  generateAuditReport
}

/**
 * Generate PDF audit report
 */
export function generateAuditReport(report: AuditReport): jsPDF {
  const doc = new jsPDF()
  
  // Set document properties
  doc.setProperties({
    title: 'Mono Waves Security Audit Report',
    subject: 'Security & Compliance Audit',
    author: 'Mono Waves Admin',
    creator: 'Mono Waves Security Dashboard'
  })

  let yPosition = 20

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('MONO WAVES', 105, yPosition, { align: 'center' })
  
  yPosition += 10
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Security Audit Report', 105, yPosition, { align: 'center' })
  
  yPosition += 8
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Report Period: ${formatDate(report.startDate.toISOString())} - ${formatDate(report.endDate.toISOString())}`, 105, yPosition, { align: 'center' })
  yPosition += 5
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, yPosition, { align: 'center' })
  
  // Reset text color
  doc.setTextColor(0)
  yPosition += 15

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', 14, yPosition)
  yPosition += 8

  // Summary metrics table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Events', report.summary.totalEvents.toString()],
      ['Critical Events', report.summary.eventsBySeverity.critical.toString()],
      ['Error Events', report.summary.eventsBySeverity.error.toString()],
      ['Warning Events', report.summary.eventsBySeverity.warning.toString()],
      ['Info Events', report.summary.eventsBySeverity.info.toString()],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' }
    }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // Events by Source
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Events by Source', 14, yPosition)
  yPosition += 8

  autoTable(doc, {
    startY: yPosition,
    head: [['Source', 'Count']],
    body: [
      ['Stripe', report.summary.eventsBySource.stripe.toString()],
      ['Gelato', report.summary.eventsBySource.gelato.toString()],
      ['System', report.summary.eventsBySource.system.toString()],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' }
    }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // Add new page if needed
  if (yPosition > 220) {
    doc.addPage()
    yPosition = 20
  }

  // Critical Events Section
  if (report.criticalEvents && report.criticalEvents.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Critical Events', 14, yPosition)
    yPosition += 8

    const criticalRows = report.criticalEvents.slice(0, 20).map(event => [
      formatDate(event.timestamp.toISOString()),
      event.eventType,
      event.source.toUpperCase(),
      event.correlationId.substring(0, 20) + '...'
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Timestamp', 'Event Type', 'Source', 'Correlation ID']],
      body: criticalRows,
      theme: 'striped',
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 50 }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Add new page if needed
  if (yPosition > 220) {
    doc.addPage()
    yPosition = 20
  }

  // Security Alerts Section
  if (report.securityAlerts && report.securityAlerts.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Security Alerts', 14, yPosition)
    yPosition += 8

    const alertRows = report.securityAlerts.slice(0, 20).map(event => [
      formatDate(event.timestamp.toISOString()),
      event.eventType,
      event.severity.toUpperCase(),
      event.source.toUpperCase()
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Timestamp', 'Event Type', 'Severity', 'Source']],
      body: alertRows,
      theme: 'striped',
      headStyles: {
        fillColor: [234, 179, 8],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 }
      }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Add new page if needed
  if (yPosition > 220) {
    doc.addPage()
    yPosition = 20
  }

  // Recommendations Section
  if (report.recommendations && report.recommendations.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommendations', 14, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    report.recommendations.forEach((recommendation, index) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      const lines = doc.splitTextToSize(`${index + 1}. ${recommendation}`, 180)
      doc.text(lines, 14, yPosition)
      yPosition += lines.length * 5 + 3
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
    doc.text(
      'Mono Waves - Confidential',
      14,
      doc.internal.pageSize.height - 10
    )
  }

  return doc
}
