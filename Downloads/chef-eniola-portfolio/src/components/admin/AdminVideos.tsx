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

  if (loading) return <div className="py-12 text-center font-medium" style={{color: '#ffffff99'}}>Loading videos...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold" style={{color: '#ffffff'}}>TikTok Videos</h2>
          <p className="text-base mt-2 font-medium" style={{color: '#ffffff99'}}>Manage videos displayed in the TikTok section</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={18} /> Add Video
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-12 bg-brand-bg/50 p-6 rounded-2xl border-2 border-brand-accent/20">
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Title *</label>
              <input 
                type="text" 
                required 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                placeholder="e.g. Plating Masterclass"
                style={{color: '#ffffff'}}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>TikTok Video URL *</label>
              <input 
                type="url" 
                required 
                value={formData.videoUrl}
                onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                placeholder="https://tiktok.com/..."
                style={{color: '#ffffff'}}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Thumbnail Image URL *</label>
              <input 
                type="url" 
                required 
                value={formData.thumbnailUrl}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                placeholder="https://..."
                style={{color: '#ffffff'}}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-semibold hover:bg-white/10 rounded-lg transition-all" style={{color: '#ffffffb3'}}>Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 shadow-lg transition-all">Save Video</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <div key={video.id} className="group relative bg-brand-bg rounded-xl overflow-hidden border-2 border-brand-accent/20 shadow-sm hover:border-brand-accent/50 transition-all">
            <div className="aspect-[9/16] bg-brand-bg/50 relative">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="p-4 bg-brand-bg">
              <h3 className="font-medium truncate" style={{color: '#ffffff'}}>{video.title}</h3>
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:text-brand-accent/80 hover:underline mt-1 inline-block font-medium">View on TikTok</a>
            </div>
            <button 
              onClick={() => handleDelete(video.id)}
              className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {videos.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-brand-bg/30 rounded-2xl border-2 border-dashed border-brand-accent/30">
            <p className="text-lg font-bold" style={{color: '#ffffff99'}}>No videos added yet.</p>
            <p className="text-base mt-1 font-medium" style={{color: '#ffffff99'}}>Click "Add Video" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
