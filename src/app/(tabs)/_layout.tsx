import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, font } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Filled icon when the tab is active, outline when not. `color` already follows
// tabBarActiveTintColor / tabBarInactiveTintColor.
function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    return (
      <Ionicons
        name={focused ? active : inactive}
        size={size}
        color={focused ? colors.primary : colors.textMuted}
      />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0, // Android would otherwise draw a shadow over the border
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarIcon: tabIcon('barbell', 'barbell-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('time', 'time-outline') }}
      />
      {/* Hidden until PRs and charts exist (H7). The route file stays. */}
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}
