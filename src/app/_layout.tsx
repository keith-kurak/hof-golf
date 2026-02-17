import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import React from "react";
import { useColorScheme } from "react-native";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
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
}
