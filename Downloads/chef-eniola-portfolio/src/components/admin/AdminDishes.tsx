import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus } from 'lucide-react';

interface Dish {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
}

export default function AdminDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', imageUrl: '' });

  useEffect(() => {
    const fetchDishes = async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        setDishes(data as Dish[]);
      }
      setLoading(false);
    };

    fetchDishes();

    const channel = supabase
      .channel('admin_dishes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, fetchDishes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.imageUrl) return;
    
    try {
      const { error } = await supabase.from('dishes').insert([{
        ...formData,
        createdAt: new Date().toISOString()
      }]);
      
      if (error) throw error;
      setFormData({ title: '', description: '', imageUrl: '' });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add dish:", error);
      alert("Failed to add dish. Make sure you are an admin.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this dish?")) return;
    try {
      await supabase.from('dishes').delete().eq('id', id);
    } catch (error) {
      console.error("Failed to delete dish:", error);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading dishes...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif">Manage Dishes</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-full text-sm font-medium hover:bg-[#4a4a30] transition-colors"
        >
          <Plus size={16} /> Add Dish
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Title *</label>
              <input 
                type="text" 
                required 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="e.g. Jollof Rice"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Image URL *</label>
              <input 
                type="url" 
                required 
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Description (Optional)</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent h-24 resize-none"
                placeholder="Brief description of the dish..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-brand-ink text-white rounded-full text-sm font-medium hover:bg-black">Save Dish</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map(dish => (
          <div key={dish.id} className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="aspect-square bg-gray-100">
              <img src={dish.imageUrl} alt={dish.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 truncate">{dish.title}</h3>
              {dish.description && <p className="text-sm text-gray-500 truncate mt-1">{dish.description}</p>}
            </div>
            <button 
              onClick={() => handleDelete(dish.id)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {dishes.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            No dishes added yet.
          </div>
        )}
      </div>
    </div>
  );
}
