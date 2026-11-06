import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  // Bar is purple in light mode and the card purple in dark mode.
  const barColor = scheme === 'dark' ? colors.backgroundElement : colors.primary;
  const idle = 'rgba(255,255,255,0.7)';

  return (
    <NativeTabs
      backgroundColor={barColor}
      disableTransparentOnScrollEdge
      indicatorColor={colors.primaryDark}
      iconColor={{ default: idle, selected: colors.accent }}
      labelStyle={{ default: { color: idle }, selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Trilha</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          md="route"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Reforço</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
          md="style"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
