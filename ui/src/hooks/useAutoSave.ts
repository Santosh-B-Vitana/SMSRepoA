import { useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialRender = useRef(true);
  const debouncedData = useDebounce(data, delay);

  useEffect(() => {
    if (!enabled) return;
    
    // Skip initial render
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const save = async () => {
      setIsSaving(true);
      setError(null);
      
      try {
        await onSave(debouncedData);
        setLastSaved(new Date());
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsSaving(false);
      }
    };

    save();
  }, [debouncedData, onSave, enabled]);

  return { isSaving, lastSaved, error };
}
