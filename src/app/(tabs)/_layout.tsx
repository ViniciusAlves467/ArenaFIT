import { router } from 'expo-router';
import { type BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName, Text } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Início', icon: 'home' },
  groups: { label: 'Grupos', icon: 'users' },
  challenges: { label: 'Desafios', icon: 'trophy' },
  profile: { label: 'Perfil', icon: 'user' },
};

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((r) => TABS[r.name]);
  const half = Math.ceil(routes.length / 2);

  const item = (route: (typeof routes)[number]) => {
    const active = state.routes[state.index]?.key === route.key;
    const meta = TABS[route.name];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={meta.label}
        onPress={() => navigateToTab(route.key)}
        style={styles.item}
      >
        <Icon name={meta.icon} size={22} color={active ? colors.primary : colors.textMuted} strokeWidth={active ? 2.3 : 1.9} />
        <Text variant="caption" style={{ fontSize: 11, color: active ? colors.text : colors.textMuted }}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {routes.slice(0, half).map(item)}
      <View style={styles.item}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar check-in"
          onPress={() => router.push('/checkin/new')}
          style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.96 }] }]}
        >
          <Icon name="plus" size={26} color={colors.onPrimary} strokeWidth={2.6} />
        </Pressable>
      </View>
      {routes.slice(half).map(item)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="challenges" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginTop: -14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
