import { NativeTabs } from "expo-router/native-tabs";

import { useTheme } from "@/hooks/use-theme";

export default function TabLayout() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.tint}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="figure.golf" md="sports_golf" />
        <NativeTabs.Trigger.Label>Golf</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        <NativeTabs.Trigger.Icon sf="baseball.fill" md="sports_baseball" />
        <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
