import React from 'react';
import { motion } from 'motion/react';
import { Instagram, Music2 } from 'lucide-react'; // Music2 as a fallback for TikTok icon

export default function Footer() {
  return (
    <footer className="bg-brand-bg py-12 border-t border-brand-ink/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-serif text-2xl font-medium"
        >
          Chef Eniola
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-6"
        >
          <a href="#" className="w-10 h-10 rounded-full border border-brand-ink/20 flex items-center justify-center hover:bg-brand-ink hover:text-brand-bg transition-colors">
            <Instagram size={18} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full border border-brand-ink/20 flex items-center justify-center hover:bg-brand-ink hover:text-brand-bg transition-colors">
            <Music2 size={18} />
          </a>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xs uppercase tracking-widest text-brand-ink/60"
        >
          © {new Date().getFullYear()} Chef Eniola. All rights reserved.
        </motion.div>
      </div>
    </footer>
  );
}
