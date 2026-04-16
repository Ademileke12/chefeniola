import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';

interface Dish {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
}

export default function DishesGallery() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDishes = async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching dishes:', error);
      } else if (data) {
        setDishes(data as Dish[]);
      }
      setLoading(false);
    };

    fetchDishes();

    const channel = supabase
      .channel('dishes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, () => {
        fetchDishes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Fallback dishes if none in database
  const displayDishes = dishes.length > 0 ? dishes : [
    { id: '1', title: 'Jollof Rice & Plantain', imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=800&auto=format&fit=crop' },
    { id: '2', title: 'Suya Spiced Steak', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop' },
    { id: '3', title: 'Egusi Soup', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=800&auto=format&fit=crop' },
    { id: '4', title: 'Pounded Yam', imageUrl: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?q=80&w=800&auto=format&fit=crop' },
  ];

  return (
    <section id="menu" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.2em] text-brand-accent mb-4 font-medium"
          >
            Culinary Creations
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif"
          >
            Curated <span className="italic">Plates</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {displayDishes.map((dish, index) => (
            <motion.div
              key={dish.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`group relative overflow-hidden rounded-[2rem] aspect-square md:aspect-[4/5] ${index % 2 !== 0 ? 'md:mt-24' : ''}`}
            >
              <img
                src={dish.imageUrl}
                alt={dish.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                <h3 className="text-white font-serif text-3xl mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  {dish.title}
                </h3>
                {dish.description && (
                  <p className="text-white/80 text-sm font-light translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                    {dish.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
