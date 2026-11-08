import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { type ComponentRef, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { ScoreCard } from "@/components/score-card";
import { SheetCloseButton } from "@/components/sheet-close-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Spacing } from "@/constants/theme";
import { game$ } from "@/store/game-store";

/**
 * Preview of the score card for a finished game, with a button that shares
 * it as a PNG. Opened from the Game Complete screen and from game history.
 */
export default function ShareScoreScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const game = useSelector(() =>
    (game$.history.get() ?? []).find((g) => g.id === gameId),
  );
  const { bottom } = useSafeAreaInsets();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    setError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError("Sharing is not available on this device.");
        return;
      }
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        fileName: `hof-golf-${game?.totalPoints ?? 0}-points`,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Share your score",
      });
    } catch (e) {
      console.error("Failed to share score:", e);
      setError("Could not share the score. Try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Share Score" }} />
      <SheetCloseButton />
      {game ? (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
          >
            <View ref={cardRef} collapsable={false} testID="share-card">
              <ScoreCard game={game} />
            </View>
            {error && (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            )}
          </ScrollView>
          {Platform.OS !== "web" && (
            <View
              style={[
                styles.footer,
                { paddingBottom: bottom + Spacing.three },
              ]}
            >
              <Button
                testID="share-score"
                title="Share"
                icon={{
                  ios: "square.and.arrow.up",
                  android: "share",
                  web: "share",
                }}
                loading={sharing}
                onPress={handleShare}
              />
            </View>
          )}
        </>
      ) : (
        <ThemedText style={styles.empty}>Game not found.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.three,
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  empty: {
    padding: Spacing.three,
  },
});
