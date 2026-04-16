import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import AdminDishes from '../components/admin/AdminDishes';
import AdminReviews from '../components/admin/AdminReviews';
import AdminVideos from '../components/admin/AdminVideos';
import { LogOut } from 'lucide-react';

export default function Admin() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dishes' | 'reviews' | 'videos'>('dishes');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[2rem] shadow-sm max-w-md w-full text-center"
        >
          <h1 className="font-serif text-3xl mb-2">Admin Portal</h1>
          <p className="text-brand-ink/60 mb-8 text-sm">Secure access for Chef Eniola</p>
          
          {user && !isAdmin && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              You do not have admin privileges.
            </div>
          )}

          <button
            onClick={login}
            className="w-full py-4 bg-brand-ink text-white rounded-full uppercase tracking-widest text-sm font-medium hover:bg-brand-accent transition-colors"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-brand-ink font-sans">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-serif text-2xl font-medium">Chef Eniola <span className="text-brand-accent italic text-lg">Admin</span></div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-500 hidden md:block">{user.email}</span>
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            {[
              { id: 'dishes', label: 'Dishes Gallery' },
              { id: 'reviews', label: 'Customer Reviews' },
              { id: 'videos', label: 'TikTok Videos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 rounded-2xl text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-brand-ink text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
            {activeTab === 'dishes' && <AdminDishes />}
            {activeTab === 'reviews' && <AdminReviews />}
            {activeTab === 'videos' && <AdminVideos />}
          </div>
        </main>
      </div>
    </div>
  );
}
