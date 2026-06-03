import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { GeometricBackground } from '@/components/GeometricBackground';
import Link from 'next/link';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <>
      <GeometricBackground />
      <Navbar session={session} />
      {children}
      <footer style={{
        background: 'linear-gradient(135deg, rgba(10, 54, 104, 0.95) 0%, rgba(15, 75, 140, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'white',
        padding: '1.5rem 1rem 1rem',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -20px 40px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Corner Prism - Top Left */}
        <div style={{
          position: 'absolute',
          top: '-50px', left: '-50px', width: '300px', height: '300px',
          background: 'radial-gradient(circle at center, rgba(0, 229, 255, 0.15) 0%, transparent 70%)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '200px', height: '200px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Corner Prism - Top Right */}
        <div style={{
          position: 'absolute',
          top: '-50px', right: '-50px', width: '300px', height: '300px',
          background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.1) 0%, transparent 70%)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: 0, right: 0, width: '200px', height: '200px',
          background: 'linear-gradient(-135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Radial Glass Reflection */}
        <div style={{
          position: 'absolute',
          top: '-50%', left: '50%', transform: 'translateX(-50%)',
          width: '120%', height: '100%',
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
          zIndex: 0,
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />

        <div className="page-container footer-grid" style={{ padding: 0, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
              <img src="/svm_logo.png" alt="Logo" style={{ height: '55px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
              <h3 style={{ margin: 0, color: 'white', fontFamily: 'Outfit', fontSize: '1.1rem', letterSpacing: '2px', border: 'none' }}>SHUBHA VIDHYALAYA</h3>
            </div>
            <p style={{ fontSize: '0.95rem', opacity: 0.75, lineHeight: '1.9', maxWidth: '350px' }}>
              Committed to excellence in education and character building. Nurturing the leaders of tomorrow with a global perspective and traditional values.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 800 }}>Quick Navigation</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><Link href="/" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.95rem' }} className="footer-link">Home Portal</Link></li>
              <li><Link href="/about" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.95rem' }} className="footer-link">About Mission</Link></li>
              <li><Link href="/newsletter" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.95rem' }} className="footer-link">School Newsletter</Link></li>
              <li><Link href="/forum" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.95rem' }} className="footer-link">Parent-Teacher Forum</Link></li>
              <li><Link href="/career" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.95rem' }} className="footer-link">Careers / Hiring</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 800 }}>Connect With Us</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.95rem', opacity: 0.8, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>📍 No.1, Shubham campus, Periyar street, Mettupalayam, Thiruvarur, 610001</p>
              <p style={{ fontSize: '0.95rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>📞 04366-226688 / 9943938371</p>
              <p style={{ fontSize: '0.95rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>✉️ tvrsvmhss@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="page-container" style={{ padding: 0, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', opacity: 0.7, letterSpacing: '1px' }}>
          <div>© {new Date().getFullYear()} SHUBHA VIDYALAYA MATRICULATION HIGHER SECONDARY SCHOOL. ALL RIGHTS RESERVED.</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            opacity: 1,
            padding: '0.5rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Developed by</span>
            <img src="/zyro-logo.png" alt="Zyro Soft Logo" style={{ height: '24px', width: 'auto' }} />
            <span style={{ fontWeight: 700, fontFamily: 'Outfit', letterSpacing: '1px', background: 'linear-gradient(90deg, #00e5ff, #0077ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '0.95rem' }}>Zyro Soft</span>
          </div>
        </div>
      </footer>
    </>
  );
}
