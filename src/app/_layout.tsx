import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SQLiteProvider
      databaseName="test.db"
      assetSource={{ assetId: require("../../lahman/db/database.sqlite") }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{ title: "MLB Teams" }}
          />
          <Stack.Screen
            name="team/[teamID]"
            options={{ title: "Roster" }}
          />
          <Stack.Screen
            name="player/[playerID]"
            options={{ title: "Player" }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
