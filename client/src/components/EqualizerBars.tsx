import { useRef, useEffect, useState, useCallback } from "react";

type Stage = 'flatlined' | 'rising' | 'playing' | 'dying';

interface EqualizerBarsProps {
  isActive: boolean;
  className?: string;
  riseDuration?: number;
  decayDuration?: number;
}

export function EqualizerBars({ 
  isActive, 
  className = "",
  riseDuration = 800,
  decayDuration = 2000 
}: EqualizerBarsProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [stage, setStage] = useState<Stage>(isActive ? 'playing' : 'flatlined');
  const [amplitude, setAmplitude] = useState(isActive ? 1 : 0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const targetAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const currentAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const durationRef = useRef<number>(0);

  const updateBars = useCallback((amp: number) => {
    currentAmplitudeRef.current = amp;
    setAmplitude(amp);
    barsRef.current.forEach(bar => {
      if (bar) {
        bar.style.setProperty('--amplitude', String(amp));
      }
    });
  }, []);

  const animate = useCallback((currentTime: number) => {
    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1);
    
    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    const newAmplitude = startAmplitudeRef.current + 
      (targetAmplitudeRef.current - startAmplitudeRef.current) * eased;
    
    updateBars(newAmplitude);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animationFrameRef.current = null;
      // Transition to final stage
      if (targetAmplitudeRef.current === 1) {
        setStage('playing');
      } else {
        setStage('flatlined');
      }
    }
  }, [updateBars]);

  const startAnimation = useCallback((
    toAmplitude: number,
    duration: number,
    newStage: Stage
  ) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setStage(newStage);
    startTimeRef.current = performance.now();
    startAmplitudeRef.current = currentAmplitudeRef.current;
    targetAmplitudeRef.current = toAmplitude;
    durationRef.current = duration;

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    if (isActive) {
      // Start or resume playing
      if (stage === 'flatlined' || stage === 'dying') {
        startAnimation(1, riseDuration, 'rising');
      }
    } else {
      // Stop playing
      if (stage === 'playing' || stage === 'rising') {
        startAnimation(0, decayDuration, 'dying');
      }
    }
  }, [isActive, stage, startAnimation, riseDuration, decayDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const delays = [0, 0.2, 0.4, 0.1, 0.3];

  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="equalizer-bar"
          style={{
            '--amplitude': amplitude,
            animationDelay: `${delays[i]}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
