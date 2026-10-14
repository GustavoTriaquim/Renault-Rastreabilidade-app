import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DataValue {
  /** Muda a cada gravação; as telas recarregam seus dados quando ele muda. */
  version: number;
  /** Avisa que os dados mudaram (chamar depois de validar, pedir revisão, ler notificação...). */
  invalidate: () => void;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((current) => current + 1), []);
  const value = useMemo(() => ({ version, invalidate }), [version, invalidate]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData deve ser usado dentro de <DataProvider>.');
  return value;
}
