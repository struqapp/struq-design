import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { gsap, ScrollTrigger, registerGsap } from './experience/gsap-client';

registerGsap();

type LenisRootProps = {
  children: ReactNode;
};

export function LenisRoot({ children }: LenisRootProps): JSX.Element {
  const lenisRef = useRef<LenisRef>(null);

  // ScrollTrigger sync without capturing the instance once.
  useLenis(() => ScrollTrigger.update());

  useEffect(() => {
    // Registered unconditionally, instance resolved per frame.
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
