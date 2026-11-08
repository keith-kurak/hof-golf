import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";

/**
 * Close (xmark) button in the header of a modal sheet on iOS. Android shows a
 * back arrow in modal headers already.
 */
export function SheetCloseButton() {
  const router = useRouter();
  if (Platform.OS !== "ios") return null;
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="xmark"
        accessibilityLabel="Close"
        onPress={() => router.back()}
      />
    </Stack.Toolbar>
  );
}
