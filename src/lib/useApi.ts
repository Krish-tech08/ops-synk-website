import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

/** Load data on mount (and when `path` changes); exposes reload. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const r = await api<T>(path);
      if (mine === seq.current) { setData(r.data); setMeta(r.meta); setError(null); }
    } catch (e) {
      if (mine === seq.current) setError(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Something went wrong.", 0));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, meta, error, loading, reload: load };
}
