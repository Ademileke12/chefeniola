import React from 'react';
import { motion } from 'motion/react';

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Image with Parallax/Scale effect */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      >
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img
          src="/gl/image.png"
          alt="Chef Eniola preparing a meal"
          className="w-full h-full object-cover object-[center_15%]"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 text-center px-6 max-w-4xl mx-auto mt-20">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white/80 text-sm md:text-base uppercase tracking-[0.3em] mb-6 font-medium"
        >
          Premium Personal Chef
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-white font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.1] font-light"
        >
          Hello, I am <br className="hidden md:block" />
          <span className="italic font-medium">Chef Eniola</span> <br className="hidden md:block" />
          from Nigeria
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16"
        >
          <a
            href="#menu"
            className="inline-flex items-center justify-center w-32 h-32 rounded-full border border-white/30 text-white text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-500"
          >
            Explore
          </a>
        </motion.div>
      </div>
    </section>
  );
}
