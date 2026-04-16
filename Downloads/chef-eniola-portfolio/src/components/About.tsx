import React from 'react';
import { motion } from 'motion/react';

export default function About() {
  return (
    <section id="about" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        
        {/* Image Column */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="aspect-[3/4] rounded-[2rem] overflow-hidden"
          >
            <img
              src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?q=80&w=1000&auto=format&fit=crop"
              alt="Chef Eniola plating a dish"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          {/* Decorative floating element */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-brand-ink/20 flex items-center justify-center bg-brand-bg hidden md:flex"
          >
            <p className="text-xs uppercase tracking-widest text-center leading-relaxed">
              Crafting <br /> Culinary <br /> Art
            </p>
          </motion.div>
        </div>

        {/* Text Column */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-serif mb-8"
          >
            A Passion for <br />
            <span className="italic text-brand-accent">Flavor & Culture</span>
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 text-brand-ink/80 leading-relaxed font-light text-lg"
          >
            <p>
              My journey began in the vibrant kitchens of Nigeria, where the aroma of spices and the rhythm of cooking were the backdrop to my childhood. Today, I bring that same warmth and authenticity to every table I serve.
            </p>
            <p>
              As a personal chef, I don't just cook food; I curate experiences. Whether it's an intimate dinner or a grand celebration, my goal is to elevate traditional flavors with modern techniques, creating dishes that are as visually stunning as they are delicious.
            </p>
            <p>
              Every ingredient is carefully selected, every plate is a canvas, and every meal is a story waiting to be shared.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Stylized_signature_sample.svg/1200px-Stylized_signature_sample.svg.png" 
              alt="Chef Eniola Signature" 
              className="h-16 opacity-60 mix-blend-multiply"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

      </div>
    </section>
  );
}
