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
  LifeBuoy,
  X
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
    <>
      <aside className={`
        fixed left-0 top-0 h-full w-[85vw] max-w-sm lg:w-64 bg-gray-900 text-white flex flex-col z-50 
        transition-transform duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header - Hidden on mobile (shown in top bar instead) */}
        <div className="hidden lg:flex p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
          <h1 className="text-lg sm:text-xl font-bold">Menu</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors active:scale-95 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || activeSection === item.name.toLowerCase()

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-lg transition-all touch-manipulation
                  ${isActive
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white active:scale-95'
                  }
                `}
              >
                <Icon className="w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-medium text-base sm:text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Admin User Profile & Logout */}
        <div className="p-3 sm:p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/50">
            <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">admin@monowaves.com</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50 active:scale-95 touch-manipulation"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-base sm:text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
