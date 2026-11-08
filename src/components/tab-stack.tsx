import { Stack } from "expo-router";
import { Platform, PlatformColor } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * The native stack in each tab: a large title that collapses on scroll.
 * Scroll views in these screens use contentInsetAdjustmentBehavior="automatic"
 * so their content starts below the header.
 */
export function TabStack({ title }: { title: string }) {
  const theme = useTheme();
  const ios = Platform.OS === "ios";

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: ios,
        headerTransparent: ios,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerStyle: ios ? undefined : { backgroundColor: theme.background },
        // iOS: a dynamic system color, so the title follows a light/dark
        // switch while the screen is open
        headerTitleStyle: ios
          ? { color: PlatformColor("label") }
          : { color: theme.text, fontWeight: "700" },
        headerLargeTitleStyle: ios ? { color: PlatformColor("label") } : undefined,
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
