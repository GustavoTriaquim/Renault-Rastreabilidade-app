import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { AppText, Chip, EmptyState, LoadingState, Screen, ScreenHeader, TextField } from '@/components/ui';
import { EVENT_TYPE_LABELS, STAGE_LABELS, STAGE_ORDER } from '@/constants/labels';
import { useSession } from '@/context/session-context';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import { theme } from '@/theme';
import type { PartEventType, Stage } from '@/types/domain';
import {
  DEFAULT_HISTORY_FILTERS,
  PERIOD_LABELS,
  filterHistory,
  type HistoryFilters,
  type PeriodFilter,
} from '@/utils/history';
import { partHref } from '@/utils/routes';

const PERIODS = Object.keys(PERIOD_LABELS) as PeriodFilter[];
const TYPES = Object.keys(EVENT_TYPE_LABELS) as PartEventType[];

function FilterRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label" color={theme.colors.textSecondary}>
        {title.toUpperCase()}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
        {children}
      </ScrollView>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { operator } = useSession();
  const operatorId = operator?.id ?? '';
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);

  const history = useServiceQuery(() => services.events.listByOperator(operatorId), [operatorId]);
  const events = useMemo(
    () => filterHistory(history.data ?? [], filters, new Date()),
    [history.data, filters],
  );
  const set = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_HISTORY_FILTERS);

  return (
    <Screen>
      <ScreenHeader title="Histórico" subtitle="Validações e revisões registradas para você." />

      <TextField
        label="Número da peça"
        identifier
        value={filters.partQuery}
        onChangeText={(text) => set('partQuery', text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="Buscar por número"
      />

      <FilterRow title="Período">
        {PERIODS.map((period) => (
          <Chip key={period} label={PERIOD_LABELS[period]} selected={filters.period === period} onPress={() => set('period', period)} />
        ))}
      </FilterRow>
      <FilterRow title="Etapa">
        <Chip label="Todas" selected={filters.stage === 'todas'} onPress={() => set('stage', 'todas')} />
        {STAGE_ORDER.map((stage: Stage) => (
          <Chip key={stage} label={STAGE_LABELS[stage]} selected={filters.stage === stage} onPress={() => set('stage', stage)} />
        ))}
      </FilterRow>
      <FilterRow title="Tipo de evento">
        <Chip label="Todos" selected={filters.type === 'todos'} onPress={() => set('type', 'todos')} />
        {TYPES.map((type) => (
          <Chip key={type} label={EVENT_TYPE_LABELS[type]} selected={filters.type === type} onPress={() => set('type', type)} />
        ))}
      </FilterRow>
      <FilterRow title="Ordem">
        <Chip label="Mais recentes" selected={filters.order === 'recentes'} onPress={() => set('order', 'recentes')} />
        <Chip label="Mais antigos" selected={filters.order === 'antigos'} onPress={() => set('order', 'antigos')} />
      </FilterRow>

      {history.loading ? (
        <LoadingState message="Carregando histórico…" />
      ) : history.error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={history.error.message}
          actionLabel="Tentar de novo"
          onAction={history.reload}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon="history"
          title={filtered ? 'Nenhum evento com esses filtros' : 'Nenhum evento ainda'}
          description={
            filtered
              ? 'Ajuste ou limpe os filtros para ver mais resultados.'
              : 'Suas validações e pedidos de revisão aparecem aqui.'
          }
          actionLabel={filtered ? 'Limpar filtros' : undefined}
          onAction={filtered ? () => setFilters(DEFAULT_HISTORY_FILTERS) : undefined}
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </AppText>
          {events.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => router.push(partHref(event.partId))} />
          ))}
        </View>
      )}
    </Screen>
  );
}
