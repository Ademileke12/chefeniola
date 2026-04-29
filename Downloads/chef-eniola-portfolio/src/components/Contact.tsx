import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, MessageCircle, Sparkles } from 'lucide-react';

export default function Contact() {
  const whatsappNumber = '+2349078061757';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\+/g, '')}`;

  const services = [
    {
      icon: Users,
      title: 'Private Dining',
      description: 'Intimate culinary experiences crafted exclusively for you and your guests',
      features: ['Personalized Menu', 'In-Home Service', 'Dietary Accommodations']
    },
    {
      icon: Calendar,
      title: 'Event Catering',
      description: 'Elevate your celebrations with authentic Nigerian cuisine and modern flair',
      features: ['Weddings & Parties', 'Corporate Events', 'Custom Packages']
    }
  ];

  return (
    <section id="contact" className="py-32 bg-brand-bg relative overflow-hidden border-t border-brand-ink/10">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-brand-accent/10 blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-brand-accent/5 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/20 rounded-full mb-6"
          >
            <Sparkles size={20} className="text-brand-accent" />
            <span className="text-sm font-semibold text-brand-accent uppercase tracking-wider">
              Let's Create Magic
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-serif text-white mb-6"
          >
            Book My <span className="italic text-brand-accent">Services</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-2xl mx-auto"
          >
            Whether it's an intimate dinner or a grand celebration, let's bring your culinary vision to life
          </motion.p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative bg-brand-surface glass rounded-3xl p-8 md:p-10 border border-white/10 hover:border-brand-accent/30 transition-all duration-500 shadow-xl hover:shadow-2xl"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 flex items-center justify-center mb-6 group-hover:bg-brand-accent/30 transition-colors duration-300">
                <service.icon size={32} className="text-brand-accent" />
              </div>

              {/* Content */}
              <h3 className="text-2xl md:text-3xl font-serif text-white mb-4">
                {service.title}
              </h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                {service.description}
              </p>

              {/* Features */}
              <ul className="space-y-3">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white/60 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-accent/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center bg-gradient-to-br from-brand-accent/10 to-brand-accent/5 rounded-3xl p-12 md:p-16 border border-brand-accent/20"
        >
          <h3 className="text-3xl md:text-4xl font-serif text-white mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-white/70 mb-8 text-lg max-w-xl mx-auto">
            Let's discuss your event details, menu preferences, and create an unforgettable culinary experience together
          </p>
          
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <MessageCircle size={24} />
            <span>Chat on WhatsApp</span>
          </motion.a>

          <p className="text-white/50 text-sm mt-6">
            Available for bookings • Quick response guaranteed
          </p>
        </motion.div>
      </div>
    </section>
  );
}
