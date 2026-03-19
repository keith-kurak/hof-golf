import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import React from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const isWeb = Platform.OS === "web";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const content = (
    <SQLiteProvider
      databaseName="test.db"
      assetSource={{ assetId: require("../../lahman/db/database.sqlite") }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="team/[teamID]" options={{ title: "Roster" }} />
          <Stack.Screen
            name="player/[playerID]"
            options={{ title: "Player" }}
          />
          <Stack.Screen
            name="game/[modeId]"
            options={{ title: "Mode Details" }}
          />
          <Stack.Screen
            name="game/pick-team"
            options={{
              presentation: "modal",
              title: "Choose Starting Team",
            }}
          />
          <Stack.Screen
            name="game/summary"
            options={{
              presentation: "modal",
              title: "Game Summary",
            }}
          />
          <Stack.Screen
            name="game/history-detail"
            options={{ title: "Game Details" }}
          />
          <Stack.Screen
            name="game/complete"
            options={{ title: "Game Complete", headerBackVisible: false }}
          />
          <Stack.Screen
            name="game/resume"
            options={{
              presentation: "transparentModal",
              headerShown: false,
              animation: "fade",
            }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );

  if (!isWeb) return content;

  return (
    <View style={[webStyles.outer, { backgroundColor: colorScheme === "dark" ? "#111113" : "#E8E8EB" }]}>
      <View style={webStyles.inner}>{content}</View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
});
