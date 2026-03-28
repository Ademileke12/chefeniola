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
  variant?: 'default' | 'dark'
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
  
  return (
    <div className={`
      p-6 rounded-lg border
      ${isDark 
        ? 'bg-gray-900 border-gray-800 text-white' 
        : 'bg-white border-gray-200'
      }
      ${className}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
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
          <div className={`ml-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}