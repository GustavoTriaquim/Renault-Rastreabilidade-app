import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useSession } from '@/context/session-context';
import { useServiceQuery } from '@/hooks/use-service-query';
import { services } from '@/services';
import { theme } from '@/theme';

function tabIcon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  const { operator } = useSession();
  const operatorId = operator?.id ?? '';
  const unread = useServiceQuery(() => services.notifications.countUnread(operatorId), [operatorId]);
  const unreadCount = unread.data ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarBadgeStyle: { backgroundColor: theme.colors.accent, color: theme.colors.textInverse },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon('home-variant-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico', tabBarIcon: tabIcon('history') }} />
      <Tabs.Screen name="scanner" options={{ title: 'Scanner', tabBarIcon: tabIcon('text-recognition') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificações',
          tabBarIcon: tabIcon('bell-outline'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tabs>
  );
}
