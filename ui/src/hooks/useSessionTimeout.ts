import { useEffect, useRef, useState } from 'react';

interface UseSessionTimeoutOptions {
  timeout: number; // in milliseconds
  warningTime?: number; // in milliseconds before timeout to show warning
  onTimeout: () => void;
  onWarning?: () => void;
}

export function useSessionTimeout({
  timeout,
  warningTime = 60000, // 1 minute before timeout
  onTimeout,
  onWarning,
}: UseSessionTimeoutOptions) {
  const [remainingTime, setRemainingTime] = useState(timeout);
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();

  const resetTimeout = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setShowWarning(false);
    setRemainingTime(timeout);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning?.();

      // Start countdown
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }, timeout - warningTime);

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  };

  useEffect(() => {
    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout);
    });

    // Initial timer
    resetTimeout();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeout, warningTime, onTimeout, onWarning]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    showWarning,
    remainingTime,
    formattedTime: formatTime(remainingTime),
    resetTimeout,
  };
}
