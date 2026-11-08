/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    /** Grouped page background (iOS systemGroupedBackground) */
    background: '#F2F2F7',
    /** Cards and rows on the page background */
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5EA',
    textSecondary: '#6C6C70',
    /** Brand color, from the app icon */
    tint: '#4C3BBF',
    tintMuted: 'rgba(76, 59, 191, 0.12)',
    /** Segmented control track and other neutral fills */
    fill: 'rgba(118, 118, 128, 0.12)',
    segmentSelected: '#FFFFFF',
    separator: 'rgba(60, 60, 67, 0.18)',
    success: '#16A34A',
    successMuted: 'rgba(22, 163, 74, 0.12)',
    warning: '#B7791F',
    warningMuted: 'rgba(234, 179, 8, 0.14)',
    danger: '#E5484D',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    textSecondary: '#98989F',
    tint: '#9B8CFF',
    tintMuted: 'rgba(155, 140, 255, 0.18)',
    fill: 'rgba(118, 118, 128, 0.24)',
    segmentSelected: '#636366',
    separator: 'rgba(84, 84, 88, 0.6)',
    success: '#30D158',
    successMuted: 'rgba(48, 209, 88, 0.16)',
    warning: '#FFD60A',
    warningMuted: 'rgba(255, 214, 10, 0.14)',
    danger: '#FF6369',
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

export const Radius = {
  small: 9,
  medium: 12,
  card: 20,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
