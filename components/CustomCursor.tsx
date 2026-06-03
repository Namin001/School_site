'use client';
import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      setIsMobile(false);
      // Hide default cursor
      document.body.style.cursor = 'none';
      
      // Ensure we don't add multiple styles if hot-reloading
      if (!document.getElementById('custom-cursor-style')) {
        const style = document.createElement('style');
        style.id = 'custom-cursor-style';
        style.innerHTML = `* { cursor: none !important; }`;
        document.head.appendChild(style);
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      // Small delay for smooth trailing effect is possible, but instant is better for this theme
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName?.toLowerCase() === 'a' ||
        target.tagName?.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button') ||
        window.getComputedStyle(target).cursor === 'pointer'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      document.body.style.cursor = 'auto';
      const styleEl = document.getElementById('custom-cursor-style');
      if (styleEl) styleEl.remove();
    };
  }, []);

  if (isMobile) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: isHovering ? '60px' : '20px',
        height: isHovering ? '60px' : '20px',
        backgroundColor: 'white',
        borderRadius: '50%',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        mixBlendMode: 'difference',
        transition: 'width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
        {isHovering && (
            <span style={{ 
                color: 'black', 
                fontSize: '0.65rem', 
                fontWeight: 800, 
                letterSpacing: '1px',
                opacity: 0.8,
                animation: 'fadeIn 0.2s ease-in'
            }}>
            </span>
        )}
    </div>
  );
}
