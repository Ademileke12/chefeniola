import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  reviewText: string;
  imageUrl?: string;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else if (data) {
        setReviews(data as Review[]);
      }
    };

    fetchReviews();

    const channel = supabase
      .channel('reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        fetchReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayReviews = reviews.length > 0 ? reviews : [
    { id: '1', customerName: 'Amina B.', reviewText: 'Chef Eniola catered our wedding and the food was absolutely spectacular. Every guest was raving about the Jollof!' },
    { id: '2', customerName: 'David K.', reviewText: 'An unforgettable dining experience. The attention to detail and the fusion of flavors is unmatched.' },
    { id: '3', customerName: 'Sarah T.', reviewText: 'Professional, warm, and incredibly talented. She brought our dinner party to life.' },
  ];

  const nextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % displayReviews.length);
  };

  const prevReview = () => {
    setCurrentIndex((prev) => (prev - 1 + displayReviews.length) % displayReviews.length);
  };

  return (
    <section id="reviews" className="py-32 bg-brand-bg relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-brand-accent/5 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-accent/5 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-serif"
          >
            Client <span className="italic text-brand-accent">Stories</span>
          </motion.h2>
        </div>

        <div className="relative bg-brand-surface glass rounded-[3rem] p-8 md:p-16 shadow-2xl border border-white/5">
          <Quote className="absolute top-8 left-8 md:top-12 md:left-12 w-12 h-12 text-brand-accent/20" />
          
          <div className="min-h-[200px] flex items-center justify-center text-center px-4 md:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <p className="text-xl md:text-3xl font-serif leading-relaxed mb-8 text-brand-ink/90">
                  "{displayReviews[currentIndex].reviewText}"
                </p>
                <div className="flex items-center gap-4">
                  {displayReviews[currentIndex].imageUrl && (
                    <img 
                      src={displayReviews[currentIndex].imageUrl} 
                      alt={displayReviews[currentIndex].customerName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-accent/50"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <p className="text-sm uppercase tracking-widest font-medium text-brand-accent">
                    — {displayReviews[currentIndex].customerName}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mt-12">
            <button 
              onClick={prevReview}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-brand-accent hover:text-white hover:border-brand-accent transition-all duration-300 transform hover:scale-110"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextReview}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-brand-accent hover:text-white hover:border-brand-accent transition-all duration-300 transform hover:scale-110"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
