import { useCallback, useEffect, useRef, useState } from 'react';

import { useData } from '@/context/data-context';
import type { Result, ServiceError } from '@/services';

export interface QueryState<T> {
  data: T | null;
  error: ServiceError | null;
  /** Verdadeiro só enquanto ainda não há dados; recargas mantêm o conteúdo anterior na tela. */
  loading: boolean;
  reload: () => void;
}

/**
 * Lê dados de um serviço e os recarrega sempre que algo é gravado (`invalidate`)
 * ou quando `deps` muda. As telas nunca guardam cópia própria das regras.
 */
export function useServiceQuery<T>(
  fetcher: () => Promise<Result<T>>,
  deps: readonly unknown[],
): QueryState<T> {
  const { version } = useData();
  const [state, setState] = useState<Omit<QueryState<T>, 'reload'>>({
    data: null,
    error: null,
    loading: true,
  });
  const [manualVersion, setManualVersion] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { data: result.value, error: null, loading: false }
          : { data: null, error: result.error, loading: false },
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, manualVersion, ...deps]);

  const reload = useCallback(() => setManualVersion((current) => current + 1), []);
  return { ...state, reload };
}
