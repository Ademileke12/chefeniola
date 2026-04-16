'use client';

import { motion, useScroll, useTransform, useSpring, AnimatePresence, useInView } from 'motion/react';
import { useRef, useState, useEffect, useId } from 'react';
import Image from 'next/image';
import { ChevronDown, Cpu, Factory, Zap, Globe, Rocket, ShieldCheck, Gavel, ArrowRight, Activity } from 'lucide-react';

function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"], .cursor-pointer')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <div className="hidden md:block pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] mix-blend-screen"
        animate={{
          x: mousePosition.x - 4,
          y: mousePosition.y - 4,
          scale: isHovering ? 0 : 1,
          opacity: isHovering ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 1000, damping: 40, mass: 0.1 }}
      />
      <motion.div
        className="absolute top-0 left-0 w-12 h-12 border border-red-500/40 rounded-full flex items-center justify-center mix-blend-screen"
        animate={{
          x: mousePosition.x - 24,
          y: mousePosition.y - 24,
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0)",
          borderColor: isHovering ? "rgba(239,68,68,0.8)" : "rgba(239,68,68,0.4)",
        }}
        transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
      />
    </div>
  );
}

function TelemetryOverlay() {
  const [data, setData] = useState({ lat: '0.0000', lng: '0.0000', speed: '0.00', temp: '0.0' });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setData({
        lat: (Math.random() * 180 - 90).toFixed(4),
        lng: (Math.random() * 360 - 180).toFixed(4),
        speed: (Math.random() * 100).toFixed(2),
        temp: (Math.random() * 50 + 20).toFixed(1)
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-32 left-8 font-mono text-[10px] text-white/40 tracking-widest flex flex-col gap-1 pointer-events-none z-20 hidden md:flex">
      <div className="flex items-center gap-2 mb-2 text-white/60"><Activity size={12} className="animate-pulse" /> SYS.DIAGNOSTICS</div>
      <div>LAT: {data.lat}</div>
      <div>LNG: {data.lng}</div>
      <div>VEL: {data.speed} U/s</div>
      <div>CORE: {data.temp} °C</div>
      <div className="mt-4 text-red-500/80 animate-pulse border border-red-500/30 px-2 py-1 bg-red-500/10 inline-block w-max">AUTONOMOUS MODE ENGAGED</div>
    </div>
  );
}

function CinematicMedia({ src, videoSrc, alt, className = "", redTint = false }: { src: string, videoSrc?: string, alt: string, className?: string, redTint?: boolean }) {
  const sysOp = useId().replace(/[^0-9]/g, '').slice(-4) || '0451';
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const isInView = useInView(containerRef, { margin: "200px 0px" });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleResize = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    handleResize(mediaQuery);
    mediaQuery.addEventListener?.('change', handleResize);
    return () => mediaQuery.removeEventListener?.('change', handleResize);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isInView && !isMobile) {
      videoElement.currentTime = 0;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [isInView, isMobile]);

  const showVideo = videoSrc && !isMobile;

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden group ${className}`}>
      <motion.div
        animate={{
          scale: [1.05, 1.15, 1.05],
          rotate: [0, 1, -1, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0"
      >
        {showVideo ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={src}
            loop
            muted
            autoPlay
            playsInline
            preload="metadata"
            controls={false}
            className={`object-cover w-full h-full transition-all duration-1000 ${redTint ? 'grayscale contrast-125 brightness-75' : 'grayscale group-hover:grayscale-0'}`}
          />
        ) : (
          <Image 
            src={src} 
            alt={alt} 
            fill 
            className={`object-cover transition-all duration-1000 ${redTint ? 'grayscale contrast-125 brightness-75' : 'grayscale group-hover:grayscale-0'}`} 
            referrerPolicy="no-referrer"
          />
        )}
      </motion.div>
      {/* Overlays for Video/HUD effect */}
      <div className={`absolute inset-0 mix-blend-overlay pointer-events-none ${redTint ? 'bg-red-900/40' : 'bg-blue-900/10'}`} />
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
      
      {/* Scanline */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-full h-8 bg-white/5 blur-md animate-scanline" />
      </div>

      {/* HUD Elements */}
      <div className="absolute top-6 left-6 font-mono text-[10px] text-white/50 tracking-widest z-10 flex items-center gap-2">
        REC <span className="animate-pulse text-red-500">●</span>
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[10px] text-white/50 tracking-widest z-10">
        SYS.OP // {sysOp}
      </div>
      
      {/* Crosshairs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/10 rounded-full flex items-center justify-center pointer-events-none opacity-50">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/20 -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/20 -translate-y-1/2" />
      </div>
    </div>
  );
}

export default function RoboticsEvolution() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);

  return (
    <main ref={containerRef} className="relative bg-black selection:bg-red-500/30 selection:text-red-200 md:cursor-none">
      <CustomCursor />
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-red-500 z-50 origin-left shadow-[0_0_10px_rgba(239,68,68,0.8)]"
        style={{ scaleX }}
      />

      {/* Fixed Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <TelemetryOverlay />
        
        <motion.div 
          style={{ 
            y: heroY,
            scale: heroScale
          }}
          className="absolute inset-0 z-0"
        >
          <CinematicMedia 
            src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2000&auto=format&fit=crop" 
            videoSrc="/arm-optimized.mp4"
            alt="Robotics Evolution" 
          />
        </motion.div>

        <div className="relative z-10 text-center px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-[10px] font-mono tracking-[0.4em] uppercase border border-white/10 rounded-full bg-black/50 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              System Online: Evolution Protocol
            </motion.div>
            
            <h1 className="font-display text-[12vw] md:text-[10vw] font-black tracking-tighter leading-[0.85] mb-12 uppercase hover-glitch transition-colors duration-300">
              <span className="block overflow-hidden">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  How Far
                </motion.span>
              </span>
              <span className="block overflow-hidden text-white/30">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  Robotics
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  Has Come
                </motion.span>
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="font-sans text-sm md:text-base text-white/40 max-w-xl mx-auto font-light leading-relaxed tracking-[0.2em] uppercase"
            >
              A cinematic exploration of synthetic intelligence and mechanical transcendence.
            </motion.p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4"
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/20">Initiate Scroll</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-[1px] h-12 bg-gradient-to-b from-red-500/50 to-transparent"
          />
        </motion.div>
      </section>

      {/* Origin Section */}
      <Section 
        number="01"
        title="MECHANICAL ROOTS"
        description="The dawn of automation began with clockwork precision. Early mechanics sought to replicate the complexity of life through gears, steam, and the first whispers of programmed motion."
        icon={<Cpu className="w-5 h-5" />}
        image="https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=1200&auto=format&fit=crop"
        videoSrc="https://assets.mixkit.co/videos/preview/mixkit-cogs-and-gears-spinning-in-a-machine-4163-large.mp4"
        align="left"
      />

      {/* Industrial Revolution */}
      <Section 
        number="02"
        title="THE ASSEMBLY LINE"
        description="Robotics entered the physical world at scale, transforming global industry. Repetitive automation became the heartbeat of the modern world, redefining the limits of production."
        icon={<Factory className="w-5 h-5" />}
        image="https://images.unsplash.com/photo-1613539246066-78db6ec4ff0f?q=80&w=1200&auto=format&fit=crop"
        videoSrc="https://assets.mixkit.co/videos/preview/mixkit-welding-robot-arm-in-a-car-factory-47630-large.mp4"
        align="right"
      />

      {/* Intelligence Era */}
      <Section 
        number="03"
        title="THE NEURAL SHIFT"
        description="The transition from rigid programming to autonomous learning. Machines began to perceive, interpret, and react to the chaotic variables of the human environment."
        icon={<Zap className="w-5 h-5" />}
        image="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop"
        videoSrc="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-blue-network-3160-large.mp4"
        align="left"
      />

      {/* Judgment Section (Inspired by Gavel) */}
      <section className="relative py-24 lg:py-40 px-4 overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <CinematicMedia 
            src="https://images.unsplash.com/photo-1633412802994-5c058f151b66?q=80&w=2000&auto=format&fit=crop" 
            videoSrc="https://assets.mixkit.co/videos/preview/mixkit-white-robot-head-looking-around-42721-large.mp4"
            alt="Judgment" 
            redTint={true}
          />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-500 mb-8 md:mb-12 shadow-[0_0_30px_rgba(239,68,68,0.2)] backdrop-blur-md"
            >
              <Gavel size={32} className="md:w-10 md:h-10" />
            </motion.div>
            <h2 className="font-display text-4xl md:text-6xl lg:text-8xl font-black mb-6 md:mb-8 tracking-tighter uppercase text-glow">
              The Protocol <br />
              <span className="text-red-500">Of Judgment</span>
            </h2>
            <p className="text-white/70 text-base md:text-lg lg:text-xl font-light max-w-3xl mx-auto leading-relaxed mb-12 md:mb-16 bg-black/40 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
              As robotics evolves, the question shifts from capability to authority. Who holds the gavel in a world governed by algorithms? The intersection of ethics, law, and synthetic logic.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <StatCard label="Decision Speed" value="0.002ms" />
              <StatCard label="Ethical Bias" value="0.00%" />
              <StatCard label="Authority Level" value="Level 9" />
            </div>
          </div>
        </div>
      </section>

      {/* Present Day */}
      <Section 
        number="04"
        title="HUMANOID INTEGRATION"
        description="Today, robotics walks among us. From healthcare to deep-space exploration, humanoid systems are no longer a vision of the future—they are the architects of the present."
        icon={<Globe className="w-5 h-5" />}
        image="https://images.unsplash.com/photo-1535378917042-10a22c95931a?q=80&w=1200&auto=format&fit=crop"
        videoSrc="https://assets.mixkit.co/videos/preview/mixkit-futuristic-technology-abstract-background-3158-large.mp4"
        align="right"
      />

      {/* Future Vision */}
      <FutureVisionSection />

      {/* Final Reflection */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/20" />
        <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 2 }}
          className="max-w-4xl relative z-10"
        >
          <h3 className="font-display text-3xl md:text-5xl lg:text-7xl font-light mb-8 md:mb-12 text-white/90 leading-tight">
            &ldquo;We are not just building tools. <br />
            We are birthing a new <span className="font-black italic text-red-500 text-glow">consciousness</span>.&rdquo;
          </h3>
          <div className="w-16 md:w-24 h-[1px] bg-white/20 mx-auto mb-12 md:mb-16" />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 md:px-12 py-4 bg-white text-black font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
          >
            Join The Evolution
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 lg:py-20 px-4 border-t border-white/5 relative overflow-hidden bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-display text-2xl font-bold tracking-tighter mb-2 uppercase">Robotics Evolution</h4>
            <p className="font-mono text-[8px] text-white/40 uppercase tracking-[0.4em]">A Cinematic Experience &bull; v3.0.0</p>
          </div>
          <div className="flex gap-8">
            {['Twitter', 'Instagram', 'LinkedIn'].map((social) => (
              <a key={social} href="#" className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-red-500 transition-colors">
                {social}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

function Section({ number, title, description, icon, image, videoSrc, align }: any) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section ref={ref} className="relative py-24 lg:py-40 px-4 min-h-screen flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}>
          <motion.div 
            initial={{ opacity: 0, x: align === 'left' ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className={align === 'right' ? 'lg:order-2' : ''}
          >
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-10">
              <span className="font-display text-5xl md:text-6xl font-black text-white/10 leading-none">{number}</span>
              <div className="w-8 md:w-12 h-[1px] bg-red-500/50" />
              <div className="p-2 md:p-3 rounded-full bg-white/5 border border-white/10 text-white/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                {icon}
              </div>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-7xl font-black mb-6 md:mb-8 tracking-tighter uppercase leading-[0.9] hover-glitch">
              {title}
            </h2>
            <p className="text-white/50 text-base md:text-lg font-light leading-relaxed mb-8 md:mb-12 max-w-xl tracking-wide">
              {description}
            </p>
            <button className="group flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-white/60 hover:text-red-500 active:text-red-400 transition-colors active:scale-95 origin-left">
              <span>Explore Archive</span>
              <div className="w-8 h-[1px] bg-white/20 group-hover:w-16 group-hover:bg-red-500 transition-all duration-500" />
            </button>
          </motion.div>

          <motion.div 
            style={{ y }}
            className={`relative aspect-[4/5] md:aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${align === 'right' ? 'lg:order-1' : ''}`}
          >
            <CinematicMedia src={image} videoSrc={videoSrc} alt={title} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ icon, title, text }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col sm:flex-row gap-4 sm:gap-8 group"
    >
      <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-red-500 group-hover:border-red-500/30 group-hover:bg-red-500/10 transition-all duration-500 shadow-[0_0_0_rgba(239,68,68,0)] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]">
        {icon}
      </div>
      <div>
        <h4 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-3 tracking-tight uppercase group-hover:text-white transition-colors">{title}</h4>
        <p className="text-white/40 text-sm sm:text-base font-light leading-relaxed tracking-wide">{text}</p>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <div className="p-6 md:p-8 rounded-2xl md:rounded-3xl bg-black/50 border border-white/10 backdrop-blur-md text-center hover:border-red-500/30 transition-colors group">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2 md:mb-4 group-hover:text-red-500/80 transition-colors">{label}</p>
      <p className="font-display text-3xl md:text-4xl font-black text-white uppercase group-hover:text-glow transition-all">{value}</p>
    </div>
  );
}

function FutureVisionSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Parallax values
  const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section ref={ref} className="relative py-24 lg:py-40 px-4 min-h-screen flex items-center overflow-hidden bg-black">
      {/* Parallax Background */}
      <motion.div 
        style={{ y: bgY }}
        className="absolute inset-0 z-0 w-full h-[140%] -top-[20%]"
      >
        <CinematicMedia 
          src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=1400&auto=format&fit=crop" 
          videoSrc="https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4"
          alt="Future Vision" 
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </motion.div>

      {/* Foreground Content */}
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          <motion.div style={{ y: contentY }}>
            <span className="font-mono text-[10px] tracking-[0.5em] text-red-500 uppercase mb-4 md:mb-6 block">Future Horizon</span>
            <h2 className="font-display text-5xl md:text-6xl lg:text-8xl font-black mb-8 md:mb-12 tracking-tighter leading-none uppercase hover-glitch">
              The <br />
              <span className="text-white/20">Singularity</span>
            </h2>
            <div className="space-y-8 md:space-y-12">
              <FeatureItem 
                icon={<Rocket />}
                title="Galactic Expansion"
                text="Autonomous swarms building the infrastructure for a multi-planetary civilization."
              />
              <FeatureItem 
                icon={<ShieldCheck />}
                title="Synthetic Symbiosis"
                text="The seamless merger of biological intuition and computational perfection."
              />
            </div>
          </motion.div>
          
          <motion.div style={{ y: contentY }} className="flex justify-center lg:justify-end">
            <div className="flex items-center gap-4 cursor-pointer group active:scale-95 transition-transform">
              <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all duration-500 group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] relative">
                <div className="absolute inset-0 rounded-full border border-red-500/0 group-hover:border-red-500/50 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <ArrowRight className="w-6 h-6 text-white group-hover:text-red-400 transition-colors relative z-10" />
              </div>
              <span className="font-mono text-xs uppercase tracking-widest group-hover:text-red-400 transition-colors">View Concept</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
