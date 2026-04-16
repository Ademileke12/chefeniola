import React from 'react';
import { motion } from 'motion/react';

const videos = [
  'IMG_5069.MP4', 'IMG_5074.MP4', 'IMG_5075.MP4', 'IMG_5078.MP4',
  'IMG_5085.MP4', 'IMG_5086.MP4', 'IMG_5088.MP4', 'IMG_5095.MP4'
];

export default function LocalVideos() {
  return (
    <section id="kitchen-videos" className="py-32 bg-brand-bg text-white relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 relative z-10">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs uppercase tracking-[0.2em] text-brand-accent mb-4 font-medium"
            >
              Behind The Scenes
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-serif text-white/90"
            >
              In The <span className="italic text-brand-accent">Kitchen</span>
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {videos.map((vid, index) => (
            <motion.div
              key={vid}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-[2rem] aspect-[9/16] bg-brand-surface glass border border-white/5 shadow-2xl shadow-black/50"
            >
              <video
                src={`/gl/${vid}`}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-brand-accent/20 rounded-[2rem] group-hover:ring-brand-accent/50 transition-all duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
