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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>(isActive ? 'playing' : 'flatlined');
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const targetAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const currentAmplitudeRef = useRef<number>(isActive ? 1 : 0);
  const durationRef = useRef<number>(0);

  const updateEnvelope = useCallback((amplitude: number) => {
    currentAmplitudeRef.current = amplitude;
    if (wrapperRef.current) {
      // Scale the wrapper to create amplitude envelope
      // At amplitude 0: scaleY(0.25), at amplitude 1: scaleY(1)
      const scale = 0.25 + amplitude * 0.75;
      wrapperRef.current.style.transform = `scaleY(${scale})`;
    }
  }, []);

  const animate = useCallback((currentTime: number) => {
    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1);
    
    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    const newAmplitude = startAmplitudeRef.current + 
      (targetAmplitudeRef.current - startAmplitudeRef.current) * eased;
    
    updateEnvelope(newAmplitude);

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
  }, [updateEnvelope]);

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
  const isFlatlined = stage === 'flatlined';

  return (
    <div 
      ref={wrapperRef}
      className={`equalizer-wrapper gap-[2px] ${className}`}
      style={{
        transform: `scaleY(${isFlatlined ? 0.25 : (0.25 + currentAmplitudeRef.current * 0.75)})`,
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`equalizer-bar ${isFlatlined ? 'flatlined' : ''}`}
          style={{
            animationDelay: `${delays[i]}s`,
          }}
        />
      ))}
    </div>
  );
}
