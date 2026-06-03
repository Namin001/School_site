'use client';
import { useState, useEffect } from 'react';
import { PebblesBackground } from '@/components/PebblesBackground';
// We'll use client side fetching for updates to avoid server-client sync issues with new models for now
import { Bell, ArrowRight, BookOpen, Users as UsersIcon, ShieldCheck, Calendar, X } from 'lucide-react';
import Link from 'next/link';
import BookLoader from '@/components/BookLoader';
import FloatingNotice from '@/components/FloatingNotice';

const dynamicWords = ['Excellence', 'Impact', 'Innovation', 'Integrity'];

export default function HomePage() {
  const [contentRecords, setContentRecords] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [admissionPosts, setAdmissionPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const [dynamicWordIdx, setDynamicWordIdx] = useState(0);
  const [showEventsModal, setShowEventsModal] = useState(false);

  
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const startTime = Date.now();
    try {
        const [contentRes, updatesRes, admissionRes, eventsRes] = await Promise.all([
            fetch('/api/content'),
            fetch('/api/posts?type=UPDATE'),
            fetch('/api/posts?type=ADMISSION'),
            fetch('/api/posts?type=EVENT')
        ]);
        if (contentRes.ok) setContentRecords(await contentRes.json());
        if (updatesRes.ok) setUpdates(await updatesRes.json());
        if (admissionRes.ok) setAdmissionPosts(await admissionRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());

        const heroRes = await fetch('/api/home-banner');
        if (heroRes.ok) setHeroImages(await heroRes.json());
    } catch {}
    
    // Ensure at least 5 seconds of loading
    const elapsed = Date.now() - startTime;
    if (elapsed < 5000) {
      await new Promise(resolve => setTimeout(resolve, 5000 - elapsed));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (heroImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroIdx(prev => (prev + 1) % heroImages.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [heroImages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDynamicWordIdx(prev => (prev + 1) % dynamicWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getContent = (id: string) => contentRecords.find(r => r.pageId === id)?.content || '';
  const admissionText = getContent('admission');
  const isAdmissionOpen = getContent('admission_status') === 'OPEN';
  
  if (isLoading) return <BookLoader text="Entering SVM Hub..." />;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', scrollBehavior: 'smooth' }}>
       <FloatingNotice />
       {/* INTERACTIVE ADMISSION BADGE */}
       {isAdmissionOpen && admissionText && (
         <Link href="/admissions">
          <div className="admission-badge-container">
              <div className="admission-badge">
                <div className="badge-glow"></div>
                <div className="badge-content">
                  <span className="badge-icon">🎓</span>
                  <span className="badge-text">{admissionText}</span>
                </div>
              </div>
          </div>
         </Link>
       )}

       {/* SECONDARY FLOATING BADGE (EVENTS/CALENDAR) */}
       <div className="event-badge-container" onClick={() => setShowEventsModal(true)}>
          <div className="event-badge" title="Upcoming Events">
            <Calendar size={28} />
            {events.length > 0 && <span className="event-count">{events.length}</span>}
          </div>
       </div>

       {/* EVENTS MODAL */}
       {showEventsModal && (
         <div className="modal-overlay" onClick={() => setShowEventsModal(false)}>
           <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, border: 'none', color: 'var(--primary)', paddingBottom: 0 }}>School Events</h2>
                <button onClick={() => setShowEventsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No upcoming events at the moment.</p>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="event-item" style={{ 
                      padding: '1rem', 
                      background: 'rgba(10, 54, 104, 0.03)', 
                      borderRadius: '12px',
                      border: '1px solid rgba(10, 54, 104, 0.1)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        {new Date(event.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{event.title}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0 }}>{event.content}</p>
                    </div>
                  ))
                )}
              </div>
           </div>
         </div>
       )}

        <div className="hero-section" style={{
          background: heroImages.length > 0 ? 'black' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          transition: 'all 0.5s ease'
        }}>
          {/* Background Slideshow */}
          {heroImages.map((img, idx) => (
            <div key={idx} style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: idx === currentHeroIdx ? 0.6 : 0,
                transition: 'opacity 1.5s ease-in-out',
                zIndex: 0
            }} />
          ))}

          {/* Fallback/Overlay Gradient if no images or for better text legibility */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: heroImages.length > 0 
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)' 
                : 'transparent',
            zIndex: 1
          }} />

          {/* Animated Modern UI Blobs (Hidden when images present for cleaner look, or kept as subtle overlay) */}
          {heroImages.length === 0 && (
            <>
              <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '50%',
                height: '140%',
                background: 'radial-gradient(circle, rgba(252,163,17,0.1) 0%, transparent 70%)',
                filter: 'blur(60px)',
                borderRadius: '50%',
                animation: 'blobFloat 15s infinite alternate',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30%',
                right: '-5%',
                width: '60%',
                height: '120%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
                animation: 'blobFloat 20s infinite alternate-reverse',
                zIndex: 1
              }} />
            </>
          )}

          <div className="hero-content">
            <div className="hero-text-wrapper">
              <div className="hero-svm-text">
                SVM
              </div>
              <h1 className="hero-title">
                Committed to <br />
                <span className="dynamic-word">
                  {dynamicWords[dynamicWordIdx]}
                </span>
              </h1>
              <p className="hero-subtitle">
                Nurturing brilliant minds and building the leaders of tomorrow through holistic education, innovation, and unwavering integrity.
              </p>
            </div>
          </div>
        </div>

      <div style={{ 
        background: 'linear-gradient(180deg, var(--card-bg) 0%, var(--bg-color) 100%)',
        width: '100%',
        position: 'relative'
      }}>
        <PebblesBackground />
        <div className="page-container animate-fade-in" style={{ paddingTop: '5rem', paddingBottom: '8rem', position: 'relative', zIndex: 2 }}>
          
          {/* STATISTICS SECTION */}
          <div className="grid-3" style={{ marginTop: '0', marginBottom: '8rem' }}>
            <div className="stat-box" style={{ 
              background: 'rgba(10, 54, 104, 0.1)', // Light Navy Tint
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(10, 54, 104, 0.2)'
            }}>
              <div className="stat-num" style={{ color: '#0A3668' }}>20+</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a202c', fontFamily: 'Outfit' }}>Years of Experience</div>
            </div>
            <div className="stat-box" style={{ 
              background: 'rgba(252, 163, 17, 0.15)', // Light Orange Tint
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(252, 163, 17, 0.2)'
            }}>
              <div className="stat-num" style={{ color: '#FCA311' }}>400+</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a202c', fontFamily: 'Outfit' }}>Enrolled Students</div>
            </div>
            <div className="stat-box" style={{ 
              background: 'rgba(10, 54, 104, 0.1)', // Light Navy Tint
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(10, 54, 104, 0.2)'
            }}>
              <div className="stat-num" style={{ color: '#0A3668' }}>30+</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a202c', fontFamily: 'Outfit' }}>Dedicated Staffs</div>
            </div>
          </div>



        {/* ADMISSION HUB SECTION (New Dynamic Multi-Post Section) */}
        {admissionPosts.length > 0 && (
          <div id="admissions" className="admission-hub">
            <div className="hub-card">
              <div className="hub-header">
                <div className="hub-title-group">
                  <span className="hub-badge">Admission & Enrollment</span>
                  <h2 style={{ fontSize: '2.5rem', margin: 0, border: 'none', color: 'var(--primary)', paddingBottom: 0 }}>Join Our Excellence</h2>
                </div>
                <Link href="/admissions">
                  <button className="btn" style={{ borderRadius: '12px' }}>Apply Now <ArrowRight size={18} /></button>
                </Link>
              </div>
              
              <div className="hub-grid">
                {admissionPosts.map((post, idx) => (
                  <div key={post.id} className="step-card">
                    <div className="step-num">{idx + 1}</div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{post.title}</h3>
                    {post.subject && <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{post.subject}</p>}
                    <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{post.content}</p>
                    {post.imagePath && (
                      <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', height: '150px' }}>
                        <img src={post.imagePath} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div id="about" style={{ marginBottom: '8rem', scrollMarginTop: '100px' }}>
          <div className="about-grid">
            {/* Left Side: Image with Interactive Effects */}
            <div className="about-image-container" style={{ 
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              transform: 'perspective(1000px) rotateY(-5deg)',
            }}>
              <img 
                src="/about_us.jpg" 
                alt="About Shubha Vidhyalaya" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  display: 'block',
                  transition: 'transform 0.5s ease'
                }} 
              />
              <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(10, 54, 104, 0.2) 100%)',
                pointerEvents: 'none'
              }} />
            </div>

            <div className="about-content">
              <h2 className="section-title legacy-title">
                🏛️ Our Legacy
              </h2>
              <div className="legacy-card">
                <div className="legacy-text">
                  {getContent('about')}
                </div>
                {/* Decorative element */}
                <div style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'var(--accent)',
                  opacity: 0.1,
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  zIndex: -1
                }} />
              </div>
              <Link href="/about" style={{ textDecoration: 'none' }}>
                <button className="btn legacy-btn">
                  Learn More About Us <ArrowRight size={20} />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ACADEMIC PROGRAMS */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 className="section-title">Our Academic Programs</h2>
          <p className="section-subtitle">We provide a holistic, comprehensive curriculum designed to nurture brilliant minds across all age groups.</p>
          
          <div className="grid-3">
            <div className="info-card">
              <BookOpen size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <h3>Primary Education</h3>
              <p style={{ color: 'var(--text-muted)' }}>Foundational learning focusing on creativity, literacy, and mathematics in a highly nurturing environment.</p>
            </div>
            <div className="info-card">
              <UsersIcon size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <h3>Middle School</h3>
              <p style={{ color: 'var(--text-muted)' }}>A transitional phase emphasizing critical thinking and character building.</p>
            </div>
            <div className="info-card">
              <ShieldCheck size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <h3>High School</h3>
              <p style={{ color: 'var(--text-muted)' }}>Rigorous academic preparation for college and leadership programs.</p>
            </div>
          </div>
        </div>

        {/* WHY CHOOSE US */}
        <div className="choose-us-section">
          <h2 className="section-title" style={{ paddingBottom: '0.5rem' }}>Why Choose Shubha Vidyalaya?</h2>
          <div className="choose-us-grid">
            <div>
              <ul className="choose-us-list">
                <li>
                  <div className="check-icon">✓</div> 
                  Global standard curriculum
                </li>
                <li>
                  <div className="check-icon">✓</div> 
                  State-of-the-art laboratories & library
                </li>
              </ul>
            </div>
            <div>
              <ul className="choose-us-list">
                <li>
                  <div className="check-icon">✓</div> 
                  Safe & 24/7 monitored campus
                </li>
                <li>
                  <div className="check-icon">✓</div> 
                  Dedicated mentorship programs
                </li>
              </ul>
            </div>
          </div>
        </div>

        </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blobFloat {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .event-count {
            position: absolute; top: -5px; right: -5px; background: var(--accent); color: var(--primary);
            width: 20px; height: 20px; border-radius: 50%; font-size: 0.7rem; font-weight: 900;
            display: flex; align-items: center; justify-content: center; border: 2px solid white;
        }
      `}} />
      </div>
    </div>
  );
}
