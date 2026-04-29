import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus, Upload, AlertCircle } from 'lucide-react';

interface KitchenVideo {
  id: string;
  videourl: string;
  createdat: string;
}

export default function AdminKitchenVideos() {
  const [videos, setVideos] = useState<KitchenVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const MAX_VIDEO_SIZE_MB = Number(import.meta.env.VITE_MAX_VIDEO_SIZE_MB) || 5;
  const MAX_VIDEOS_COUNT = Number(import.meta.env.VITE_MAX_VIDEOS_COUNT) || 8;
  const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

  useEffect(() => {
    fetchVideos();

    const channel = supabase
      .channel('admin_kitchen_videos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_videos' }, fetchVideos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('kitchen_videos')
      .select('*')
      .order('createdat', { ascending: false });

    if (!error && data) {
      setVideos(data as KitchenVideo[]);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`Video size must not exceed ${MAX_VIDEO_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setVideoFile(file);
  };

  const uploadVideoFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `kitchen-videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (videos.length >= MAX_VIDEOS_COUNT) {
      setError(`Maximum of ${MAX_VIDEOS_COUNT} videos allowed. Please delete a video before adding a new one.`);
      return;
    }

    if (uploadMode === 'file' && !videoFile) {
      setError('Please select a video file');
      return;
    }

    if (uploadMode === 'url' && !videoUrl) {
      setError('Please enter a video URL');
      return;
    }
    
    setUploading(true);
    try {
      let finalVideoUrl = videoUrl;

      if (uploadMode === 'file' && videoFile) {
        finalVideoUrl = await uploadVideoFile(videoFile);
      }

      const { error } = await supabase.from('kitchen_videos').insert([{
        videourl: finalVideoUrl,
        createdat: new Date().toISOString()
      }]);
      
      if (error) throw error;
      
      setVideoUrl('');
      setVideoFile(null);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Failed to add video:", error);
      setError(error.message || "Failed to add video. Make sure you are an admin.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await supabase.from('kitchen_videos').delete().eq('id', id);
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  const canAddVideo = videos.length < MAX_VIDEOS_COUNT;

  if (loading) return <div className="py-12 text-center text-white/60 font-medium text-base" style={{color: '#ffffff99'}}>Loading videos...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white" style={{color: '#ffffff'}}>In The Kitchen Videos</h2>
          <p className="text-base text-white/60 mt-2 font-medium" style={{color: '#ffffff99'}}>
            Manage videos ({videos.length}/{MAX_VIDEOS_COUNT} videos)
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          disabled={!canAddVideo}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg ${
            canAddVideo 
              ? 'bg-brand-accent text-brand-bg hover:bg-brand-accent/90' 
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          <Plus size={18} /> Add Video
        </button>
      </div>

      {!canAddVideo && (
        <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={22} />
          <div className="text-sm text-amber-300 font-medium">
            <p className="font-bold text-base">Maximum videos reached</p>
            <p className="mt-1">Delete a video before adding a new one.</p>
          </div>
        </div>
      )}

      {isAdding && canAddVideo && (
        <form onSubmit={handleSubmit} className="mb-12 bg-brand-bg/50 p-6 rounded-2xl border-2 border-brand-accent/20">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-sm text-red-400 flex items-start gap-2 font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white mb-3" style={{color: '#ffffff'}}>Upload Method</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer bg-brand-bg/50 px-4 py-3 rounded-xl border-2 border-brand-accent/30 hover:border-brand-accent transition-colors">
                <input
                  type="radio"
                  value="file"
                  checked={uploadMode === 'file'}
                  onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                  className="w-5 h-5 text-brand-accent"
                />
                <span className="text-base font-semibold text-white" style={{color: '#ffffff'}}>Upload File (Max {MAX_VIDEO_SIZE_MB}MB)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-brand-bg/50 px-4 py-3 rounded-xl border-2 border-brand-accent/30 hover:border-brand-accent transition-colors">
                <input
                  type="radio"
                  value="url"
                  checked={uploadMode === 'url'}
                  onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                  className="w-5 h-5 text-brand-accent"
                />
                <span className="text-base font-semibold text-white" style={{color: '#ffffff'}}>Enter URL</span>
              </label>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-white mb-2" style={{color: '#ffffff'}}>
                Video File * (Max {MAX_VIDEO_SIZE_MB}MB)
              </label>
              <input 
                type="file" 
                accept="video/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent text-white font-medium"
                style={{color: '#ffffff'}}
              />
              {videoFile && (
                <p className="text-sm text-brand-accent mt-2 font-semibold">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-white mb-2" style={{color: '#ffffff'}}>Video URL *</label>
              <input 
                type="text" 
                required 
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent text-white text-base font-medium"
                placeholder="/gl/video.MP4 or https://..."
                style={{color: '#ffffff'}}
              />
              <p className="text-sm text-white/60 mt-2 font-medium" style={{color: '#ffffff99'}}>
                Enter a local path like /gl/IMG_5069.MP4 or a full URL
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => {
                setIsAdding(false);
                setError('');
                setVideoFile(null);
                setVideoUrl('');
              }} 
              className="px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              disabled={uploading}
              style={{color: '#ffffffb3'}}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploading}
              className="px-6 py-2.5 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Save Video
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map(video => (
          <div key={video.id} className="group relative bg-brand-bg rounded-xl overflow-hidden border-2 border-brand-accent/20 shadow-sm hover:shadow-lg transition-all aspect-[9/16]">
            <video 
              src={video.videourl} 
              className="w-full h-full object-cover" 
              muted
              loop
              playsInline
            />
            <button 
              onClick={() => handleDelete(video.id)}
              className="absolute top-2 right-2 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {videos.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-brand-bg/30 rounded-2xl border-2 border-dashed border-brand-accent/30" style={{color: '#ffffff99'}}>
            <p className="text-lg font-bold" style={{color: '#ffffff99'}}>No videos added yet.</p>
            <p className="text-base mt-1 font-medium" style={{color: '#ffffff99'}}>Click "Add Video" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
