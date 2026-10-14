import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { PartCard } from '@/components/part-card';
import { AppText, Button, Card, EmptyState, Icon, LoadingState, Screen, ScreenHeader } from '@/components/ui';
import { STAGE_LABELS } from '@/constants/labels';
import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import { theme } from '@/theme';
import { historyHref, notificationsHref, partHref, scannerHref } from '@/utils/routes';

function Counter({ value, label, urgent = false }: { value: number; label: string; urgent?: boolean }) {
  const highlight = urgent && value > 0;
  return (
    <Card
      style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}
      accessible
      accessibilityLabel={`${value} ${label}`}>
      <AppText variant="display" color={highlight ? theme.colors.error : theme.colors.text}>
        {value}
      </AppText>
      <AppText variant="caption" color={theme.colors.textSecondary} style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { operator, signOut } = useSession();
  const { invalidate } = useData();
  const operatorId = operator?.id ?? '';

  const queue = useServiceQuery(() => services.parts.listQueue(operatorId), [operatorId]);
  const unread = useServiceQuery(() => services.notifications.countUnread(operatorId), [operatorId]);

  const items = queue.data ?? [];
  const urgent = items.filter((item) => item.band === 'urgente' || item.band === 'vencido').length;

  const confirmReset = () =>
    Alert.alert(
      'Restaurar dados de demonstração',
      'Todas as validações, revisões e notificações feitas voltam ao estado inicial. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            await services.resetData();
            invalidate();
          },
        },
      ],
    );

  return (
    <Screen>
      <ScreenHeader
        title={`Olá, ${operator?.name.split(' ')[0] ?? ''}`}
        subtitle={operator ? `Etapa de atuação: ${STAGE_LABELS[operator.stage]}` : undefined}
      />

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Counter value={items.length} label="peças pendentes" />
        <Counter value={urgent} label="urgentes ou vencidas" urgent />
      </View>

      <Button label="Ler peça para validar" icon="text-recognition" onPress={() => router.navigate(scannerHref())} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button label="Histórico" variant="secondary" icon="history" onPress={() => router.navigate(historyHref())} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={unread.data ? `Avisos (${unread.data})` : 'Avisos'}
            variant="secondary"
            icon="bell-outline"
            onPress={() => router.navigate(notificationsHref())}
          />
        </View>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Peças para validar</AppText>
        <View style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' }}>
          <Icon name="sort" size={16} color={theme.colors.textSecondary} />
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1 }}>
            Prazo mais curto primeiro; dentro do mesmo prazo, quem chegou antes na etapa.
          </AppText>
        </View>

        {queue.loading ? (
          <LoadingState message="Carregando peças…" />
        ) : queue.error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar"
            description={queue.error.message}
            actionLabel="Tentar de novo"
            onAction={queue.reload}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="check-all"
            title="Nenhuma peça aguardando"
            description="Quando uma peça chegar à sua etapa, ela aparece aqui e você recebe um aviso."
          />
        ) : (
          items.map((summary) => (
            <PartCard
              key={summary.part.id}
              summary={summary}
              showStageEntry
              onPress={() => router.push(partHref(summary.part.id))}
            />
          ))
        )}
      </View>

      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
        <Button label="Sair" variant="secondary" icon="logout" onPress={() => void signOut()} />
        <Button label="Restaurar dados de demonstração" variant="ghost" icon="restore" onPress={confirmReset} />
      </View>
    </Screen>
  );
}
