import React, { useEffect, useRef, useState, useMemo, lazy, Suspense, useCallback } from "react";
import { FaXTwitter, FaLinkedin, FaInstagram, FaDiscord, FaYoutube } from "react-icons/fa6";

// Lazy load Three.js only when needed
const THREE = lazy(() => import('three'));

// --- PERFORMANCE HOOKS (Optimized) ---
const usePerformanceMonitor = () => {
  const [quality, setQuality] = useState(() => {
    const mobile = window.innerWidth < 768;
    const lowEnd = navigator.hardwareConcurrency < 4;
    const slowConnection = navigator.connection?.effectiveType === 'slow-2g' || navigator.connection?.effectiveType === '2g';
    if (mobile || lowEnd || slowConnection) return "low";
    if (window.innerWidth < 1024) return "medium";
    return "high";
  });
  useEffect(() => {
    let timeoutId;
    const update = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth < 768;
        const lowEnd = navigator.hardwareConcurrency < 4;
        const slowConnection = navigator.connection?.effectiveType === 'slow-2g' || navigator.connection?.effectiveType === '2g';
        if (mobile || lowEnd || slowConnection) setQuality("low");
        else if (window.innerWidth < 1024) setQuality("medium");
        else setQuality("high");
      }, 100);
    };
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(timeoutId);
    };
  }, []);
  return quality;
};

const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafId = useRef();
  const updateScroll = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      const progress = Math.min(Math.max(window.scrollY / 800, 0), 1);
      setScrollProgress(progress);
      rafId.current = null;
    });
  }, []);
  useEffect(() => {
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
    return () => {
      window.removeEventListener("scroll", updateScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [updateScroll]);
  return scrollProgress;
};

// --- OPTIMIZED 3D COMPONENTS ---
const getQualitySettings = (quality) => ({
  sphereSegments: quality === "high" ? 32 : quality === "medium" ? 24 : 16,
  particleCount: quality === "high" ? 800 : quality === "medium" ? 400 : 200,
  particleSize: quality === "high" ? 0.12 : 0.08,
  antialias: quality === "high",
  powerPreference: quality === "high" ? "high-performance" : "low-power"
});

// Loading fallback component
const SceneLoadingFallback = () => (
  <div className="absolute inset-0 w-full h-full flex items-center justify-center"
       style={{ background: "radial-gradient(circle, #0a1323 0%, #040811 100%)" }}>
    <div className="text-white text-xl">Loading...</div>
  </div>
);

const SphereGridScene = React.memo(({ quality, scrollProgress }) => {
  const mountRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const qualitySettings = useMemo(() => getQualitySettings(quality), [quality]);
  useEffect(() => {
    let mounted = true;
    const loadScene = async () => {
      try {
        const THREE = await import('three');
        if (!mounted) return;
        const localMount = mountRef.current;
        if (!localMount) return;
        const width = localMount.clientWidth;
        const height = localMount.clientHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 7;
        const renderer = new THREE.WebGLRenderer({
          antialias: qualitySettings.antialias,
          alpha: true,
          powerPreference: qualitySettings.powerPreference,
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0x0a1323, 1);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 2 : 1.5));
        localMount.appendChild(renderer.domElement);
        const geometry = new THREE.SphereGeometry(2.8, qualitySettings.sphereSegments, qualitySettings.sphereSegments);
        const material = new THREE.MeshPhysicalMaterial({
          color: 0x83cafe,
          emissive: 0x0ff1ff,
          emissiveIntensity: 0.7,
          roughness: 0.15,
          metalness: 0.6,
          transparent: true,
          opacity: 0.7,
          wireframe: true,
        });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0x00fff9,
          opacity: 0.38,
          transparent: true,
        });
        const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        sphere.add(wireframe);
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(qualitySettings.particleCount * 3);
        const colors = new Float32Array(qualitySettings.particleCount * 3);

        for (let i = 0; i < qualitySettings.particleCount; i++) {
          const i3 = i * 3;
          const radius = 5 + Math.random() * 13;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i3 + 2] = radius * Math.cos(phi);
          const intensity = 0.7 + Math.random() * 0.3;
          colors[i3] = 0.1 * intensity;
          colors[i3 + 1] = 0.6 + Math.random() * 0.2;
          colors[i3 + 2] = intensity;
        }

        particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const particlesMaterial = new THREE.PointsMaterial({
          size: qualitySettings.particleSize,
          transparent: true,
          opacity: 0.45,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        let time = 0, lastTime = 0;
        let animationFrame;
        const animate = (currentTime) => {
          if (!mounted) return;
          animationFrame = requestAnimationFrame(animate);
          const deltaTime = currentTime - lastTime;
          if (deltaTime < 16) return;
          lastTime = currentTime;
          time += 0.009;
          sphere.rotation.y += 0.004 + scrollProgress * 0.01;
          sphere.rotation.x += 0.002 + scrollProgress * 0.003;
          particles.rotation.y -= 0.001 + scrollProgress * 0.003;
          particles.rotation.x += Math.sin(time * 0.5) * 0.0008;
          const sOpacity = Math.max(0.2, 1 - scrollProgress * 0.8);
          material.opacity = sOpacity;
          edgesMaterial.opacity = sOpacity * 0.6;
          particlesMaterial.opacity = sOpacity * 0.45;
          const scale = 1 + Math.sin(time * 2) * 0.05 * (1 - scrollProgress * 0.5);
          sphere.scale.setScalar(scale);
          renderer.render(scene, camera);
        };
        const onResize = () => {
          if (!localMount || !mounted) return;
          const w = localMount.clientWidth;
          const h = localMount.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize, { passive: true });
        animate(0);
        setIsLoaded(true);
        return () => {
          mounted = false;
          window.removeEventListener("resize", onResize);
          cancelAnimationFrame(animationFrame);
          geometry.dispose();
          material.dispose();
          edgesGeometry.dispose();
          edgesMaterial.dispose();
          particlesGeometry.dispose();
          particlesMaterial.dispose();
          renderer.dispose();
          if (localMount && localMount.contains(renderer.domElement)) {
            localMount.removeChild(renderer.domElement);
          }
        };
      } catch (error) {
        console.error('Failed to load 3D scene:', error);
        setIsLoaded(true); // Show fallback
      }
    };
    loadScene();
    return () => {
      mounted = false;
    };
  }, [quality, qualitySettings, scrollProgress]);
  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: "radial-gradient(circle, #0a1323 0%, #040811 100%)" }}
    >
      {!isLoaded && <SceneLoadingFallback />}
    </div>
  );
});

// DNA Scene
const DnaSceneComponent = React.memo(({ scrollProgress }) => {
  const mountRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    const loadDnaScene = async () => {
      try {
        const THREE = await import('three');
        if (!mounted) return;
        const mount = mountRef.current;
        if (!mount) return;
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
        camera.position.z = 8;
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: "default"
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0x0a1323, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        mount.appendChild(renderer.domElement);
        const helixGroup = new THREE.Group();
        const segments = 120;
        const radius = 2.6;
        const strand1Points = [];
        const strand2Points = [];
        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const angle = t * Math.PI * 10;
          const y = (t - 0.5) * 14;
          strand1Points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
          strand2Points.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
        }
        const curve1 = new THREE.CatmullRomCurve3(strand1Points);
        const curve2 = new THREE.CatmullRomCurve3(strand2Points);
        const geo1 = new THREE.TubeGeometry(curve1, segments, 0.08, 6, false);
        const geo2 = new THREE.TubeGeometry(curve2, segments, 0.08, 6, false);
        const mat1 = new THREE.MeshBasicMaterial({
          color: 0x2fd3f7,
          transparent: true,
          opacity: 0.7 + 0.2 * scrollProgress
        });
        const mat2 = new THREE.MeshBasicMaterial({
          color: 0xc084fc,
          transparent: true,
          opacity: 0.65 + 0.2 * scrollProgress
        });
        const strand1 = new THREE.Mesh(geo1, mat1);
        const strand2 = new THREE.Mesh(geo2, mat2);
        helixGroup.add(strand1, strand2);
        for (let i = 0; i < segments; i += 20) {
          const t = i / (segments - 1);
          const angle = t * Math.PI * 10;
          const y = (t - 0.5) * 14;
          const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, radius * 2, 4);
          const rungMat = new THREE.MeshBasicMaterial({
            color: 0xffe084,
            transparent: true,
            opacity: 0.5 + 0.3 * scrollProgress,
          });
          const rung = new THREE.Mesh(rungGeo, rungMat);
          rung.position.y = y;
          rung.rotation.y = angle;
          rung.rotation.z = Math.PI / 2;
          helixGroup.add(rung);
        }
        scene.add(helixGroup);
        const particleCount = 150;
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          const rad = 6.5 + Math.random() * 4;
          const phi = Math.random() * Math.PI;
          const theta = Math.random() * 2 * Math.PI;
          positions[i3] = Math.sin(phi) * Math.cos(theta) * rad;
          positions[i3 + 1] = (Math.random() - 0.5) * 14;
          positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * rad;
          colors[i3 + 0] = 0.3 + 0.7 * Math.random();
          colors[i3 + 1] = 0.7 + 0.3 * Math.random();
          colors[i3 + 2] = 1.0;
        }
        particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const particlesMaterial = new THREE.PointsMaterial({
          size: 0.11,
          transparent: true,
          opacity: 0.13 + 0.5 * scrollProgress,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);
        scene.add(new THREE.AmbientLight(0xffffff, 0.54));
        let time = 0;
        let animationFrame;
        const animate = () => {
          if (!mounted) return;
          animationFrame = requestAnimationFrame(animate);
          time += 0.011;
          helixGroup.rotation.y = time * 0.35 + 0.033 * scrollProgress;
          helixGroup.rotation.x = 0.32 * Math.sin(time * 0.32 + 0.15 * scrollProgress);
          const pulse = 1.0 + 0.08 * Math.sin(time * 2.5);
          helixGroup.scale.set(pulse, pulse, pulse);
          particles.rotation.y += 0.003;
          mat1.opacity = 0.65 + 0.31 * scrollProgress;
          mat2.opacity = 0.62 + 0.33 * scrollProgress;
          renderer.render(scene, camera);
        };
        const onResize = () => {
          if (!mount || !mounted) return;
          const w = mount.clientWidth;
          const h = mount.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize, { passive: true });
        animate();
        setIsLoaded(true);
        return () => {
          mounted = false;
          window.removeEventListener("resize", onResize);
          cancelAnimationFrame(animationFrame);
          geo1.dispose();
          geo2.dispose();
          mat1.dispose();
          mat2.dispose();
          particlesGeometry.dispose();
          particlesMaterial.dispose();
          renderer.dispose();
          if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        };
      } catch (error) {
        console.error('Failed to load DNA scene:', error);
        setIsLoaded(true);
      }
    };
    loadDnaScene();
    return () => {
      mounted = false;
    };
  }, [scrollProgress]);
  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "90vh",
        background: "radial-gradient(circle at center, #181b2e 0%, #0a1323 100%)",
        position: "relative",
      }}
    >
      {!isLoaded && <SceneLoadingFallback />}
    </div>
  );
});

const AnimatedText = React.memo(({ children, className = "", delay = 0 }) => {
  const [isVisible, setVisible] = useState(false);
  const elementRef = useRef(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay * 1000);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);
  return (
    <div
      ref={elementRef}
      className={`transition-all duration-1000 ease-out text-center ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
});

const FeatureCards = React.memo(() => {
  const [shiningIdx, setShiningIdx] = useState(null);
  const cards = useMemo(() => [
    { icon: "🔗", title: "Nexus Connect", desc: "Connecting people, ideas, and technology — transforming how we learn,innovate & collaborate" },
    { icon: "🤖", title: "Nexus AGI", desc: "Advanced general intelligence evolving with you." },
    { icon: "🌐", title: "Nexus Sphere", desc: "Immersive digital worlds unlock limitless possibilities." },
    { icon: "🏪", title: "Nexus Store", desc: "Marketplace for next-gen assets and collaboration." },
  ], []);
  const doShine = useCallback((index) => {
    setShiningIdx(index);
    setTimeout(() => setShiningIdx(null), 550);
  }, []);
  return (
    <section className="py-24 bg-gradient-to-b from-[#151829] to-[#101024] text-white max-w-7xl mx-auto px-4 select-none">
      <h2 className="text-center text-4xl md:text-5xl font-bold mb-16 tracking-tight">
        Experience The Future
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map(({ icon, title, desc }, i) => (
          <div
            key={i}
            onClick={() => doShine(i)}
            onMouseEnter={() => doShine(i)}
            className="feature-card relative p-8 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-white/5 to-indigo-900/10 backdrop-blur-sm cursor-pointer shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 overflow-hidden text-center"
          >
            <div className="text-5xl mb-3">{icon}</div>
            <h3 className="font-bold text-xl mb-2">{title}</h3>
            <p className="text-gray-200 text-base leading-relaxed">{desc}</p>
            <span
              className={`shine-overlay absolute top-0 left-[-70%] w-36 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent rotate-12 pointer-events-none rounded-2xl transition ${
                shiningIdx === i ? "opacity-70 shine-animate" : "opacity-0"
              }`}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shine {
          0% { left: -70%; opacity: 0; }
          35% { opacity: 1; }
          70% { left: 120%; opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }
        .shine-animate {
          animation: shine 0.55s linear 1;
        }
      `}</style>
    </section>
  );
});

const socialLinks = [
  {
    url: "https://x.com/NEXUSNEXT001?t=TaGToS6fZdczKvwS_a8T9A&s=09",
    icon: <FaXTwitter />,
    name: "X (Twitter)"
  },
  {
    url: "https://www.linkedin.com/company/104148942/admin/dashboard/",
    icon: <FaLinkedin />,
    name: "LinkedIn"
  },
  {
    url: "https://www.instagram.com/nexusnext1?igsh=M2ZmZHBmMjBuOGx0",
    icon: <FaInstagram />,
    name: "Instagram"
  },
  {
    url: "https://discord.gg/MRmyM2ca",
    icon: <FaDiscord />,
    name: "Discord"
  },
  {
    url: "https://youtube.com/@vlsuniverse?si=m4tDMzNyGSCXYkNK",
    icon: <FaYoutube />,
    name: "YouTube"
  }
];
const SocialBar = React.memo(() => (
  <div className="flex justify-center gap-6 py-8 bg-gradient-to-r from-[#10182f] to-[#1b1b34] select-none">
    {socialLinks.map(social => (
      <a
        key={social.name}
        href={social.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Follow us on ${social.name}`}
        className="text-white hover:text-blue-400 hover:scale-125 transition-transform duration-200 text-2xl"
      >
        {social.icon}
      </a>
    ))}
  </div>
));
const VisionSection = React.memo(() => (
  <section className="flex justify-center items-center bg-gradient-to-br from-black to-[#1a1a3a] py-16 px-4 relative select-none">
    <blockquote className="text-white text-center font-light italic max-w-xl text-2xl md:text-3xl mx-auto">
      <span className="font-bold text-blue-200">"</span>
      The future belongs to those who create it.
      <span className="font-bold text-blue-200">"</span>
    </blockquote>
  </section>
));
const CtaSection = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !isEmail(email) || isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:3001/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Thanks! You've joined the waitlist.");
        setEmail("");
      } else {
        setMessage(data.error || "Failed to submit. Please try again.");
      }
    } catch (error) {
      setMessage("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-[#151a31] text-center py-20 px-4 select-none">
      <h2 className="text-white text-3xl md:text-4xl font-bold mb-6">
        Join The Future · Join Nexusnext
      </h2>
      <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
        Be part of the movement where humanity and AI co-create a global future.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row max-w-md mx-auto gap-4"
      >
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
          aria-label="Enter your email to join the waitlist"
          className="rounded-full bg-white/10 placeholder-white/60 text-white px-6 py-3 focus:bg-white/20 focus:outline-none border border-white/20 flex-1 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !email || !isEmail(email)}
          className="rounded-full bg-gradient-to-r from-blue-700 to-purple-700 text-white font-semibold px-8 py-3 hover:scale-105 active:scale-95 shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${message.includes('Thanks') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </section>
  );
};

// --- MAIN APP ---
export default function App() {
  const quality = usePerformanceMonitor();
  const scrollProgress = useScrollProgress();

  return (
    <div className="bg-[#10182f] min-h-screen overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center px-4">
        <Suspense fallback={<SceneLoadingFallback />}>
          <SphereGridScene quality={quality} scrollProgress={scrollProgress} />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1321cc] to-[#232e4fcc] z-10 pointer-events-none" />
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full max-w-4xl mx-auto text-center">
          <AnimatedText delay={0.2}>
            <h1
              className="text-white text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-3"
              style={{
                background: "linear-gradient(90deg,#fff 70%,#47cffa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}
            >
              Welcome to <span className="text-[#2b70ff] font-black">Nexusnext</span>
            </h1>
          </AnimatedText>
          <AnimatedText delay={0.4}>
            <h2
              className="text-xl md:text-2xl font-semibold mb-3"
              style={{
                background: "linear-gradient(90deg,#8fe7f8 10%, #b18bfa 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 600,
              }}
            >
              The new era where <span className="text-[#a33afc] font-black">human potential</span> meets <span className="text-[#13c8f5] font-black">AI innovation</span>.
            </h2>
          </AnimatedText>
          <AnimatedText delay={0.6}>
            <a
              href="#dna"
              className="mt-8 px-10 py-3 bg-gradient-to-r from-blue-500 via-blue-700 to-purple-600 rounded-full text-white font-semibold text-lg hover:scale-105 active:scale-95 shadow-xl inline-block transition-transform"
            >
              Step Into The Future
            </a>
          </AnimatedText>
        </div>
      </section>
      {/* DNA Section */}
      <section id="dna" className="relative bg-[#10182f] pt-12">
        <Suspense fallback={<SceneLoadingFallback />}>
          <DnaSceneComponent scrollProgress={scrollProgress} />
        </Suspense>
        <AnimatedText delay={0.2}>
          <h2 className="text-center text-3xl md:text-4xl font-bold text-blue-200 pt-8">Evolution in Action</h2>
        </AnimatedText>
        <AnimatedText delay={0.4}>
          <p className="text-center text-gray-300 max-w-2xl mx-auto pt-4 pb-10 text-lg font-medium">
            Witness intelligent collaboration — DNA meets AI to solve India's defining challenges. Join the upward spiral.
          </p>
        </AnimatedText>
      </section>
      <FeatureCards />
      <VisionSection />
      <CtaSection />
      <SocialBar />
      <footer className="py-12 text-center text-gray-400 border-t border-gray-900 select-none">
        &copy; {new Date().getFullYear()} Nexusnext. Shaping tomorrow, today.
      </footer>
    </div>
  );
}
