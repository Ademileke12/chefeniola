import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import AdminDishes from '../components/admin/AdminDishes';
import AdminReviews from '../components/admin/AdminReviews';
import AdminVideos from '../components/admin/AdminVideos';
import AdminGallery from '../components/admin/AdminGallery';
import AdminKitchenVideos from '../components/admin/AdminKitchenVideos';
import AdminImageReviews from '../components/admin/AdminImageReviews';
import { LogOut, Lock, Mail } from 'lucide-react';

export default function Admin() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dishes' | 'reviews' | 'videos' | 'gallery' | 'kitchen-videos' | 'image-reviews'>('dishes');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    const { error } = await login(email, password);
    
    if (error) {
      setLoginError(error);
    }
    
    setLoggingIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600 text-base">Secure access for Chef Eniola</p>
          </div>
          
          {user && !isAdmin && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              You do not have admin privileges.
            </div>
          )}

          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 text-base"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 text-base"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Admin Header */}
      <header className="bg-brand-surface border-b border-brand-accent/20 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Chef Eniola</h1>
            <span className="px-3 py-1 bg-brand-accent/20 text-brand-accent text-sm font-semibold rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-white/70 hidden md:block">{user.email}</span>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            {[
              { id: 'gallery', label: 'Visual Menu' },
              { id: 'kitchen-videos', label: 'Kitchen Videos' },
              { id: 'dishes', label: 'Dishes Gallery' },
              { id: 'reviews', label: 'Customer Reviews' },
              { id: 'image-reviews', label: 'Image Reviews' },
              { id: 'videos', label: 'TikTok Videos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3.5 rounded-xl text-left text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20' 
                    : 'bg-brand-surface text-white hover:bg-brand-surface/80 hover:text-brand-accent shadow-sm border border-brand-accent/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-brand-surface rounded-2xl p-8 shadow-sm border border-brand-accent/10">
            {activeTab === 'gallery' && <AdminGallery />}
            {activeTab === 'kitchen-videos' && <AdminKitchenVideos />}
            {activeTab === 'dishes' && <AdminDishes />}
            {activeTab === 'reviews' && <AdminReviews />}
            {activeTab === 'image-reviews' && <AdminImageReviews />}
            {activeTab === 'videos' && <AdminVideos />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 text-center">
        <p className="text-sm font-medium text-white/60">
          Created by{' '}
          <a 
            href="https://x.com/anakincoco" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-brand-accent hover:text-brand-accent/80 font-semibold transition-colors underline decoration-2 underline-offset-2"
          >
            Anakincoco
          </a>
        </p>
      </footer>
    </div>
  );
}
