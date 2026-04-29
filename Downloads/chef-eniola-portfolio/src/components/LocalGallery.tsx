import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { supabase } from '../supabase';

interface GalleryImage {
  id: string;
  imageurl: string;
  createdat: string;
}

export default function LocalGallery() {
  const containerRef = useRef<HTMLElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track scroll progress relative to the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Unique parallax speeds for 4 columns
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  
  const transforms = [y1, y2, y3, y4];

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('createdat', { ascending: false });

        if (error) {
          console.error('Error fetching gallery:', error);
        } else if (data && data.length > 0) {
          setImages(data as GalleryImage[]);
        }
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();

    try {
      const channel = supabase
        .channel('gallery_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
          fetchImages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Failed to subscribe to gallery changes:', err);
    }
  }, []);

  // Fallback photos if none in database
  const fallbackPhotos = [
    'photo_1_2026-04-14_13-04-14.jpg', 'photo_2_2026-04-14_13-04-14.jpg', 
    'photo_3_2026-04-14_13-04-14.jpg', 'photo_4_2026-04-14_13-04-14.jpg',
    'photo_9_2026-04-14_13-04-14.jpg', 'photo_10_2026-04-14_13-04-14.jpg',
    'photo_11_2026-04-14_13-04-14.jpg', 'photo_12_2026-04-14_13-04-14.jpg',
    'photo_13_2026-04-14_13-04-14.jpg', 'photo_14_2026-04-14_13-04-15.jpg',
    'photo_15_2026-04-14_13-04-15.jpg', 'photo_16_2026-04-14_13-04-15.jpg',
    'photo_17_2026-04-14_13-04-15.jpg', 'photo_18_2026-04-14_13-04-15.jpg',
    'photo_19_2026-04-14_13-04-15.jpg', 'photo_20_2026-04-14_13-04-15.jpg',
    'subs/photo_1_2026-04-27_15-59-26.jpg', 'subs/photo_2_2026-04-27_15-59-26.jpg',
    'subs/photo_3_2026-04-27_15-59-26.jpg', 'subs/photo_4_2026-04-27_15-59-26.jpg',
    'subs/photo_5_2026-04-27_15-59-26.jpg', 'subs/photo_6_2026-04-27_15-59-26.jpg',
    'subs/photo_7_2026-04-27_15-59-26.jpg', 'subs/photo_1_2026-04-27_16-06-28.jpg',
    'subs/photo_2_2026-04-27_16-06-28.jpg', 'subs/photo_3_2026-04-27_16-06-28.jpg',
    'subs/photo_4_2026-04-27_16-06-28.jpg', 'subs/photo_5_2026-04-27_16-06-28.jpg',
    'subs/photo_6_2026-04-27_16-06-28.jpg', 'subs/photo_7_2026-04-27_16-06-28.jpg',
    'subs/photo_8_2026-04-27_16-06-28.jpg'
  ];

  const displayPhotos = images.length > 0 
    ? images.map(img => img.imageurl) 
    : fallbackPhotos.map(p => `/gl/${p}`);

  // Distribute photos into 4 columns
  const cols = [
    displayPhotos.filter((_, i) => i % 4 === 0),
    displayPhotos.filter((_, i) => i % 4 === 1),
    displayPhotos.filter((_, i) => i % 4 === 2),
    displayPhotos.filter((_, i) => i % 4 === 3),
  ];

  return (
    <section id="gallery" ref={containerRef} className="py-24 md:py-40 bg-brand-surface relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full bg-brand-accent/20 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-32">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="text-xs uppercase tracking-[0.3em] text-brand-accent mb-6 font-medium"
          >
            Culinary Craft
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-serif text-white/90 tracking-tight"
          >
            Visual <span className="italic text-brand-accent">Menu</span>
          </motion.h2>
        </div>

        {/* Parallax Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 items-start pb-32 md:pb-64 -mx-4 px-4">
          {cols.map((col, colIndex) => (
            <motion.div
              key={colIndex}
              style={{ y: transforms[colIndex] }}
              className="flex flex-col gap-4 md:gap-8"
            >
              {col.map((photo, index) => (
                <motion.div
                  key={photo}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "200px" }}
                  transition={{ 
                    duration: 0.8, 
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  className="group relative overflow-hidden rounded-2xl glass shadow-2xl shadow-black/80 w-full"
                >
                  <img
                    src={photo}
                    className="w-full h-auto object-cover transform transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.15]"
                    loading="lazy"
                    alt={`Culinary craft ${index}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-700 ease-out" />
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fade out top and bottom ends so images don't randomly cut off */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-surface to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-brand-surface to-transparent z-20 pointer-events-none" />
    </section>
  );
}
