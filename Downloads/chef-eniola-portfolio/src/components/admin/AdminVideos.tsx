import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', videoUrl: '', thumbnailUrl: '' });

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        setVideos(data as Video[]);
      }
      setLoading(false);
    };

    fetchVideos();

    const channel = supabase
      .channel('admin_videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, fetchVideos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.videoUrl || !formData.thumbnailUrl) return;
    
    try {
      const { error } = await supabase.from('videos').insert([{
        ...formData,
        createdAt: new Date().toISOString()
      }]);
      
      if (error) throw error;
      setFormData({ title: '', videoUrl: '', thumbnailUrl: '' });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add video:", error);
      alert("Failed to add video. Make sure you are an admin.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading videos...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif">Manage TikTok Videos</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-full text-sm font-medium hover:bg-[#4a4a30] transition-colors"
        >
          <Plus size={16} /> Add Video
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
                placeholder="e.g. Plating Masterclass"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">TikTok Video URL *</label>
              <input 
                type="url" 
                required 
                value={formData.videoUrl}
                onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="https://tiktok.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Thumbnail Image URL *</label>
              <input 
                type="url" 
                required 
                value={formData.thumbnailUrl}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-brand-ink text-white rounded-full text-sm font-medium hover:bg-black">Save Video</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <div key={video.id} className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="aspect-[9/16] bg-gray-100 relative">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="p-4 bg-white">
              <h3 className="font-medium text-gray-900 truncate">{video.title}</h3>
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline mt-1 inline-block">View on TikTok</a>
            </div>
            <button 
              onClick={() => handleDelete(video.id)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {videos.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            No videos added yet.
          </div>
        )}
      </div>
    </div>
  );
}
