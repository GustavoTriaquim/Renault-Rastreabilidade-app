import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, LoadingState, Screen, ScreenHeader, type IconName } from '@/components/ui';
import { useData } from '@/context/data-context';
import { useSession } from '@/context/session-context';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import { theme } from '@/theme';
import type { AppNotification, NotificationType } from '@/types/domain';
import { formatDateTime } from '@/utils/format';
import { notificationHref } from '@/utils/routes';

const ICONS: Record<NotificationType, IconName> = {
  peca_disponivel: 'inbox-arrow-down-outline',
  revisao_retornou: 'backup-restore',
  peca_reprovada: 'close-circle-outline',
  revisao_atualizada: 'clipboard-text-search-outline',
  acao_necessaria: 'alert-circle-outline',
};

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Não lida. '}${item.title}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.card, !item.read && styles.unread]}>
        <Icon name={ICONS[item.type]} size={26} color={item.read ? theme.colors.textSecondary : theme.colors.accent} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="bodyStrong" style={styles.title}>
              {item.title}
            </AppText>
            {!item.read ? <View style={styles.dot} accessibilityLabel="Não lida" /> : null}
          </View>
          <AppText color={theme.colors.textSecondary}>{item.summary}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {item.partNumber ? `Peça ${item.partNumber} · ` : ''}
            {formatDateTime(item.createdAt)}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { operator } = useSession();
  const { invalidate } = useData();
  const operatorId = operator?.id ?? '';
  const list = useServiceQuery(() => services.notifications.listForOperator(operatorId), [operatorId]);

  const items = list.data ?? [];
  const unread = items.filter((item) => !item.read).length;

  const markAll = async () => {
    await services.notifications.markAllAsRead(operatorId);
    invalidate();
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} ${unread === 1 ? 'não lida' : 'não lidas'}` : 'Tudo em dia.'}
      />
      {unread > 0 ? (
        <Button label="Marcar todas como lidas" variant="secondary" icon="check-all" onPress={() => void markAll()} />
      ) : null}

      {list.loading ? (
        <LoadingState message="Carregando notificações…" />
      ) : list.error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          description={list.error.message}
          actionLabel="Tentar de novo"
          onAction={list.reload}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell-outline"
          title="Nenhuma notificação"
          description="Avisos de peças disponíveis e de revisões aparecem aqui."
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} onPress={() => router.push(notificationHref(item.id))} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  unread: { borderColor: theme.colors.accent },
  body: { flex: 1, gap: theme.spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
  pressed: { opacity: 0.85 },
});
