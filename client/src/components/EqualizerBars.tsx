import { useRef, useEffect, useState } from "react";

interface EqualizerBarsProps {
  isActive: boolean;
  className?: string;
}

export function EqualizerBars({ isActive, className = "" }: EqualizerBarsProps) {
  const barsRef = useRef<HTMLDivElement>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [isSettled, setIsSettled] = useState(!isActive);
  const animationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    const container = barsRef.current;
    if (!container) return;

    const bars = container.querySelectorAll('.equalizer-bar');

    if (!isActive && !isSettled) {
      // Pause and settle: capture current transforms and animate to flatline
      setIsSettling(true);
      
      animationsRef.current.forEach(a => a.cancel());
      animationsRef.current = [];

      bars.forEach((bar) => {
        const computed = getComputedStyle(bar);
        const currentTransform = computed.transform || 'none';
        
        const animation = bar.animate(
          [
            { transform: currentTransform },
            { transform: 'scaleY(0.25)' }
          ],
          {
            duration: 600,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
          }
        );
        
        animationsRef.current.push(animation);
      });

      // After all animations complete, mark as settled
      Promise.all(animationsRef.current.map(a => a.finished)).then(() => {
        setIsSettling(false);
        setIsSettled(true);
      }).catch(() => {
        // Animation was cancelled
      });

    } else if (isActive && isSettled) {
      // Resume: cancel settle animations and restart
      animationsRef.current.forEach(a => a.cancel());
      animationsRef.current = [];
      
      bars.forEach((bar) => {
        (bar as HTMLElement).style.transform = '';
      });
      
      setIsSettling(false);
      setIsSettled(false);
    }
  }, [isActive, isSettled]);

  // Determine CSS class state
  const getBarClass = () => {
    if (isSettling) return 'equalizer-bar settling';
    if (!isActive) return 'equalizer-bar paused';
    return 'equalizer-bar';
  };

  return (
    <div ref={barsRef} className={`flex items-end gap-[2px] ${className}`}>
      <div className={getBarClass()} />
      <div className={getBarClass()} />
      <div className={getBarClass()} />
      <div className={getBarClass()} />
      <div className={getBarClass()} />
    </div>
  );
}
