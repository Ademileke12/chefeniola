import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus } from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  reviewText: string;
  imageUrl?: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ customerName: '', reviewText: '', imageUrl: '' });

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        setReviews(data as Review[]);
      }
      setLoading(false);
    };

    fetchReviews();

    const channel = supabase
      .channel('admin_reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, fetchReviews)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.reviewText) return;
    
    try {
      const dataToSave: any = {
        customerName: formData.customerName,
        reviewText: formData.reviewText,
        createdAt: new Date().toISOString()
      };
      if (formData.imageUrl) dataToSave.imageUrl = formData.imageUrl;

      const { error } = await supabase.from('reviews').insert([dataToSave]);
      if (error) throw error;
      
      setFormData({ customerName: '', reviewText: '', imageUrl: '' });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add review:", error);
      alert("Failed to add review. Make sure you are an admin.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await supabase.from('reviews').delete().eq('id', id);
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading reviews...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif">Manage Reviews</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-full text-sm font-medium hover:bg-[#4a4a30] transition-colors"
        >
          <Plus size={16} /> Add Review
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Customer Name *</label>
              <input 
                type="text" 
                required 
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="e.g. Amina B."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Review Text *</label>
              <textarea 
                required
                value={formData.reviewText}
                onChange={e => setFormData({...formData, reviewText: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent h-24 resize-none"
                placeholder="What did they say?"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Customer Image URL (Optional)</label>
              <input 
                type="url" 
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-brand-ink text-white rounded-full text-sm font-medium hover:bg-black">Save Review</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map(review => (
          <div key={review.id} className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col">
            <p className="text-gray-600 italic mb-6 flex-1">"{review.reviewText}"</p>
            <div className="flex items-center gap-3">
              {review.imageUrl ? (
                <img src={review.imageUrl} alt={review.customerName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                  {review.customerName.charAt(0)}
                </div>
              )}
              <span className="font-medium text-sm">{review.customerName}</span>
            </div>
            <button 
              onClick={() => handleDelete(review.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {reviews.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            No reviews added yet.
          </div>
        )}
      </div>
    </div>
  );
}
