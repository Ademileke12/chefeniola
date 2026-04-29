import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Trash2, Plus, Upload, AlertCircle } from 'lucide-react';
import { compressImage } from '../../lib/imageOptimizer';
import DeleteConfirmModal from './DeleteConfirmModal';

interface GalleryImage {
  id: string;
  imageurl: string;
  createdat: string;
}

export default function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchImages();

    const channel = supabase
      .channel('admin_gallery_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, fetchImages)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('createdat', { ascending: false });

    if (!error && data) {
      setImages(data as GalleryImage[]);
    }
    setLoading(false);
  };

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
    const filePath = `gallery/${fileName}`;

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

    if (uploadMode === 'url' && !imageUrl) {
      setError('Please enter an image URL');
      return;
    }
    
    setUploading(true);
    try {
      let finalImageUrl = imageUrl;

      if (uploadMode === 'file' && imageFile) {
        finalImageUrl = await uploadImageFile(imageFile);
      }

      const { error } = await supabase.from('gallery').insert([{
        imageurl: finalImageUrl
      }]);
      
      if (error) throw error;
      setImageUrl('');
      setImageFile(null);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Failed to add image:", error);
      setError(error.message || "Failed to add image. Make sure you are an admin.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await supabase.from('gallery').delete().eq('id', itemToDelete);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete image:", error);
      setError('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="py-12 text-center font-medium text-base" style={{color: '#ffffff99'}}>Loading gallery...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold" style={{color: '#ffffff'}}>Visual Menu Gallery</h2>
          <p className="text-base mt-2 font-medium" style={{color: '#ffffff99'}}>Manage images displayed in the Visual Menu section</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-accent text-brand-bg rounded-xl text-sm font-semibold hover:bg-brand-accent/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus size={18} /> Add Image
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

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Upload Method</label>
            <div className="flex gap-4">
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
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>
                Image File *
              </label>
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
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{color: '#ffffff'}}>Image URL *</label>
              <input 
                type="url" 
                required 
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-brand-accent/30 bg-brand-bg/50 focus:outline-none focus:ring-2 focus:ring-brand-accent text-base font-medium"
                placeholder="https://... or /gl/photo.jpg"
                style={{color: '#ffffff'}}
              />
              <p className="text-sm mt-2 font-medium" style={{color: '#ffffff99'}}>
                Enter a full URL or a local path like /gl/photo_name.jpg
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => {
                setIsAdding(false);
                setError('');
                setImageFile(null);
                setImageUrl('');
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
                  Save Image
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map(image => (
          <div key={image.id} className="group relative bg-brand-bg rounded-xl overflow-hidden border-2 border-brand-accent/20 shadow-sm hover:shadow-lg transition-all aspect-square">
            <img 
              src={image.imageurl} 
              alt="Gallery" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
            />
            <button 
              onClick={() => handleDelete(image.id)}
              className="absolute top-2 right-2 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 font-bold"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {images.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-brand-bg/30 rounded-2xl border-2 border-dashed border-brand-accent/30">
            <p className="text-lg font-bold" style={{color: '#ffffff99'}}>No images added yet.</p>
            <p className="text-base mt-1 font-medium" style={{color: '#ffffff99'}}>Click "Add Image" to get started.</p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image from the gallery? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </div>
  );
}
