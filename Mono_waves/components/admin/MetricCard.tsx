'use client'

import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  variant?: 'default' | 'dark' | 'warning'
  className?: string
}

export default function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  variant = 'default',
  className = '' 
}: MetricCardProps) {
  const isDark = variant === 'dark'
  const isWarning = variant === 'warning'
  
  return (
    <div className={`
      p-4 sm:p-6 rounded-lg border
      ${isDark 
        ? 'bg-gray-900 border-gray-800 text-white' 
        : isWarning
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-white border-gray-200'
      }
      ${className}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-300' : isWarning ? 'text-yellow-700' : 'text-gray-600'} truncate`}>
            {title}
          </p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 ${isDark ? 'text-white' : isWarning ? 'text-yellow-900' : 'text-gray-900'}`}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-1 sm:mt-2">
              <span className={`text-xs sm:text-sm font-medium ${
                trend.direction === 'up' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`ml-3 sm:ml-4 flex-shrink-0 ${isDark ? 'text-gray-400' : isWarning ? 'text-yellow-600' : 'text-gray-500'}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}