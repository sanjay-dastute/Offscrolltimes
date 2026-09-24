import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Wraps content in a one-time fade/slide reveal driven by IntersectionObserver.
 * Renders fully visible during SSR and before hydration so content never
 * depends on JS to be seen; the hidden/animated classes are only added after
 * mount, once the observer is registered.
 */
export function Reveal({
  children,
  className = '',
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    // Content already in the viewport should never flash visible, disappear,
    // then animate back in after hydration.
    const bounds = node.getBoundingClientRect();
    if (bounds.top < window.innerHeight * 0.9 && bounds.bottom > 0) {
      setVisible(true);
      return;
    }

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -48px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${armed ? 'reveal' : ''} ${visible ? 'reveal-visible' : ''}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
