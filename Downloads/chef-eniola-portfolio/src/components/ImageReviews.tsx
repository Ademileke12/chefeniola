import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { MessageCircle } from 'lucide-react';
import { optimizeSupabaseImage } from '../lib/imageOptimizer';

interface ImageReview {
  id: string;
  imageurl: string;
  customername?: string;
  createdat: string;
}

export default function ImageReviews() {
  const [imageReviews, setImageReviews] = useState<ImageReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImageReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('image_reviews')
          .select('*')
          .order('createdat', { ascending: false });

        if (error) {
          console.error('Error fetching image reviews:', error);
        } else if (data && data.length > 0) {
          setImageReviews(data as ImageReview[]);
        }
      } catch (error) {
        console.error('Error fetching image reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImageReviews();

    const channel = supabase
      .channel('image_reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'image_reviews' }, () => {
        fetchImageReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || imageReviews.length === 0) return null;

  return (
    <section id="user-reviews" className="py-32 bg-brand-bg relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/20 rounded-full mb-6"
          >
            <MessageCircle size={20} className="text-brand-accent" />
            <span className="text-sm font-semibold text-brand-accent uppercase tracking-wider">
              What Customers Say
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-serif text-white"
          >
            User <span className="italic text-brand-accent">Reviews</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 mt-4 text-lg max-w-2xl mx-auto"
          >
            Real conversations and moments shared by our amazing customers
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {imageReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 bg-brand-surface border border-white/10"
            >
              <img
                src={optimizeSupabaseImage(review.imageurl, { width: 600, quality: 80 })}
                alt={review.customername || 'Customer review'}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Customer name badge */}
              {review.customername && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-brand-surface/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10">
                    <p className="text-white text-sm font-semibold truncate">
                      {review.customername}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Chat icon indicator */}
              <div className="absolute top-4 right-4 w-10 h-10 bg-brand-accent/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                <MessageCircle size={18} className="text-white" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-white/70 text-base">
            Want to share your experience? Message us on WhatsApp!
          </p>
        </motion.div>
      </div>
    </section>
  );
}
