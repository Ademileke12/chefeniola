'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  Settings,
  User,
  LogOut,
  LifeBuoy
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface SidebarProps {
  activeSection?: string
  isOpen?: boolean
  onClose?: () => void
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Designs',
    href: '/admin/designs',
    icon: Palette,
  },
  {
    name: 'Support',
    href: '/admin/support',
    icon: LifeBuoy,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export default function Sidebar({ activeSection, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }

  return (
    <aside className={`
      fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col z-40 transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-800">
        <h1 className="text-lg sm:text-xl font-bold">Admin Panel</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || activeSection === item.name.toLowerCase()

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm sm:text-base">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Admin User Profile & Logout */}
      <div className="p-3 sm:p-4 border-t border-gray-800 space-y-2">
        <div className="flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-4 sm:w-5 h-4 sm:h-5 text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-gray-400 truncate">admin@monowaves.com</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 sm:w-5 h-4 sm:h-5" />
          <span className="font-medium text-sm sm:text-base">{loggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  )
}
