import { useState, useEffect } from 'react';

export function useLiveAnalysis(intervalMs: number = 5000) {
  const [data, setData] = useState<any>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const fetchLatest = async () => {
      try {
        // This endpoint should return the most recent analysis from your DB
        const response = await fetch('/api/analyze/latest');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Live polling error:", error);
      }
    };

    fetchLatest(); // Initial fetch
    const interval = setInterval(fetchLatest, intervalMs);
    
    return () => clearInterval(interval);
  }, [isLive, intervalMs]);

  return { data, isLive, setIsLive };
}