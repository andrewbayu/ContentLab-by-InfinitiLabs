import { useEffect, useState } from 'react';
import { localDateKey } from './dates';

/** Refresh across midnight and when a background tab becomes active. */
export function useToday() {
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return today;
}
