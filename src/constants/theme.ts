/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1230',
    background: '#F6F3FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6DDF3',
    textSecondary: '#5B5070',
    primary: '#6A0CC9',
    onPrimary: '#FFFFFF',
    primaryText: '#6A0CC9',
    accent: '#F5B700',
    onAccent: '#2A1A00',
    success: '#1E7B45',
    error: '#C23030',
    border: '#8C7FA3',
  },
  dark: {
    text: '#F3EEFA',
    background: '#120A1C',
    backgroundElement: '#1E1430',
    backgroundSelected: '#33244A',
    textSecondary: '#B7AACB',
    primary: '#6A0CC9',
    onPrimary: '#FFFFFF',
    primaryText: '#AB66FF',
    accent: '#F5B700',
    onAccent: '#2A1A00',
    success: '#4CC38A',
    error: '#FF6B6B',
    border: '#7A6A94',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
