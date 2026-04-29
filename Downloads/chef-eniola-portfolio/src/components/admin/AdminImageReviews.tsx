import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus, Upload, AlertCircle } from 'lucide-react';
import { compressImage } from '../../lib/imageOptimizer';

interface ImageReview {
  id: string;
  imageurl: string;
  customername?: string;
}

export default function AdminImageReviews() {
  const [imageReviews, setImageReviews] = useState<ImageReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ imageUrl: '', customerName: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('url');

  useEffect(() => {
    const fetchImageReviews = async () => {
      const { data, error } = await supabase
        .from('image_reviews')
        .select('*')
        .order('createdat', { ascending: false });

      if (!error && data) {
        setImageReviews(data as ImageReview[]);
      }
      setLoading(false);
    };

    fetchImageReviews();

    const channel = supabase
      .channel('admin_image_reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'image_reviews' }, fetchImageReviews)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setImageFile(file);
  };

  const uploadImageFile = async (file: File): Promise<string> => {
    // Compress image before upload
    const compressedBlob = await compressImage(file, 1920, 1920, 0.85);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `image-reviews/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, compressedBlob);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (uploadMode === 'file' && !imageFile) {
      setError('Please select an image file');
      return;
    }

    if (uploadMode === 'url' && !formData.imageUrl) {
      setError('Please enter an image URL');
      return;
    }
    
    setUploading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (uploadMode === 'file' && imageFile) {
        finalImageUrl = await uploadImageFile(imageFile);
      }

      const dataToSave: any = {
        imageurl: finalImageUrl,
        createdat: new Date().toISOString()
      };
      if (formData.customerName) dataToSave.customername = formData.customerName;

      const { error } = await supabase.from('image_reviews').insert([dataToSave]);
      if (error) throw error;
      
      setFormData({ imageUrl: '', customerName: '' });
      setImageFile(null);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Failed to add image review:", error);
      setError(error.message || "Failed to add image review. Make sure you are an admin.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this image review?")) return;
    try {
      await supabase.from('image_reviews').delete().eq('id', id);
    } catch (error) {
      console.error("Failed to delete image review:", error);
    }
  };

  if (loading) return <div className="py-12 text-center font-medium" style={{color: '#ffffff99'}}>Loading image reviews...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold" style={{color: '#ffffff'}}>Image Reviews</h2>
          <p className="text-base mt-2 font-medium" style={{color: '#ffffff99'}}>Manage customer moment images</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={18} /> Add Image Review
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-12 bg-brand-bg/50 p-6 rounded-2xl border-2 border-brand-accent/20">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-sm text-red-400 flex items-start gap-2 font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Upload Method</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="url"
                    checked={uploadMode === 'url'}
                    onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold" style={{color: '#ffffff'}}>Enter URL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="file"
                    checked={uploadMode === 'file'}
                    onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold" style={{color: '#ffffff'}}>Upload File</span>
                </label>
              </div>
            </div>

            {uploadMode === 'url' ? (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Image URL *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                  placeholder="https://... or /gl/photo.jpg"
                  style={{color: '#ffffff'}}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Image File *</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                  style={{color: '#ffffff'}}
                />
                {imageFile && (
                  <p className="text-sm text-brand-accent mt-2 font-semibold">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Customer Name (Optional)</label>
              <input 
                type="text" 
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                placeholder="e.g. John D."
                style={{color: '#ffffff'}}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => {
                setIsAdding(false);
                setError('');
                setImageFile(null);
                setFormData({ imageUrl: '', customerName: '' });
              }} 
              className="px-5 py-2.5 text-sm font-semibold hover:bg-white/10 rounded-lg transition-all"
              disabled={uploading}
              style={{color: '#ffffffb3'}}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploading}
              className="px-6 py-2.5 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Save Image Review
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {imageReviews.map(review => (
          <div key={review.id} className="group relative aspect-square bg-brand-bg rounded-xl overflow-hidden border-2 border-brand-accent/20 shadow-sm hover:shadow-lg transition-all">
            <img src={review.imageurl} alt={review.customername || 'Customer review'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            {review.customername && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-sm font-semibold truncate" style={{color: '#ffffff'}}>{review.customername}</p>
              </div>
            )}
            <button 
              onClick={() => handleDelete(review.id)}
              className="absolute top-2 right-2 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {imageReviews.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-brand-bg/30 rounded-2xl border-2 border-dashed border-brand-accent/30">
            <p className="text-lg font-bold" style={{color: '#ffffff99'}}>No image reviews added yet.</p>
            <p className="text-base mt-1 font-medium" style={{color: '#ffffff99'}}>Click "Add Image Review" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
