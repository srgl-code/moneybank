import { useState, useCallback } from 'react';

/**
 * Persists state in localStorage with JSON serialization.
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    setStoredValue((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* quota exceeded — silently fail */ }
      return next;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
