import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus, Upload, AlertCircle } from 'lucide-react';

interface Dish {
  id: string;
  title: string;
  description?: string;
  imageurl: string;
}

export default function AdminDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', imageUrl: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('url');

  useEffect(() => {
    const fetchDishes = async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .order('createdat', { ascending: false });

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `dishes/${fileName}`;

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

    if (!formData.title) {
      setError('Please enter a title');
      return;
    }

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

      const { error } = await supabase.from('dishes').insert([{
        title: formData.title,
        description: formData.description || null,
        imageurl: finalImageUrl,
        createdat: new Date().toISOString()
      }]);
      
      if (error) throw error;
      setFormData({ title: '', description: '', imageUrl: '' });
      setImageFile(null);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Failed to add dish:", error);
      setError(error.message || "Failed to add dish. Make sure you are an admin.");
    } finally {
      setUploading(false);
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

  if (loading) return <div className="py-12 text-center font-medium" style={{color: '#ffffff99'}}>Loading dishes...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold" style={{color: '#ffffff'}}>Dishes Gallery</h2>
          <p className="text-base mt-2 font-medium" style={{color: '#ffffff99'}}>Manage dishes displayed in the Curated Plates section</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={18} /> Add Dish
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
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Title *</label>
              <input 
                type="text" 
                required 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium"
                placeholder="e.g. Jollof Rice"
                style={{color: '#ffffff'}}
              />
            </div>

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
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Description (Optional)</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent font-medium h-24 resize-none"
                placeholder="Brief description of the dish..."
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
                setFormData({ title: '', description: '', imageUrl: '' });
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
                  Save Dish
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map(dish => (
          <div key={dish.id} className="group relative bg-brand-bg rounded-xl overflow-hidden border-2 border-brand-accent/20 shadow-sm hover:shadow-lg transition-all">
            <div className="aspect-square bg-brand-bg/50">
              <img src={dish.imageurl} alt={dish.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold truncate" style={{color: '#ffffff'}}>{dish.title}</h3>
              {dish.description && <p className="text-sm line-clamp-2 mt-1" style={{color: '#ffffff99'}}>{dish.description}</p>}
            </div>
            <button 
              onClick={() => handleDelete(dish.id)}
              className="absolute top-3 right-3 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {dishes.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-brand-bg/30 rounded-2xl border-2 border-dashed border-brand-accent/30">
            <p className="text-lg font-bold" style={{color: '#ffffff99'}}>No dishes added yet.</p>
            <p className="text-base mt-1 font-medium" style={{color: '#ffffff99'}}>Click "Add Dish" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
