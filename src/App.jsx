import React, { useEffect, useState, useRef } from 'react';
import { 
  ArrowRight, 
  ExternalLink, 
  Github, 
  Mail, 
  Code2, 
  BookOpen, 
  Terminal, 
  Cpu,
  Smartphone
} from 'lucide-react';

// ============================================================================
// GLOBAL STYLES & UTILITIES
// ============================================================================
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;600;900&display=swap');
    
    html { scroll-behavior: auto; /* Dinonaktifkan untuk GSAP Scroll smoothening */ }

    body {
      font-family: 'Space Grotesk', sans-serif;
      background-color: #fdfdfd;
      color: #000000;
      overflow-x: hidden;
    }

    @media (min-width: 1024px) { body { cursor: none; } }
    
    ::-webkit-scrollbar { width: 8px; }
    @media (min-width: 768px) { ::-webkit-scrollbar { width: 14px; } }
    ::-webkit-scrollbar-track { background: #ffffff; border-left: 2px solid #000; }
    @media (min-width: 768px) { ::-webkit-scrollbar-track { border-left: 4px solid #000; } }
    ::-webkit-scrollbar-thumb { background: #ffde59; border: 2px solid #000; }
    @media (min-width: 768px) { ::-webkit-scrollbar-thumb { border: 4px solid #000; } }
    ::-webkit-scrollbar-thumb:hover { background: #ff5757; }

    ::selection { background-color: #5e17eb; color: white; }

    /* Shadow Neobrutalism */
    .brutal-shadow { box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); }
    .brutal-shadow-lg { box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); }
    
    @media (min-width: 768px) {
      .brutal-shadow { box-shadow: 8px 8px 0px 0px rgba(0,0,0,1); }
      .brutal-shadow-lg { box-shadow: 12px 12px 0px 0px rgba(0,0,0,1); }
    }

    /* Utilitas untuk Text Reveal */
    .word-wrap { display: inline-block; overflow: hidden; vertical-align: top; }
    .word-inner { display: inline-block; transform: translateY(100%); }
  `}} />
);

// ============================================================================
// CUSTOM HOOKS: GSAP LOADER & ANIMATIONS
// ============================================================================
const useGSAPLoader = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.gsap && window.ScrollTrigger) return setLoaded(true);
    const loadScript = (src) => new Promise((res, rej) => {
      const script = document.createElement('script');
      script.src = src; script.async = true; script.onload = res; script.onerror = rej;
      document.head.appendChild(script);
    });

    const init = async () => {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
        window.gsap.registerPlugin(window.ScrollTrigger);
        setLoaded(true);
      } catch (e) { console.error("GSAP Failed", e); }
    };
    init();
  }, []);
  return loaded;
};

// ============================================================================
// ANIMATION COMPONENTS (ReactBits Style)
// ============================================================================

// 1. Magnetic Button Wrapper (Tombol tertarik ke arah kursor)
const MagneticWrapper = ({ children, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.gsap || window.innerWidth < 1024) return;

    const xTo = window.gsap.quickTo(el, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
    const yTo = window.gsap.quickTo(el, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });

    const mouseMove = (e) => {
      const { clientX, clientY } = e;
      const { height, width, left, top } = el.getBoundingClientRect();
      const x = (clientX - (left + width / 2)) * 0.4; // Intensitas tarikan
      const y = (clientY - (top + height / 2)) * 0.4;
      xTo(x); yTo(y);
    };

    const mouseLeave = () => { xTo(0); yTo(0); };

    el.addEventListener("mousemove", mouseMove);
    el.addEventListener("mouseleave", mouseLeave);
    return () => { el.removeEventListener("mousemove", mouseMove); el.removeEventListener("mouseleave", mouseLeave); };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
};

// 2. 3D Tilt Card (Card miring mengikuti mouse)
const TiltCard = ({ children, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.gsap || window.innerWidth < 1024) return;

    const mouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPct = x / rect.width - 0.5;
      const yPct = y / rect.height - 0.5;

      window.gsap.to(el, {
        rotationY: xPct * 15, // Max miring 15 derajat
        rotationX: -yPct * 15,
        transformPerspective: 1000,
        ease: "power2.out",
        duration: 0.5
      });
    };

    const mouseLeave = () => {
      window.gsap.to(el, { rotationY: 0, rotationX: 0, ease: "elastic.out(1, 0.3)", duration: 1.5 });
    };

    el.addEventListener("mousemove", mouseMove);
    el.addEventListener("mouseleave", mouseLeave);
    return () => { el.removeEventListener("mousemove", mouseMove); el.removeEventListener("mouseleave", mouseLeave); };
  }, []);

  return <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>{children}</div>;
};

// 3. Animated Split Text
const AnimatedText = ({ text, className, id }) => {
  return (
    <div className={className} id={id}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="word-wrap inline-block mr-[0.25em]">
          <span className="word-inner">{word}</span>
        </span>
      ))}
    </div>
  );
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const CustomCursor = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    if (!window.gsap) return;
    const cursor = cursorRef.current;
    let mm = window.gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      window.gsap.set(cursor, { xPercent: -50, yPercent: -50 });
      const xTo = window.gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3" });
      const yTo = window.gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3" });

      const move = (e) => { xTo(e.clientX); yTo(e.clientY); };
      const hover = (e) => {
        if(e.target.closest('a') || e.target.closest('button')) {
          window.gsap.to(cursor, { scale: 1.5, rotation: 45, backgroundColor: "#ffde59", duration: 0.3, ease: "back.out(2)" });
        } else {
          window.gsap.to(cursor, { scale: 1, rotation: 0, backgroundColor: "rgba(255,255,255,0.8)", duration: 0.3 });
        }
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseover", hover);
      return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", hover); };
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={cursorRef} className="fixed top-0 left-0 w-8 h-8 border-4 border-black bg-white/80 rounded-full pointer-events-none z-[9999] hidden lg:block backdrop-blur-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
  );
};

const InteractiveGrid = () => {
  const bgRef = useRef(null);
  useEffect(() => {
    const handleMove = (e) => {
      if(!bgRef.current || window.innerWidth < 1024) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      window.gsap.to(bgRef.current, { x, y, duration: 1, ease: "power2.out" });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div 
      ref={bgRef}
      className="absolute inset-[-50px] pointer-events-none opacity-[0.07]"
      style={{
        backgroundImage: 'linear-gradient(to right, #000 2px, transparent 2px), linear-gradient(to bottom, #000 2px, transparent 2px)',
        backgroundSize: '40px 40px'
      }}
    />
  );
};

const Hero = ({ gsapLoaded }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!gsapLoaded || !containerRef.current) return;
    const gsap = window.gsap;
    const tl = gsap.timeline();

    // Text Reveal Animasi Ekstrem
    tl.to('.hero-title .word-inner', { 
      y: "0%", duration: 1, stagger: 0.1, ease: "expo.out", delay: 0.2 
    })
    .fromTo('.hero-badge', 
      { scale: 0, rotation: 15 }, 
      { scale: 1, rotation: -4, duration: 0.6, ease: "back.out(2)" }, "-=0.8"
    )
    .fromTo('.hero-desc', 
      { opacity: 0, x: -50, skewX: 10 }, 
      { opacity: 1, x: 0, skewX: 0, duration: 0.8, ease: "power4.out" }, "-=0.6"
    )
    .fromTo('.hero-cta', 
      { y: 50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.5)" }, "-=0.4"
    );

    // Parallax Decor Elements on Scroll
    gsap.to('.decor-fast', { yPercent: -150, ease: "none", scrollTrigger: { trigger: containerRef.current, scrub: true }});
    gsap.to('.decor-slow', { yPercent: -50, rotation: 45, ease: "none", scrollTrigger: { trigger: containerRef.current, scrub: true }});

  }, [gsapLoaded]);

  return (
    <section ref={containerRef} className="relative min-h-[90vh] md:min-h-screen flex items-center pt-24 pb-12 overflow-hidden bg-white border-b-[6px] md:border-b-8 border-black">
      <InteractiveGrid />
      
      <div className="max-w-7xl mx-auto px-5 md:px-6 relative z-10 w-full flex flex-col items-start">
        
        <div className="hero-badge inline-block px-4 py-1.5 md:px-6 md:py-2 text-xs md:text-base bg-[#ffde59] border-[3px] md:border-4 border-black font-black uppercase tracking-widest mb-6 md:mb-8 brutal-shadow origin-left">
          Software Engineer x AI
        </div>

        <h1 className="hero-title text-[3.5rem] leading-[0.85] sm:text-7xl md:text-[6rem] lg:text-[8rem] font-black uppercase tracking-tighter mb-6 md:mb-8 font-['Inter'] w-full">
          <AnimatedText text="Ricky Maulana." className="text-[#ff5757] drop-shadow-[3px_3px_0px_#000] md:drop-shadow-[6px_6px_0px_#000]" />
        </h1>

        <div className="hero-desc max-w-2xl mb-8 md:mb-12 bg-white p-4 md:p-6 border-[3px] md:border-4 border-black brutal-shadow-lg relative w-full md:w-auto">
          <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-6 h-6 md:w-8 md:h-8 bg-[#4ade80] border-[3px] md:border-4 border-black rounded-full animate-pulse" />
          <p className="text-lg md:text-2xl font-bold mb-2">"Building AI Tools for Students & Researchers"</p>
          <p className="text-gray-600 font-semibold uppercase tracking-wider text-[10px] md:text-sm border-t-2 border-black/10 pt-2">Fokus pada efisiensi skripsi & produktivitas akademik</p>
        </div>

        <MagneticWrapper className="hero-cta inline-block">
          <a href="#tools" className="group flex items-center gap-3 md:gap-4 px-6 py-4 md:px-8 md:py-5 bg-[#5e17eb] text-white font-black text-xl md:text-2xl uppercase border-[3px] md:border-4 border-black transition-all brutal-shadow hover:bg-black">
            <span>Lihat Tools</span>
            <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
          </a>
        </MagneticWrapper>

      </div>

      <div className="decor-fast absolute top-40 right-10 w-20 h-20 bg-[#4ade80] border-4 border-black brutal-shadow rounded-full hidden sm:block" />
      <div className="decor-slow absolute bottom-20 right-10 md:right-40 w-24 h-24 md:w-40 md:h-40 bg-[#ffde59] border-4 border-black brutal-shadow rotate-12 hidden sm:block" />
    </section>
  );
};

const Marquee = () => {
  return (
    <div className="w-full bg-black text-white py-3 md:py-4 overflow-hidden border-b-[6px] md:border-b-8 border-black flex items-center relative z-20 -mt-1 md:-mt-2">
      <div className="whitespace-nowrap animate-[marquee_12s_linear_infinite] md:animate-[marquee_15s_linear_infinite] flex gap-4 md:gap-8 items-center font-black text-lg md:text-3xl uppercase tracking-widest font-['Inter'] hover:animate-[marquee_6s_linear_infinite] transition-all">
        <span>🔥 Accelerate Research</span><span className="text-[#ffde59]">///</span>
        <span>🚀 AI Powered</span><span className="text-[#ff5757]">///</span>
        <span>⚡ Zero To Hero</span><span className="text-[#4ade80]">///</span>
        <span>🔥 Accelerate Research</span><span className="text-[#ffde59]">///</span>
        <span>🚀 AI Powered</span><span className="text-[#ff5757]">///</span>
        <span>⚡ Zero To Hero</span><span className="text-[#4ade80]">///</span>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}} />
    </div>
  );
};

const About = ({ gsapLoaded }) => {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!gsapLoaded || !sectionRef.current) return;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: sectionRef.current, start: "top 70%" }
    });

    tl.fromTo('.about-visual', 
      { x: -100, opacity: 0, rotation: -15 },
      { x: 0, opacity: 1, rotation: -2, duration: 1, ease: "elastic.out(1, 0.5)" }
    )
    .to('.about-title .word-inner', { y: "0%", duration: 0.8, stagger: 0.1, ease: "power4.out" }, "-=0.8")
    .fromTo('.about-text', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.4")
    .fromTo('.about-tag', { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.05, ease: "back.out(2)" }, "-=0.2");
  }, [gsapLoaded]);

  return (
    <section id="about" ref={sectionRef} className="py-20 md:py-32 bg-[#ffde59] border-b-[6px] md:border-b-8 border-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
        
        <div className="lg:col-span-5 relative w-2/3 mx-auto lg:w-full">
          <TiltCard className="about-visual w-full aspect-square bg-[#ff5757] border-[6px] md:border-8 border-black brutal-shadow-lg p-4 md:p-6 flex flex-col justify-between cursor-pointer">
             <div className="flex justify-between items-start border-b-[3px] md:border-b-4 border-black pb-3 mb-3">
               <span className="font-black text-xl md:text-3xl">ID.</span>
               <span className="bg-black text-[#4ade80] px-2 py-1 text-xs md:text-base font-bold animate-pulse">ONLINE</span>
             </div>
             <div className="flex-grow flex items-center justify-center">
                <Terminal className="w-16 h-16 md:w-32 md:h-32 text-black" strokeWidth={1.5} />
             </div>
             <div className="mt-3 pt-3 border-t-[3px] md:border-t-4 border-black font-bold uppercase text-xs md:text-xl text-center">
               Sistem Siap Eksekusi
             </div>
          </TiltCard>
        </div>

        <div className="lg:col-span-7 space-y-5 md:space-y-8 z-10">
          <h2 className="about-title text-[3rem] md:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] bg-white inline-block px-3 py-1 border-[3px] md:border-4 border-black brutal-shadow rotate-1">
            <AnimatedText text="Who Am I?" />
          </h2>
          
          <div className="about-text bg-white border-[3px] md:border-4 border-black p-4 md:p-8 brutal-shadow text-sm md:text-2xl font-medium leading-relaxed">
            Saya developer di balik <strong className="bg-black text-white px-2 uppercase shadow-[2px_2px_0px_0px_#ff5757]">AI Tools Mahasiswa</strong>. 
            Misi saya: Menghancurkan tugas repetitif. Jangan buang waktu memformat sitasi jika algoritma bisa menyelesaikannya dalam hitungan detik. 
          </div>

          <div className="flex gap-2 md:gap-4 flex-wrap pt-2">
            {['React', 'AI/LLM', 'Tailwind', 'GSAP', 'Next.js'].map((skill, i) => (
              <span key={i} className="about-tag px-3 py-1.5 md:px-5 md:py-3 bg-black text-white font-bold text-xs md:text-lg uppercase border-[3px] md:border-4 border-black hover:bg-[#ff5757] hover:-translate-y-1 transition-all brutal-shadow">
                {skill}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

// ============================================================================
// TOOLS SECTION - MOBILE OPTIMIZED (COMPACT CARDS) & FULL ANIMATED
// ============================================================================
const Tools = ({ gsapLoaded }) => {
  const sectionRef = useRef(null);

  const toolsList = [
    { 
      id: '01', title: 'Flash Sitasi', color: 'bg-white', badge: 'bg-[#ffde59]', 
      desc: 'Generate sitasi otomatis dari DOI/URL. Bye format APA manual.', 
      url: 'https://flash-sitasi.vercel.app', icon: <BookOpen className="w-6 h-6 md:w-10 md:h-10" />
    },
    { 
      id: '02', title: 'Skripsi Gen', color: 'bg-[#f4f4f5]', badge: 'bg-[#4ade80]', 
      desc: 'Cari jurnal otomatis DOI valid. Database super akurat.', 
      url: 'https://skripsi-gen.vercel.app', icon: <Cpu className="w-6 h-6 md:w-10 md:h-10" />
    },
    { 
      id: '03', title: 'Parafrase Tool', color: 'bg-white', badge: 'bg-[#ff5757]', 
      desc: 'Lolos Turnitin tanpa merusak makna kalimat asli.', 
      url: 'https://parafrase-tools.vercel.app', icon: <Code2 className="w-6 h-6 md:w-10 md:h-10" />
    },
    { 
      id: '04', title: 'AI Hukum', color: 'bg-black', textDark: true, badge: 'bg-[#5e17eb]', 
      desc: 'Generate skripsi hukum Bab 1-5 (60+ hal) komprehensif.', 
      url: 'https://g.co/gemini/share/9b95d9a17d40', icon: <Terminal className="w-6 h-6 md:w-10 md:h-10 text-white" />
    },
  ];

  useEffect(() => {
    if (!gsapLoaded || !sectionRef.current) return;
    const gsap = window.gsap;
    
    gsap.fromTo('.tool-wrapper', 
      { y: 100, opacity: 0, scale: 0.8, rotationX: 20 },
      {
        y: 0, opacity: 1, scale: 1, rotationX: 0,
        duration: 0.8, stagger: 0.15, ease: "back.out(1.2)",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" }
      }
    );
  }, [gsapLoaded]);

  return (
    <section id="tools" ref={sectionRef} className="py-20 md:py-32 bg-[#fdfdfd] border-b-[6px] md:border-b-8 border-black relative [perspective:1000px]">
      <InteractiveGrid />
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        
        <div className="flex flex-col mb-12 md:mb-20 text-center md:text-left items-center md:items-start">
          <h2 className="text-[3rem] md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-2 md:mb-4 font-['Inter'] leading-none">
            The <span className="bg-[#5e17eb] text-white px-2 md:px-4 border-[3px] md:border-4 border-black brutal-shadow rotate-[-2deg] inline-block hover:rotate-2 transition-transform">Arsenal</span>
          </h2>
          <p className="text-sm md:text-2xl font-bold bg-white inline-block px-3 py-1 border-2 md:border-4 border-black mt-2">
            Senjata peretas produktivitas akademik.
          </p>
        </div>

        {/* COMPACT GRID: Menggunakan gap kecil dan padding minimal di Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 md:gap-10">
          {toolsList.map((tool) => (
            <div key={tool.id} className="tool-wrapper">
              {/* TILT CARD EFFECT UNTUK HOVER INTERACTION */}
              <TiltCard className={`relative flex flex-col justify-between h-full p-4 md:p-8 border-[3px] md:border-4 border-black brutal-shadow transition-colors ${tool.color} ${tool.textDark ? 'text-white' : 'text-black'}`}>
                
                {/* Compact Badge */}
                <div className={`absolute -top-3 -right-3 md:-top-5 md:-right-5 w-10 h-10 md:w-16 md:h-16 ${tool.badge} border-[3px] md:border-4 border-black brutal-shadow flex items-center justify-center font-black text-lg md:text-3xl z-10 rotate-12`}>
                  {tool.id}
                </div>

                <div className="flex flex-col flex-grow">
                  <div className={`mb-3 md:mb-6 w-max p-2 md:p-4 border-[3px] md:border-4 border-black brutal-shadow ${tool.textDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                    {tool.icon}
                  </div>
                  {/* Compact Text Sizes */}
                  <h3 className="text-xl md:text-4xl font-black uppercase mb-1 md:mb-3 tracking-tight font-['Inter'] leading-tight">
                    {tool.title}
                  </h3>
                  <p className={`text-sm md:text-lg font-medium mb-4 md:mb-8 flex-grow ${tool.textDark ? 'text-gray-300' : 'text-gray-700'} leading-snug md:leading-relaxed`}>
                    {tool.desc}
                  </p>
                </div>

                {/* Compact Button */}
                <a href={tool.url} target="_blank" rel="noopener noreferrer"
                  className={`group inline-flex items-center justify-between w-full py-2 px-3 md:py-4 md:px-6 font-black text-sm md:text-xl uppercase border-[2px] md:border-4 border-black brutal-shadow transition-transform hover:-translate-y-1 hover:translate-x-1
                    ${tool.textDark ? 'bg-white text-black hover:bg-[#ffde59]' : 'bg-black text-white hover:bg-[#4ade80] hover:text-black'}
                  `}
                >
                  <span>Buka Tool</span> 
                  <ExternalLink className="w-4 h-4 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" strokeWidth={3} />
                </a>
              </TiltCard>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

const ExperienceStats = ({ gsapLoaded }) => {
  const sectionRef = useRef(null);
  const counterRef = useRef(null);

  useEffect(() => {
    if (!gsapLoaded || !sectionRef.current || !counterRef.current) return;
    const gsap = window.gsap;
    
    gsap.to(counterRef.current, {
      innerHTML: 5000, duration: 2.5, snap: { innerHTML: 1 }, ease: "power2.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true }
    });

    // Parallax text background
    gsap.to('.impact-bg', {
      xPercent: 20, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, scrub: true }
    });
  }, [gsapLoaded]);

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-[#4ade80] border-b-[6px] md:border-b-8 border-black relative overflow-hidden">
      <div className="impact-bg absolute top-1/2 left-0 transform -translate-y-1/2 text-[8rem] md:text-[20rem] font-black text-black opacity-[0.04] pointer-events-none whitespace-nowrap">
        IMPACT ACCELERATION
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center relative z-10">
        <div>
          <h2 className="text-[2.5rem] leading-[0.9] sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 md:mb-8 font-['Inter']">
            Membantu <br/><span className="text-white drop-shadow-[3px_3px_0px_#000]">Ribuan</span><br/>Mahasiswa.
          </h2>
        </div>

        <div className="flex justify-center md:justify-end">
          <TiltCard className="bg-white text-black p-6 md:p-10 border-[4px] md:border-8 border-black brutal-shadow-lg rotate-[2deg] w-full md:w-auto">
            <div className="text-6xl sm:text-7xl md:text-[7rem] font-black leading-none flex font-['Inter'] text-center justify-center">
              <span ref={counterRef}>0</span><span className="text-[#ff5757] ml-1">+</span>
            </div>
            <div className="text-sm md:text-xl font-bold uppercase tracking-widest mt-4 text-black border-t-[3px] md:border-t-4 border-black pt-3 text-center">
              Skripsi Dipercepat
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-24 md:py-40 bg-[#5e17eb] text-white border-b-[6px] md:border-b-8 border-black">
      <div className="max-w-5xl mx-auto px-5 md:px-6 text-center">
        
        <h2 className="text-[3rem] md:text-[6rem] font-black uppercase tracking-tighter mb-6 md:mb-8 leading-[0.9] font-['Inter']">
          Let's Build <br/> 
          <span className="text-[#ffde59] drop-shadow-[4px_4px_0px_#000] md:drop-shadow-[8px_8px_0px_#000]">Something</span>
        </h2>
        
        <p className="text-sm md:text-2xl font-bold mb-10 md:mb-16 max-w-xl mx-auto bg-black p-3 md:p-4 border-2 md:border-4 border-white brutal-shadow rotate-[-1deg]">
          Punya ide tool AI gila? Kolaborasi? Hit me up.
        </p>

        {/* Magnetic Buttons untuk Contact */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
          <MagneticWrapper>
            <a href="#" className="flex items-center justify-center gap-3 bg-[#25D366] text-black font-black text-lg md:text-2xl uppercase px-6 py-4 md:px-10 md:py-6 border-[3px] md:border-4 border-black brutal-shadow hover:bg-white transition-colors w-full">
               <Smartphone className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /> WhatsApp
            </a>
          </MagneticWrapper>
          <MagneticWrapper>
            <a href="#" className="flex items-center justify-center gap-3 bg-[#ff5757] text-white font-black text-lg md:text-2xl uppercase px-6 py-4 md:px-10 md:py-6 border-[3px] md:border-4 border-black brutal-shadow hover:bg-black transition-colors w-full">
               <Mail className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /> Email
            </a>
          </MagneticWrapper>
        </div>

      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-black text-white py-6 md:py-10 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-5 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 text-center md:text-left">
      <div className="text-2xl md:text-4xl font-black uppercase tracking-tighter font-['Inter']">
        Ricky Maulana <span className="text-[#ff5757] animate-pulse">.</span>
      </div>
      <div className="text-gray-400 font-bold font-mono text-[10px] md:text-sm uppercase tracking-widest border-t border-gray-800 pt-2 md:border-none md:pt-0 w-full md:w-auto">
        © {new Date().getFullYear()} — Brutalism Never Dies.
      </div>
    </div>
  </footer>
);

// ============================================================================
// MAIN APP EXPORT
// ============================================================================
export default function App() {
  const gsapLoaded = useGSAPLoader();

  return (
    <div className="relative selection:bg-[#ff5757] selection:text-white">
      <GlobalStyles />
      
      {/* Loading Screen - Edgy Reveal */}
      {!gsapLoaded && (
        <div className="fixed inset-0 z-[99999] bg-black text-white flex items-center justify-center flex-col px-6 text-center">
          <div className="text-5xl md:text-8xl font-black uppercase mb-4 tracking-tighter font-['Inter'] animate-bounce">
            BOOTING<span className="text-[#ffde59]">_</span>
          </div>
          <div className="w-full max-w-[150px] md:max-w-xs h-2 md:h-4 bg-zinc-800 border-2 md:border-4 border-white overflow-hidden">
             <div className="h-full bg-[#4ade80] animate-[load_1s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
          </div>
          <style>{`@keyframes load { 0% { width: 0; } 100% { width: 100%; } }`}</style>
        </div>
      )}

      {/* App Content */}
      <div style={{ opacity: gsapLoaded ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.87, 0, 0.13, 1)' }}>
        
        <CustomCursor />
        
        <nav className="fixed top-0 w-full z-50 p-4 md:p-6 mix-blend-difference text-white pointer-events-none">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-xl md:text-3xl font-black tracking-tighter uppercase pointer-events-auto font-['Inter']">RM.</div>
            <div className="hidden sm:flex gap-6 md:gap-8 font-bold uppercase tracking-widest text-xs md:text-sm pointer-events-auto">
              <a href="#about" className="hover:text-[#ffde59] transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-[2px] after:bottom-0 after:left-0 after:bg-[#ffde59] after:origin-bottom-right after:transition-transform hover:after:scale-x-100 hover:after:origin-bottom-left">About</a>
              <a href="#tools" className="hover:text-[#ff5757] transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-[2px] after:bottom-0 after:left-0 after:bg-[#ff5757] after:origin-bottom-right after:transition-transform hover:after:scale-x-100 hover:after:origin-bottom-left">Tools</a>
            </div>
          </div>
        </nav>

        <main>
          <Hero gsapLoaded={gsapLoaded} />
          <Marquee />
          <About gsapLoaded={gsapLoaded} />
          <Tools gsapLoaded={gsapLoaded} />
          <ExperienceStats gsapLoaded={gsapLoaded} />
          <Contact />
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

