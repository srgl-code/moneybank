import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to the new value.
 * Returns { displayValue, isAnimating, direction }.
 * direction: 'up' | 'down' | null
 */
export function useAnimatedNumber(targetValue, { duration = 600, enabled = true } = {}) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(null);
  const prevRef = useRef(targetValue);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled || prevRef.current === targetValue) {
      prevRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const start = prevRef.current;
    const diff = targetValue - start;
    const dir = diff > 0 ? 'up' : 'down';
    setDirection(dir);
    setIsAnimating(true);

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setIsAnimating(false);
        setTimeout(() => setDirection(null), 400);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    prevRef.current = targetValue;

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, duration, enabled]);

  return { displayValue, isAnimating, direction };
}
