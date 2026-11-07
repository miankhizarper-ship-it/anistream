import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared horizontal-rail controller used by the detail-page rails
 * (Top Billed Cast / More Like This). Tracks whether the scroll
 * position is at either edge and performs smooth programmatic scrolls.
 */
export function useRail<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 10,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 10,
    });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  const scroll = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }, []);

  return { ref, edges, update, scroll };
}
