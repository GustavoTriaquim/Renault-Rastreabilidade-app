import { useCallback, useState } from 'react';

import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { services } from '@/services';

/**
 * Dispara a decisão simulada de uma revisão em análise (alterna aprovada/reprovada).
 * No sistema real essa decisão virá do site administrativo.
 */
export function useDecideReview(onDecided?: () => void) {
  const { operator } = useSession();
  const { invalidate } = useData();
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = useCallback(
    async (reviewId: string) => {
      if (!operator || deciding) return;
      setDeciding(true);
      setError(null);
      const result = await services.reviews.decide(operator.id, reviewId);
      setDeciding(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      invalidate();
      onDecided?.();
    },
    [operator, deciding, invalidate, onDecided],
  );

  return { decide, deciding, error };
}
