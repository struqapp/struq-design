'use client';

import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { gsap, ScrollTrigger, registerGsap } from '@/experience/gsap-client';

registerGsap();

type LenisRootProps = {
  children: ReactNode;
};

export function LenisRoot({ children }: LenisRootProps): JSX.Element {
  const lenisRef = useRef<LenisRef>(null);

  // ScrollTrigger sync. useLenis subscribes as soon as the root instance exists,
  // so it never races the ref the way a one-time lenis.on('scroll') capture does.
  useLenis(() => ScrollTrigger.update());

  useEffect(() => {
    // Registered unconditionally; the instance is resolved through the ref on
    // every frame. Never capture it once and early-return: that is the
    // dead-scroll race.
    const update = (time: number) => {
      lenisRef.current?.lenis?.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} options={{ lerp: 0.1, anchors: true, autoRaf: false }}>
      {children}
    </ReactLenis>
  );
}
