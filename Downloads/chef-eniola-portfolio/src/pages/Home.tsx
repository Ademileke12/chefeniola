import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import LocalGallery from '../components/LocalGallery';
import Reviews from '../components/Reviews';
import ImageReviews from '../components/ImageReviews';
import LocalVideos from '../components/LocalVideos';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink selection:bg-brand-accent selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <LocalGallery />
        <Reviews />
        <ImageReviews />
        <LocalVideos />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

