import { useState, useEffect, useRef, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  itemCount: number;
  overscan?: number;
  containerHeight?: number;
}

export function useVirtualScroll({
  itemHeight,
  itemCount,
  overscan = 3,
  containerHeight = 600,
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { visibleRange, totalHeight, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [scrollTop, itemHeight, itemCount, containerHeight, overscan]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    scrollRef,
    handleScroll,
    visibleRange,
    totalHeight,
    offsetY,
    visibleItems: Array.from(
      { length: visibleRange.end - visibleRange.start + 1 },
      (_, i) => visibleRange.start + i
    ),
  };
}
