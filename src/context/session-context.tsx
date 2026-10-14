import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { services, type Result } from '@/services';
import type { Operator } from '@/types/domain';

interface SessionValue {
  /** Operador autenticado, ou `null` sem sessão. */
  operator: Operator | null;
  /** Verdadeiro enquanto o app confere se havia uma sessão salva. */
  restoring: boolean;
  /** Entra pela matrícula (digitada ou lida por OCR). Devolve o erro tipado em caso de falha. */
  signIn: (registration: string) => Promise<Result<Operator>>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Sessão do operador. As regras (validar matrícula, lembrar o operador, revalidar
 * se ele segue ativo) ficam em `services.session`; aqui só guardamos o estado.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    services.session
      .restore()
      .then((restored) => {
        if (!cancelled && restored) setOperator(restored);
      })
      .catch(() => {
        // sessão ilegível: segue para o login
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (registration: string) => {
    const result = await services.session.signIn(registration);
    if (result.ok) setOperator(result.value);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    setOperator(null);
    await services.session.signOut();
  }, []);

  const value = useMemo(
    () => ({ operator, restoring, signIn, signOut }),
    [operator, restoring, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession deve ser usado dentro de <SessionProvider>.');
  }
  return value;
}
