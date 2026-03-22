'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Skip auth check for login page
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    // Don't check auth on login page
    if (isLoginPage) {
      setLoading(false)
      return
    }

    // Check if user is authenticated and has admin privileges
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          // Redirect to login page
          router.push('/admin/login')
          return
        }

        // Check if user has admin privileges
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@monowaves.com'
        
        if (user.email !== adminEmail) {
          // User is not admin, sign them out and redirect to login
          await supabase.auth.signOut()
          router.push('/admin/login')
          return
        }

        setUser(user)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/admin/login')
        } else if (session?.user) {
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@monowaves.com'
          if (session.user.email !== adminEmail) {
            await supabase.auth.signOut()
            router.push('/admin/login')
          } else {
            setUser(session.user)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, isLoginPage, pathname])

  // Show login page without auth check
  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return <>{children}</>
}