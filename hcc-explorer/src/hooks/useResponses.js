// hooks/useResponses.js
import { useState, useEffect } from "react";

export function useResponses(src = "/data/responses.json") {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(json => {
        if (!cancelled) { setData(json); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [src]);

  return { data, loading, error };
}
