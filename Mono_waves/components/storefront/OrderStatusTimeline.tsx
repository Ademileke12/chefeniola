import React from 'react'
import { OrderStatus } from '@/types'

interface OrderStatusTimelineProps {
  status: OrderStatus
}

interface TimelineStep {
  key: OrderStatus
  label: string
  description: string
}

const timelineSteps: TimelineStep[] = [
  {
    key: 'payment_confirmed',
    label: 'Confirmed',
    description: 'Order confirmed and payment received'
  },
  {
    key: 'printing',
    label: 'Printing',
    description: 'Your items are being printed'
  },
  {
    key: 'shipped',
    label: 'Shipped',
    description: 'Order has been shipped'
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Order delivered to your address'
  }
]

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const getStepStatus = (stepKey: OrderStatus) => {
    const currentIndex = timelineSteps.findIndex(step => step.key === status)
    const stepIndex = timelineSteps.findIndex(step => step.key === stepKey)
    
    if (stepIndex <= currentIndex) {
      return 'completed'
    } else if (stepIndex === currentIndex + 1) {
      return 'current'
    } else {
      return 'upcoming'
    }
  }

  return (
    <div className="relative">
      {timelineSteps.map((step, index) => {
        const stepStatus = getStepStatus(step.key)
        const isLast = index === timelineSteps.length - 1
        
        return (
          <div key={step.key} className="relative flex items-start pb-8">
            {/* Timeline Line */}
            {!isLast && (
              <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200">
                {stepStatus === 'completed' && (
                  <div className="w-full bg-green-600 h-8"></div>
                )}
              </div>
            )}
            
            {/* Timeline Node */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white z-10">
              {stepStatus === 'completed' ? (
                <div className="w-full h-full bg-green-600 border-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : stepStatus === 'current' ? (
                <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-blue-600"></div>
              ) : (
                <div className="w-4 h-4 bg-gray-200 rounded-full border-2 border-gray-300"></div>
              )}
            </div>
            
            {/* Timeline Content */}
            <div className="ml-4 flex-1">
              <h4 className={`text-sm font-medium uppercase tracking-wider ${
                stepStatus === 'completed' ? 'text-green-600' : 
                stepStatus === 'current' ? 'text-blue-600' : 
                'text-gray-400'
              }`}>
                {step.label}
              </h4>
              <p className={`text-sm mt-1 ${
                stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {step.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}